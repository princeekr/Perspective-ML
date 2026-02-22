const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Features {
  total_topics: number;
  unique_topics: number;
  page_similarity: number;
  page_variance: number;
  boolean_page_variance: number;
}

interface PredictRequest {
  userId: string;
  features: Features;
}

/**
 * Mock prediction logic — replace this function with a real ML model call later.
 * 
 * Current heuristic:
 *  - Bots tend to have very high page_similarity (visiting many unique pages per event)
 *    OR extremely low variance (hitting the same page repeatedly in robotic fashion).
 *  - Confidence is derived from distance from decision boundary.
 */
function mockPredict(features: Features): { prediction: 'bot' | 'human'; confidence: number } {
  const { page_similarity, page_variance, boolean_page_variance, unique_topics, total_topics } = features;

  // New bot signals based on inflated metrics:
  // Bots: PAGE_SIMILARITY > 3, PAGE_VARIANCE > 30, UNIQUE_TOPICS >> TOTAL_TOPICS
  // Humans: PAGE_SIMILARITY ≈ 1, PAGE_VARIANCE low, UNIQUE ≈ TOTAL
  let botScore = 0;

  if (page_similarity > 2.5) botScore += 0.35;       // inflated unique/total ratio
  if (page_variance > 25) botScore += 0.25;           // high variance
  if (boolean_page_variance > 0.1) botScore += 0.2;   // high boolean variance
  if (unique_topics > total_topics * 2) botScore += 0.2; // unique far exceeds total

  const isBot = botScore >= 0.5;
  const raw = isBot ? 0.5 + botScore * 0.5 : 1 - botScore * 0.8;
  const confidence = Math.min(0.99, Math.max(0.55, parseFloat(raw.toFixed(2))));

  return { prediction: isBot ? 'bot' : 'human', confidence };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: PredictRequest = await req.json();

    if (!body.userId || !body.features) {
      return new Response(JSON.stringify({ error: 'Missing userId or features' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prediction, confidence } = mockPredict(body.features);

    return new Response(
      JSON.stringify({ prediction, confidence, userId: body.userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
