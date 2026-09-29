import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { generateTextEmbedding } from "@/lib/ai/embeddings";
import { logServerError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  const { authorized } = await requireAdmin();
  if (!authorized && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const forceAll = !!body.forceAll;

    // Fetch products
    let query = supabase
      .from("products")
      .select("id, name, slug, description, category, is_active");

    if (!forceAll) {
      // Only select products where embedding is missing
      query = query.is("embedding", null);
    }

    const { data: products, error } = await query;

    if (error) {
      logServerError("Failed to fetch products for embedding sync", error);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All products already have vector embeddings.",
        syncedCount: 0,
        total: 0,
      });
    }

    let syncedCount = 0;
    const failures: string[] = [];

    for (const product of products) {
      const textToEmbed = [
        product.name,
        product.category ? `Category: ${product.category}` : "",
        product.description ? `Description: ${product.description}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      const embedding = await generateTextEmbedding(textToEmbed);

      if (embedding) {
        const { error: updateError } = await (supabase.from("products") as any)
          .update({ embedding: embedding as any })
          .eq("id", product.id);

        if (updateError) {
          logServerError(`Failed to update embedding for product ${product.id}`, updateError);
          failures.push(product.name);
        } else {
          syncedCount++;
        }
      } else {
        failures.push(product.name);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized embeddings for ${syncedCount} of ${products.length} products.`,
      syncedCount,
      total: products.length,
      failures,
    });
  } catch (err) {
    logServerError("Embedding sync route failed", err);
    return NextResponse.json({ error: "Embedding sync failed" }, { status: 500 });
  }
}
