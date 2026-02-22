/**
 * Sends behavioral features to the FastAPI bot-detection backend.
 * @param {Object} data - Feature values from Supabase
 * @returns {Promise<{prediction: "bot"|"human", confidence: number}>}
 */
export async function getPrediction(data) {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) throw new Error("VITE_API_URL is not set");

  const res = await fetch(`${apiUrl}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }

  return res.json();
}
