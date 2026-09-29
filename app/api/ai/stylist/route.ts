import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/api/errors";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content || "";

    const supabase = await createClient();

    // 1. Fetch active products to ground the stylist in live inventory
    const { data: rawProducts } = await (supabase as any)
      .from("products")
      .select("id, name, slug, description, base_price, category, product_images(url), product_variants(size, color, stock_qty)")
      .eq("is_active", true)
      .limit(30);

    const products: any[] = rawProducts || [];

    const catalogContext = products
      .map((p: any) => {
        const sizes = Array.from(new Set((p.product_variants || []).filter((v: any) => v.stock_qty > 0).map((v: any) => v.size))).join(", ");
        return `- "${p.name}" (Slug: ${p.slug}, Category: ${p.category || "Casual"}, Price: Rs ${p.base_price}, Sizes in stock: ${sizes || "Sold out"}): ${p.description || "Premium cotton shirt"}`;
      })
      .join("\n");

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const systemInstruction = `You are a high-end personal fashion stylist and concierge for "FHD Store", a premium shirt & apparel brand in Pakistan.
Your goal is to help customers find the perfect shirt for their style, occasion, body fit, and budget.

Live Store Catalog:
${catalogContext}

Instructions:
1. Always be polite, stylish, concise, and enthusiastic about fashion.
2. Ground your recommendations strictly in the shirts available in the catalog above.
3. When recommending shirts, mention their exact name, price in Rs, and why it fits the customer's request.
4. If asked what to wear with a shirt (pants, shoes, accessories), provide tasteful advice (e.g. "pair with tailored beige chinos and white leather sneakers").
5. Return your response in JSON format with:
   - "reply": The friendly stylist markdown response.
   - "recommendedSlugs": An array of up to 3 product slugs mentioned from the catalog.

Format:
{
  "reply": "...",
  "recommendedSlugs": ["slug-1", "slug-2"]
}`;

      const conversationHistory = messages.map((m: ChatMessage) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      for (const model of GEMINI_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              contents: conversationHistory,
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              let clean = text.trim();
              if (clean.startsWith("```")) {
                clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
              }
              const parsed = JSON.parse(clean);

              // Enrich recommended products
              let recommendedProducts: any[] = [];
              if (Array.isArray(parsed.recommendedSlugs) && parsed.recommendedSlugs.length > 0 && products) {
                recommendedProducts = products
                  .filter((p) => parsed.recommendedSlugs.includes(p.slug))
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    base_price: p.base_price,
                    category: p.category,
                    image_url: p.product_images?.[0]?.url || null,
                  }));
              }

              return NextResponse.json({
                success: true,
                reply: parsed.reply,
                recommendedProducts,
              });
            }
          }
        } catch (err) {
          logServerError(`Stylist Gemini call failed with model ${model}`, err);
        }
      }
    }

    // Heuristic Fallback Stylist (Works offline & without API key)
    const lower = userPrompt.toLowerCase();
    let matchedSlugs: string[] = [];
    let advice = "I'd love to help you find the right look! Here are some of our top picks crafted from premium combed cotton that offer great versatility:";

    if (lower.includes("formal") || lower.includes("office") || lower.includes("interview") || lower.includes("wedding")) {
      advice = "For a polished formal or evening look, a structured Oxford button-down or crisp dress shirt is unbeatable. Pair it with tapered trousers and classic loafers:";
      matchedSlugs = (products || []).filter((p) => p.category?.includes("oxford") || p.category?.includes("formal") || p.name.toLowerCase().includes("oxford")).map((p) => p.slug);
    } else if (lower.includes("summer") || lower.includes("linen") || lower.includes("hot") || lower.includes("beach")) {
      advice = "For warm weather, breathability is key. Our airy linen blends and resort collar shirts allow maximum airflow while maintaining an effortless drape. Style with light chinos or tailored shorts:";
      matchedSlugs = (products || []).filter((p) => p.category?.includes("linen") || p.name.toLowerCase().includes("linen")).map((p) => p.slug);
    } else if (lower.includes("casual") || lower.includes("weekend") || lower.includes("tee") || lower.includes("t-shirt")) {
      advice = "For relaxed weekend vibes, our heavyweight combed cotton tees and casual button-ups provide superior comfort and a modern silhouette:";
      matchedSlugs = (products || []).filter((p) => p.category?.includes("casual") || p.category?.includes("tee") || p.category?.includes("polo")).map((p) => p.slug);
    }

    const fallbackProducts = (products || [])
      .filter((p) => (matchedSlugs.length > 0 ? matchedSlugs.includes(p.slug) : true))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        base_price: p.base_price,
        category: p.category,
        image_url: p.product_images?.[0]?.url || null,
      }));

    return NextResponse.json({
      success: true,
      reply: advice,
      recommendedProducts: fallbackProducts,
    });
  } catch (err) {
    logServerError("Stylist route error", err);
    return NextResponse.json({ error: "Failed to generate styling advice" }, { status: 500 });
  }
}
