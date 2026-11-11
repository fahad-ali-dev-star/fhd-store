import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/api/errors";
import {
  VisualAnalysisResult,
  ClientVisualTelemetry,
} from "@/lib/ai/fashion-taxonomy";
import { analyzeImageLocally } from "@/lib/ai/vision-analyzer";
import { matchCatalogProducts } from "@/lib/ai/catalog-matcher";

// Prioritized Gemini Vision models (current 3.8 down through 1.5 flash)
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const PROMPT = `You are a world-class fashion director and computer vision visual search engine for a luxury apparel and shirt store.
Analyze the provided image of a garment or outfit with precision.

Identify and return pure valid JSON with the following fields:
{
  "query": "Precise 3-6 word fashion e-commerce search title (e.g. 'Vintage indigo denim shirt', 'Classic charcoal pique polo shirt', 'White heavy crewneck cotton tee', 'Tropical floral Hawaiian resort shirt')",
  "apparel_type": "One of: 'shirt', 'tshirt', 'polo', 'jacket', 'overshirt'",
  "sub_category": "One of: 'denim-shirt', 'oxford-shirt', 'linen-shirt', 'flannel-shirt', 'hawaiian-shirt', 'polo-shirt', 'graphic-tee', 'plain-tee', 'striped-tee', 'leather-jacket', 'casual-shirt'",
  "primary_color": "Dominant color name (e.g. 'Indigo Blue', 'Charcoal Grey', 'Pure White', 'Jet Black', 'Sand Beige', 'Tropical Sunset', 'Olive Green')",
  "color_hex": "6-digit hex color code matching the primary color (e.g. '#1e3a8a', '#374151', '#f8fafc', '#111827', '#d4b996')",
  "secondary_colors": ["Optional accent or secondary colors"],
  "pattern": "One of: 'solid', 'striped', 'plaid', 'floral', 'graphic', 'acid-wash', 'textured-weave', 'colorblock'",
  "fabric": "Estimated fabric (e.g. 'denim', 'linen', 'oxford cotton', 'pique cotton', 'combed cotton', 'flannel', 'leather', 'rayon')",
  "collar_style": "One of: 'button-down', 'polo collar', 'crewneck', 'spread collar', 'camp collar', 'biker lapel', 'mandarin'",
  "sleeve_length": "One of: 'short-sleeve', 'long-sleeve', 'sleeveless'",
  "vibe": "One of: 'smart-casual', 'streetwear', 'business-formal', 'summer-resort', 'vintage-rugged', 'minimalist'",
  "analysis_summary": "A professional 1-2 sentence fashion stylist description detailing the garment's texture, cut, collar, and silhouette.",
  "confidence": 0.95,
  "tags": ["4 to 6 relevant fashion keywords (e.g. 'denim', 'indigo', 'western', 'cotton', 'vintage')"]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, clientTelemetry } = body as {
      image?: string;
      clientTelemetry?: ClientVisualTelemetry;
    };

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

    let analysisResult: VisualAnalysisResult | null = null;
    let geminiApiIssue: string | null = null;

    // 1. Attempt Gemini Vision Multimodal Analysis
    if (apiKey && base64Data) {
      for (const model of GEMINI_MODELS) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(7000),
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: PROMPT },
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
                temperature: 0.1,
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
              if (parsed.query && parsed.primary_color) {
                analysisResult = {
                  query: parsed.query,
                  apparel_type: parsed.apparel_type || "shirt",
                  sub_category: parsed.sub_category || "casual-shirt",
                  primary_color: parsed.primary_color,
                  color_hex: parsed.color_hex || "#1e3a8a",
                  secondary_colors: Array.isArray(parsed.secondary_colors) ? parsed.secondary_colors : [],
                  pattern: parsed.pattern || "solid",
                  fabric: parsed.fabric || "cotton",
                  collar_style: parsed.collar_style || "button-down",
                  sleeve_length: parsed.sleeve_length || "long-sleeve",
                  vibe: parsed.vibe || "smart-casual",
                  analysis_summary: parsed.analysis_summary || `Detected ${parsed.query} with authentic styling and tailored silhouette.`,
                  confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
                  tags: Array.isArray(parsed.tags) ? parsed.tags : [parsed.apparel_type || "shirt"],
                  engine: "gemini-vision",
                };
                break;
              }
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${res.status}`;
            geminiApiIssue = errMsg;
            // If project free tier unavailable (403), no need to retry every other model
            if (res.status === 403 && errMsg.includes("free tier is not available")) {
              break;
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          geminiApiIssue = msg;
        }
      }
    }

    // 2. High-Precision Computer Vision & Palette Fallback Engine
    if (!analysisResult && base64Data) {
      const notice = geminiApiIssue?.includes("free tier is not available")
        ? "Gemini API requires billing enabled at aistudio.google.com/billing. Visual search utilized High-Precision Color & Attribute Vision Engine."
        : undefined;

      analysisResult = analyzeImageLocally(base64Data, clientTelemetry, notice);
    }

    if (!analysisResult) {
      return NextResponse.json({ error: "Failed to analyze image" }, { status: 422 });
    }

    // 3. Query Database Catalog Products & Attach Primary Images
    const supabase = await createClient();
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

    // 4. Run Multi-Factor Weighted Catalog Matching Algorithm
    const matchedProducts = matchCatalogProducts(activeProducts, analysisResult, 8);

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      results: matchedProducts,
    });
  } catch (err: unknown) {
    logServerError("Visual search route exception", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Visual search failed" },
      { status: 500 }
    );
  }
}
