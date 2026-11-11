/**
 * Fashion Taxonomy and Attribute Definitions
 * Comprehensive classification of garments, colors, fabrics, and collar styles.
 */

export interface VisualAnalysisResult {
  query: string;
  apparel_type: "shirt" | "tshirt" | "polo" | "jacket" | "overshirt";
  sub_category: string;
  primary_color: string;
  color_hex: string;
  secondary_colors: string[];
  pattern: "solid" | "striped" | "plaid" | "floral" | "graphic" | "acid-wash" | "textured-weave" | "colorblock";
  fabric: string;
  collar_style: string;
  sleeve_length: string;
  vibe: string;
  analysis_summary: string;
  confidence: number;
  tags: string[];
  engine: "gemini-vision" | "vision-cv";
  engine_notice?: string;
}

export interface ClientVisualTelemetry {
  dominantColor?: { name: string; hex: string };
  averageBrightness?: number;
  averageSaturation?: number;
  dominantHue?: number;
  patternEntropy?: number;
  palette?: Array<{ name: string; hex: string }>;
}

export interface ScoredProductMatch {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  category: string | null;
  similarity: number;
  match_score: number;
  matched_reasons: string[];
  image_url?: string | null;
}

// Color keyword groupings for fuzzy and synonym matching
export const COLOR_SYNONYMS: Record<string, string[]> = {
  white: ["white", "cream", "ivory", "off-white", "snow", "bone"],
  black: ["black", "charcoal", "dark", "jet", "ebony", "noir"],
  charcoal: ["charcoal", "grey", "gray", "smoke", "slate", "graphite", "ash"],
  indigo: ["indigo", "denim", "blue", "navy", "deep blue", "stonewash"],
  navy: ["navy", "indigo", "midnight", "marine", "dark blue"],
  blue: ["blue", "sky", "indigo", "navy", "cyan", "azure", "cobalt"],
  green: ["green", "olive", "sage", "forest", "moss", "khaki green", "army"],
  beige: ["beige", "linen", "sand", "tan", "khaki", "cream", "oatmeal", "camel"],
  red: ["red", "burgundy", "maroon", "crimson", "ruby", "wine"],
  floral: ["floral", "tropical", "sunset", "botanical", "flower", "aloha", "resort"],
  striped: ["striped", "stripe", "pinstripe", "nautical", "horizontal stripe"],
  plaid: ["plaid", "flannel", "check", "tartan", "gingham", "buffalo check"],
};

// Fabric mapping
export const FABRIC_KEYWORDS = [
  "denim",
  "linen",
  "oxford",
  "pique",
  "piqué",
  "combed cotton",
  "cotton",
  "rayon",
  "leather",
  "flannel",
  "jersey",
  "mesh",
  "twill",
];
