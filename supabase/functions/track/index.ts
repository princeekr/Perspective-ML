import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingEvent {
  user_id: string;
  session_id: string;
  page: string;
  timestamp: string;
  event_type: 'page' | 'click' | 'mouse' | 'scroll';
  extra_data: Record<string, unknown>;
}

function toInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: TrackingEvent = await req.json();
    const { user_id, session_id, page, timestamp, event_type, extra_data } = body;

    console.log(`Tracking ${event_type} event for user ${user_id} session ${session_id} on page ${page}`);

    // Validate required fields - now including user_id
    if (!user_id || !session_id || !page || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, session_id, page, event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert session (create if not exists, update last_activity if exists)
    const { error: sessionError } = await supabase
      .from('tracking_sessions')
      .upsert({
        session_id,
        user_id,
        user_agent: (extra_data.user_agent as string) || null,
        last_activity_at: new Date().toISOString(),
      }, { onConflict: 'session_id' });

    if (sessionError) {
      console.error('Session upsert error:', sessionError);
    }

    let result;

    switch (event_type) {
      case 'page': {
        const timeSpentMs = toInt(extra_data.time_spent_ms) ?? 0;
        result = await supabase.from('page_visits').insert({
          user_id,
          session_id,
          page_url: page,
          referrer: (extra_data.referrer as string) || null,
          timestamp: timestamp || new Date().toISOString(),
          time_spent_ms: timeSpentMs,
        });
        break;
      }

      case 'click': {
        const x = toInt(extra_data.x);
        const y = toInt(extra_data.y);

        // Never 500 on malformed client data; just skip.
        if (x === null || y === null) {
          return new Response(
            JSON.stringify({ success: true, event_type, skipped: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = await supabase.from('click_events').insert({
          user_id,
          session_id,
          page_url: page,
          x_position: x,
          y_position: y,
          element_tag: (extra_data.element_tag as string) || null,
          element_id: (extra_data.element_id as string) || null,
          element_class: (extra_data.element_class as string) || null,
          timestamp: timestamp || new Date().toISOString(),
        });
        break;
      }

      case 'mouse':
        result = await supabase.from('mouse_events').insert({
          user_id,
          session_id,
          page_url: page,
          positions: extra_data.positions || [],
          timestamp: timestamp || new Date().toISOString(),
        });
        break;

      case 'scroll': {
        const scrollDepth = toInt(extra_data.scroll_depth_percent);
        const scrollY = toInt(extra_data.scroll_y);
        const viewportHeight = toInt(extra_data.viewport_height);
        const documentHeight = toInt(extra_data.document_height);

        if (
          scrollDepth === null ||
          scrollY === null ||
          viewportHeight === null ||
          documentHeight === null
        ) {
          return new Response(
            JSON.stringify({ success: true, event_type, skipped: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const depthClamped = Math.max(0, Math.min(100, scrollDepth));

        result = await supabase.from('scroll_events').insert({
          user_id,
          session_id,
          page_url: page,
          scroll_depth_percent: depthClamped,
          scroll_y: scrollY,
          viewport_height: viewportHeight,
          document_height: documentHeight,
          timestamp: timestamp || new Date().toISOString(),
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid event_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result?.error) {
      console.error(`Error inserting ${event_type} event:`, result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, event_type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tracking error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
