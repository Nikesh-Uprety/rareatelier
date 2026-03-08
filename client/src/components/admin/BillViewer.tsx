import { useRef } from "react";
import { Printer, Download, X } from "lucide-react";
import { formatPrice } from "@/lib/format";

interface BillItem {
  productName: string;
  variantColor: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface BillViewerProps {
  bill: {
    billNumber: string;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    items: BillItem[];
    subtotal: number | string;
    taxRate: number | string;
    taxAmount: number | string;
    discountAmount: number | string;
    totalAmount: number | string;
    paymentMethod: string;
    cashReceived?: number | string | null;
    changeGiven?: number | string | null;
    processedBy: string;
    createdAt: string;
    status: string;
  };
  onClose?: () => void;
}

export function BillViewer({ bill, onClose }: BillViewerProps) {
  const billRef = useRef<HTMLDivElement>(null);

  const subtotal = Number(bill.subtotal);
  const taxRate = Number(bill.taxRate);
  const taxAmount = Number(bill.taxAmount);
  const discountAmount = Number(bill.discountAmount);
  const totalAmount = Number(bill.totalAmount);
  const cashReceived = bill.cashReceived ? Number(bill.cashReceived) : null;
  const changeGiven = bill.changeGiven ? Number(bill.changeGiven) : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!billRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;

    const canvas = await html2canvas(billRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5",
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${bill.billNumber}.pdf`);
  };

  const paymentLabels: Record<string, string> = {
    cash: "Cash",
    esewa: "eSewa",
    card: "Card",
    khalti: "Khalti",
    "bank-transfer": "Bank Transfer",
    "cash_on_delivery": "Cash on Delivery",
    "pos-cash": "POS Cash",
  };

  // Parse items — handle both array and string
  const items: BillItem[] = Array.isArray(bill.items)
    ? bill.items
    : typeof bill.items === "string"
      ? JSON.parse(bill.items)
      : [];

  return (
    <div className="bill-wrapper">
      {/* Action buttons — hidden when printing */}
      <div className="bill-actions no-print">
        <button onClick={handlePrint}>
          <Printer size={16} /> Print
        </button>
        <button onClick={handleDownloadPDF}>
          <Download size={16} /> Download PDF
        </button>
        {onClose && (
          <button onClick={onClose}>
            <X size={16} /> Close
          </button>
        )}
      </div>

      {/* THE ACTUAL BILL */}
      <div ref={billRef} className="bill-document">
        {/* Header */}
        <div className="bill-header">
          <h1>RARE Nepal</h1>
          <p>Khusibu, Nayabazar, Kathmandu</p>
          <p>(+977)-9705203050 · rarenepal888@gmail.com</p>
          <p>instagram.com/rare.np</p>
        </div>

        <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Bill meta */}
        <div className="bill-meta">
          <div className="bill-meta-row">
            <span>Bill No.</span>
            <span>{bill.billNumber}</span>
          </div>
          <div className="bill-meta-row">
            <span>Date</span>
            <span>
              {new Date(bill.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="bill-meta-row">
            <span>Time</span>
            <span>
              {new Date(bill.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="bill-meta-row">
            <span>Cashier</span>
            <span>{bill.processedBy}</span>
          </div>
          <div className="bill-meta-row">
            <span>Payment</span>
            <span>{paymentLabels[bill.paymentMethod] ?? bill.paymentMethod}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
        <div className="bill-customer">
          <strong>Customer:</strong> {bill.customerName}
          {bill.customerPhone && <span> · {bill.customerPhone}</span>}
        </div>
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
            {items.map((item, i) => (
              <tr key={i}>
                <td>
                  <div>{item.productName}</div>
                  {item.variantColor && (
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {item.variantColor}
                      {item.size ? ` · ${item.size}` : ""}
                    </div>
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
            <span>VAT ({taxRate}%)</span>
            <span>{formatPrice(taxAmount)}</span>
          </div>
          <div className="bill-divider">──────────────────────────</div>
          <div className="bill-total-row bill-grand-total">
            <span>TOTAL</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          {cashReceived !== null && (
            <>
              <div className="bill-total-row">
                <span>Cash Received</span>
                <span>{formatPrice(cashReceived)}</span>
              </div>
              <div className="bill-total-row">
                <span>Change</span>
                <span>{formatPrice(changeGiven ?? 0)}</span>
              </div>
            </>
          )}
        </div>

        <div className="bill-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>

        {/* Footer */}
        <div className="bill-footer">
          <p>Thank you for shopping at RARE Nepal!</p>
          <p>Exchange within 7 days with receipt.</p>
          <p>No cash refunds.</p>
        </div>

        {bill.status === "void" && (
          <div className="bill-void-stamp">VOID</div>
        )}
      </div>
    </div>
  );
}
