import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCartStore();
  const { toast } = useToast();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const tax = subtotal * 0.08;
  const shipping = subtotal > 150 ? 0 : 15;
  const total = subtotal + tax + shipping;

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
      toast({
        title: "Order Placed Successfully",
        description: "Thank you for shopping with Urban Threads.",
      });
    }, 1500);
  };

  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-2xl text-center">
        <div className="w-20 h-20 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-serif font-medium mb-4 tracking-tight">Order Confirmed</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Thank you for your purchase. No account needed—your order is being processed.
        </p>
        <Button asChild size="lg" className="rounded-none px-12">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 max-w-6xl mt-20">
      <div className="flex items-center gap-2 text-sm mb-12 uppercase tracking-widest text-muted-foreground">
        <Link href="/cart" className="hover:text-foreground">Cart</Link>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 1 ? 'text-foreground font-medium' : ''}>Information</span>
        <ChevronRight className="w-4 h-4" />
        <span className={step === 2 ? 'text-foreground font-medium' : ''}>Payment</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-20">
        <div className="flex-1">
          {step === 1 ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
              <div>
                <h2 className="text-2xl font-serif font-medium mb-6">Contact</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs uppercase tracking-widest">Mobile Number</Label>
                    <Input id="phone" placeholder="Mobile Number" className="h-14 rounded-none border-foreground/20" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-serif font-medium mb-6">Shipping Address</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs uppercase tracking-widest">First name</Label>
                    <Input id="firstName" className="h-14 rounded-none border-foreground/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs uppercase tracking-widest">Last name</Label>
                    <Input id="lastName" className="h-14 rounded-none border-foreground/20" />
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs uppercase tracking-widest">Address</Label>
                    <Input id="address" className="h-14 rounded-none border-foreground/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs uppercase tracking-widest">City</Label>
                      <Input id="city" className="h-14 rounded-none border-foreground/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs uppercase tracking-widest">State</Label>
                      <Input id="state" className="h-14 rounded-none border-foreground/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-xs uppercase tracking-widest">Zip code</Label>
                      <Input id="zip" className="h-14 rounded-none border-foreground/20" />
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full h-14 rounded-none text-sm tracking-widest uppercase" onClick={() => setStep(2)}>
                Continue to Payment
              </Button>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-left-4">
              <h2 className="text-2xl font-serif font-medium mb-6">Payment</h2>
              <div className="border border-foreground/20 p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="card" className="text-xs uppercase tracking-widest">Card Number</Label>
                  <div className="relative">
                    <Input id="card" placeholder="0000 0000 0000 0000" className="h-14 rounded-none border-foreground/20 pr-12" />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="MM / YY" className="h-14 rounded-none border-foreground/20" />
                  <Input placeholder="CVV" className="h-14 rounded-none border-foreground/20" />
                </div>
              </div>
              <Button className="w-full h-14 rounded-none text-sm tracking-widest uppercase" onClick={handlePlaceOrder} disabled={isProcessing}>
                {isProcessing ? "Processing..." : `Pay Now — $${total.toFixed(2)}`}
              </Button>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[400px] bg-muted/30 p-8 border border-foreground/5 h-fit">
          <h2 className="text-lg font-serif font-medium mb-8">Summary</h2>
          <div className="space-y-6 mb-8">
            {items.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-20 bg-muted shrink-0 relative">
                  <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full">{item.quantity}</span>
                </div>
                <div className="flex-1 text-sm">
                  <h4 className="font-medium uppercase tracking-tight">{item.product.name}</h4>
                  <p className="text-muted-foreground text-xs mt-1">{item.variant.size} / {item.variant.color}</p>
                </div>
                <div className="text-sm font-medium">${(item.product.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-8">
            <Input placeholder="Gift card or discount code" className="h-12 rounded-none border-foreground/20 bg-transparent" />
            <Button variant="outline" className="h-12 rounded-none px-6">Apply</Button>
          </div>

          <div className="space-y-3 text-sm border-t border-foreground/10 pt-6">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-serif text-lg pt-4">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}