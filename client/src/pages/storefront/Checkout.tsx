import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCartStore();
  const { toast } = useToast();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const tax = subtotal * 0.08;
  const shipping = 100;
  const total = subtotal + shipping;

  if (items.length === 0 && step !== 3) {
    setLocation('/cart');
    return null;
  }

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      setStep(3);
      toast({ title: "Order Placed" });
    }, 1500);
  };

  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-32 text-center mt-20">
        <CheckCircle2 className="w-16 h-16 text-black mx-auto mb-8" />
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Confirmed</h1>
        <p className="text-muted-foreground mb-12">Your order is being processed.</p>
        <Button asChild className="rounded-none px-12 h-14 uppercase tracking-widest text-xs font-bold bg-black text-white">
          <Link href="/">Back Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-32 max-w-7xl mt-10">
      <div className="flex flex-col lg:flex-row gap-20">
        <div className="flex-1 space-y-12">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter mb-8">Contact</h2>
            <div className="space-y-4">
              <Input placeholder="Mobile Number" className="h-14 rounded-none border-gray-200" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter mb-8">Shipping Address</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input placeholder="First name" className="h-14 rounded-none border-gray-200" />
              <Input placeholder="Last name" className="h-14 rounded-none border-gray-200" />
            </div>
            <div className="space-y-4">
              <Input placeholder="Address" className="h-14 rounded-none border-gray-200" />
              <div className="grid grid-cols-3 gap-4">
                <Input placeholder="City" className="h-14 rounded-none border-gray-200" />
                <Input placeholder="State" className="h-14 rounded-none border-gray-200" />
                <Input placeholder="Zip code" className="h-14 rounded-none border-gray-200" />
              </div>
              <Input placeholder="Phone" className="h-14 rounded-none border-gray-200" />
            </div>
          </div>

          <Button className="w-full h-16 bg-black text-white rounded-none uppercase tracking-[0.2em] text-xs font-bold" onClick={handlePlaceOrder} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Pay Now"}
          </Button>
        </div>

        <div className="w-full lg:w-[450px] bg-gray-50/50 p-10 h-fit">
          <div className="space-y-6 mb-10">
            {items.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-20 bg-muted shrink-0 relative">
                  <img src={item.product.images[0]} className="w-full h-full object-cover" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center rounded-full">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">{item.product.name}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.variant.size}</p>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest">Rs.{item.product.price.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-10">
            <Input placeholder="Gift card or discount code" className="h-12 rounded-none bg-white border-gray-200" />
            <Button variant="secondary" className="h-12 rounded-none px-6 text-xs uppercase tracking-widest font-bold">Apply</Button>
          </div>

          <div className="space-y-4 text-[10px] uppercase tracking-widest font-medium text-muted-foreground pt-8 border-t border-gray-100">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-black">Rs.{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="text-black">Rs.{shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-black text-sm font-black pt-4">
              <span>Total</span>
              <span>Rs.{(subtotal + shipping).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}