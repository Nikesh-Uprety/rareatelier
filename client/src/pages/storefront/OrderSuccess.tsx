import { useRoute, Link } from "wouter";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Package, Truck, MapPin, Printer, LifeBuoy, ClipboardCheck, Sparkles } from "lucide-react";
import { fetchOrderById, fetchOrderByTrackingToken, getCachedLatestOrder, updateCachedOrder, type OrderDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { formatStorefrontPrice as formatPrice, displayEmptyField } from "@/lib/format";
import { StorefrontSeo } from "@/components/seo/StorefrontSeo";

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    cash_on_delivery: "Cash on Delivery",
    bank_transfer: "Bank Transfer",
    card: "Card",
    esewa: "eSewa",
    khalti: "Khalti",
    fonepay: "Fonepay",
    stripe: "Pay by Card",
  };
  return labels[method] ?? method.replace(/_/g, " ");
}

function firstNameFromFull(fullName: string) {
  const t = fullName.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function meaningfulOrderColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "default") return null;
  return trimmed;
}

function selectedColorLabel(item: any): string {
  const variantColor = meaningfulOrderColor(item?.variantColor);
  if (variantColor) return variantColor;

  const color = meaningfulOrderColor(item?.color);
  if (color) return color;

  const options = parseJsonArray(item?.product?.colorOptions);
  return options[0] ?? "-";
}

const ORDER_COLOR_NAME_SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f5",
  cream: "#f2eadf",
  ivory: "#fff8e7",
  beige: "#d8c3a5",
  brown: "#7a5a43",
  mocha: "#7b5b45",
  grey: "#7c7c7c",
  gray: "#7c7c7c",
  blue: "#2548b1",
  navy: "#1f2a44",
  "navy blue": "#1f2a44",
  green: "#2f7d32",
  red: "#c62828",
  maroon: "#6b1f2a",
  burgundy: "#6d213c",
  pink: "#f7a6ec",
  purple: "#7c3aed",
  yellow: "#facc15",
  orange: "#f97316",
  gold: "#c9a84c",
};

