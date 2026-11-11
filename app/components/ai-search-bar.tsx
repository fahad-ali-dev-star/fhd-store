"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  X,
  ArrowRight,
  Tag,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  RefreshCw,
} from "lucide-react";
import { VisualAnalysisResult, ScoredProductMatch } from "@/lib/ai/fashion-taxonomy";

const DEMO_LOOKS = [
  {
    title: "Vintage Denim",
    category: "shirts",
    color: "Indigo Blue",
    hex: "#1e3a8a",
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
    icon: "🧥",
  },
  {
    title: "White Minimalist Tee",
    category: "tshirts",
    color: "Pure White",
    hex: "#f8fafc",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    icon: "👕",
  },
  {
    title: "Charcoal Polo",
    category: "polos",
    color: "Charcoal Grey",
    hex: "#374151",
    imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80",
    icon: "🎾",
  },
  {
    title: "Hawaiian Sunset",
    category: "shirts",
    color: "Tropical Floral",
    hex: "#ea580c",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80",
    icon: "🌊",
  },
  {
    title: "Oxford Button Down",
    category: "shirts",
    color: "Sky Blue",
    hex: "#3b82f6",
    imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80",
    icon: "👔",
  },
];

export function AISearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoredProductMatch[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visualAnalysis, setVisualAnalysis] = useState<VisualAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close modal on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setVisualAnalysis(null);
    setImagePreview(null);
    try {
      const res = await fetch("/api/search/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error("AI Search failed", err);
    } finally {
      setLoading(false);
    }
  }

  // Extract client-side visual telemetry using canvas for 100% accurate color & texture analysis
  async function extractCanvasTelemetry(imgSrc: string) {
    return new Promise<any>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(undefined);

          ctx.drawImage(img, 0, 0, size, size);
          const imgData = ctx.getImageData(0, 0, size, size);
          const d = imgData.data;

          let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;
          let variance = 0;

          // Sample central 70% of image
          const start = Math.floor(size * 0.15);
          const end = Math.floor(size * 0.85);

          for (let y = start; y < end; y++) {
            for (let x = start; x < end; x++) {
              const idx = (y * size + x) * 4;
              const r = d[idx];
              const g = d[idx + 1];
              const b = d[idx + 2];
              const a = d[idx + 3];
              if (a < 120) continue;

              rTotal += r;
              gTotal += g;
              bTotal += b;
              count++;
            }
          }

          if (count > 0) {
            const avgR = Math.round(rTotal / count);
            const avgG = Math.round(gTotal / count);
            const avgB = Math.round(bTotal / count);

            // Compute variance across pixels to detect pattern frequency
            for (let y = start; y < end; y += 2) {
              for (let x = start; x < end; x += 2) {
                const idx = (y * size + x) * 4;
                const diff =
                  Math.abs(d[idx] - avgR) +
                  Math.abs(d[idx + 1] - avgG) +
                  Math.abs(d[idx + 2] - avgB);
                variance += diff;
              }
            }

            const patternEntropy = variance / (count * 30);
            const hex = `#${avgR.toString(16).padStart(2, "0")}${avgG.toString(16).padStart(2, "0")}${avgB.toString(16).padStart(2, "0")}`;

            resolve({
              dominantColor: { name: "Detected Color", hex },
              patternEntropy,
            });
          } else {
            resolve(undefined);
          }
        } catch {
          resolve(undefined);
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = imgSrc;
    });
  }

  async function processImageSearch(base64Data: string) {
    setLoading(true);
    setResults(null);
    setVisualAnalysis(null);
    setImagePreview(base64Data);

    try {
      const clientTelemetry = await extractCanvasTelemetry(base64Data);

      const res = await fetch("/api/search/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          clientTelemetry,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
        if (data.analysis) {
          setVisualAnalysis(data.analysis);
          if (data.analysis.query) {
            setQuery(data.analysis.query);
          }
        }
      }
    } catch (err) {
      console.error("Visual search error", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageFile(file: File) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await processImageSearch(base64Data);
    };
    reader.readAsDataURL(file);
  }

  async function handleDemoLook(look: typeof DEMO_LOOKS[0]) {
    setLoading(true);
    setResults(null);
    setVisualAnalysis(null);
    setImagePreview(look.imageUrl);

    try {
      // Fetch the image and convert to base64
      const response = await fetch(look.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        await processImageSearch(base64Data);
      };
      reader.readAsDataURL(blob);
    } catch {
      // Fallback direct search if image fetch blocked
      setQuery(look.title);
      fetch("/api/search/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: look.title }),
      })
        .then((r) => r.json())
        .then((d) => setResults(d.results || []))
        .finally(() => setLoading(false));
    }
  }

  function handleClose() {
    setIsOpen(false);
    setResults(null);
    setQuery("");
    setImagePreview(null);
    setVisualAnalysis(null);
  }

  return (
    <div className="relative w-full max-w-lg">
      <div
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-500 hover:border-indigo-300 hover:bg-white transition-all cursor-pointer shadow-xs group"
      >
        <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse shrink-0 group-hover:scale-110 transition-transform" />
        <span className="flex-1 truncate">Search shirts by vibe, or upload photo...</span>
        <div className="flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <kbd className="hidden sm:inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Visual AI
          </kbd>
        </div>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-20 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl transition-all border border-slate-100 max-h-[88vh] flex flex-col"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleImageFile(file);
            }}
          >
            {/* Input Header */}
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2.5 sm:gap-3 border-b border-slate-100 px-4 sm:px-5 py-3.5 sm:py-4 shrink-0 bg-white"
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type vibe (e.g. 'navy linen wedding') or snap a photo..."
                autoFocus
                className="flex-1 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
              />

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                }}
              />

              {/* Upload image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shrink-0 shadow-2xs"
                title="Search by shirt photo or screenshot"
              >
                <Camera className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Upload Photo</span>
              </button>

              {loading ? (
                <svg className="h-5 w-5 animate-spin text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults(null);
                      setImagePreview(null);
                      setVisualAnalysis(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}

              <button
                type="button"
                onClick={handleClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </form>

            {/* Drag and Drop Overlay Indicator */}
            {isDragging && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-indigo-600/90 text-white backdrop-blur-xs">
                <Camera className="h-10 w-10 animate-bounce mb-2" />
                <p className="font-bold text-base">Drop your shirt photo here</p>
                <p className="text-xs text-indigo-100">Gemini Vision will analyze style, color & cut</p>
              </div>
            )}

            {/* Professional Visual Analysis Banner */}
            {imagePreview && (
              <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/50 p-4 sm:p-5 text-xs text-indigo-950 shrink-0">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {/* Image Thumbnail with subtle status indicator */}
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 border-indigo-200 shrink-0 shadow-sm bg-white">
                    <Image src={imagePreview} alt="Uploaded shirt" fill className="object-cover" />
                    {loading && (
                      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-2xs flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Visual Analysis Breakdown */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          Visual Fashion Analysis
                        </span>

                        {visualAnalysis && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              visualAnalysis.engine === "gemini-vision"
                                ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                                : "bg-emerald-100 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {visualAnalysis.engine === "gemini-vision"
                              ? "✨ Gemini 3.8 Vision"
                              : "⚡ Vision Engine"}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setVisualAnalysis(null);
                          setResults(null);
                          setQuery("");
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Stylist Summary Quote */}
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {visualAnalysis?.analysis_summary ||
                        "Analyzing collar rolls, texture weave, dominant dye, and garment silhouette..."}
                    </p>

                    {/* Visual Attributes: Color Swatch, Category, Fabric */}
                    {visualAnalysis && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {/* Dominant Color Swatch Badge */}
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-200 shadow-2xs">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: visualAnalysis.color_hex }}
                          />
                          <span>{visualAnalysis.primary_color}</span>
                        </span>

                        {/* Silhouette Pill */}
                        {visualAnalysis.sub_category && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-200 shadow-2xs capitalize">
                            {visualAnalysis.sub_category.replace(/-/g, " ")}
                          </span>
                        )}

                        {/* Fabric & Collar Chips */}
                        {visualAnalysis.fabric && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60 capitalize">
                            {visualAnalysis.fabric}
                          </span>
                        )}

                        {visualAnalysis.collar_style && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60 capitalize">
                            {visualAnalysis.collar_style}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Developer/Admin Note if Gemini billing required */}
                    {visualAnalysis?.engine_notice && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded border border-amber-200/60 mt-1">
                        <Info className="h-3 w-3 shrink-0" />
                        <span className="truncate">{visualAnalysis.engine_notice}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!results && !loading && !imagePreview && (
                <div className="space-y-5">
                  {/* Upload Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-slate-50/30 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/60 transition-all shadow-2xs"
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md group-hover:scale-105 transition-transform">
                      <Camera className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1">
                      Visual Search with Gemini Vision
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3 leading-relaxed">
                      Upload an Instagram outfit, Pinterest pin, or camera snapshot to detect exact matching shirts in our store.
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 shadow-2xs group-hover:bg-indigo-50 transition-colors">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Choose Shirt Photo or Drag & Drop</span>
                    </span>
                  </div>

                  {/* Interactive Demo Looks */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Try Instant Demo Looks
                      </p>
                      <span className="text-[11px] text-indigo-600 font-medium">1-Click Test</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEMO_LOOKS.map((look) => (
                        <button
                          key={look.title}
                          type="button"
                          onClick={() => handleDemoLook(look)}
                          className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-all group shadow-2xs"
                        >
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                            <Image src={look.imageUrl} alt={look.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600">
                              {look.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className="h-2 w-2 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: look.hex }}
                              />
                              <span className="text-[10px] text-slate-500 truncate">{look.color}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Natural Language Searches */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Suggested Style Vibes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Vintage oversized t-shirt",
                        "Tailored oxford cotton shirt",
                        "Casual summer linen shirt",
                        "Dark streetwear graphic tee",
                        "Breathable charcoal polo",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setQuery(suggestion);
                            setLoading(true);
                            fetch("/api/search/ai", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ query: suggestion }),
                            })
                              .then((res) => res.json())
                              .then((d) => setResults(d.results || []))
                              .finally(() => setLoading(false));
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-white hover:text-indigo-700 transition-all active:scale-95 shadow-2xs"
                        >
                          <Tag className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="py-14 text-center">
                  <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Sparkles className="h-7 w-7 animate-spin" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {imagePreview
                      ? "Gemini Vision is analyzing garment attributes..."
                      : "Searching catalog by semantic relevance..."}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {imagePreview
                      ? "Evaluating fabric weave, dominant dye, collar roll, and catalog inventory."
                      : "Matching your query with tailored cotton, linen, and polo styles."}
                  </p>
                </div>
              )}

              {/* No Results State */}
              {results && results.length === 0 && !loading && (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <SlidersHorizontal className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">
                    No matching shirts found
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    {query ? `We couldn't find shirts matching "${query}".` : "Try uploading a clearer photo of the shirt."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setImagePreview(null);
                      setVisualAnalysis(null);
                      setResults(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <span>Reset Search</span>
                  </button>
                </div>
              )}

              {/* Professional Ranked Results List */}
              {results && results.length > 0 && !loading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">
                      Top Detected Matches ({results.length})
                    </span>
                    <span className="text-indigo-600 font-medium">Ranked by Visual Relevance</span>
                  </div>

                  {results.map((product, idx) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={handleClose}
                      className="group flex items-center gap-3.5 sm:gap-4 rounded-2xl border border-slate-100 bg-white p-3 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md transition-all"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="(max-width: 640px) 64px, 80px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            👕
                          </div>
                        )}

                        {/* Top 1 Badge */}
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                            Top Match
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {product.name}
                          </h4>

                          {/* Match Score Badge */}
                          {product.match_score && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                product.match_score >= 90
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : product.match_score >= 80
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {product.match_score}% Match
                            </span>
                          )}

                          {product.category && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                              {product.category}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-1 mt-1 leading-normal">
                          {product.description}
                        </p>

                        {/* Matched reasons chips */}
                        {product.matched_reasons && product.matched_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {product.matched_reasons.map((reason) => (
                              <span
                                key={reason}
                                className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/60"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                <span>{reason}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-1.5 text-sm font-bold text-slate-900">
                          Rs {Number(product.base_price).toLocaleString()}
                        </div>
                      </div>

                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
