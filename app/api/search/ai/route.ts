import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/api/errors";

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

interface ImageRecord {
  product_id: string;
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const supabase = await createClient();

    let matchedProducts: ProductRecord[] = [];

    // 1. Vector embedding search via Gemini text-embedding-004
    try {
      const { generateTextEmbedding } = await import("@/lib/ai/embeddings");
      const queryEmbedding = await generateTextEmbedding(query.trim());

      if (queryEmbedding && Array.isArray(queryEmbedding)) {
        // Perform pgvector cosine similarity search in Supabase
        const { data: vectorMatches, error: rpcError } = await (supabase as any).rpc(
          "match_products",
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.15,
            match_count: 8,
          }
        );

        if (!rpcError && vectorMatches && Array.isArray(vectorMatches) && vectorMatches.length > 0) {
          matchedProducts = vectorMatches as ProductRecord[];
        }
      }
    } catch (embeddingErr) {
      logServerError("Gemini vector embedding search failed, falling back to text search", embeddingErr);
    }

    // Fallback: If no vector matches found (or pgvector SQL not executed yet), run smart ILIKE text search
    if (matchedProducts.length === 0) {
      const searchTerms = query.trim().split(/\s+/).filter(Boolean);
      let dbQuery = supabase
        .from("products")
        .select("id, name, slug, description, base_price, category")
        .eq("is_active", true)
        .limit(8);

      if (searchTerms.length > 0) {
        const ilikePattern = `%${searchTerms.join("%")}%`;
        dbQuery = dbQuery.or(
          `name.ilike.${ilikePattern},description.ilike.${ilikePattern},category.ilike.${ilikePattern}`
        );
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

    // Fetch primary images for matched products
    if (matchedProducts.length > 0) {
      const productIds = matchedProducts.map((p) => p.id);
      const { data: images } = await supabase
        .from("product_images")
        .select("product_id, url")
        .in("product_id", productIds)
        .order("position", { ascending: true });

      const imageMap = new Map<string, string>();
      if (images) {
        (images as ImageRecord[]).forEach((img) => {
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
      query,
      results: matchedProducts,
    });
  } catch (err: unknown) {
    logServerError("AI search request failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
