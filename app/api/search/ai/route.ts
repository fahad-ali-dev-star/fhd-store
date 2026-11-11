import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/api/errors";
import { matchCatalogProducts } from "@/lib/ai/catalog-matcher";
import { VisualAnalysisResult } from "@/lib/ai/fashion-taxonomy";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const cleanQuery = query.trim();
    const supabase = await createClient();

    // 1. Fetch active products with primary images
    const { data: rawProducts } = await supabase
      .from("products")
      .select("id, name, slug, description, base_price, category, is_active")
      .eq("is_active", true);

    const activeProducts = (rawProducts || []) as any[];

    if (activeProducts.length > 0) {
      const productIds = activeProducts.map((p) => p.id);
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

      activeProducts.forEach((p) => {
        p.image_url = imageMap.get(p.id) || null;
      });
    }

    // 2. Synthesize query into visual analysis attributes for intelligent multi-factor matching
    const qLower = cleanQuery.toLowerCase();
    let apparelType: "shirt" | "tshirt" | "polo" | "jacket" | "overshirt" = "shirt";
    if (qLower.includes("polo")) apparelType = "polo";
    else if (qLower.includes("tee") || qLower.includes("t-shirt") || qLower.includes("crewneck")) apparelType = "tshirt";
    else if (qLower.includes("jacket") || qLower.includes("leather") || qLower.includes("biker")) apparelType = "jacket";

    let subCategory = "casual-shirt";
    if (qLower.includes("denim")) subCategory = "denim-shirt";
    else if (qLower.includes("linen")) subCategory = "linen-shirt";
    else if (qLower.includes("oxford")) subCategory = "oxford-shirt";
    else if (qLower.includes("flannel") || qLower.includes("plaid")) subCategory = "flannel-shirt";
    else if (qLower.includes("hawaiian") || qLower.includes("floral")) subCategory = "hawaiian-shirt";
    else if (qLower.includes("polo")) subCategory = "polo-shirt";
    else if (qLower.includes("graphic")) subCategory = "graphic-tee";
    else if (qLower.includes("leather")) subCategory = "leather-jacket";

    let primaryColor = "Classic";
    let colorHex = "#1e3a8a";
    if (qLower.includes("white")) { primaryColor = "Pure White"; colorHex = "#f8fafc"; }
    else if (qLower.includes("black")) { primaryColor = "Jet Black"; colorHex = "#111827"; }
    else if (qLower.includes("charcoal") || qLower.includes("grey") || qLower.includes("gray")) { primaryColor = "Charcoal Grey"; colorHex = "#374151"; }
    else if (qLower.includes("indigo") || qLower.includes("denim")) { primaryColor = "Indigo Blue"; colorHex = "#1e3a8a"; }
    else if (qLower.includes("navy") || qLower.includes("blue")) { primaryColor = "Navy Blue"; colorHex = "#1e3a8a"; }
    else if (qLower.includes("floral") || qLower.includes("sunset")) { primaryColor = "Tropical Floral"; colorHex = "#ea580c"; }
    else if (qLower.includes("beige") || qLower.includes("linen") || qLower.includes("sand")) { primaryColor = "Sand Beige"; colorHex = "#d4b996"; }

    let fabric = "cotton";
    if (qLower.includes("denim")) fabric = "denim";
    else if (qLower.includes("linen")) fabric = "linen";
    else if (qLower.includes("oxford")) fabric = "oxford cotton";
    else if (qLower.includes("pique") || qLower.includes("piqué")) fabric = "piqué mesh";
    else if (qLower.includes("flannel")) fabric = "flannel";
    else if (qLower.includes("leather")) fabric = "leather";
    else if (qLower.includes("rayon")) fabric = "rayon";

    const syntheticAnalysis: VisualAnalysisResult = {
      query: cleanQuery,
      apparel_type: apparelType,
      sub_category: subCategory,
      primary_color: primaryColor,
      color_hex: colorHex,
      secondary_colors: [],
      pattern: qLower.includes("floral") ? "floral" : qLower.includes("plaid") ? "plaid" : qLower.includes("striped") ? "striped" : "solid",
      fabric,
      collar_style: apparelType === "polo" ? "polo collar" : apparelType === "tshirt" ? "crewneck" : "button-down",
      sleeve_length: "long-sleeve",
      vibe: "smart-casual",
      analysis_summary: `Natural language search for ${cleanQuery}.`,
      confidence: 0.95,
      tags: cleanQuery.split(/\s+/).filter((w) => w.length > 2),
      engine: "vision-cv",
    };

    const matchedProducts = matchCatalogProducts(activeProducts, syntheticAnalysis, 8);

    return NextResponse.json({
      success: true,
      query: cleanQuery,
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
