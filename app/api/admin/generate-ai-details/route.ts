import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/admin";
import { logServerError } from "@/lib/api/errors";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
];

// Smart Fashion Copywriting Engine for Pakistani e-commerce clothing
function generateSmartFashionDetails(title?: string, category?: string) {
  const cleanTitle = (title || "").trim();
  const lower = cleanTitle.toLowerCase();

  let detectedCategory = "casual-shirts";
  let adjective = "Premium";
  let fabric = "100% high-grade combed cotton";
  let styleName = cleanTitle || "Classic Oxford Cotton Shirt";

  if (lower.includes("oxford") || lower.includes("button-down") || lower.includes("formal")) {
    detectedCategory = "oxford-shirts";
    adjective = "Tailored";
    fabric = "fine-spun Oxford weave cotton";
  } else if (lower.includes("polo") || lower.includes("collar")) {
    detectedCategory = "polos";
    adjective = "Sporty & Refined";
    fabric = "breathable pique cotton knit";
  } else if (lower.includes("tee") || lower.includes("t-shirt") || lower.includes("crewneck")) {
    detectedCategory = lower.includes("oversized") ? "oversized-tees" : "t-shirts";
    adjective = "Effortless";
    fabric = "heavyweight 240 GSM combed cotton";
  } else if (lower.includes("linen")) {
    detectedCategory = "linen-shirts";
    adjective = "Breezy";
    fabric = "organic linen-cotton blend";
  } else if (lower.includes("denim") || lower.includes("jean")) {
    detectedCategory = "denim-shirts";
    adjective = "Rugged";
    fabric = "authentic indigo-dyed washed denim";
  }

  if (!cleanTitle) {
    const titles = [
      "Classic Tailored Oxford Shirt",
      "Vintage Washed Cotton Casual Shirt",
      "Modern Minimalist Slim-Fit Shirt",
      "Relaxed Everyday Resort Collar Shirt",
      "Premium Textured Long-Sleeve Shirt",
    ];
    styleName = titles[Math.floor(Math.random() * titles.length)];
  }

  const descriptions = [
    `Crafted from ${fabric}, this shirt delivers unmatched breathable comfort and a clean silhouette. Features precision reinforced stitching and durable pearlized buttons, making it an effortless staple for both workday elegance and weekend outings.`,
    `Engineered with ${adjective.toLowerCase()} ${fabric} for maximum softness and structural drape. Tailored to provide effortless ease of movement whether styled tucked in for smart occasions or worn relaxed over your favorite chinos.`,
    `Elevate your daily wardrobe with this masterfully stitched piece in ${fabric}. Designed with a contemporary cut, reinforced collar, and resilient pre-shrunk finish for long-lasting color and shape retention.`,
  ];

  const selectedDescription = descriptions[Math.floor(Math.random() * descriptions.length)];

  return {
    name: styleName,
    description: selectedDescription,
    category: category && category !== "all" ? category : detectedCategory,
  };
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser();
  // Allow if user is authenticated or in dev mode
  if (!user && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { imageUrl, currentName, currentCategory } = body;
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. If Gemini API key is available, attempt live generation
  if (apiKey) {
    let base64Data: string | null = null;
    let mimeType = "image/jpeg";

    if (imageUrl && typeof imageUrl === "string") {
      if (imageUrl.startsWith("data:")) {
        const parts = imageUrl.split(",");
        const matches = imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        if (matches && matches[1]) {
          mimeType = matches[1];
        }
        base64Data = parts[1];
      } else {
        try {
          const imgRes = await fetch(imageUrl, {
            headers: { "User-Agent": "FHDStore/1.0" },
            signal: AbortSignal.timeout(5000),
          });
          if (imgRes.ok) {
            const ct = imgRes.headers.get("content-type");
            if (ct && ct.startsWith("image/")) {
              mimeType = ct.split(";")[0].trim();
            }
            const buf = await imgRes.arrayBuffer();
            base64Data = Buffer.from(buf).toString("base64");
          }
        } catch {
          // Continue without image data
        }
      }
    }

    const prompt = `You are a fashion copywriter for "FHD Store", a luxury men's clothing store in Pakistan.
Generate details for this shirt product ${currentName ? `(Title: "${currentName}")` : ""}.

Return ONLY a JSON object with:
- "name": Catchy, elegant product title
- "description": 2-3 sentences highlighting combed cotton fabric quality, fit, and styling versatility
- "category": One slug from: "oxford-shirts", "casual-shirts", "formal-shirts", "polos", "t-shirts", "oversized-tees", "denim-shirts", "linen-shirts"

Format: pure JSON without markdown code fences.`;

    const parts: any[] = [{ text: prompt }];
    if (base64Data) {
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    for (const model of GEMINI_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
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
            return NextResponse.json({
              success: true,
              source: "gemini",
              data: {
                name: parsed.name || currentName || "Premium Cotton Shirt",
                description: parsed.description || "",
                category: parsed.category || currentCategory || "casual-shirts",
              },
            });
          }
        }
      } catch {
        // Continue to fallback
      }
    }
  }

  // 2. Guaranteed Smart Fashion Copywriting Fallback Engine (Zero downtime)
  const smartDetails = generateSmartFashionDetails(currentName, currentCategory);

  return NextResponse.json({
    success: true,
    source: "smart-engine",
    data: smartDetails,
  });
}
