import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { fetchOrderById } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { formatPrice } from "@/lib/format";

function paymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    cash_on_delivery: "Cash on Delivery",
    bank_transfer: "Bank Transfer",
    card: "Card",
    esewa: "eSewa",
    khalti: "Khalti",
    fonepay: "Fonepay",
  };
  return labels[method] ?? method.replace(/_/g, " ");
}

export default function OrderSuccess() {
  const [, newParams] = useRoute("/order-confirmation/:orderId");
  const [, legacyParams] = useRoute("/checkout/success/:id");
  const orderId = newParams?.orderId ?? legacyParams?.id;

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
  });

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
      <div className="min-h-[70vh] flex items-center justify-center">
        <BrandedLoader />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">
          We couldn't find this order, or you do not have access to view it.
        </p>
        <Link href="/">
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="order-confirmation-page container mx-auto px-4 py-10 lg:py-16 max-w-5xl mt-8">
      <div className="no-print flex flex-col gap-3 mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight">Order Confirmed</h1>
        <p className="text-sm text-muted-foreground">
          Your order has been received. You can use this page as your official bill preview.
        </p>
      </div>

      <div className="order-confirmation-bill bg-white text-black border border-zinc-200 shadow-sm p-6 md:p-10">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
          <div className="flex items-center gap-4">
            <img src="/images/logo.webp" alt="RARE.NP" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-xl font-black tracking-tight">RARE.NP</p>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Official Bill Preview</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Order ID: {order.id}</p>
            <p className="text-zinc-500">
              {new Date(order.createdAt).toLocaleDateString("en-NP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 py-6 border-b border-zinc-200 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Customer</p>
            <p className="font-semibold">{order.fullName}</p>
            <p>{order.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Delivery Location</p>
            <p className="font-semibold">{order.deliveryLocation || order.locationCoordinates || "-"}</p>
            {order.deliveryAddress && <p>{order.deliveryAddress}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Delivery</p>
            <p>
              {order.deliveryRequired === false
                ? "Pickup / No delivery required"
                : order.deliveryProvider
                  ? `Partner: ${order.deliveryProvider}`
                  : "Partner: To be assigned"}
            </p>
            <p className="text-zinc-600">Estimated delivery: 3-5 business days</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Payment Method</p>
            <p className="font-semibold">{paymentMethodLabel(order.paymentMethod)}</p>
          </div>
        </div>

        <div className="py-6 border-b border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
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
                return (
                  <tr key={item.id} className="border-b border-zinc-100 align-top">
                    <td className="py-3 pr-2">
                      <p className="font-medium">{item.product?.name || "Product"}</p>
                    </td>
                    <td className="py-3 px-2">{item.product?.sizeOptions || "-"}</td>
                    <td className="py-3 px-2">{item.product?.colorOptions || "-"}</td>
                    <td className="py-3 px-2 text-center">{item.quantity}</td>
                    <td className="py-3 px-2 text-right">{formatPrice(item.unitPrice)}</td>
                    <td className="py-3 pl-2 text-right">{formatPrice(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="py-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">Subtotal</span>
            <span>{formatPrice(itemsSubtotal)}</span>
          </div>
          {promoDiscountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-600">
                Discount {order.promoCode ? `(${order.promoCode})` : ""}
              </span>
              <span>-{formatPrice(promoDiscountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-600">Shipping</span>
            <span>{formatPrice(shippingFee)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 mt-3 pt-3 text-lg font-black">
            <span>Grand Total (NPR)</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="order-confirmation-actions no-print flex flex-wrap gap-3 mt-6">
        <Button onClick={() => window.print()} className="h-11 rounded-none uppercase tracking-widest text-xs">
          <Printer className="h-4 w-4 mr-2" />
          Download as PDF
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-none uppercase tracking-widest text-xs">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
