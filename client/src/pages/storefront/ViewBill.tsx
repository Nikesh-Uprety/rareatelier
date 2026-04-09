import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicBill, type PublicBill } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { Printer, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Barcode from "react-barcode";
import "@/styles/bill-viewer.css";

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  esewa: "eSewa",
  card: "Card",
  khalti: "Khalti",
  cash_on_delivery: "Cash on Delivery",
};

const sourceLabels: Record<string, string> = {
  pos: "POS",
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  store: "Store",
};

export default function ViewBill() {
  const params = useParams<{ billNumber: string }>();
  const billNumber = params?.billNumber ?? "";
  const billRef = useRef<HTMLDivElement>(null);
  const [showShareFallback, setShowShareFallback] = useState(false);

  const { data: bill, isLoading, isError } = useQuery<PublicBill | null>({
    queryKey: ["public-bill", billNumber],
    queryFn: () => fetchPublicBill(billNumber),
    enabled: !!billNumber,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoading) return;

    const done = (window as { finishLoading?: () => void }).finishLoading;
    if (typeof done !== "function") return;

    const timer = window.setTimeout(() => {
      done();
    }, 40);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const subtotal = useMemo(() => bill ? Number(bill.subtotal) : 0, [bill]);
  const discountAmount = useMemo(() => bill ? Number(bill.discountAmount) : 0, [bill]);
  const computedTotalAmount = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);
  const items = useMemo(() => bill?.items ?? [], [bill]);

  const handlePrint = () => {
    window.print();
  };

  const shareUrl = `${window.location.origin}/bill/${billNumber}`;
  const shareText = `Order #${bill?.billNumber} — NPR ${computedTotalAmount.toFixed(2)} — RARE.NP`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bill ${bill?.billNumber}`, text: shareText, url: shareUrl });
      } catch {
        setShowShareFallback(true);
      }
    } else {
      setShowShareFallback(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setShowShareFallback(false);
  };

  if (isLoading) return <BrandedLoader fullScreen />;

  if (isError || !bill) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-serif text-[#2C3E2D]">Bill Not Found</h1>
          <p className="text-muted-foreground mt-2">The bill you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const statusLabel = bill.status === "void" ? "Voided" : "Issued";

  return (
    <div className="min-h-screen bg-[#FDFDFB] py-8 px-4 print:py-2 print:px-0">
      <div className="max-w-lg mx-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-serif text-[#2C3E2D]">RARE ATELIER</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Order Bill</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-white hover:bg-muted transition-colors"
            >
              <Share2 size={14} />
              Share
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-white hover:bg-muted transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        {showShareFallback && (
          <div className="mb-4 p-3 rounded-lg border border-border bg-white">
            <p className="text-xs text-muted-foreground mb-2">Copy this link to share:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-muted font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[#2C3E2D] text-white hover:bg-[#1A251B]"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Bill content */}
        <div ref={billRef} className="bg-white rounded-2xl border border-[#E5E5E0] p-6 shadow-sm print:shadow-none print:border-0 print:rounded-none">
          {/* Brand */}
          <div className="text-center mb-6 print:mb-4">
            <h2 className="text-xl font-serif text-[#2C3E2D]">RARE ATELIER</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Kathmandu, Nepal</p>
          </div>

          {/* Meta */}
          <div className="bill-meta">
            <div className="bill-meta-row">
              <span>Bill #</span>
              <span>{bill.billNumber}</span>
            </div>
            <div className="bill-meta-row">
              <span>Date</span>
              <span>{new Date(bill.createdAt).toLocaleDateString("en-NP", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
            <div className="bill-meta-row">
              <span>Time</span>
              <span>{new Date(bill.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="bill-meta-row">
              <span>Cashier</span>
              <span>{bill.processedBy}</span>
            </div>
            <div className="bill-meta-row">
              <span>Payment</span>
              <span>{paymentLabels[bill.paymentMethod] ?? bill.paymentMethod}</span>
            </div>
            {bill.source && (
              <div className="bill-meta-row">
                <span>Source</span>
                <span>{sourceLabels[bill.source] ?? bill.source}</span>
              </div>
            )}
            <div className="bill-meta-row">
              <span>Status</span>
              <span className={bill.status === "void" ? "text-red-500" : "text-green-600"}>{statusLabel}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
          <div className="bill-customer">
            <strong>Customer:</strong> {bill.customerName}
            {bill.customerPhone && <span> · {bill.customerPhone}</span>}
          </div>
          {bill.customerEmail && (
            <div className="bill-customer">
              <strong>Email:</strong> {bill.customerEmail}
            </div>
          )}
          {bill.deliveryRequired && (
            <div className="bill-customer">
              <strong>Delivery:</strong>{" "}
              {bill.deliveryProvider ? `${bill.deliveryProvider}` : "Assigned"}
              {bill.deliveryAddress ? ` · ${bill.deliveryAddress}` : ""}
            </div>
          )}
          <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

          {/* Items */}
          <table className="bill-items">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Item</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td>
                    <div>{item.productName}</div>
                    {item.variantColor && (
                      <div style={{ fontSize: "11px", color: "#666" }}>
                        {item.variantColor}
                        {item.size ? ` · ${item.size}` : ""}
                      </div>
                    )}
                    {!item.variantColor && item.size && (
                      <div style={{ fontSize: "11px", color: "#666" }}>{item.size}</div>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{formatPrice(item.unitPrice)}</td>
                  <td style={{ textAlign: "right" }}>{formatPrice(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

          {/* Totals */}
          <div className="bill-totals">
            <div className="bill-total-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="bill-total-row">
                <span>Discount</span>
                <span>- {formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="bill-total-row">
              <span>Tax (VAT {bill.taxRate}%)</span>
              <span>{formatPrice(bill.taxAmount)}</span>
            </div>
            <div className="bill-divider">──────────────────────────</div>
            <div className="bill-total-row bill-grand-total">
              <span>TOTAL</span>
              <span>{formatPrice(computedTotalAmount)}</span>
            </div>
            {bill.cashReceived && (
              <>
                <div className="bill-total-row">
                  <span>Cash Received</span>
                  <span>{formatPrice(bill.cashReceived)}</span>
                </div>
                <div className="bill-total-row">
                  <span>Change</span>
                  <span>{formatPrice(bill.changeGiven ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

          {/* Thank you */}
          <div className="text-center mt-4 print:mt-2">
            <p className="text-sm font-medium text-[#2C3E2D]">Thank you for shopping with us!</p>
            <p className="text-xs text-muted-foreground mt-1">This is a computer-generated bill.</p>
          </div>

          {/* Barcode */}
          <div className="flex justify-center mt-4 print:mt-2">
            <Barcode value={bill.billNumber} width={1} height={30} displayValue={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
