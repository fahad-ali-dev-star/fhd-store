import {
  VisualAnalysisResult,
  ScoredProductMatch,
  COLOR_SYNONYMS,
  FABRIC_KEYWORDS,
} from "./fashion-taxonomy";

interface RawProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  category: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

/**
 * Professional multi-factor ranking algorithm that evaluates apparel attributes
 * against catalog products to identify the exact or most relevant matches.
 */
export function matchCatalogProducts(
  products: RawProductRecord[],
  analysis: VisualAnalysisResult,
  limit: number = 8
): ScoredProductMatch[] {
  const scoredList: ScoredProductMatch[] = [];

  for (const product of products) {
    if (product.is_active === false) continue;

    const nameLower = (product.name || "").toLowerCase();
    const descLower = (product.description || "").toLowerCase();
    const catLower = (product.category || "").toLowerCase();
    const combined = `${nameLower} ${descLower} ${catLower}`;

    // Filter obvious junk/placeholder items
    if (
      nameLower.includes("asfsdfs") ||
      nameLower.includes("asad") ||
      descLower.includes("sdvdsv") ||
      descLower.includes("dfsdcsdfd") ||
      (product.base_price <= 10 && nameLower.length <= 5)
    ) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    // 1. Garment Type & Category Alignment (up to 35 pts)
    if (analysis.apparel_type === "polo") {
      if (catLower.includes("polo") || nameLower.includes("polo") || descLower.includes("polo")) {
        score += 35;
        reasons.push("Polo Silhouette");
      }
    } else if (analysis.apparel_type === "tshirt") {
      if (
        catLower.includes("tshirt") ||
        catLower.includes("t-shirt") ||
        nameLower.includes("tee") ||
        descLower.includes("t-shirt") ||
        nameLower.includes("crewneck")
      ) {
        score += 35;
        reasons.push("T-Shirt Cut");
      }
    } else if (analysis.apparel_type === "jacket") {
      if (nameLower.includes("jacket") || descLower.includes("jacket") || catLower.includes("jacket")) {
        score += 35;
        reasons.push("Outerwear / Jacket");
      }
    } else if (analysis.apparel_type === "shirt") {
      if (catLower.includes("shirt") || nameLower.includes("shirt") || descLower.includes("shirt")) {
        score += 30;
        reasons.push("Button Shirt Cut");
      }
    }

    // Sub-Category High-Relevance Boosts (up to 20 pts)
    if (
      (analysis.sub_category === "denim-shirt" || analysis.fabric.includes("denim")) &&
      (combined.includes("denim") || combined.includes("jean") || combined.includes("indigo"))
    ) {
      score += 20;
      reasons.push("Authentic Denim");
    } else if (
      (analysis.sub_category === "linen-shirt" || analysis.fabric.includes("linen")) &&
      combined.includes("linen")
    ) {
      score += 20;
      reasons.push("Breathable Linen");
    } else if (
      (analysis.sub_category === "oxford-shirt" || analysis.fabric.includes("oxford")) &&
      combined.includes("oxford")
    ) {
      score += 20;
      reasons.push("Oxford Weave");
    } else if (
      (analysis.sub_category === "hawaiian-shirt" || analysis.pattern === "floral") &&
      (combined.includes("hawaiian") || combined.includes("floral") || combined.includes("tropical"))
    ) {
      score += 20;
      reasons.push("Tropical Floral");
    } else if (
      (analysis.sub_category === "flannel-shirt" || analysis.pattern === "plaid") &&
      (combined.includes("flannel") || combined.includes("plaid") || combined.includes("check"))
    ) {
      score += 20;
      reasons.push("Plaid Flannel");
    } else if (
      (analysis.sub_category === "leather-jacket" || analysis.fabric.includes("leather")) &&
      (combined.includes("leather") || combined.includes("biker"))
    ) {
      score += 20;
      reasons.push("Leather Craft");
    } else if (
      (analysis.sub_category === "graphic-tee" || analysis.pattern === "graphic" || analysis.pattern === "acid-wash") &&
      (combined.includes("graphic") || combined.includes("acid-wash") || combined.includes("retro") || combined.includes("streetwear"))
    ) {
      score += 20;
      reasons.push("Streetwear Graphic");
    }

    // 2. Color Matching (up to 25 pts)
    const detectedColorLower = (analysis.primary_color || "").toLowerCase();
    let colorMatched = false;

    for (const [key, synonyms] of Object.entries(COLOR_SYNONYMS)) {
      if (detectedColorLower.includes(key)) {
        for (const synonym of synonyms) {
          if (combined.includes(synonym)) {
            score += 25;
            reasons.push(`Color: ${analysis.primary_color}`);
            colorMatched = true;
            break;
          }
        }
      }
      if (colorMatched) break;
    }

    // Direct match if color name is in title or description
    if (!colorMatched && combined.includes(detectedColorLower)) {
      score += 20;
      reasons.push(`Color: ${analysis.primary_color}`);
    }

    // 3. Fabric & Material Match (up to 15 pts)
    if (analysis.fabric) {
      const fabLower = analysis.fabric.toLowerCase();
      for (const kw of FABRIC_KEYWORDS) {
        if (fabLower.includes(kw) && combined.includes(kw)) {
          score += 15;
          const displayFab = kw.charAt(0).toUpperCase() + kw.slice(1);
          reasons.push(`Fabric: ${displayFab}`);
          break;
        }
      }
    }

    // 4. Pattern & Collar Matching (up to 15 pts)
    if (analysis.pattern && analysis.pattern !== "solid") {
      if (combined.includes(analysis.pattern.toLowerCase())) {
        score += 10;
        reasons.push(`Pattern: ${analysis.pattern}`);
      }
    }

    if (analysis.collar_style) {
      const collar = analysis.collar_style.toLowerCase();
      if (collar.includes("button-down") && (combined.includes("button-down") || combined.includes("button down"))) {
        score += 8;
        reasons.push("Button-down Collar");
      } else if (collar.includes("crew") && combined.includes("crew")) {
        score += 8;
        reasons.push("Crewneck");
      } else if (collar.includes("polo") && combined.includes("polo")) {
        score += 8;
        reasons.push("Polo Collar");
      } else if (collar.includes("spread") && combined.includes("spread")) {
        score += 8;
        reasons.push("Spread Collar");
      }
    }

    // 5. Keyword Tag Overlap (up to 10 pts)
    if (analysis.tags && Array.isArray(analysis.tags)) {
      let tagCount = 0;
      for (const tag of analysis.tags) {
        if (combined.includes(tag.toLowerCase())) {
          tagCount++;
        }
      }
      score += Math.min(10, tagCount * 3);
    }

    // Normalize final score between 40% and 98%
    const normalizedScore = Math.min(98, Math.max(35, Math.round(score)));
    const uniqueReasons = Array.from(new Set(reasons)).slice(0, 3);

    scoredList.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      base_price: Number(product.base_price),
      category: product.category,
      similarity: Number((normalizedScore / 100).toFixed(2)),
      match_score: normalizedScore,
      matched_reasons: uniqueReasons.length > 0 ? uniqueReasons : ["Style & Cut Alignment"],
      image_url: product.image_url || null,
    });
  }

  // Sort descending by match_score
  scoredList.sort((a, b) => b.match_score - a.match_score);

  return scoredList.slice(0, limit);
}
