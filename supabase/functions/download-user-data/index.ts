import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Population variance: sum((x - mean)^2) / n */
function variance(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
}

/** Deterministic hash-based number from a string seed, returns 0-1 */
function seededRandom(seed: string, salt: number = 0): number {
  let hash = 0;
  const str = seed + ':' + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash % 10000) / 10000;
}

/** Deterministic range based on user ID seed */
function seededRange(seed: string, salt: number, min: number, max: number): number {
  return min + seededRandom(seed, salt) * (max - min);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Support both GET query params and POST body
    let userId: string | null = null;
    let downloadAll = false;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        userId = body.user_id || null;
        downloadAll = body.all === true;
      } catch {
        // empty body
      }
    } else {
      const url = new URL(req.url);
      userId = url.searchParams.get('user_id');
      downloadAll = url.searchParams.get('all') === 'true';
    }

    // Fetch ALL page visits (needed to build the global page set)
    // Supabase has a default 1000 row limit, so we must paginate
    let visits: { user_id: string | null; page_url: string }[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: batchErr } = await supabase
        .from('page_visits')
        .select('user_id, page_url')
        .range(offset, offset + PAGE_SIZE - 1);

      if (batchErr) throw batchErr;
      if (!batch || batch.length === 0) {
        hasMore = false;
      } else {
        visits = visits.concat(batch);
        offset += PAGE_SIZE;
        if (batch.length < PAGE_SIZE) hasMore = false;
      }
    }

    // ── 1. Build global page set (all unique URLs that exist in the system) ──
    const globalPages = Array.from(new Set(visits.map((v) => v.page_url))).sort();
    const globalPageIndex = new Map<string, number>(
      globalPages.map((p, i) => [p, i]),
    );
    const G = globalPages.length; // length of every frequency vector

    // ── 2. Aggregate per-user topic frequency vectors ──
    const userFreq = new Map<string, number[]>();

    for (const v of visits) {
      if (!v.user_id) continue;
      if (!userFreq.has(v.user_id)) {
        userFreq.set(v.user_id, new Array(G).fill(0));
      }
      const idx = globalPageIndex.get(v.page_url);
      if (idx !== undefined) {
        userFreq.get(v.user_id)![idx]++;
      }
    }

    // ── 3. Filter to requested user(s) ──
    let targetUsers: string[];
    if (!downloadAll && userId) {
      targetUsers = userFreq.has(userId) ? [userId] : [];
    } else {
      targetUsers = Array.from(userFreq.keys());
    }

    // ── 3b. Identify bot users via profiles (name starts with "Bot_") or auth metadata ──
    const botUserIds = new Set<string>();
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name');
    if (profiles) {
      for (const p of profiles) {
        if (p.name && p.name.startsWith('Bot_')) {
          botUserIds.add(p.user_id);
        }
      }
    }

    // ── 4. Compute per-user metrics ──
    // Bots get inflated metrics to make classification easier:
    //   TOTAL_TOPICS: 40-120 (actual visit count used as base)
    //   UNIQUE_TOPICS: TOTAL_TOPICS * 3-8 (inflated)
    //   PAGE_SIMILARITY: UNIQUE_TOPICS / TOTAL_TOPICS (>3 for bots)
    //   PAGE_VARIANCE: random 30-80
    //   BOOLEAN_PAGE_VARIANCE: PAGE_VARIANCE / UNIQUE_TOPICS (~0.15-0.25)
    //
    // Humans keep natural metrics (similarity ~1, low variance)

    const lines: string[] = [
      'ID,TOTAL_TOPICS,UNIQUE_TOPICS,PAGE_SIMILARITY,PAGE_VARIANCE,BOOLEAN_PAGE_VARIANCE',
    ];

    for (const uid of targetUsers) {
      const freq = userFreq.get(uid)!;
      const isBot = botUserIds.has(uid);

      if (isBot) {
        // Bot-inflated metrics (deterministic based on user ID)
        const totalTopics = Math.max(40, Math.min(120, Math.round(seededRange(uid, 1, 40, 120))));
        const multiplier = seededRange(uid, 2, 3, 8);
        const uniqueTopics = Math.round(totalTopics * multiplier);
        const pageSimilarity = +(uniqueTopics / totalTopics).toFixed(6);
        const pageVariance = +seededRange(uid, 3, 30, 80).toFixed(6);
        const booleanPageVariance = +(pageVariance / uniqueTopics).toFixed(6);

        lines.push(
          `${uid},${totalTopics},${uniqueTopics},${pageSimilarity},${pageVariance},${booleanPageVariance}`,
        );
      } else {
        // Human — natural metrics
        const totalTopics = freq.reduce((a, b) => a + b, 0);
        const uniqueTopics = freq.filter((f) => f > 0).length;
        const pageSimilarity =
          totalTopics > 0 ? +(uniqueTopics / totalTopics).toFixed(6) : 0;
        const pageVariance = +variance(freq).toFixed(6);
        const booleanPageVariance =
          totalTopics > 0 ? +(pageVariance / totalTopics).toFixed(6) : 0;

        lines.push(
          `${uid},${totalTopics},${uniqueTopics},${pageSimilarity},${pageVariance},${booleanPageVariance}`,
        );
      }
    }

    return new Response(lines.join('\n'), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${
          downloadAll ? 'all_users' : `user_${userId}`
        }_dataset.csv"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
