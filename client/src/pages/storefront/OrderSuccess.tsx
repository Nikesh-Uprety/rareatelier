import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "@/lib/api";
import { CheckCircle2, Download, Package, Truck, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function OrderSuccess() {
  const [, params] = useRoute("/checkout/success/:id");
  const orderId = params?.id;

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
  });

  const downloadReceipt = () => {
    if (!order) return;

    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(22);
    doc.text("RARE ATELIER", margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text("Official Order Receipt", margin, y);
    y += 20;

    // Order Info
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, margin, y);
    y += 7;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 7;
    doc.text(`Customer: ${order.fullName}`, margin, y);
    y += 7;
    doc.text(`Email: ${order.email}`, margin, y);
    y += 20;

    // Items Header
    doc.setFont("helvetica", "bold");
    doc.text("Item", margin, y);
    doc.text("Qty", 140, y);
    doc.text("Price", 170, y);
    y += 2;
    doc.line(margin, y, 190, y);
    y += 10;

    // Items
    doc.setFont("helvetica", "normal");
    order.items.forEach((item: any) => {
      doc.text(`Product ID: ${item.productId.slice(0, 8)}...`, margin, y);
      doc.text(`${item.quantity}`, 140, y);
      doc.text(`Rs. ${item.unitPrice}`, 170, y);
      y += 10;
    });

    y += 10;
    doc.line(margin, y, 190, y);
    y += 10;

    // Total
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", 130, y);
    doc.text(`Rs. ${order.total}`, 170, y);

    y += 30;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for shopping with Rare Atelier.", margin, y);

    doc.save(`rare-atelier-receipt-${order.id.slice(0, 8)}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <BrandedLoader />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find the order details you're looking for.</p>
        <Link href="/">
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mb-6 font-serif">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-4xl font-serif mb-4">Order Confirmed</h1>
        <p className="text-lg text-muted-foreground">
          Thank you for your purchase, {order.fullName.split(' ')[0]}. Your order has been received and is being processed.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Order Details */}
        <div className="bg-card rounded-2xl border p-8 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Package size={16} />
            Order Information
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono font-medium">{order.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold capitalize">
                {order.status}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-bold">Rs. {order.total}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full gap-2 rounded-xl h-12"
            onClick={downloadReceipt}
          >
            <Download size={18} />
            Download Receipt
          </Button>
        </div>

        {/* Shipping & Payment */}
        <div className="bg-card rounded-2xl border p-8 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Truck size={16} />
            Shipping & Payment
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Truck size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Standard Delivery</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Estimated delivery within 3-5 business days.
                </p>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium capitalize">{order.paymentMethod.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">
                  {order.paymentVerified === 'verified' ? 'Payment Verified' : 'Manual verification pending'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/">
          <Button variant="ghost" className="gap-2 group">
            Continue Shopping
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
