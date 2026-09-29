import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PromoBar } from "@/components/promo-bar";
import { NavBar } from "./nav-bar";
import { TopLoader } from "@/components/top-loader";
import { Logo } from "@/components/logo";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { NewProductPopup } from "@/components/new-product-popup";
import { AIStylistDrawer } from "@/components/ai-stylist-drawer";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fhdstore.pk"),
  manifest: "/manifest.webmanifest",
  title: {
    default: "FHD Store | Premium Quality Shirts & Essentials",
    template: "%s | FHD Store",
  },
  description: "Premium cotton shirts, fast nationwide delivery across Pakistan, and secure Cash on Delivery checkout.",
  keywords: ["shirts", "t-shirts", "cotton shirts", "pakistan fashion", "menswear", "fhd store", "fhd shirts", "cash on delivery", "cod"],
  openGraph: {
    title: "FHD Store | Premium Quality Shirts & Essentials",
    description: "Quality shirts, fast checkout, nationwide delivery in Pakistan.",
    url: "/",
    siteName: "FHD Store",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#f8f8fb] text-slate-900 antialiased flex flex-col font-sans" suppressHydrationWarning>
        <TopLoader />
        <PromoBar />
        <NavBar />
        <div className="flex-1">
          {children}
        </div>
        <PWAInstallPrompt />
        <NewProductPopup />
        <AIStylistDrawer />

        {/* ── Rich Footer ── */}
        <footer className="mt-24 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            {/* Top row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-slate-100">
              {/* Brand */}
              <div>
                <Link href="/" className="inline-block mb-3">
                  <Logo size="lg" />
                </Link>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                  Crafted with care, worn with pride. Premium cotton essentials designed for everyday comfort.
                </p>
                {/* Social icons */}
                <div className="flex gap-4 mt-6">
                  {[
                    { label: "Instagram", icon: "📸" },
                    { label: "Facebook", icon: "📘" },
                    { label: "Twitter", icon: "🐦" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href="#"
                      aria-label={s.label}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base hover:bg-brand-50 hover:ring-1 hover:ring-brand-200 transition-all"
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Shop</p>
                <ul className="space-y-3">
                  {[
                    { label: "New Arrivals", href: "/#products" },
                    { label: "All Products", href: "/#products" },
                    { label: "My Cart", href: "/cart" },
                    { label: "My Account", href: "/account" },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-slate-600 hover:text-brand-600 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Support</p>
                <ul className="space-y-3">
                  {[
                    { label: "About Us", href: "/policies/about" },
                    { label: "Shipping Policy", href: "/policies/shipping" },
                    { label: "Return Policy", href: "/policies/returns" },
                    { label: "Privacy Policy", href: "/policies/privacy" },
                    { label: "Terms of Service", href: "/policies/terms" },
                  ].map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-slate-600 hover:text-brand-600 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-slate-400">
              <p>© {new Date().getFullYear()} FHD Store. All rights reserved.</p>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                <span>Accepted Payments:</span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">💵 Cash on Delivery (COD)</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