function parseOrderColor(value: string): { label: string; swatch: string | null } {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/);
  const label = trimmed.replace(/\(\s*#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\s*\)/g, "").trim();
  const normalized = label.toLowerCase();
  return {
    label: label || trimmed,
    swatch: hexMatch?.[0] ?? ORDER_COLOR_NAME_SWATCHES[normalized] ?? null,
  };
}

function normalizeOrderDetail(order: unknown): OrderDetail | null {
  if (!order || typeof order !== "object") return null;
  const candidate = order as Partial<OrderDetail>;
  return {
    ...candidate,
    id: typeof candidate.id === "string" ? candidate.id : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    fullName: typeof candidate.fullName === "string" ? candidate.fullName : "Customer",
    addressLine1: typeof candidate.addressLine1 === "string" ? candidate.addressLine1 : "",
    addressLine2: typeof candidate.addressLine2 === "string" ? candidate.addressLine2 : null,
    city: typeof candidate.city === "string" ? candidate.city : "",
    region: typeof candidate.region === "string" ? candidate.region : "",
    postalCode: typeof candidate.postalCode === "string" ? candidate.postalCode : "",
    country: typeof candidate.country === "string" ? candidate.country : "",
    total: Number(candidate.total ?? 0),
    status: typeof candidate.status === "string" ? candidate.status : "pending",
    paymentMethod: typeof candidate.paymentMethod === "string" ? candidate.paymentMethod : "cash_on_delivery",
    paymentProofUrl: typeof candidate.paymentProofUrl === "string" ? candidate.paymentProofUrl : null,
    paymentVerified: typeof candidate.paymentVerified === "string" ? candidate.paymentVerified : null,
    locationCoordinates: typeof candidate.locationCoordinates === "string" ? candidate.locationCoordinates : null,
    deliveryLocation: typeof candidate.deliveryLocation === "string" ? candidate.deliveryLocation : null,
    deliveryRequired: typeof candidate.deliveryRequired === "boolean" ? candidate.deliveryRequired : true,
    deliveryProvider: typeof candidate.deliveryProvider === "string" ? candidate.deliveryProvider : null,
    deliveryAddress: typeof candidate.deliveryAddress === "string" ? candidate.deliveryAddress : null,
    trackingToken: typeof candidate.trackingToken === "string" ? candidate.trackingToken : null,
    promoCode: typeof candidate.promoCode === "string" ? candidate.promoCode : null,
    promoDiscountAmount: typeof candidate.promoDiscountAmount === "number" ? candidate.promoDiscountAmount : null,
    createdAt: candidate.createdAt ?? new Date().toISOString(),
    items: Array.isArray(candidate.items) ? candidate.items : [],
  };
}

type OrderLineItem = OrderDetail["items"][number];

function orderItemVariantLabel(item: OrderLineItem): string {
  const sizeLabel = String(item.size ?? "").trim();
  const colorLabel = selectedColorLabel(item);
  const parts = [
    sizeLabel ? `Size ${sizeLabel}` : "",
    colorLabel !== "-" ? `Color ${parseOrderColor(colorLabel).label}` : "",
  ].filter(Boolean);
  return parts.join(" / ") || "Standard";
}

function orderReceiptCustomerLines(order: OrderDetail): string[] {
  return [order.fullName, order.email].filter((value): value is string => Boolean(value && value.trim()));
}

function orderReceiptDeliveryLines(order: OrderDetail): string[] {
  const locationLine = [order.deliveryLocation, order.locationCoordinates].find(
    (value): value is string => Boolean(value && value.trim()),
  );
  const addressLine = [order.addressLine1, order.addressLine2]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(", ");
  const localityLine = [order.city, order.region, order.postalCode]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(", ");
  const lines = [
    locationLine,
    addressLine,
    localityLine,
    order.country,
    order.deliveryAddress ? `Landmark: ${order.deliveryAddress}` : null,
  ].filter((value): value is string => Boolean(value && value.trim()));
  return Array.from(new Set(lines));
}

function buildOrderPdfFileName(order: OrderDetail): string {
  return `rare-order-${order.id.slice(0, 8)}.pdf`;
}

async function downloadOrderReceiptPdf(params: {
  order: OrderDetail;
  orderDateLabel: string;
  itemsSubtotal: number;
  shippingFee: number;
  promoDiscountAmount: number;
}) {
  const { order, orderDateLabel, itemsSubtotal, shippingFee, promoDiscountAmount } = params;
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const rightEdge = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;
  const itemWidth = 68;
  const variantWidth = 44;
  const qtyWidth = 12;
  const unitWidth = 24;
  const totalWidth = contentWidth - itemWidth - variantWidth - qtyWidth - unitWidth;
  const tableStartX = margin;
  const tableVariantX = tableStartX + itemWidth;
  const tableQtyX = tableVariantX + variantWidth;
  const tableUnitX = tableQtyX + qtyWidth;
  const tableTotalX = tableUnitX + unitWidth;
  let y = margin;

  const ensureSpace = (spaceNeeded: number, onPageBreak?: () => void) => {
    if (y + spaceNeeded <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
    onPageBreak?.();
  };

  const drawRule = () => {
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y, rightEdge, y);
    y += 5;
  };

  const drawSectionHeading = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(title.toUpperCase(), margin, y);
    y += 5;
  };

  const drawInfoColumn = (x: number, width: number, title: string, lines: string[]) => {
    let localY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(title.toUpperCase(), x, localY);
    localY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    const resolvedLines = lines.length ? lines : ["-"];
    for (const line of resolvedLines) {
      const wrapped = doc.splitTextToSize(line, width);
      doc.text(wrapped, x, localY);
      localY += wrapped.length * 4.4 + 1.2;
    }
    return localY;
  };

  const drawTableHeader = () => {
    doc.setFillColor(244, 244, 245);
    doc.rect(margin, y - 3.5, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text("Item", tableStartX, y + 1.5);
    doc.text("Variant", tableVariantX, y + 1.5);
    doc.text("Qty", tableQtyX + qtyWidth / 2, y + 1.5, { align: "center" });
    doc.text("Unit", tableUnitX + unitWidth, y + 1.5, { align: "right" });
    doc.text("Subtotal", tableTotalX + totalWidth, y + 1.5, { align: "right" });
    y += 8;
  };

  doc.setProperties({
    title: `Order ${order.id}`,
    subject: "Rare Atelier order receipt",
    author: "RARE.NP",
    creator: "RARE.NP storefront",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39);
  doc.text("RARE.NP", margin, y);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text("Official Order Receipt", rightEdge, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(`Order ID: ${order.id}`, margin, y);
  doc.text(orderDateLabel, rightEdge, y, { align: "right" });
  y += 5;
  doc.text(`Payment: ${paymentMethodLabel(order.paymentMethod)}`, margin, y);
  const statusLabel = order.paymentVerified === "verified" ? "Paid" : order.status;
  doc.text(`Status: ${statusLabel}`, rightEdge, y, { align: "right" });
  y += 4;
  drawRule();

  ensureSpace(34);
  const columnGap = 12;
  const columnWidth = (contentWidth - columnGap) / 2;
  const customerEndY = drawInfoColumn(margin, columnWidth, "Customer", orderReceiptCustomerLines(order));
  const deliveryEndY = drawInfoColumn(margin + columnWidth + columnGap, columnWidth, "Delivery", orderReceiptDeliveryLines(order));
  y = Math.max(customerEndY, deliveryEndY) + 2;
  drawRule();

  drawSectionHeading("Items");
  drawTableHeader();

  for (const item of order.items) {
    const itemName = item.product?.name || "Product";
    const nameLines = doc.splitTextToSize(itemName, itemWidth - 4);
    const variantLines = doc.splitTextToSize(orderItemVariantLabel(item), variantWidth - 4);
    const rowHeight = Math.max(nameLines.length, variantLines.length) * 4.6 + 3;
    ensureSpace(rowHeight + 3, drawTableHeader);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(nameLines, tableStartX, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(variantLines, tableVariantX, y);
    doc.text(String(item.quantity), tableQtyX + qtyWidth / 2, y, { align: "center" });
    doc.text(formatPrice(item.unitPrice), tableUnitX + unitWidth, y, { align: "right" });
    doc.text(formatPrice(Number(item.unitPrice) * item.quantity), tableTotalX + totalWidth, y, { align: "right" });

    y += rowHeight;
    doc.setDrawColor(236, 236, 236);
    doc.line(margin, y - 1.5, rightEdge, y - 1.5);
  }

  y += 3;
  ensureSpace(30);
  const totalsLabelX = rightEdge - 70;
  const totalsValueX = rightEdge;
  const writeTotalRow = (label: string, value: string, isGrand = false) => {
    doc.setFont("helvetica", isGrand ? "bold" : "normal");
    doc.setFontSize(isGrand ? 11 : 10);
    doc.setTextColor(17, 24, 39);
    doc.text(label, totalsLabelX, y);
    doc.text(value, totalsValueX, y, { align: "right" });
    y += isGrand ? 7 : 5.5;
  };

  writeTotalRow("Subtotal", formatPrice(itemsSubtotal));
  if (promoDiscountAmount > 0) {
    writeTotalRow(order.promoCode ? `Discount (${order.promoCode})` : "Discount", `- ${formatPrice(promoDiscountAmount)}`);
  }
  writeTotalRow("Shipping", formatPrice(shippingFee));
  doc.setDrawColor(209, 213, 219);
  doc.line(totalsLabelX, y - 2, totalsValueX, y - 2);
  y += 2;
  writeTotalRow("Grand Total", formatPrice(order.total), true);

  ensureSpace(18);
  drawRule();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const footerLines = [
    "Thank you for shopping with RARE.NP.",
    order.paymentVerified === "verified"
      ? "Your payment has been confirmed and the order is moving to fulfillment."
      : "If your payment is still under review, our team will verify it shortly.",
    "For delivery or order questions, please contact the store support team.",
  ];
  for (const line of footerLines) {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.2 + 1;
  }

  doc.save(buildOrderPdfFileName(order));
}

export default function OrderSuccess() {
  const [, newParams] = useRoute("/order-confirmation/:orderId");
  const [, legacyParams] = useRoute("/checkout/success/:id");
  const [, trackParams] = useRoute("/orders/track/:token");
  const orderId = newParams?.orderId ?? legacyParams?.id;
  const trackingToken = trackParams?.token;
  const isTrackingView = Boolean(trackingToken);
  const rawCachedOrder = trackingToken ? null : getCachedLatestOrder(orderId);
  const cachedOrder = normalizeOrderDetail(rawCachedOrder);

  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ["order", trackingToken ?? orderId],
    queryFn: () => trackingToken ? fetchOrderByTrackingToken(trackingToken) : fetchOrderById(orderId!),
    enabled: Boolean(trackingToken || orderId),
    initialData: cachedOrder ?? undefined,
  });
  const order = normalizeOrderDetail(fetchedOrder) ?? cachedOrder;
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (fetchedOrder) {
      updateCachedOrder(fetchedOrder);
    }
  }, [fetchedOrder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [orderId, trackingToken]);

  const itemsSubtotal = order
    ? order.items.reduce(
        (acc: number, item: any) => acc + Number(item.unitPrice) * item.quantity,
        0,
      )
    : 0;
  const shippingFee = 100;
  const promoDiscountAmount =
    typeof order?.promoDiscountAmount === "number" ? order.promoDiscountAmount : 0;

  if (isLoading) {
    return (
      <>
        <StorefrontSeo
          title={isTrackingView ? "Track Order | Rare Atelier" : "Order Confirmed | Rare Atelier"}
          description={isTrackingView ? "Track your Rare Atelier order and review its current details." : "Your Rare Atelier order has been placed successfully."}
          canonicalPath={typeof window !== "undefined" ? window.location.pathname : isTrackingView ? "/orders/track" : "/order-confirmation"}
          noIndex
        />
        <div className="min-h-[70vh] flex items-center justify-center">
          <BrandedLoader />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <StorefrontSeo
          title={isTrackingView ? "Track Order | Rare Atelier" : "Order Confirmation | Rare Atelier"}
          description={isTrackingView ? "This order tracking page is not available." : "This order confirmation page is not available."}
          canonicalPath={typeof window !== "undefined" ? window.location.pathname : isTrackingView ? "/orders/track" : "/order-confirmation"}
          noIndex
        />
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't find this order, or you do not have access to view it.
          </p>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </>
    );
  }

  const firstName = firstNameFromFull(order.fullName);
  const pageEyebrow = isTrackingView ? "ORDER TRACKING" : "ORDER CONFIRMED";
  const orderDateLabel = new Date(order.createdAt).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDownloadPdf = async () => {
    if (!order) return;
    setIsDownloadingPdf(true);
    try {
      await downloadOrderReceiptPdf({
        order,
        orderDateLabel,
        itemsSubtotal,
        shippingFee,
        promoDiscountAmount,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div
      className="order-confirmation-page container mx-auto max-w-5xl px-4 pb-10 lg:pb-16"
      style={{ paddingTop: "calc(var(--nav-h) + 1.75rem)" }}
    >
      <StorefrontSeo
        title={isTrackingView ? "Track Order | Rare Atelier" : "Order Confirmed | Rare Atelier"}
        description={isTrackingView ? `Track order ${order.id.slice(0, 8)} and review delivery, payment, and item details.` : `Your order ${order.id.slice(0, 8)}… has been confirmed. View your bill and delivery details.`}
        canonicalPath={isTrackingView && order.trackingToken ? `/orders/track/${order.trackingToken}` : `/order-confirmation/${order.id}`}
        noIndex
      />
      <style>
        {`
          @keyframes ocFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
          @keyframes ocGlowPulse {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.25; transform: scale(1.05); }
          }
          @keyframes ocIconSpin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(8deg) scale(1.15); }
            100% { transform: rotate(0deg) scale(1); }
          }
          @keyframes ocBorderShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes ocFadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .order-confirm-icon-float { animation: ocFloat 3s ease-in-out infinite; }
          .order-confirm-icon-glow { animation: ocGlowPulse 2.5s ease-in-out infinite; }
          .order-confirm-step:hover .step-icon { animation: ocIconSpin 0.6s ease-in-out; }
          .order-confirm-step:hover .step-card { transform: translateY(-6px); box-shadow: 0 12px 40px -8px var(--step-shadow); }
          .order-confirm-step { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .step-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .step-icon { transition: transform 0.3s ease; }
          .order-confirm-fade-in { animation: ocFadeInUp 0.6s ease-out both; }
          .order-confirm-fade-in-delay-1 { animation: ocFadeInUp 0.6s ease-out 0.15s both; }
          .order-confirm-fade-in-delay-2 { animation: ocFadeInUp 0.6s ease-out 0.3s both; }
        `}
      </style>

      {/* Success hero — screen only */}
      <div className="no-print relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/6 via-background to-blue-500/5 dark:from-emerald-500/5 dark:via-background dark:to-blue-500/5 px-6 pb-10 pt-10 md:px-10 md:pb-14 md:pt-16">
        {/* Blurred white depth orbs */}
        <span className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/25" />
        <span className="pointer-events-none absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-blue-200/30 blur-2xl dark:bg-blue-900/20" />
        <div className="relative flex flex-col items-center text-center">
          {/* Animated order-completed icon */}
          <div className="order-confirm-icon-float relative mb-6 flex items-center justify-center">
            <span className="order-confirm-icon-glow absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(16,185,129,0.18),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:shadow-[0_8px_32px_rgba(16,185,129,0.12)] md:h-28 md:w-28">
              <img
                src="https://img.icons8.com/?size=200&id=4s6J5ffeGarN&format=gif"
                alt="Order Confirmed"
                width={80}
                height={80}
                className="h-16 w-16 object-contain md:h-20 md:w-20"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-3 order-confirm-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">Order Success</p>
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              {firstName ? `Thank you, ${firstName}` : "Thank you for your order"}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We&apos;ve received your payment details and your order is being processed. A confirmation has been sent to{" "}
              <span className="font-semibold text-foreground">{order.email || "the contact details you provided"}</span>. Keep this page as your receipt or print
              it below.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <span className="inline-flex items-center rounded-md border border-border bg-background/80 px-3 py-1.5 font-mono text-xs font-semibold text-foreground backdrop-blur-sm">
                Order ID · {order.id}
              </span>
              <span className="text-xs text-muted-foreground">{orderDateLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brand logo circle between hero and steps */}
      <div className="relative z-10 -mt-6 mb-6 flex justify-center">
        <div className="order-confirm-icon-float relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_0_30px_rgba(0,0,0,0.2),0_6px_24px_rgba(0,0,0,0.1)] md:h-28 md:w-28 overflow-hidden">
          <span className="order-confirm-icon-glow absolute inset-0 rounded-full bg-black/10 blur-lg" />
          <img
            src="/images/order-success-icon.webp"
            alt="RARE.NP"
            className="relative z-10 h-full w-full object-cover rounded-full"
          />
        </div>
      </div>

      {/* What happens next — screen only */}
      <div className="no-print mb-10">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-black dark:text-white mb-6">
          What happens next
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Step 1 */}
          <div className="order-confirm-step order-confirm-fade-in">
            <div className="step-card group relative rounded-2xl border border-border/60 bg-card/50 dark:bg-card/30 p-6 cursor-default overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow duration-300">
                  <ClipboardCheck className="step-icon h-6 w-6" aria-hidden />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">Step 1</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 to-transparent" />
                </div>
                <p className="font-bold text-base text-foreground mb-2">Confirmation</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We verify your order and prepare it for fulfillment at our atelier.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="order-confirm-step order-confirm-fade-in-delay-1">
            <div className="step-card group relative rounded-2xl border border-border/60 bg-card/50 dark:bg-card/30 p-6 cursor-default overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-300" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-300">
                  <Package className="step-icon h-6 w-6" aria-hidden />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400">Step 2</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent" />
                </div>
                <p className="font-bold text-base text-foreground mb-2">Packing & dispatch</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your items are packed carefully. Our delivery partner will be assigned when the order ships.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="order-confirm-step order-confirm-fade-in-delay-2 sm:col-span-2 lg:col-span-1">
            <div className="step-card group relative rounded-2xl border border-border/60 bg-card/50 dark:bg-card/30 p-6 cursor-default overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-300" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow duration-300">
                  <MapPin className="step-icon h-6 w-6" aria-hidden />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">Step 3</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
                </div>
                <p className="font-bold text-base text-foreground mb-2">Delivery</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Estimated delivery within 3–5 business days in Nepal. See our{" "}
                  <Link href="/shipping" className="underline font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                    shipping policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="order-confirmation-export" className="order-confirmation-bill relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.45)] dark:shadow-[0_30px_80px_-35px_rgba(0,0,0,0.6)]">
        {(order.paymentMethod === "esewa" || order.paymentMethod === "khalti") && order.paymentVerified !== "verified" && (
          <div className="no-print rounded-none border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-6 py-5">
            <div className="flex gap-3">
              <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Payment Proof Under Review</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Thank you for uploading your payment proof. Our team will review it and contact you very soon. Your order is being processed in the meantime.
                </p>
              </div>
            </div>
          </div>
        )}
        {order.paymentMethod === "fonepay" && order.paymentVerified === "verified" && (
          <div className="no-print rounded-none border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-6 py-5">
            <div className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Fonepay payment confirmed</p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  Your exact-amount Fonepay payment was verified successfully. We&apos;ve moved the order straight into processing.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600" />
        <div className="p-6 md:p-10">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 pb-6">
            <div className="flex items-center gap-4">
              <img src="/images/newproductpagelogo.png" alt="RARE.NP" className="h-11 w-11 object-contain" />
              <div>
                <p className="text-xl font-black tracking-tight text-black dark:text-white">RARE.NP</p>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Official Bill Preview</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-black dark:text-white">Order ID: {order.id}</p>
              <p className="text-zinc-500 dark:text-zinc-400">{orderDateLabel}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 py-6 border-b border-zinc-200 dark:border-zinc-700 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Customer</p>
              <p className="font-semibold text-black dark:text-white">{order.fullName}</p>
              <p className="text-zinc-700 dark:text-zinc-300">{displayEmptyField(order.email)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Delivery Location</p>
              <p className="font-semibold text-black dark:text-white">{displayEmptyField(order.deliveryLocation || order.locationCoordinates || "", "-")}</p>
              {order.deliveryAddress && <p className="text-zinc-700 dark:text-zinc-300">{displayEmptyField(order.deliveryAddress)}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Delivery</p>
              <p className="text-zinc-700 dark:text-zinc-300">
                {order.deliveryRequired === false
                  ? "Pickup / No delivery required"
                  : order.deliveryProvider
                    ? `Partner: ${order.deliveryProvider}`
                    : "Partner: To be assigned"}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">Estimated delivery: 3-5 business days</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Payment Method</p>
              <p className="font-semibold text-black dark:text-white">{paymentMethodLabel(order.paymentMethod)}</p>
            </div>
          </div>

          <div className="py-6 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-2 pr-2">Item</th>
                  <th className="py-2 px-2">Size</th>
                  <th className="py-2 px-2">Color</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price</th>
                  <th className="py-2 pl-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any) => {
                  const lineTotal = Number(item.unitPrice) * item.quantity;
                  const sizeLabel = String(item.size ?? "").trim() || "-";
                  const colorLabel = selectedColorLabel(item);
                  const colorMeta = colorLabel !== "-" ? parseOrderColor(colorLabel) : null;
                  return (
                    <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800 align-top">
                      <td className="py-3 pr-2">
                        <p className="font-medium text-black dark:text-white">{item.product?.name || "Product"}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {sizeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {colorMeta ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            <span
                              className="h-3.5 w-3.5 rounded-sm border border-black/10"
                              style={{ background: colorMeta.swatch ?? "#d4d4d8" }}
                            />
                            {colorMeta.label}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            -
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center text-zinc-700 dark:text-zinc-300">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-zinc-700 dark:text-zinc-300">{formatPrice(item.unitPrice)}</td>
                      <td className="py-3 pl-2 text-right font-medium text-black dark:text-white">{formatPrice(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="py-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
              <span className="text-black dark:text-white">{formatPrice(itemsSubtotal)}</span>
            </div>
            {promoDiscountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Discount {order.promoCode ? `(${order.promoCode})` : ""}
                </span>
                <span className="text-green-600 dark:text-green-400">-{formatPrice(promoDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Shipping</span>
              <span className="text-black dark:text-white">{formatPrice(shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 mt-3 pt-3 text-lg font-black">
              <span className="text-black dark:text-white">Grand Total (NPR)</span>
              <span className="text-black dark:text-white">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help — screen only */}
      <div className="no-print mt-8 rounded-xl border border-dashed border-border bg-muted/20 dark:bg-muted/10 px-4 py-5 md:px-6 md:flex md:items-center md:justify-between md:gap-6">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background dark:bg-zinc-800 text-muted-foreground">
            <LifeBuoy className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Need help with your order?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reach our team for changes, sizing, or delivery questions.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-4 md:mt-0 shrink-0 rounded-none uppercase tracking-widest text-[10px] h-10">
          <Link href="/atelier#contact">Contact us</Link>
        </Button>
      </div>

      <div className="order-confirmation-actions no-print flex flex-wrap gap-3 mt-6">
        <Button onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="h-11 rounded-none uppercase tracking-widest text-xs">
          <Printer className="h-4 w-4 mr-2" />
          {isDownloadingPdf ? "Preparing PDF" : "Download as PDF"}
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-none uppercase tracking-widest text-xs">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
