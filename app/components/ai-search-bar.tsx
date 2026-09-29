"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, X, ArrowRight, Tag, Camera, Image as ImageIcon, RefreshCw } from "lucide-react";

interface SearchResultItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  category: string;
  similarity?: number;
  image_url?: string;
}

export function AISearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visualAnalysis, setVisualAnalysis] = useState<{
    query?: string;
    category?: string;
    tags?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImageFile(file: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setLoading(true);
    setResults(null);
    setVisualAnalysis(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);

      try {
        const res = await fetch("/api/search/visual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data }),
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
        console.error("Visual search failed", err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
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
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-500 hover:border-indigo-300 hover:bg-white transition-all cursor-pointer shadow-xs"
      >
        <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse shrink-0" />
        <span className="flex-1 truncate">Search shirts by vibe, or upload photo...</span>
        <div className="flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600 transition-colors" />
          <kbd className="hidden sm:inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            AI Search
          </kbd>
        </div>
      </div>

      {/* Modal / Expanded Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-24 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl transition-all border border-slate-100 max-h-[85vh] flex flex-col">
            {/* Input Header */}
            <form onSubmit={handleSearch} className="flex items-center gap-2.5 sm:gap-3 border-b border-slate-100 px-4 sm:px-5 py-3.5 sm:py-4 shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type vibe (e.g. 'navy linen wedding') or snap a photo..."
                autoFocus
                className="flex-1 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
              />

              {/* Hidden file input for visual search */}
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                title="Search by photo / screenshot"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Photo</span>
              </button>

              {loading ? (
                <svg className="h-5 w-5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
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
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </form>

            {/* Visual Search Preview Banner */}
            {imagePreview && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-indigo-100 bg-indigo-50/60 p-3.5 sm:px-5 sm:py-3.5 text-xs text-indigo-900 w-full transition-all">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-indigo-200 shrink-0 shadow-xs">
                    <Image src={imagePreview} alt="Uploaded sample" fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-indigo-950 text-xs sm:text-sm">Visual Analysis Active</p>
                      {visualAnalysis?.category && (
                        <span className="rounded-full bg-indigo-200/80 px-2.5 py-0.5 text-[10px] font-bold text-indigo-900 capitalize border border-indigo-300/50">
                          {visualAnalysis.category.replace(/-/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-indigo-800 font-medium leading-relaxed break-words">
                      {visualAnalysis?.query
                        ? `Detected: "${visualAnalysis.query}"`
                        : "Analyzing shirt texture, collar & pattern with Gemini Vision..."}
                    </p>
                    {visualAnalysis?.tags && visualAnalysis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {visualAnalysis.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-indigo-100/90 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 border border-indigo-200/60">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setVisualAnalysis(null);
                    setResults(null);
                  }}
                  className="self-end sm:self-center text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 p-1.5 rounded-lg transition-colors shrink-0"
                  title="Clear visual search analysis"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!results && !loading && !imagePreview && (
                <div>
                  <div className="mb-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-3.5 text-center">
                    <p className="text-xs font-semibold text-indigo-900 mb-1">
                      📸 Visual Search with Gemini Vision
                    </p>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      Upload an Instagram outfit, Pinterest pin, or camera snapshot to find matching shirts in our store.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Upload Shirt Photo</span>
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Suggested Natural Language Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Vintage oversized t-shirt",
                      "Formal white oxford shirt",
                      "Casual summer linen shirt",
                      "Dark streetwear graphic tee",
                      "Breathable pastel polo",
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
                        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all active:scale-95"
                      >
                        <Tag className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="py-12 text-center">
                  <Sparkles className="mx-auto h-7 w-7 text-indigo-600 animate-spin mb-3" />
                  <p className="text-xs sm:text-sm font-medium text-slate-700">
                    {imagePreview
                      ? "Gemini Vision is analyzing your photo and searching catalog..."
                      : "Searching catalog using semantic pgvector embeddings..."}
                  </p>
                </div>
              )}

              {results && results.length === 0 && !loading && (
                <div className="py-10 text-center">
                  <p className="text-xs sm:text-sm text-slate-500">
                    No matching shirts found {query ? `for "${query}"` : ""}.
                  </p>
                </div>
              )}

              {results && results.length > 0 && !loading && (
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>AI Matched ({results.length})</span>
                    <span className="text-indigo-600 font-medium">Supabase pgvector</span>
                  </div>
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={handleClose}
                      className="group flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-100 p-2.5 sm:p-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                    >
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-lg sm:rounded-xl bg-slate-100 border border-slate-200">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="(max-width: 640px) 56px, 64px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            👕
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {product.name}
                          </h4>
                          {product.category && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                              {product.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {product.description}
                        </p>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          Rs {Number(product.base_price).toLocaleString()}
                        </div>
                      </div>

                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
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
