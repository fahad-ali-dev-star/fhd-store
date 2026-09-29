"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface HeroBannerData {
  id?: string;
  is_active?: boolean;
  image_url?: string | null;
  badge_text?: string | null;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  secondary_cta_text?: string | null;
  secondary_cta_link?: string | null;
  overlay_opacity?: number;
  banner_height?: "screen" | "tall" | "standard";
  image_fit?: "cover" | "contain";
}

interface HeroBannerProps {
  banners?: HeroBannerData[] | HeroBannerData | null;
  banner?: HeroBannerData | null;
  autoPlayInterval?: number;
}

export function HeroBanner({ banners: bannersProp, banner, autoPlayInterval = 4500 }: HeroBannerProps) {
  // Normalize banners input
  const bannerList: HeroBannerData[] = Array.isArray(bannersProp)
    ? bannersProp.filter((b) => b.is_active !== false)
    : bannersProp
    ? [bannersProp]
    : banner
    ? [banner]
    : [];

  const effectiveBanners: HeroBannerData[] =
    bannerList.length > 0
      ? bannerList
      : [
          {
            image_url: "/hero_banner.png",
            badge_text: "SPRING / SUMMER 2026 DROP",
            title: "Essentials, Elevated.",
            subtitle:
              "Discover our new collection of premium cotton t-shirts. Designed for everyday comfort, crafted to last a lifetime.",
            cta_text: "Shop Collection",
            cta_link: "#products",
            secondary_cta_text: "Explore Oversized",
            secondary_cta_link: "/category/oversized",
            overlay_opacity: 40,
            banner_height: "tall",
            image_fit: "cover",
          },
        ];

  const totalSlides = effectiveBanners.length;
  const isMulti = totalSlides > 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch swipe support for mobile / tablet
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-scroll timer
  useEffect(() => {
    if (!isMulti || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isMulti, isPaused, autoPlayInterval, nextSlide]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const threshold = 40; // minimum swipe distance in px
    if (distance > threshold) {
      nextSlide(); // swipe left -> next slide
    } else if (distance < -threshold) {
      prevSlide(); // swipe right -> previous slide
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const currentBanner = effectiveBanners[currentIndex] || effectiveBanners[0];
  const imageUrl = currentBanner.image_url || "/hero_banner.png";
  const badgeText = currentBanner.badge_text ?? "SPRING / SUMMER 2026 DROP";
  const title = currentBanner.title || "Essentials, Elevated.";
  const subtitle =
    currentBanner.subtitle ||
    "Discover our new collection of premium cotton t-shirts. Designed for everyday comfort, crafted to last a lifetime.";
  const ctaText = currentBanner.cta_text || "Shop the Collection";
  const ctaLink = currentBanner.cta_link || "#products";
  const secondaryCtaText = currentBanner.secondary_cta_text;
  const secondaryCtaLink = currentBanner.secondary_cta_link;
  const opacity =
    typeof currentBanner.overlay_opacity === "number" ? currentBanner.overlay_opacity : 40;
  const imageFit = currentBanner.image_fit === "contain" ? "object-contain" : "object-cover";

  // Responsive height per setting - ensuring content never clips on mobile
  const heightClasses =
    currentBanner.banner_height === "screen"
      ? "min-h-[520px] sm:min-h-[600px] md:h-[calc(100vh-4rem)] md:max-h-[740px]"
      : currentBanner.banner_height === "standard"
      ? "min-h-[380px] sm:min-h-[400px] md:h-[420px]"
      : "min-h-[460px] sm:min-h-[520px] md:min-h-[560px] lg:h-[600px]"; // tall (default)

  return (
    <section
      className={`relative w-full ${heightClasses} bg-slate-950 flex items-center overflow-hidden group/hero select-none`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background images stack with smooth crossfade */}
      <div className="absolute inset-0">
        {effectiveBanners.map((b, idx) => {
          const isActive = idx === currentIndex;
          const bgUrl = b.image_url || "/hero_banner.png";
          const fit = b.image_fit === "contain" ? "object-contain" : "object-cover";

          return (
            <div
              key={b.id || idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"
              }`}
            >
              <Image
                src={bgUrl}
                alt={b.title || "Banner"}
                fill
                priority={idx === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1920px"
                className={`w-full h-full ${fit} object-center transition-transform duration-7000 ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
                quality={85}
              />
            </div>
          );
        })}

        {/* Dynamic vignette */}
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-700"
          style={{ opacity: opacity / 100 }}
        />

        {/* Responsive Dual-Gradient for perfect legibility on all screen sizes:
            - Mobile: vertical bottom-to-top gradient for full portrait readability
            - Tablet/Desktop: cinematic horizontal gradient leaving image right-side clear */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/35 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/55 sm:to-black/15 pointer-events-none" />

        {/* Bottom scrim to smooth boundary */}
        <div className="absolute inset-x-0 bottom-0 h-28 sm:h-44 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full mx-auto max-w-7xl px-4 sm:px-8 md:px-12 lg:px-16 py-12 sm:py-16 md:py-20 flex flex-col justify-center">
        <div key={currentIndex} className="max-w-2xl animate-slide-up">
          {/* Badge */}
          {badgeText && (
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 sm:px-4 sm:py-1.5 mb-3 sm:mb-5 w-fit">
              <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-400" />
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-bold tracking-wider sm:tracking-[0.2em] uppercase text-white/90">
                {badgeText}
              </span>
            </div>
          )}

          {/* Headline - fully responsive text scaling */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] sm:leading-[1.08] text-white mb-2.5 sm:mb-4 drop-shadow-md">
            {title}
          </h1>

          {/* Accent rule */}
          <div className="w-10 sm:w-16 h-[2.5px] sm:h-[3px] bg-gradient-to-r from-brand-400 to-white/30 rounded-full mb-3 sm:mb-5" />

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-slate-200/90 mb-5 sm:mb-7 md:mb-8 max-w-xl leading-relaxed font-light drop-shadow line-clamp-3 sm:line-clamp-none">
            {subtitle}
          </p>

          {/* CTAs - Responsive mobile layout: 2-column side-by-side or proportional single button */}
          <div
            className={`w-full sm:w-auto ${
              secondaryCtaText && secondaryCtaLink
                ? "grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 sm:gap-3.5 max-w-sm sm:max-w-none"
                : "flex flex-col min-[360px]:flex-row items-stretch min-[360px]:items-center gap-2.5 sm:gap-3.5"
            }`}
          >
            <a
              href={ctaLink}
              className={`group/cta inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-slate-950 px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-slate-100 active:scale-[0.98] transition-all shadow-xl hover:shadow-white/20 text-xs sm:text-sm tracking-wide min-h-[44px] sm:min-h-[46px] ${
                secondaryCtaText && secondaryCtaLink
                  ? "w-full sm:w-auto text-center"
                  : "w-full min-[360px]:w-auto min-[360px]:min-w-[180px] max-w-[280px] sm:max-w-none"
              }`}
            >
              <span className="truncate">{ctaText}</span>
              <ArrowRight size={14} className="shrink-0 transition-transform group-hover/cta:translate-x-0.5" />
            </a>

            {secondaryCtaText && secondaryCtaLink && (
              <Link
                href={secondaryCtaLink}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-md text-white border border-white/30 px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold sm:font-medium transition-all text-xs sm:text-sm active:scale-[0.98] min-h-[44px] sm:min-h-[46px] w-full sm:w-auto text-center"
              >
                <span className="truncate">{secondaryCtaText}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Multi-Banner Navigation (Arrows & Indicators) ── */}
      {isMulti && (
        <>
          {/* Left Arrow (Desktop / Tablet - visible on hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="hidden sm:flex absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-md border border-white/15 items-center justify-center transition-all opacity-0 group-hover/hero:opacity-100 hover:scale-110 active:scale-95 shadow-lg"
            aria-label="Previous banner slide"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* Right Arrow (Desktop / Tablet - visible on hover) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="hidden sm:flex absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-md border border-white/15 items-center justify-center transition-all opacity-0 group-hover/hero:opacity-100 hover:scale-110 active:scale-95 shadow-lg"
            aria-label="Next banner slide"
          >
            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* Slide Indicator Dots & Mobile Touch Navigation */}
          <div className="absolute bottom-3 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/50 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg">
            {/* Mobile Prev Micro-Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="sm:hidden p-1 -ml-1 text-white/70 hover:text-white active:scale-90 transition-all rounded-full"
              aria-label="Previous slide"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 px-0.5">
              {effectiveBanners.map((_, dotIdx) => {
                const isActive = dotIdx === currentIndex;
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setCurrentIndex(dotIdx)}
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-5 sm:w-6 bg-white shadow-xs"
                        : "w-1.5 sm:w-2 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                  />
                );
              })}
            </div>

            {/* Mobile Next Micro-Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="sm:hidden p-1 -mr-1 text-white/70 hover:text-white active:scale-90 transition-all rounded-full"
              aria-label="Next slide"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}

      {/* Static scroll indicator (when single banner on desktop) */}
      {!isMulti && (
        <div className="hidden md:flex absolute bottom-5 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-white/40 animate-bounce-in pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest font-medium">Scroll</span>
          <ChevronDown size={14} />
        </div>
      )}
    </section>
  );
}
