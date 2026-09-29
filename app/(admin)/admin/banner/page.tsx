"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sliders,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Clock,
  Eye,
  Upload,
  Link2,
  X,
  Smartphone,
  Monitor,
} from "lucide-react";

interface BannerConfig {
  id?: string;
  is_active: boolean;
  image_url: string;
  badge_text: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
  overlay_opacity: number;
  banner_height: "screen" | "tall" | "standard";
  image_fit: "cover" | "contain";
}

const PRESET_BANNERS = [
  {
    label: "Minimalist Studio Cotton",
    url: "/hero_banner.png",
  },
  {
    label: "Urban Dark Streetwear",
    url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1920&q=80",
  },
  {
    label: "Clean Monochrome Apparel",
    url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1920&q=80",
  },
  {
    label: "Vintage Denim & Flannel",
    url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1920&q=80",
  },
];

const DEFAULT_BANNER: BannerConfig = {
  is_active: true,
  image_url: "/hero_banner.png",
  badge_text: "SPRING / SUMMER 2026 DROP",
  title: "Essentials, Elevated.",
  subtitle:
    "Discover our new collection of premium cotton t-shirts. Designed for everyday comfort, crafted to last a lifetime.",
  cta_text: "Shop Collection",
  cta_link: "#products",
  secondary_cta_text: "Explore Oversized",
  secondary_cta_link: "/category/oversized",
  overlay_opacity: 50,
  banner_height: "tall",
  image_fit: "cover",
};

