"use client";

import { useEffect, useState } from "react";
import type { AdminOrder, OrderItemWithProduct } from "@/lib/supabase/types";
import { InventoryForecastCard } from "@/components/admin/inventory-forecast-card";

const STATUSES = ["pending", "processing", "shipped", "fulfilled", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? "Not authorized" : "Failed to load");
        return res.json();
      })
      .then((data) => setOrders(data.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function updatePaymentStatus(
    orderId: string,
    payment_status: AdminOrder["payment_status"] | "failed"
  ) {
    if (
      payment_status === "failed" &&
      !window.confirm(
        "Are you sure you want to REJECT this payment? This will cancel the order and RESTORE the reserved inventory stock."
      )
    ) {
      return;
    }

    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, payment_status }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      window.alert(data?.error ?? "Failed to update payment status");
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              payment_status: payment_status as AdminOrder["payment_status"],
              status: payment_status === "failed" ? "cancelled" : o.status,
            }
          : o
      )
    );
  }

  async function updateStatus(orderId: string, status: AdminOrder["status"]) {
    let courier: string | null = null;
    let tracking_number: string | null = null;

    if (status === "shipped") {
      courier = window.prompt("Enter the Courier Name (e.g. TCS, Leopard, Trax):");
      if (courier === null) return; // User cancelled
      tracking_number = window.prompt("Enter the Tracking Number:");
      if (tracking_number === null) return; // User cancelled
    }

    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, courier, tracking_number }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      window.alert(data?.error ?? "Failed to update order");
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              payment_status:
                status === "fulfilled" && o.payment_method === "cod" ? "paid" : o.payment_status,
              courier: status === "shipped" ? courier : o.courier,
              tracking_number: status === "shipped" ? tracking_number : o.tracking_number,
            }
          : o
      )
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
        <p className="text-sm font-medium text-slate-500">Loading customer orders…</p>
      </div>
    </div>
  );

  if (error)
    return (
      <main className="mx-auto max-w-5xl px-3.5 sm:px-4 py-6 sm:py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold text-base">{error}</p>
        </div>
      </main>
    );

  return (
    <div className="mx-auto max-w-5xl pb-16 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders Manager</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track fulfillment, update tracking numbers, and verify payment transactions.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full self-start sm:self-auto">
          {orders.length} Total Order{orders.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* AI Inventory Demand & Stockout Velocity Warnings */}
      <InventoryForecastCard />

      {orders.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <p className="text-base font-semibold text-slate-700">No orders yet</p>
          <p className="text-xs text-slate-400 mt-1">New customer orders will appear here in real-time.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold font-mono text-slate-900 text-base">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <span className="text-xs text-slate-400">•</span>
                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Payment Method Badge */}
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase border ${
                    order.payment_method === "cod"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : order.payment_method === "jazzcash"
                      ? "bg-red-50 text-red-800 border-red-200"
                      : order.payment_method === "easypaisa"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {order.payment_method === "cod"
                    ? "💵 COD"
                    : order.payment_method === "jazzcash"
                    ? "📱 JazzCash"
                    : order.payment_method === "easypaisa"
                    ? "🟢 Easypaisa"
                    : "💳 Stripe"}
                </span>

                {/* Payment Status with quick toggle */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-slate-500">Payment:</span>
                  <span
                    className={`font-bold capitalize ${
                      order.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {order.payment_status}
                  </span>
                  <button
                    onClick={() =>
                      updatePaymentStatus(
                        order.id,
                        order.payment_status === "paid" ? "unpaid" : "paid"
                      )
                    }
                    className="ml-1 text-[11px] text-brand-600 hover:text-brand-800 underline font-semibold"
                    title="Click to toggle payment verification status"
                  >
                    {order.payment_status === "paid" ? "Mark Unpaid" : "Mark Paid"}
                  </button>
                </div>

                {/* Order Status Selector */}
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value as AdminOrder["status"])}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 shadow-2xs focus:border-black focus:outline-none capitalize"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Reference / TID Details */}
            {order.payment_reference && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-600">Payment Ref / TID:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{order.payment_reference}</span>
                </div>
                {order.payment_status !== "paid" && (order.payment_method === "jazzcash" || order.payment_method === "easypaisa") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updatePaymentStatus(order.id, "paid")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      ✓ Confirm TID & Mark Paid
                    </button>
                    <button
                      onClick={() => updatePaymentStatus(order.id, "failed")}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      ✗ Reject & Restore Stock
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {order.order_items?.map((item: OrderItemWithProduct, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 gap-3">
                  <span className="text-slate-800 font-medium">
                    {item.product_variants?.products?.name}{" "}
                    <span className="text-slate-400 font-normal">
                      ({item.product_variants?.size}/{item.product_variants?.color})
                    </span>{" "}
                    <span className="font-bold text-slate-900">× {item.qty}</span>
                  </span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    Rs {(item.price_at_purchase * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Customer & Address Details Box */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-100 text-xs">
                {/* Contact Info */}
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>👤</span>
                    <span>{order.shipping_address?.fullName || "Customer"}</span>
                  </p>
                  {order.shipping_address?.email && (
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400">✉️</span>
                      <a href={`mailto:${order.shipping_address.email}`} className="text-brand-600 hover:underline">
                        {order.shipping_address.email}
                      </a>
                    </p>
                  )}
                  {order.shipping_address?.phone && (
                    <p className="text-slate-700 flex items-center gap-1.5 font-medium">
                      <span className="text-slate-400">📞</span>
                      <a href={`tel:${order.shipping_address.phone}`} className="font-mono hover:underline">
                        {order.shipping_address.phone}
                      </a>
                      <a
                        href={`https://wa.me/${order.shipping_address.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-200 transition"
                      >
                        WhatsApp
                      </a>
                    </p>
                  )}
                  {order.shipping_address?.alternatePhone && (
                    <p className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">📱 Alt:</span>
                      <span className="font-mono">{order.shipping_address.alternatePhone}</span>
                    </p>
                  )}
                </div>

                {/* Delivery Location */}
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{order.shipping_address?.city || "City"}</span>
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    {order.shipping_address?.address || order.shipping_address?.streetAddress || "Address not specified"}
                  </p>
                  {order.shipping_address?.landmark && (
                    <p className="text-amber-800 text-[11px] bg-amber-50 rounded px-2 py-0.5 border border-amber-200/60 inline-block font-medium">
                      Landmark: {order.shipping_address.landmark}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Notes / Special Instructions */}
              {order.shipping_address?.deliveryNotes && (
                <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-2.5 text-xs text-blue-900 flex items-start gap-2">
                  <span className="shrink-0 text-sm">📝</span>
                  <div>
                    <span className="font-bold text-blue-950">Customer Delivery Note: </span>
                    <span>{order.shipping_address.deliveryNotes}</span>
                  </div>
                </div>
              )}

              {/* Order Total Line */}
              <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">Order Total (incl. Delivery & Discounts)</span>
                <span className="font-extrabold text-slate-950 text-base">
                  Rs {Number(order.total).toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Courier Tracking Box */}
            {order.courier && order.tracking_number && (
              <div className="rounded-xl bg-blue-50/80 p-2.5 text-xs text-blue-900 border border-blue-200/60 flex items-center justify-between flex-wrap gap-2">
                <p>
                  <strong>Courier:</strong> {order.courier} | <strong>Tracking:</strong> <span className="font-mono font-bold">{order.tracking_number}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
