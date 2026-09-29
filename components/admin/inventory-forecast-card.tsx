"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, TrendingUp, Sparkles, Package, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import type { StockForecastAlert } from "@/app/api/admin/analytics/forecast/route";

export function InventoryForecastCard() {
  const [alerts, setAlerts] = useState<StockForecastAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ totalTracked: number; criticalCount: number; warningCount: number } | null>(null);

  async function fetchForecast() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/forecast");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error("Failed to fetch forecast", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchForecast();
  }, []);

  const urgentItems = alerts.filter((a) => a.status === "critical" || a.status === "warning");

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium">Computing AI Demand Velocity & Stockout Risk...</span>
        </div>
      </div>
    );
  }

  if (urgentItems.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-emerald-950">
              Inventory Velocity Healthy
            </h4>
            <p className="text-[11px] text-emerald-700">
              All active variants have adequate stock runway based on 14-day sales velocity.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchForecast}
          className="p-1.5 text-emerald-600 hover:text-emerald-800"
          title="Refresh forecast"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-950">
                AI Inventory Demand Forecasting
              </h3>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                {summary?.criticalCount || 0} Critical • {summary?.warningCount || 0} Low Stock
              </span>
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Based on real sales velocity from the last 14 days. Reorder recommended before stockouts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchForecast}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-700 p-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {urgentItems.slice(0, 6).map((item) => (
          <div
            key={item.variantId}
            className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white p-3 shadow-xs hover:border-amber-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {item.sku}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    item.status === "critical"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.status === "critical" ? "Depleting Fast" : "Low Runway"}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {item.productName}
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Size: <span className="font-semibold">{item.size}</span> • Color: <span className="font-semibold">{item.color}</span>
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Current Stock:</span>
                <span className={`font-bold ${item.currentStock <= 2 ? "text-rose-600" : "text-slate-900"}`}>
                  {item.currentStock} units
                </span>
              </div>
              {item.runwayDays !== null && (
                <div className="flex justify-between">
                  <span>Estimated Runway:</span>
                  <span className="font-semibold text-amber-700">
                    ~{item.runwayDays} days left
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Suggested Reorder:</span>
                <span className="font-bold text-indigo-600">
                  +{item.recommendedRestock} units
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
