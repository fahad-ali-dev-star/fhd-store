import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTextEmbedding } from "@/lib/ai/embeddings";
import { logServerError } from "@/lib/api/errors";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
];

interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  category: string | null;
  similarity?: number;
  image_url?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let base64Data: string | null = null;
    let mimeType = "image/jpeg";

    if (image.startsWith("data:")) {
      const parts = image.split(",");
      const matches = image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (matches && matches[1]) {
        mimeType = matches[1];
      }
      base64Data = parts[1];
    } else {
      base64Data = image;
    }

    let detectedQuery = "casual shirt";
    let detectedCategory = "casual-shirts";
    let detectedTags: string[] = [];

    if (apiKey && base64Data) {
      const prompt = `You are an AI visual search engine for a premium apparel and shirt store.
Analyze the provided image of a shirt or clothing outfit.
Extract:
1. "query": A concise 3-6 word search phrase describing the shirt (e.g. "navy blue slim fit oxford shirt", "vintage white graphic tee", "linen resort collar shirt").
2. "category": Most suitable category from: "oxford-shirts", "casual-shirts", "formal-shirts", "polos", "t-shirts", "oversized-tees", "denim-shirts", "linen-shirts".
3. "tags": 3 to 5 style/color/fabric keywords.

Return ONLY pure valid JSON in this format:
{
  "query": "...",
  "category": "...",
  "tags": ["..."]
}`;

      for (const model of GEMINI_MODELS) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          });

          if (res.ok) {
            const resData = await res.json();
            const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              let clean = text.trim();
              if (clean.startsWith("```")) {
                clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
              }
              const parsed = JSON.parse(clean);
              if (parsed.query) detectedQuery = parsed.query;
              if (parsed.category) detectedCategory = parsed.category;
              if (Array.isArray(parsed.tags)) detectedTags = parsed.tags;
              break;
            }
          }
        } catch (err) {
          logServerError(`Visual search Gemini call failed with model ${model}`, err);
        }
      }
    }

    const supabase = await createClient();
    let matchedProducts: ProductRecord[] = [];

    // 1. Try vector embedding search with detectedQuery
    const embedding = await generateTextEmbedding(detectedQuery);
    if (embedding) {
      try {
        const { data: vectorMatches, error: rpcError } = await (supabase as any).rpc(
          "match_products",
          {
            query_embedding: embedding,
            match_threshold: 0.15,
            match_count: 8,
          }
        );

        if (!rpcError && vectorMatches && Array.isArray(vectorMatches) && vectorMatches.length > 0) {
          matchedProducts = vectorMatches as ProductRecord[];
        }
      } catch (rpcErr) {
        logServerError("Visual vector match failed, falling back to category/text query", rpcErr);
      }
    }

    // 2. Fallback text / category search
    if (matchedProducts.length === 0) {
      const searchTerms = detectedQuery.split(/\s+/).filter(Boolean);
      let dbQuery = supabase
        .from("products")
        .select("id, name, slug, description, base_price, category")
        .eq("is_active", true)
        .limit(8);

      if (detectedCategory) {
        dbQuery = dbQuery.or(`category.eq.${detectedCategory},name.ilike.%${searchTerms[0] || "shirt"}%`);
      }

      const { data: textMatches } = await dbQuery;
      if (textMatches && Array.isArray(textMatches)) {
        matchedProducts = (textMatches as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          base_price: Number(p.base_price),
          category: p.category,
          similarity: 0.85,
        }));
      }
    }

    // 3. Attach primary product images
    if (matchedProducts.length > 0) {
      const productIds = matchedProducts.map((p) => p.id);
      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, url")
        .in("product_id", productIds)
        .order("position", { ascending: true });

      const imageMap = new Map<string, string>();
      if (images) {
        images.forEach((img: any) => {
          if (!imageMap.has(img.product_id)) {
            imageMap.set(img.product_id, img.url);
          }
        });
      }

      matchedProducts = matchedProducts.map((p) => ({
        ...p,
        image_url: imageMap.get(p.id) || null,
      }));
    }

    return NextResponse.json({
      success: true,
      analysis: {
        query: detectedQuery,
        category: detectedCategory,
        tags: detectedTags,
      },
      results: matchedProducts,
    });
  } catch (err: unknown) {
    logServerError("Visual search route failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Visual search failed" },
      { status: 500 }
    );
  }
}
