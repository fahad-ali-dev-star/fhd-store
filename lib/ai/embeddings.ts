import { logServerError } from "@/lib/api/errors";

export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text || !text.trim()) {
    return null;
  }

  const cleanText = text.trim().slice(0, 2048);

  const embeddingModels = ["text-embedding-004", "embedding-001"];

  for (const model of embeddingModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text: cleanText }],
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const values = data?.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      }
    } catch (err) {
      logServerError(`Embedding failed for model ${model}`, err);
    }
  }

  return null;
}
