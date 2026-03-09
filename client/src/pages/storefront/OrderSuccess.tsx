import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "@/lib/api";
import { CheckCircle2, Download, Package, Truck, CreditCard, ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { formatPrice } from "@/lib/format";

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
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, margin, y);
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
      const productName = item.product?.name || `Product ID: ${item.productId.slice(0, 8)}`;
      doc.text(productName, margin, y);
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
    <div className="container mx-auto px-4 py-16 lg:py-32 max-w-4xl mt-10">
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div 
            animate={{ 
              y: [0, -20, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500 text-white mb-8 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] relative"
          >
            <motion.div
              animate={{ 
                opacity: [1, 0.3, 1],
                scale: [1, 1.15, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <ArrowRight size={48} strokeWidth={2.5} />
            </motion.div>
          </motion.div>
          <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter mb-4 italic">Thank You for Your Order</h1>
          <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">
            A confirmation email has been sent to {order.email}
          </p>
        </motion.div>

        {/* Receipt Section */}
        <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-8 lg:p-12 shadow-sm rounded-none relative overflow-hidden mb-12">
          {/* Receipt Decor */}
          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 dark:bg-zinc-100" />
          
          <div className="flex justify-between items-start mb-12 border-b pb-8 border-zinc-100 dark:border-white/5">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">Receipt</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Order ID: {order.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="space-y-8 mb-12">
            <div className="border-b border-zinc-100 dark:border-white/5 pb-8">
              <div className="grid grid-cols-12 gap-4 text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-6">
                <div className="col-span-8">Product Details</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price</div>
              </div>
              
              <div className="space-y-8">
                {order.items.map((item: any) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-8 flex gap-4">
                      {item.product?.imageUrl && (
                        <div className="w-16 h-20 bg-zinc-50 dark:bg-zinc-800 shrink-0 border border-zinc-100 dark:border-white/5 p-1 rounded-sm overflow-hidden">
                          <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover rounded-sm" />
                        </div>
                      )}
                      <div className="flex flex-col justify-center">
                        <h4 className="text-[11px] font-black uppercase tracking-widest mb-1.5 line-clamp-1">{item.product?.name || 'Item'}</h4>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">SKU: {item.productId.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-[11px] font-bold">{item.quantity}</div>
                    <div className="col-span-2 text-right text-[11px] font-black">{formatPrice(item.unitPrice)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold text-zinc-500">
                <span>Subtotal</span>
                <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(order.items.reduce((acc: number, item: any) => acc + (parseFloat(item.unitPrice) * item.quantity), 0))}</span>
              </div>
              <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold text-zinc-500">
                <span>Shipping Fee</span>
                <span className="text-zinc-900 dark:text-zinc-100">Rs. 100</span>
              </div>
              <div className="flex justify-between text-base font-black uppercase tracking-tighter pt-6 border-t border-zinc-200 dark:border-white/10 mt-6">
                <span className="text-zinc-500">Total Amount</span>
                <span className="text-3xl text-zinc-900 dark:text-zinc-100">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={downloadReceipt}
              className="flex-1 h-14 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-none uppercase tracking-[0.2em] text-[10px] font-black gap-3 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xl"
            >
              <Download size={16} />
              Save as PDF
            </Button>
            <Button 
              onClick={() => window.print()}
              variant="outline"
              className="w-14 h-14 rounded-none border-zinc-200 dark:border-white/10 flex items-center justify-center p-0 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              <Printer size={18} />
            </Button>
          </div>
        </div>

        {/* Shipping & Payment Section */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-10 border border-zinc-100 dark:border-white/5 rounded-3xl">
            <div className="flex items-center gap-4 mb-8 text-zinc-900 dark:text-zinc-100">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center">
                <Truck size={16} strokeWidth={2.5} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest">Delivery Address</h3>
            </div>
            <div className="space-y-4 text-[11px] uppercase tracking-widest font-bold text-zinc-500 leading-relaxed pl-1">
              <p className="text-zinc-900 dark:text-zinc-100 font-black">{order.fullName}</p>
              <p className="line-clamp-1">{order.addressLine1}</p>
              {order.addressLine2 && <p className="line-clamp-1">{order.addressLine2}</p>}
              <p>{order.city}, {order.region} {order.postalCode}</p>
              <p>{order.country}</p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-10 border border-zinc-100 dark:border-white/5 rounded-3xl">
            <div className="flex items-center gap-4 mb-8 text-zinc-900 dark:text-zinc-100">
              <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center">
                <CreditCard size={16} strokeWidth={2.5} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest">Payment & Timeline</h3>
            </div>
            <div className="space-y-6 pl-1">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-2">
                  {order.paymentMethod.replace(/_/g, ' ')}
                </p>
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black uppercase tracking-widest shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {order.paymentVerified === 'verified' ? 'Payment Verified' : 'Order Received'}
                </div>
              </div>
              <div className="pt-2">
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold leading-relaxed flex items-center gap-2">
                   <Package size={10} />
                   EST. DELIVERY: 3-5 BUSINESS DAYS
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 mb-20">
          <Link href="/">
            <Button variant="ghost" className="gap-3 group text-[11px] uppercase tracking-[0.3em] font-black hover:bg-transparent transition-all">
              <ArrowRight size={16} className="rotate-180 group-hover:-translate-x-2 transition-transform" />
              Continue Shopping
            </Button>
          </Link>
          <div className="flex flex-col items-center gap-4">
            <div className="w-px h-16 bg-gradient-to-b from-zinc-200 to-transparent dark:from-white/20" />
            <p className="text-[10px] text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.4em] font-black italic">Rare Atelier Selection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
