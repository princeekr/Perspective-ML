import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Page URL generator (every visit is a unique URL) ─────────────────
const BASE_PATHS = [
  '/', '/wellness', '/travel', '/creativity', '/growth',
  '/about', '/contact', '/authors', '/style-guide', '/privacy', '/terms',
  '/article/001', '/article/002', '/article/003',
  '/article/W001', '/article/T001', '/article/G001',
];
const BLOCKED_ROUTES = ['/run-bot', '/bot'];

/**
 * Generate a sequence of FULLY UNIQUE page URLs across the entire bot run.
 * Each URL gets a unique query param so UNIQUE_TOPICS === TOTAL_TOPICS.
 * The base path is randomly picked for realistic variety.
 */
function generateUniquePageUrl(basePaths: string[], counter: number): string {
  const base = basePaths[Math.floor(Math.random() * basePaths.length)];
  return `${base}?sid=${counter}`;
}

// ── Intensity presets ──────────────────────────────────────────────────
interface Intensity {
  sessions: [number, number];
  pagesPerSession: [number, number];
  clicksPerPage: [number, number];
  scrollsPerPage: [number, number];
  mouseBatchesPerPage: [number, number];
  mousePositionsPerBatch: [number, number];
  repeatRatio: [number, number]; // min/max fraction of revisits (e.g. [0.05, 0.15])
}