export default function AdminBannerPage() {
  const [banners, setBanners] = useState<BannerConfig[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image input mode per banner tab: "url" | "upload"
  const [imgMode, setImgMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview carousel state
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    async function loadBanners() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/banner");
        if (res.ok) {
          const json = await res.json();
          const list: BannerConfig[] = Array.isArray(json.banners) && json.banners.length > 0
            ? json.banners.map((b: any) => ({
                id: b.id,
                is_active: b.is_active ?? true,
                image_url: b.image_url || "/hero_banner.png",
                badge_text: b.badge_text || "",
                title: b.title || "Essentials, Elevated.",
                subtitle: b.subtitle || "",
                cta_text: b.cta_text || "Shop Collection",
                cta_link: b.cta_link || "#products",
                secondary_cta_text: b.secondary_cta_text || "",
                secondary_cta_link: b.secondary_cta_link || "",
                overlay_opacity: b.overlay_opacity ?? 50,
                banner_height: (b.banner_height as BannerConfig["banner_height"]) || "tall",
                image_fit: (b.image_fit as BannerConfig["image_fit"]) || "cover",
              }))
            : [DEFAULT_BANNER];

          setBanners(list);
        }
      } catch (err: unknown) {
        console.error("Failed to load banners:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBanners();
  }, []);

  const currentBanner = banners[activeTab] || banners[0] || DEFAULT_BANNER;

  function updateCurrentBanner(patch: Partial<BannerConfig>) {
    setBanners((prev) =>
      prev.map((b, idx) => (idx === activeTab ? { ...b, ...patch } : b))
    );
  }

  function handleAddBanner() {
    if (banners.length >= 5) {
      alert("You can add up to 5 hero banners.");
      return;
    }

    const newBanner: BannerConfig = {
      is_active: true,
      image_url: PRESET_BANNERS[banners.length % PRESET_BANNERS.length].url,
      badge_text: `EXCLUSIVE DROP 0${banners.length + 1}`,
      title: "New Season Arrivals",
      subtitle: "Experience luxury heavyweight combed cotton. Engineered for superior comfort.",
      cta_text: "Explore Now",
      cta_link: "#products",
      secondary_cta_text: "View All",
      secondary_cta_link: "/#products",
      overlay_opacity: 50,
      banner_height: "tall",
      image_fit: "cover",
    };

    setBanners((prev) => [...prev, newBanner]);
    setActiveTab(banners.length);
  }

  async function handleDeleteBanner(index: number) {
    if (banners.length <= 1) {
      alert("You must keep at least 1 hero banner.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this banner?")) return;

    const target = banners[index];
    if (target.id) {
      try {
        await fetch(`/api/admin/banner?id=${target.id}`, { method: "DELETE" });
      } catch (err) {
        console.warn("Delete request failed:", err);
      }
    }

    setBanners((prev) => prev.filter((_, idx) => idx !== index));
    setActiveTab((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
  }

  async function handleFileUpload(file: File) {
    setUploadError(null);

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("File too large. Max size is 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/banner/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      updateCurrentBanner({ image_url: json.url });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Save current banner
      const res = await fetch("/api/admin/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentBanner, media_type: "image" }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save banner");
      }

      const json = await res.json();
      if (json.banner?.id) {
        setBanners((prev) =>
          prev.map((b, idx) => (idx === activeTab ? { ...b, id: json.banner.id } : b))
        );
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving banner");
    } finally {
      setSaving(false);
    }
  }

  // Live preview auto-cycle (every 3 seconds for active banners)
  const activeBanners = banners.filter((b) => b.is_active);
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % activeBanners.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const previewBanner = activeBanners[previewIndex] || currentBanner;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3.5 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Hero Banners Slider Manager
            </h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200 flex items-center gap-1">
              <Clock size={12} />
              Auto-Scrolls Every 4.5 Seconds
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Add 2 or 3 rotating banners. When multiple active banners are added, they automatically scroll every 4.5s on the homepage.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <span>Live Store</span>
            <ExternalLink size={13} className="text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs px-5 py-2 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Banner Changes</span>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Hero banner updated successfully! Live homepage cache has been refreshed.</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* ── Banner Tabs Selector ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {banners.map((b, idx) => {
            const isSelected = idx === activeTab;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveTab(idx);
                  setPreviewIndex(idx % Math.max(1, activeBanners.length));
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Layers size={13} />
                <span>Banner {idx + 1}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    b.is_active ? "bg-emerald-400" : "bg-slate-400"
                  }`}
                  title={b.is_active ? "Active" : "Inactive"}
                />
              </button>
            );
          })}

          {banners.length < 5 && (
            <button
              type="button"
              onClick={handleAddBanner}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 hover:border-brand-500 bg-slate-50/50 hover:bg-brand-50/50 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-brand-700 transition shrink-0"
            >
              <Plus size={14} />
              <span>Add Banner ({banners.length}/5)</span>
            </button>
          )}
        </div>

        {banners.length > 1 && (
          <button
            type="button"
            onClick={() => handleDeleteBanner(activeTab)}
            className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold"
          >
            <Trash2 size={13} />
            <span>Delete Banner {activeTab + 1}</span>
          </button>
        )}
      </div>

      {/* ── 2-Column: Form (Left) & Live Preview (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Status & Preset Images */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Banner #{activeTab + 1} Visibility</h3>
                  <p className="text-xs text-slate-500">Toggle whether this slide rotates on the homepage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentBanner.is_active}
                    onChange={(e) => updateCurrentBanner({ is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Image Source: Upload or URL */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Background Image <span className="text-red-500">*</span>
                  </label>
                  {/* Mode toggle */}
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => { setImgMode("upload"); setUploadError(null); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition ${
                        imgMode === "upload"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Upload size={11} />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => { setImgMode("url"); setUploadError(null); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition border-l border-slate-200 ${
                        imgMode === "url"
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Link2 size={11} />
                      Enter URL
                    </button>
                  </div>
                </div>

                {/* ── Upload Mode ── */}
                {imgMode === "upload" && (
                  <div className="space-y-2">
                    {/* Current image thumbnail */}
                    {currentBanner.image_url && (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <Image
                          src={currentBanner.image_url}
                          alt="Banner preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => updateCurrentBanner({ image_url: "" })}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Current Image
                        </span>
                      </div>
                    )}

                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileUpload(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition py-6 px-4 ${
                        dragOver
                          ? "border-brand-500 bg-brand-50/50"
                          : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/50"
                      }`}
                    >
                      {uploading ? (
                        <>
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                          <span className="text-xs text-slate-500 font-medium">Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} className="text-slate-400" />
                          <div className="text-center">
                            <p className="text-xs font-semibold text-slate-700">
                              Drop image here or <span className="text-brand-600 underline underline-offset-2">browse</span>
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP · Max 8 MB</p>
                          </div>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {uploadError && (
                      <p className="text-[11px] text-red-600 font-semibold">{uploadError}</p>
                    )}
                  </div>
                )}

                {/* ── URL Mode ── */}
                {imgMode === "url" && (
                  <div className="space-y-2">
                    <input
                      required
                      type="text"
                      value={currentBanner.image_url}
                      onChange={(e) => updateCurrentBanner({ image_url: e.target.value })}
                      placeholder="/hero_banner.png or https://images.unsplash.com/..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-black focus:outline-none"
                    />

                    {/* Quick presets */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-semibold text-slate-400">Presets:</span>
                      {PRESET_BANNERS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updateCurrentBanner({ image_url: preset.url })}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content & Copy */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Headlines & Marketing Copy
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Top Eyebrow Badge
                </label>
                <input
                  type="text"
                  value={currentBanner.badge_text}
                  onChange={(e) => updateCurrentBanner({ badge_text: e.target.value })}
                  placeholder="e.g. SPRING / SUMMER 2026 DROP"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-black focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Main Headline <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={currentBanner.title}
                  onChange={(e) => updateCurrentBanner({ title: e.target.value })}
                  placeholder="e.g. Essentials, Elevated."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 font-bold focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Subtitle / Description
                </label>
                <textarea
                  rows={3}
                  value={currentBanner.subtitle}
                  onChange={(e) => updateCurrentBanner({ subtitle: e.target.value })}
                  placeholder="Discover our new collection of premium cotton shirts..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-black focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* CTAs & Links */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Buttons & Links
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    value={currentBanner.cta_text}
                    onChange={(e) => updateCurrentBanner({ cta_text: e.target.value })}
                    placeholder="Shop Collection"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Primary Button Link
                  </label>
                  <input
                    type="text"
                    value={currentBanner.cta_link}
                    onChange={(e) => updateCurrentBanner({ cta_link: e.target.value })}
                    placeholder="#products or /category/casual-shirts"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Secondary Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentBanner.secondary_cta_text}
                    onChange={(e) => updateCurrentBanner({ secondary_cta_text: e.target.value })}
                    placeholder="Explore Oversized"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Secondary Button Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={currentBanner.secondary_cta_link}
                    onChange={(e) => updateCurrentBanner({ secondary_cta_link: e.target.value })}
                    placeholder="/category/oversized-tees"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dark Overlay Opacity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Dark Vignette / Text Contrast ({currentBanner.overlay_opacity}%)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {currentBanner.overlay_opacity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={currentBanner.overlay_opacity}
                onChange={(e) => updateCurrentBanner({ overlay_opacity: Number(e.target.value) })}
                className="w-full accent-black cursor-pointer"
              />
            </div>

            {/* Frame Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Sliders size={14} className="text-brand-600" />
                Frame Controls
              </h3>

              {/* Banner Height */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Banner Height
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "standard", label: "Standard", px: "380 px", icon: "▬" },
                      { value: "tall",     label: "Tall",     px: "520 px", icon: "▮" },
                      { value: "screen",   label: "Screen",   px: "≤700 px", icon: "⬛" },
                    ] as const
                  ).map(({ value, label, px, icon }) => {
                    const isSelected = currentBanner.banner_height === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateCurrentBanner({ banner_height: value })}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        <span className="text-lg leading-none">{icon}</span>
                        <span className="text-[11px] font-bold">{label}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                          {px}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Controls how tall the hero section appears on the homepage.
                </p>
              </div>

              {/* Image Fit */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Image Fit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "cover",
                        label: "Cover (Fill)",
                        desc: "Fills the frame — edges may crop",
                        icon: "⬛",
                      },
                      {
                        value: "contain",
                        label: "Contain (Fit)",
                        desc: "Full image visible — letterboxed",
                        icon: "◻",
                      },
                    ] as const
                  ).map(({ value, label, desc, icon }) => {
                    const isSelected = currentBanner.image_fit === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateCurrentBanner({ image_fit: value })}
                        className={`flex flex-col items-start gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        <span className="text-base">{icon}</span>
                        <span className="text-[11px] font-bold">{label}</span>
                        <span className={`text-[10px] leading-snug ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                          {desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Interactive Live Carousel Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Eye size={15} className="text-brand-600" />
                <span>Live Slider Preview</span>
              </div>

              {/* Viewport switch: Desktop / Mobile */}
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                    previewDevice === "desktop"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  title="Preview Desktop View"
                >
                  <Monitor size={12} />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                    previewDevice === "mobile"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  title="Preview Mobile View"
                >
                  <Smartphone size={12} />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Banner Screen Mockup */}
            {(() => {
              const isMobileView = previewDevice === "mobile";
              const previewAspect = isMobileView
                ? "aspect-[9/14] max-w-[280px] mx-auto"
                : currentBanner.banner_height === "screen"
                ? "aspect-[16/9]"
                : currentBanner.banner_height === "standard"
                ? "aspect-[16/6.5]"
                : "aspect-[16/8.5]"; // tall (default)
              const previewFit =
                currentBanner.image_fit === "contain" ? "object-contain" : "object-cover";

              return (
                <div
                  className={`relative ${previewAspect} rounded-xl overflow-hidden bg-slate-950 border ${
                    isMobileView ? "border-slate-700 ring-4 ring-slate-800/40" : "border-slate-800"
                  } shadow-inner flex items-center justify-center text-white transition-all duration-500`}
                >
                  <Image
                    src={previewBanner.image_url || "/hero_banner.png"}
                    alt={previewBanner.title}
                    fill
                    className={`${previewFit} transition-all duration-700`}
                    unoptimized
                  />

                  {/* Overlay */}
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: previewBanner.overlay_opacity / 100 }}
                  />

                  {/* Gradient: Vertical on mobile simulation, horizontal on desktop */}
                  {isMobileView ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/35" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
                  )}

                  {/* Height badge */}
                  <span className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-wide">
                    {currentBanner.banner_height} · {currentBanner.image_fit}
                  </span>

                  {/* Content Preview */}
                  <div className={`relative z-10 ${isMobileView ? "p-4" : "p-5"} w-full flex flex-col justify-center h-full`}>
                    {previewBanner.badge_text && (
                      <span className="text-[8px] sm:text-[9px] font-bold tracking-widest uppercase text-emerald-400 mb-1">
                        {previewBanner.badge_text}
                      </span>
                    )}
                    <h2 className={`${isMobileView ? "text-sm leading-tight" : "text-base sm:text-lg leading-tight"} font-black tracking-tight line-clamp-2 mb-1 drop-shadow`}>
                      {previewBanner.title}
                    </h2>
                    <p className="text-[10px] text-slate-300 line-clamp-2 mb-3 max-w-xs font-light">
                      {previewBanner.subtitle}
                    </p>
                    <div
                      className={`w-full ${
                        isMobileView
                          ? previewBanner.secondary_cta_text
                            ? "grid grid-cols-2 gap-1.5"
                            : "flex"
                          : "flex items-center gap-2"
                      }`}
                    >
                      <span className="bg-white text-slate-900 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow text-center truncate">
                        <span className="truncate">{previewBanner.cta_text || "Shop"}</span>
                        <ArrowRight size={10} className="shrink-0" />
                      </span>
                      {previewBanner.secondary_cta_text && (
                        <span className="bg-white/20 border border-white/30 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-center truncate">
                          <span className="truncate">{previewBanner.secondary_cta_text}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicators Mockup */}
                  {activeBanners.length > 1 && (
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                      {activeBanners.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === previewIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {activeBanners.length > 1
                  ? `${activeBanners.length} active rotating banners`
                  : "1 active banner"}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                Touch swipe enabled on mobile
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
