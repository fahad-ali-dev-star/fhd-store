import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/api/errors";

export interface StockForecastAlert {
  variantId: string;
  productName: string;
  productSlug: string;
  sku: string;
  size: string;
  color: string;
  currentStock: number;
  unitsSold14d: number;
  dailyVelocity: number;
  runwayDays: number | null;
  status: "critical" | "warning" | "healthy" | "idle";
  recommendedRestock: number;
}

export async function GET(_req: NextRequest) {
  try {
    const { authorized } = await requireAdmin();
    if (!authorized && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Fetch all product variants with product info
    const { data: variants, error: varError } = await supabase
      .from("product_variants")
      .select("id, size, color, sku, stock_qty, product_id, products(id, name, slug, is_active)")
      .order("stock_qty", { ascending: true });

    if (varError) {
      logServerError("Failed to fetch variants for forecast", varError);
      return NextResponse.json({ error: "Failed to load inventory data" }, { status: 500 });
    }

    // 2. Fetch order items from past 14 days to compute sales velocity
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: recentOrderItems, error: itemsError } = await (supabase as any)
      .from("order_items")
      .select("variant_id, qty, orders!inner(status, created_at)")
      .neq("orders.status", "cancelled")
      .gte("orders.created_at", fourteenDaysAgo.toISOString());

    if (itemsError) {
      logServerError("Failed to fetch order items for velocity calculation", itemsError);
    }

    // Map units sold per variant
    const salesMap = new Map<string, number>();
    if (recentOrderItems && Array.isArray(recentOrderItems)) {
      for (const item of recentOrderItems) {
        if (item.variant_id) {
          const current = salesMap.get(item.variant_id) || 0;
          salesMap.set(item.variant_id, current + (item.qty || 1));
        }
      }
    }

    const alerts: StockForecastAlert[] = [];

    for (const v of variants || []) {
      const product = (v as any).products;
      if (!product || !product.is_active) continue;

      const unitsSold = salesMap.get(v.id) || 0;
      const dailyVelocity = Number((unitsSold / 14).toFixed(2));
      const currentStock = v.stock_qty || 0;

      let runwayDays: number | null = null;
      let status: StockForecastAlert["status"] = "idle";

      if (dailyVelocity > 0) {
        runwayDays = Math.round(currentStock / dailyVelocity);
        if (currentStock === 0 || runwayDays <= 4) {
          status = "critical";
        } else if (runwayDays <= 12) {
          status = "warning";
        } else {
          status = "healthy";
        }
      } else if (currentStock <= 2) {
        status = "warning";
      }

      // Recommend a 30-day stock buffer
      const recommendedRestock = dailyVelocity > 0 ? Math.ceil(dailyVelocity * 30) : 15;

      alerts.push({
        variantId: v.id,
        productName: product.name,
        productSlug: product.slug,
        sku: v.sku,
        size: v.size,
        color: v.color,
        currentStock,
        unitsSold14d: unitsSold,
        dailyVelocity,
        runwayDays,
        status,
        recommendedRestock,
      });
    }

    // Sort by most urgent first
    const statusPriority = { critical: 0, warning: 1, healthy: 2, idle: 3 };
    alerts.sort((a, b) => {
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.runwayDays ?? 999) - (b.runwayDays ?? 999);
    });

    const criticalCount = alerts.filter((a) => a.status === "critical").length;
    const warningCount = alerts.filter((a) => a.status === "warning").length;

    return NextResponse.json({
      success: true,
      summary: {
        totalTracked: alerts.length,
        criticalCount,
        warningCount,
      },
      alerts,
    });
  } catch (err) {
    logServerError("Inventory forecast route error", err);
    return NextResponse.json({ error: "Failed to generate inventory forecast" }, { status: 500 });
  }
}