const PRESETS: Record<string, Intensity> = {
  low: {
    sessions: [5, 10],
    pagesPerSession: [30, 45],
    clicksPerPage: [3, 8],
    scrollsPerPage: [2, 5],
    mouseBatchesPerPage: [1, 2],
    mousePositionsPerBatch: [8, 20],
    repeatRatio: [0.08, 0.15], // ~85-92% similarity
  },
  medium: {
    sessions: [10, 20],
    pagesPerSession: [40, 60],
    clicksPerPage: [5, 12],
    scrollsPerPage: [3, 7],
    mouseBatchesPerPage: [2, 3],
    mousePositionsPerBatch: [12, 30],
    repeatRatio: [0.05, 0.12], // ~88-95% similarity
  },
  high: {
    sessions: [20, 40],
    pagesPerSession: [50, 80],
    clicksPerPage: [6, 15],
    scrollsPerPage: [3, 8],
    mouseBatchesPerPage: [2, 4],
    mousePositionsPerBatch: [15, 40],
    repeatRatio: [0.05, 0.10], // ~90-95% similarity
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const genSessionId = () => `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function generateClicks(count: number) {
  const tags = ['button', 'a', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'img', 'nav', 'li', 'section', 'article', 'footer', 'header'];
  const classes = ['card', 'nav-link', 'btn', 'hero-section', 'article-card', 'cta-button', 'menu-item', 'category-link', 'read-more', 'subscribe-btn'];
  const ids = ['main-nav', 'hero-cta', 'footer-links', 'search-input', 'menu-toggle', 'newsletter-form', 'article-grid'];
  return Array.from({ length: count }, () => ({
    x: rand(50, 1450),
    y: rand(50, 950),
    element_tag: pick(tags),
    element_id: Math.random() > 0.5 ? pick(ids) : null,
    element_class: Math.random() > 0.3 ? pick(classes) : null,
  }));
}

function generateMousePositions(count: number) {
  const positions = [];
  let x = rand(100, 800), y = rand(100, 400);
  for (let i = 0; i < count; i++) {
    if (Math.random() > 0.7) { x = rand(0, 1400); y = rand(0, 900); }
    else { x += rand(-10, 10); y += rand(-7, 7); }
    x = Math.max(0, Math.min(1400, x));
    y = Math.max(0, Math.min(900, y));
    positions.push({ x, y, timestamp: Date.now() + i * 50 });
  }
  return positions;
}

function generateScroll() {
  const docH = rand(2000, 5000), vpH = 800;
  const scrollY = rand(0, docH - vpH);
  return {
    scroll_depth_percent: Math.min(100, Math.round((scrollY + vpH) / docH * 100)),
    scroll_y: scrollY, viewport_height: vpH, document_height: docH,
  };
}

// ── Session simulation with BATCH inserts ──────────────────────────────
async function simulateSession(
  db: any, userId: string, pages: string[], intensity: Intensity, deadline: number
): Promise<{ sessionId: string; visits: number; clicks: number; scrolls: number; mouse: number }> {
  const sessionId = genSessionId();
  const now = () => new Date().toISOString();

  await db.from('tracking_sessions').insert({
    session_id: sessionId, user_id: userId,
    user_agent: 'BotSimulator/3.0 (Automated Crawler)', last_activity_at: now(),
  });

  let totalVisits = 0, totalClicks = 0, totalScrolls = 0, totalMouse = 0;

  // Process pages in batches for speed
  const BATCH = 20;
  for (let i = 0; i < pages.length; i += BATCH) {
    if (Date.now() >= deadline) break;
    const batch = pages.slice(i, i + BATCH);

    // Batch page visits
    const visitRows = batch.map((page, j) => ({
      user_id: userId, session_id: sessionId, page_url: page,
      referrer: j > 0 ? batch[j - 1] : (i > 0 ? pages[i - 1] : null),
      timestamp: now(), time_spent_ms: rand(200, 2000),
    }));
    await db.from('page_visits').insert(visitRows);
    totalVisits += visitRows.length;

    if (Date.now() >= deadline) break;

    // Batch clicks for entire batch of pages
    const clickRows: any[] = [];
    for (const page of batch) {
      const clicks = generateClicks(rand(intensity.clicksPerPage[0], intensity.clicksPerPage[1]));
      for (const c of clicks) {
        clickRows.push({
          user_id: userId, session_id: sessionId, page_url: page,
          x_position: c.x, y_position: c.y,
          element_tag: c.element_tag, element_id: c.element_id,
          element_class: c.element_class, timestamp: now(),
        });
      }
    }
    if (clickRows.length > 0) {
      // Insert in sub-batches of 100
      for (let c = 0; c < clickRows.length; c += 100) {
        if (Date.now() >= deadline) break;
        await db.from('click_events').insert(clickRows.slice(c, c + 100));
      }
      totalClicks += clickRows.length;
    }

    if (Date.now() >= deadline) break;

    // Batch scrolls
    const scrollRows: any[] = [];
    for (const page of batch) {
      const count = rand(intensity.scrollsPerPage[0], intensity.scrollsPerPage[1]);
      for (let s = 0; s < count; s++) {
        scrollRows.push({
          user_id: userId, session_id: sessionId, page_url: page,
          ...generateScroll(), timestamp: now(),
        });
      }
    }
    if (scrollRows.length > 0) {
      for (let s = 0; s < scrollRows.length; s += 100) {
        if (Date.now() >= deadline) break;
        await db.from('scroll_events').insert(scrollRows.slice(s, s + 100));
      }
      totalScrolls += scrollRows.length;
    }

    if (Date.now() >= deadline) break;

    // Batch mouse events
    const mouseRows: any[] = [];
    for (const page of batch) {
      const batches = rand(intensity.mouseBatchesPerPage[0], intensity.mouseBatchesPerPage[1]);
      for (let m = 0; m < batches; m++) {
        mouseRows.push({
          user_id: userId, session_id: sessionId, page_url: page,
          positions: generateMousePositions(rand(intensity.mousePositionsPerBatch[0], intensity.mousePositionsPerBatch[1])),
          timestamp: now(),
        });
      }
    }
    if (mouseRows.length > 0) {
      for (let m = 0; m < mouseRows.length; m += 50) {
        if (Date.now() >= deadline) break;
        await db.from('mouse_events').insert(mouseRows.slice(m, m + 50));
      }
      totalMouse += mouseRows.length;
    }

    // Update session activity
    await db.from('tracking_sessions').update({ last_activity_at: now() }).eq('session_id', sessionId);
  }

  return { sessionId, visits: totalVisits, clicks: totalClicks, scrolls: totalScrolls, mouse: totalMouse };
}

// ── Main handler ───────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let intensityLevel = 'medium';
    try {
      const body = await req.json();
      if (body?.intensity && PRESETS[body.intensity]) {
        intensityLevel = body.intensity;
      }
    } catch { /* no body is fine, use default */ }

    const intensity = PRESETS[intensityLevel];
    const MAX_DURATION_MS = 18000;
    const deadline = Date.now() + MAX_DURATION_MS;

    // Create bot user
    const rid = Math.random().toString(36).substr(2, 8);
    const botEmail = `bot_${rid}@test.com`;
    const botPassword = `BotPass_${rid}_${Date.now()}!`;
    const botName = `Bot_${rid}`;

    console.log(`[${intensityLevel}] Creating bot: ${botName}`);

    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email: botEmail, password: botPassword, email_confirm: true,
      user_metadata: { name: botName, is_bot: true },
    });
    if (createError) throw new Error(`Failed to create bot user: ${createError.message}`);
    const botUserId = newUser.user!.id;

    await db.from('profiles').upsert(
      { user_id: botUserId, name: botName, email: botEmail },
      { onConflict: 'user_id' }
    );

    const numSessions = rand(intensity.sessions[0], intensity.sessions[1]);
    console.log(`Bot ${botName} will create ${numSessions} sessions [${intensityLevel}]`);

    let totalVisits = 0, totalClicks = 0, totalScrolls = 0, totalMouse = 0;
    const sessionIds: string[] = [];
    let globalPageCounter = 0;
    const allGeneratedUrls: string[] = []; // track all URLs for controlled repeats

    for (let s = 0; s < numSessions; s++) {
      if (Date.now() >= deadline) break;

      const pageCount = rand(intensity.pagesPerSession[0], intensity.pagesPerSession[1]);
      // Determine how many repeats this session will have (~5-15% of pages)
      const repeatFraction = intensity.repeatRatio[0] + Math.random() * (intensity.repeatRatio[1] - intensity.repeatRatio[0]);
      const repeatCount = Math.max(1, Math.floor(pageCount * repeatFraction));
      const uniqueCount = pageCount - repeatCount;

      const pages: string[] = [];
      // Generate unique pages
      for (let p = 0; p < uniqueCount; p++) {
        globalPageCounter++;
        const url = generateUniquePageUrl(BASE_PATHS, globalPageCounter);
        pages.push(url);
        allGeneratedUrls.push(url);
      }
      // Add controlled repeats from previously generated URLs
      for (let r = 0; r < repeatCount; r++) {
        if (allGeneratedUrls.length > 0) {
          pages.push(pick(allGeneratedUrls));
        } else {
          globalPageCounter++;
          const url = generateUniquePageUrl(BASE_PATHS, globalPageCounter);
          pages.push(url);
          allGeneratedUrls.push(url);
        }
      }
      // Shuffle to mix repeats with unique pages naturally
      pages.sort(() => Math.random() - 0.5);

      console.log(`Session ${s + 1}/${numSessions}: ${pageCount} pages (${uniqueCount} unique, ${repeatCount} repeats)`);
      const result = await simulateSession(db, botUserId, pages, intensity, deadline);
      sessionIds.push(result.sessionId);
      totalVisits += result.visits;
      totalClicks += result.clicks;
      totalScrolls += result.scrolls;
      totalMouse += result.mouse;
    }

    console.log(`Bot ${botName} done: ${sessionIds.length} sessions, ${totalVisits} visits, ${totalClicks} clicks`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Bot simulation completed',
      intensity: intensityLevel,
      bot_name: botName,
      user_id: botUserId,
      session_ids: sessionIds,
      total_sessions: sessionIds.length,
      total_page_visits: totalVisits,
      total_clicks: totalClicks,
      total_scrolls: totalScrolls,
      total_mouse_batches: totalMouse,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Bot simulation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Bot simulation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
