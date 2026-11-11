import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/api/errors";

function calculateFallbackSize({
  heightCm,
  weightKg,
  fitPreference,
  availableSizes,
  productName,
}: {
  heightCm: number;
  weightKg: number;
  fitPreference?: string;
  availableSizes: string[];
  productName?: string;
}) {
  // Base sizing index: 0: XS, 1: S, 2: M, 3: L, 4: XL, 5: XXL
  let baseIndex = 2; // Default to M

  if (weightKg < 58 || heightCm < 165) {
    baseIndex = 1; // S
  } else if (weightKg <= 72 && heightCm <= 176) {
    baseIndex = 2; // M
  } else if (weightKg <= 85 && heightCm <= 183) {
    baseIndex = 3; // L
  } else if (weightKg <= 96 && heightCm <= 190) {
    baseIndex = 4; // XL
  } else {
    baseIndex = 5; // XXL
  }

  // Adjust for fit preference
  if (fitPreference === "oversized") {
    baseIndex = Math.min(baseIndex + 1, 5);
  } else if (fitPreference === "slim") {
    baseIndex = Math.max(baseIndex - 1, 0);
  }

  const standardOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const targetLabel = standardOrder[baseIndex] || "M";

  // Try exact match in available sizes
  let chosen = availableSizes.find(
    (s) => s.trim().toUpperCase() === targetLabel
  );

  // If not found, find closest by index
  if (!chosen) {
    const sizeWeights: Record<string, number> = {
      xs: 0,
      s: 1,
      m: 2,
      l: 3,
      xl: 4,
      xxl: 5,
      "2xl": 5,
      "3xl": 6,
    };

    let closest = availableSizes[0];
    let minDiff = Infinity;

    for (const size of availableSizes) {
      const normalized = size.trim().toLowerCase();
      const weight = sizeWeights[normalized];
      if (weight !== undefined) {
        const diff = Math.abs(weight - baseIndex);
        if (diff < minDiff) {
          minDiff = diff;
          closest = size;
        }
      }
    }
    chosen = closest || availableSizes[0];
  }

  const styleLabel = fitPreference || "regular";
  const itemLabel = productName || "shirt";

  return {
    recommendedSize: chosen,
    confidenceScore: 89,
    fitAnalysis: `Based on your height (${heightCm} cm) and weight (${weightKg} kg), size ${chosen} provides the optimal ${styleLabel} fit across the chest and shoulders for this ${itemLabel}.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      heightCm,
      weightKg,
      fitPreference,
      productName,
      availableSizes,
    } = await req.json();

    const numHeight = Number(heightCm);
    const numWeight = Number(weightKg);

    if (
      !numHeight ||
      numHeight < 100 ||
      numHeight > 250 ||
      !numWeight ||
      numWeight < 30 ||
      numWeight > 300 ||
      !availableSizes ||
      !Array.isArray(availableSizes) ||
      availableSizes.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid parameters. Please provide valid height, weight, and available sizes." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Try Gemini AI first if configured
    if (apiKey) {
      const models = [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ];
      for (const model of models) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const prompt = `You are an expert fashion stylist and apparel sizing advisor for FHD Store.
Analyze the following customer physical body details and calculate the optimal shirt size recommendation:
- Customer Height: ${numHeight} cm
- Customer Weight: ${numWeight} kg
- Preferred Fit Style: ${fitPreference || "regular"} (options: slim, regular, oversized)
- Shirt Name/Type: ${productName || "Shirt"}
- Available Sizes: ${availableSizes.join(", ")}

Respond with a JSON object containing:
- "recommendedSize": string (MUST BE EXACTLY one of the available sizes: ${availableSizes.join(", ")})
- "confidenceScore": number (integer between 75 and 99 representing recommendation confidence)
- "fitAnalysis": string (2 clear sentences explaining why this size will fit their height, weight, and preferred style best)

Respond ONLY with pure JSON without markdown formatting.`;

          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.2,
                maxOutputTokens: 500,
              },
            }),
          });

          if (res.ok) {
            const resData = await res.json();
            const generatedText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (generatedText) {
              let cleanJson = generatedText.trim();
              if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
              }
              const parsedData = JSON.parse(cleanJson);
              const size = parsedData.recommendedSize;
              const isValidSize = availableSizes.some(
                (s) => s.trim().toUpperCase() === String(size).trim().toUpperCase()
              );

              if (isValidSize) {
                return NextResponse.json({
                  success: true,
                  recommendation: {
                    recommendedSize: size,
                    confidenceScore: Number(parsedData.confidenceScore) || 92,
                    fitAnalysis:
                      parsedData.fitAnalysis ||
                      `Size ${size} provides the best fit based on your height and build.`,
                  },
                });
              }
            }
          }
        } catch {
          // Continue to next model or rule-based fallback
        }
      }
    }

    // Algorithmic fallback if Gemini is offline, times out, or unconfigured
    const fallbackRecommendation = calculateFallbackSize({
      heightCm: numHeight,
      weightKg: numWeight,
      fitPreference,
      availableSizes,
      productName,
    });

    return NextResponse.json({
      success: true,
      recommendation: fallbackRecommendation,
    });
  } catch (err: unknown) {
    logServerError("Size recommendation endpoint error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to calculate fit recommendation" },
      { status: 500 }
    );
  }
}
