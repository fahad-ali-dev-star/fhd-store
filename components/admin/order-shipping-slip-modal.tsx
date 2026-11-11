"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Printer, Copy, Check, MessageSquare, Phone, Package, MapPin } from "lucide-react";
import type { AdminOrder } from "@/lib/supabase/types";

interface OrderShippingSlipModalProps {
  order: AdminOrder | null;
  onClose: () => void;
}

export function OrderShippingSlipModal({ order, onClose }: OrderShippingSlipModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!order) return;
    QRCode.toDataURL(order.id, {
      width: 140,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Failed to generate QR code", err));
  }, [order]);

  if (!order) return null;

  const addr = order.shipping_address || {};
  const isCod = order.payment_method === "cod";
  const totalQty = order.order_items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;

  const formattedAddressText = `Name: ${addr.fullName || "Customer"}
Phone: ${addr.phone || "N/A"}${addr.alternatePhone ? `\nAlt Phone: ${addr.alternatePhone}` : ""}
Address: ${addr.address || addr.streetAddress || "Address not provided"}
City: ${addr.city || "Pakistan"}
${addr.landmark ? `Landmark: ${addr.landmark}\n` : ""}${addr.deliveryNotes ? `Delivery Notes: ${addr.deliveryNotes}\n` : ""}Order: #${order.id.slice(0, 8).toUpperCase()}
Total: Rs ${Number(order.total).toLocaleString()} (${isCod ? "Cash on Delivery" : "Prepaid"})`;

  function handleCopyAddress() {
    navigator.clipboard.writeText(formattedAddressText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Printer className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Order Dispatch Slip & Shipping Label</h3>
              <p className="text-[11px] text-slate-500">Ready to print & stick on delivery parcel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAddress}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
              title="Copy formatted address to paste in courier portal (Trax / Leopards / TCS / PostEx)"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
              <span>{copied ? "Copied!" : "Copy for Courier"}</span>
            </button>

            {addr.phone && (
              <a
                href={`https://wa.me/${addr.phone.replace(/[^0-9]/g, "")}?text=Assalam-o-Alaikum%20${encodeURIComponent(addr.fullName || "Customer")},%20we%20have%20received%20your%20order%20%23${order.id.slice(0, 8).toUpperCase()}%20of%20Rs%20${Number(order.total).toLocaleString()}%20at%20FHD%20Shirt%20Store.%20Please%20confirm%20your%20delivery%20address.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                title="Send WhatsApp confirmation before dispatch"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp Confirm</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Shipping Label (The actual "Slip / Clip") */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="shipping-slip"
            className="mx-auto max-w-xl bg-white border-2 border-black rounded-lg p-5 sm:p-6 text-black shadow-sm font-sans space-y-4 print:shadow-none print:border-2 print:border-black print:max-w-none print:w-full print:rounded-none"
          >
            {/* Slip Header */}
            <div className="flex items-start justify-between border-b-2 border-black pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👕</span>
                  <h1 className="text-xl font-black uppercase tracking-wider">FHD SHIRT STORE</h1>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                  Premium Apparel & Designer Shirts • Pakistan
                </p>
                <p className="text-[10px] text-slate-500">
                  Customer Care & WhatsApp: +92 300 0000000 | support@fhdstore.com
                </p>
              </div>

              {/* Order ID & QR Code */}
              <div className="flex flex-col items-end shrink-0">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeUrl} alt="Order QR" className="h-16 w-16 border border-black/30 p-0.5 rounded" />
                ) : (
                  <div className="h-16 w-16 bg-slate-100 border border-black flex items-center justify-center text-[10px]">
                    QR Code
                  </div>
                )}
                <span className="font-mono font-black text-xs sm:text-sm mt-1">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-[9px] text-slate-500">
                  {new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Courier Consignee & Shipper Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b-2 border-black pb-4 text-xs">
              {/* Consignee (DELIVERY ADDRESS - PROMINENT) */}
              <div className="border border-black rounded p-3 bg-slate-50/50 print:bg-white space-y-1">
                <p className="font-black text-[11px] uppercase tracking-wider text-black flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>DELIVER TO (CONSIGNEE):</span>
                </p>
                <p className="font-extrabold text-sm text-black leading-tight">
                  {addr.fullName || "Customer"}
                </p>
                <p className="font-mono font-bold text-xs text-black flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{addr.phone || "N/A"}</span>
                  {addr.alternatePhone && (
                    <span className="text-slate-600 font-normal"> / {addr.alternatePhone}</span>
                  )}
                </p>
                <p className="text-xs text-slate-800 leading-relaxed font-medium pt-0.5">
                  {addr.address || addr.streetAddress || "Address not provided"}
                </p>
                {addr.landmark && (
                  <p className="text-[11px] text-black font-semibold">
                    <span className="text-slate-500 font-normal">Landmark: </span>
                    {addr.landmark}
                  </p>
                )}
                <p className="font-black text-xs text-black uppercase pt-1">
                  CITY: {addr.city || "Pakistan"}
                </p>
                {addr.deliveryNotes && (
                  <div className="mt-1 pt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-700 italic">
                    <strong>Rider Note:</strong> {addr.deliveryNotes}
                  </div>
                )}
              </div>

              {/* Shipper & Logistics Details */}
              <div className="border border-black rounded p-3 space-y-1.5 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-[11px] uppercase tracking-wider text-black flex items-center gap-1">
                    <Package className="h-3 w-3 shrink-0" />
                    <span>SHIPPER (RETURN TO):</span>
                  </p>
                  <p className="font-bold text-xs text-black">FHD Shirt Store Logistics Hub</p>
                  <p className="text-[11px] text-slate-700">Fulfillment Center, Warehouse Dispatch</p>
                  <p className="text-[11px] text-slate-700">Lahore / Karachi, Pakistan</p>
                  <p className="font-mono text-[11px] text-slate-700">Helpline: +92 300 0000000</p>
                </div>

                <div className="border-t border-black/40 pt-1.5 grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <span className="text-slate-500">Weight: </span>
                    <span className="font-bold">~0.5 KG</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Pieces: </span>
                    <span className="font-bold">{totalQty} pcs</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Courier: </span>
                    <span className="font-bold uppercase font-mono">{order.courier || "Standard Courier"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT COLLECTION BOX (EXTREMELY PROMINENT FOR COURIER RIDER) */}
            <div
              className={`p-3 rounded border-2 text-center ${
                isCod
                  ? "border-black bg-black text-white print:bg-black print:text-white"
                  : "border-black bg-slate-100 text-black print:bg-slate-100"
              }`}
            >
              {isCod ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-300">
                    CASH ON DELIVERY (COD)
                  </p>
                  <p className="text-2xl font-black tracking-tight mt-0.5">
                    COLLECT CASH: Rs {Number(order.total).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-200 mt-0.5">
                    Courier Rider: Do not hand over parcel before collecting exact amount.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800">
                    PREPAID ORDER
                  </p>
                  <p className="text-xl font-black text-black">
                    PAID ONLINE — DO NOT COLLECT CASH
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Payment Method: {order.payment_method?.toUpperCase()} • Ref: {order.payment_reference || "Verified"}
                  </p>
                </div>
              )}
            </div>

            {/* Parcel Itemized Contents */}
            <div className="border border-black rounded overflow-hidden text-xs">
              <div className="bg-slate-100 border-b border-black px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider grid grid-cols-12 text-black">
                <span className="col-span-6">Item Description</span>
                <span className="col-span-3 text-center">Variant</span>
                <span className="col-span-1 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
              </div>
              <div className="divide-y divide-black/20">
                {order.order_items?.map((item, idx) => (
                  <div key={idx} className="px-3 py-1.5 grid grid-cols-12 items-center text-slate-900">
                    <span className="col-span-6 font-semibold truncate pr-2">
                      {item.product_variants?.products?.name || "Shirt"}
                    </span>
                    <span className="col-span-3 text-center text-[11px] font-mono">
                      {item.product_variants?.size} / {item.product_variants?.color}
                    </span>
                    <span className="col-span-1 text-center font-bold">
                      {item.qty}
                    </span>
                    <span className="col-span-2 text-right font-mono font-semibold">
                      Rs {(item.price_at_purchase * item.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer / Instructions / Cutline */}
            <div className="border-t-2 border-dashed border-black pt-3 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-2">
              <p>
                <strong>Security:</strong> Do not accept if package seal is damaged or tampered.
              </p>
              <p className="font-mono font-semibold uppercase">
                ✂️ Fold & Place in Courier Flyer Pouch ✂️
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
