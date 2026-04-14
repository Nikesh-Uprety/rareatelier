import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { type CartState, useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CheckCircle2, ShoppingBag, Banknote, BadgePercent, Sparkles, ArrowLeft } from "lucide-react";
import { DeliveryLocationSelect } from "@/components/DeliveryLocationSelect";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import {
  cacheLatestOrder,
  cachePendingCheckout,
  clearPendingCheckout,
  confirmOrderVerification,
  createOrder,
  requestOrderVerification,
  type OrderInput,
  validatePromoCode,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { StorefrontSeo } from "@/components/seo/StorefrontSeo";

const CHECKOUT_FORM_KEY = "ra-checkout-form-data";
const MAX_NEW_CUSTOMER_ITEMS = 5;
const DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

const PAYMENT_OPTIONS = [
  {
    id: "esewa",
    label: "eSewa",
    logoUrl: "/images/esewa-logo.png",
    logoWrapClass: "px-0",
    logoImageClass: "h-10 w-auto",
  },
  {
    id: "khalti",
    label: "Khalti",
    logoUrl: "/images/khalti-logo.png",
    logoWrapClass: "px-0 justify-start",
    logoImageClass: "h-10 w-auto mr-2",
  },
  {
    id: "fonepay",
    label: "Fonepay",
    logoUrl: "/images/fonepay-logo.png",
    logoWrapClass: "px-0",
    logoImageClass: "h-10 w-auto",
  },
  {
    id: "stripe",
    label: "Pay by Card",
    logoUrl: "/images/stripe-logo.svg",
    logoWrapClass: "px-0",
    logoImageClass: "h-8 w-auto",
  },
] as const;


export type PaymentMethodId = (typeof PAYMENT_OPTIONS)[number]["id"] | "cash_on_delivery";

type PendingCheckoutContinuation = {
  orderPayload: OrderInput;
  manualPayment: boolean;
  totalQuantity: number;
  emailVal: string;
  fullNameVal: string;
  addressVal: string;
  phoneVal: string;
  deliveryLocationVal: string;
};

const MANUAL_PAYMENT_METHODS: PaymentMethodId[] = ["esewa", "khalti", "fonepay"];

function formatVerificationCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getCheckoutOriginalPrice(price: number, originalPrice?: number | null, salePercentage?: number | null, saleActive?: boolean | null) {
  const currentPrice = Number(price);
  const explicitOriginalPrice = Number(originalPrice);

  if (Number.isFinite(explicitOriginalPrice) && explicitOriginalPrice > currentPrice) {
    return explicitOriginalPrice;
  }

  const resolvedSalePercentage = Number(salePercentage);
  if (
    Boolean(saleActive) &&
    Number.isFinite(resolvedSalePercentage) &&
    resolvedSalePercentage > 0 &&
    resolvedSalePercentage < 100 &&
    currentPrice > 0
  ) {
    return currentPrice / (1 - resolvedSalePercentage / 100);
  }

  return currentPrice;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, clearCart, hasHydrated = true } = useCartStore((state: CartState) => state);
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("cash_on_delivery");
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("returning") !== "1") return;
      const saved = localStorage.getItem(CHECKOUT_FORM_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.email) setEmail(data.email);
        if (data.fullName) setFullName(data.fullName);
        if (data.address) setAddress(data.address);
        if (data.phone) setPhone(data.phone);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        if (data.deliveryLocation) setDeliveryLocation(data.deliveryLocation);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.search]);

  const saveFormData = (formData: Record<string, string>) => {
    try {
      localStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify({
        ...formData,
        email,
        fullName,
        address,
        phone,
        paymentMethod,
        deliveryLocation,
      }));
    } catch { /* ignore */ }
  };

  const clearSavedFormData = () => {
    try {
      localStorage.removeItem(CHECKOUT_FORM_KEY);
    } catch { /* ignore */ }
  };

  const shipping = 100;
  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ id: string; code: string; discountPct: number } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [verificationChallengeId, setVerificationChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationQuantity, setVerificationQuantity] = useState<number | null>(null);
  const [isVerificationPanelOpen, setIsVerificationPanelOpen] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);
  const [verificationResendAvailableAt, setVerificationResendAvailableAt] = useState<number | null>(null);
  const [verificationTimerNow, setVerificationTimerNow] = useState(() => Date.now());
  const pendingCheckoutContinuationRef = useRef<PendingCheckoutContinuation | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const productDiscountTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const originalPrice = getCheckoutOriginalPrice(
          item.product.price,
          item.product.originalPrice,
          item.product.salePercentage,
          item.product.saleActive,
        );
        if (!Number.isFinite(originalPrice) || originalPrice <= item.product.price) {
          return sum;
        }
        return sum + (originalPrice - item.product.price) * item.quantity;
      }, 0),
    [items],
  );

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    return (subtotal * appliedPromo.discountPct) / 100;
  }, [subtotal, appliedPromo]);

  const total = subtotal + shipping - discountAmount;
  const verificationResendRemainingSeconds = verificationResendAvailableAt
    ? Math.max(0, Math.ceil((verificationResendAvailableAt - verificationTimerNow) / 1000))
    : 0;

  const startVerificationResendCooldown = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
      setVerificationResendAvailableAt(null);
      return;
    }
    setVerificationResendAvailableAt(Date.now() + seconds * 1000);
  };

  const applyVerificationChallenge = ({
    challengeId,
    nextEmail,
    quantity,
    resendSeconds,
  }: {
    challengeId: string;
    nextEmail: string;
    quantity: number;
    resendSeconds?: number | null;
  }) => {
    setVerificationChallengeId(challengeId);
    setVerificationCode("");
    setVerificationToken(null);
    setVerificationEmail(nextEmail);
    setVerificationQuantity(quantity);
    setIsVerificationPanelOpen(true);
    startVerificationResendCooldown(resendSeconds ?? DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS);
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput) return;
    setIsValidatingPromo(true);
    try {
      const productIds = items.map((it) => it.product.id);
      const result = await validatePromoCode(promoCodeInput.toUpperCase(), productIds);

      if (result.valid && result.data) {
        setAppliedPromo(result.data);
        toast({
          title: "Promo code applied!",
          description: `${result.data.discountPct}% discount added.`,
        });
      } else {
        setAppliedPromo(null);
        toast({
          title: "Invalid promo code",
          description: result.reason || "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to validate promo code.", variant: "destructive" });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  if (!hasHydrated) {
    return null;
  }

  if (items.length === 0 && step !== 3) {
    setLocation("/cart");
    return null;
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createOrder,
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  const fieldRefs = {
    email: useRef<HTMLInputElement>(null),
    fullName: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    deliveryLocation: useRef<HTMLDivElement>(null),
  };

  const resetOrderVerification = () => {
    setVerificationChallengeId(null);
    setVerificationCode("");
    setVerificationToken(null);
    setVerificationEmail(null);
    setVerificationQuantity(null);
    setVerificationResendAvailableAt(null);
    setIsVerificationPanelOpen(false);
    pendingCheckoutContinuationRef.current = null;
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  useEffect(() => {
    if (!verificationEmail && !verificationQuantity) return;
    const currentEmail = email.trim().toLowerCase();
    if (!currentEmail) return;
    if (currentEmail === verificationEmail && totalQuantity === verificationQuantity) return;
    resetOrderVerification();
  }, [email, totalQuantity, verificationEmail, verificationQuantity]);

  useEffect(() => {
    if (!verificationResendAvailableAt) return;

    setVerificationTimerNow(Date.now());
    const interval = window.setInterval(() => {
      setVerificationTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [verificationResendAvailableAt]);

  useEffect(() => {
    if (!verificationResendAvailableAt) return;
    if (verificationResendRemainingSeconds > 0) return;
    setVerificationResendAvailableAt(null);
  }, [verificationResendAvailableAt, verificationResendRemainingSeconds]);

  const finalizeCheckout = async ({
    orderPayload,
    manualPayment,
    totalQuantity: quantity,
    emailVal,
    fullNameVal,
    addressVal,
    phoneVal,
    deliveryLocationVal,
  }: PendingCheckoutContinuation) => {
    if (manualPayment) {
      saveFormData({
        email: emailVal,
        fullName: fullNameVal,
        address: addressVal,
        phone: phoneVal,
        deliveryLocation: deliveryLocationVal,
      });

      cachePendingCheckout({
        orderInput: orderPayload,
        subtotal,
        shipping,
        total,
        createdAt: new Date().toISOString(),
      });

      setStep(2);
      toast({
        title: "Proceed to payment",
        description: "Upload your payment screenshot to complete and create the order.",
      });
      setLocation(`/checkout/payment?method=${paymentMethod}`);
      return;
    }

    const result = await mutateAsync(orderPayload);

    if (!result.success || !result.data) {
      const errorCode = result.code;
      if (errorCode === "ORDER_VERIFICATION_REQUIRED") {
        setFormError(
          `A quick email verification is required before a new customer can place more than ${result.limit || MAX_NEW_CUSTOMER_ITEMS} items in one order.`,
        );
        setIsVerificationPanelOpen(true);
      } else if (errorCode === "ABUSE_TIMEOUT") {
        const mins = result.retryAfter || 5;
        setFormError(
          `Too many failed attempts. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.`,
        );
      } else {
        setFormError(result.error || "Failed to place order.");
      }
      return;
    }

    if (paymentMethod === "stripe") {
      setStep(3);
      cacheLatestOrder(result.data.order);
      clearPendingCheckout();
      clearSavedFormData();
      clearCart();
      toast({ title: "Order created. Redirecting to Stripe..." });
      try {
        const { createCheckoutSession } = await import("@/lib/api");
        const sessionResult = await createCheckoutSession(result.data.order.id);
        if (sessionResult.success && sessionResult.data?.checkoutUrl) {
          window.location.href = sessionResult.data.checkoutUrl;
        } else {
          setLocation(
            `/checkout/payment?orderId=${result.data.order.id}&method=stripe`,
          );
        }
      } catch {
        setLocation(
          `/checkout/payment?orderId=${result.data.order.id}&method=stripe`,
        );
      }
      return;
    }

    setStep(3);
    cacheLatestOrder(result.data.order);
    clearPendingCheckout();
    setLocation(`/order-confirmation/${result.data.order.id}`);
    clearCart();
    clearSavedFormData();
    if (quantity > MAX_NEW_CUSTOMER_ITEMS) {
      resetOrderVerification();
    }
    toast({ title: "Order Placed" });
  };

  const ensureLargeOrderVerification = async (
    orderPayload: OrderInput,
    continuation: PendingCheckoutContinuation,
  ) => {
    if (continuation.totalQuantity <= MAX_NEW_CUSTOMER_ITEMS) {
      return true;
    }

    const normalizedEmail = continuation.emailVal.toLowerCase().trim();
    const tokenMatchesCurrentOrder =
      verificationToken &&
      verificationEmail === normalizedEmail &&
      verificationQuantity === continuation.totalQuantity;

    if (tokenMatchesCurrentOrder) {
      return true;
    }

    if (
      verificationChallengeId &&
      verificationEmail === normalizedEmail &&
      verificationQuantity === continuation.totalQuantity
    ) {
      pendingCheckoutContinuationRef.current = continuation;
      setIsVerificationPanelOpen(true);
      setFormError("Enter the email code we sent you to continue this order.");
      return false;
    }

    setIsRequestingVerification(true);
    try {
      const result = await requestOrderVerification({
        email: normalizedEmail,
        quantity: continuation.totalQuantity,
      });

      if (!result.success) {
        if (result.code === "ABUSE_TIMEOUT") {
          const mins = result.retryAfter || 5;
          setFormError(`Too many failed attempts. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.`);
        } else if (result.code === "VERIFICATION_RESEND_COOLDOWN" && result.challengeId) {
          pendingCheckoutContinuationRef.current = continuation;
          applyVerificationChallenge({
            challengeId: result.challengeId,
            nextEmail: normalizedEmail,
            quantity: continuation.totalQuantity,
            resendSeconds:
              result.resendAvailableInSeconds ?? result.resendCooldownSeconds ?? DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS,
          });
          setFormError("A verification code was already sent. Enter it to continue this order.");
        } else {
          setFormError(result.error || "Failed to start email verification.");
        }
        return false;
      }

      if (!result.required) {
        return true;
      }

      if (!result.challengeId) {
        setFormError("Failed to start email verification.");
        return false;
      }

      pendingCheckoutContinuationRef.current = continuation;
      applyVerificationChallenge({
        challengeId: result.challengeId,
        nextEmail: normalizedEmail,
        quantity: continuation.totalQuantity,
        resendSeconds:
          result.resendAvailableInSeconds ?? result.resendCooldownSeconds ?? DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      });
      setFormError("Enter the email code we sent you to continue this order.");
      toast({
        title: "Verification code sent",
        description: `We sent a code to ${normalizedEmail}. Confirm it to continue this order.`,
      });
      return false;
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleConfirmLargeOrderVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!verificationChallengeId || !normalizedEmail) {
      setFormError("Please enter your email before requesting verification.");
      return;
    }
    if (!verificationCode.trim()) {
      setFormError("Enter the verification code from your email.");
      return;
    }

    setIsConfirmingVerification(true);
    try {
      const result = await confirmOrderVerification({
        challengeId: verificationChallengeId,
        email: normalizedEmail,
        code: verificationCode.trim(),
      });

      if (!result.success || !result.verificationToken) {
        if (result.code === "ABUSE_TIMEOUT") {
          const mins = result.retryAfter || 5;
          setFormError(`Too many failed attempts. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.`);
        } else {
          setFormError(result.error || "Verification code did not match.");
        }
        return;
      }

      setVerificationChallengeId(null);
      setVerificationCode("");
      setVerificationToken(result.verificationToken);
      setVerificationEmail(normalizedEmail);
      setVerificationQuantity(result.requestedQuantity ?? totalQuantity);
      setVerificationResendAvailableAt(null);
      setIsVerificationPanelOpen(false);
      setFormError(null);
      toast({
        title: "Email verified",
        description: "Your order is continuing now.",
      });

      const pendingContinuation = pendingCheckoutContinuationRef.current;
      if (pendingContinuation) {
        pendingCheckoutContinuationRef.current = null;
        await finalizeCheckout({
          ...pendingContinuation,
          orderPayload: {
            ...pendingContinuation.orderPayload,
            orderVerificationToken: result.verificationToken,
          },
        });
      }
    } finally {
      setIsConfirmingVerification(false);
    }
  };

  const handlePlaceOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const newErrors: Record<string, boolean> = {};

    const formData = new FormData(event.currentTarget);

    const emailVal = email || String(formData.get("email") || "").trim();
    const fullNameVal = fullName || String(formData.get("fullName") || "").trim();
    const addressVal = address || String(formData.get("address") || "").trim();
    const phoneVal = phone || String(formData.get("phone") || "").trim();
    const deliveryLocationVal = deliveryLocation.trim() || String(formData.get("deliveryLocation") || "").trim();

    if (!fullNameVal) newErrors.fullName = true;
    if (!phoneVal) newErrors.phone = true;
    if (!deliveryLocationVal) newErrors.deliveryLocation = true;
    if (!emailVal && totalQuantity > MAX_NEW_CUSTOMER_ITEMS) newErrors.email = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError("Please fill in all required fields.");
      
      // Scroll to first error
      const firstField = Object.keys(newErrors)[0] as keyof typeof fieldRefs;
      fieldRefs[firstField].current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const orderPayload = {
      items: items.map((item) => ({
        variantId:
          item.variant.id?.toString() ??
          item.product.variants
            ?.find(
              (variant) =>
                variant.size === item.variant.size && variant.color === item.variant.color,
            )
            ?.id
            ?.toString(),
        productId: item.product.id,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        priceAtTime: item.product.price,
      })),
      shipping: {
        fullName: fullNameVal,
        email: emailVal,
        phone: phoneVal,
        address: addressVal,
        city: "",
        zip: "00000",
        country: "Nepal",
        locationCoordinates: deliveryLocationVal,
        deliveryLocation: deliveryLocationVal,
      },
      paymentMethod,
      source: "website",
      deliveryRequired: true,
      deliveryProvider: null,
      deliveryAddress: null,
      promoCodeId: appliedPromo?.id,
    };

    try {
      const manualPayment = MANUAL_PAYMENT_METHODS.includes(paymentMethod);
      const continuation: PendingCheckoutContinuation = {
        orderPayload,
        manualPayment,
        totalQuantity,
        emailVal,
        fullNameVal,
        addressVal,
        phoneVal,
        deliveryLocationVal,
      };

      const canProceed = await ensureLargeOrderVerification(orderPayload, continuation);
      if (!canProceed) {
        return;
      }

      await finalizeCheckout({
        ...continuation,
        orderPayload: verificationToken
          ? {
              ...orderPayload,
              orderVerificationToken: verificationToken,
            }
          : orderPayload,
      });
    } catch (err) {
      setFormError((err as Error).message || "Failed to place order.");
    }
  };

  return (
    <>
      <StorefrontSeo
        title="Checkout | Rare Atelier"
        description="Complete your Rare Atelier order with secure checkout and delivery details."
        canonicalPath="/checkout"
        noIndex
      />
      <div className="container mx-auto max-w-7xl px-4 pb-16 pt-4 sm:pt-6 lg:pb-20">
      <div className="flex flex-col lg:flex-row gap-20">
        <form
          data-testid="checkout-form"
          className="flex-1 space-y-12"
          onSubmit={handlePlaceOrder}
        >
          <div className="space-y-10">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-8">Contact</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={fieldRefs.fullName}
                    name="fullName"
                    placeholder="Full name"
                    data-testid="checkout-full-name"
                    defaultValue={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearError("fullName"); }}
                    className={`h-14 rounded-none transition-colors ${errors.fullName ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                  {errors.fullName && <p className="text-[10px] text-red-500 uppercase font-bold">Full name is required</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    ref={fieldRefs.phone}
                    name="phone"
                    placeholder="Phone"
                    data-testid="checkout-phone"
                    defaultValue={phone}
                    onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
                    className={`h-14 rounded-none transition-colors ${errors.phone ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 uppercase font-bold">Phone is required</p>}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-5">
                <h2 className="text-xl font-black uppercase tracking-tighter">Additional Details</h2>
                <p className="mt-2 text-sm text-muted-foreground">Name, phone, and delivery location are required. Everything else is optional.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Email Address {totalQuantity > MAX_NEW_CUSTOMER_ITEMS ? <span className="text-red-500">*</span> : <span className="text-muted-foreground/60">(optional)</span>}
                  </label>
                  <Input
                    ref={fieldRefs.email}
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    data-testid="checkout-email"
                    defaultValue={email}
                    onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                    className={`h-14 rounded-none transition-colors ${errors.email ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                  {errors.email && <p className="text-[10px] text-red-500 uppercase font-bold">Email is required for large-order verification</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Address <span className="text-muted-foreground/60">(optional)</span>
                  </label>
                  <Input
                    ref={fieldRefs.address}
                    name="address"
                    placeholder="Address"
                    data-testid="checkout-address"
                    defaultValue={address}
                    onChange={(e) => { setAddress(e.target.value); clearError("address"); }}
                    className={`h-14 rounded-none transition-colors ${errors.address ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Delivery Location <span className="text-red-500">*</span>
                  </label>
                  <div ref={fieldRefs.deliveryLocation} className="pt-1">
                    <DeliveryLocationSelect
                      value={deliveryLocation}
                      onChange={(next) => {
                        setDeliveryLocation(next);
                        clearError("deliveryLocation");
                      }}
                      error={Boolean(errors.deliveryLocation)}
                    />
                  </div>
                  {errors.deliveryLocation && <p className="text-[10px] text-red-500 uppercase font-bold">Delivery location is required</p>}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">
              Payment Option <span className="text-red-500">*</span>
            </h2>
            <div className="space-y-3">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`checkout-payment-${opt.id}`}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-none border-2 text-left transition-all ${
                      isSelected
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900/5 dark:bg-white/10"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`h-12 min-w-[140px] flex items-center justify-center shrink-0 overflow-hidden ${
                        "logoWrapClass" in opt ? opt.logoWrapClass : ""
                      }`}
                    >
                      {"logoUrl" in opt ? (
                        <img 
                          src={opt.logoUrl} 
                          alt={opt.label} 
                          className={`max-w-full object-contain ${
                            "logoImageClass" in opt ? opt.logoImageClass : "h-8 w-auto"
                          }`}
                        />
                      ) : null}
                    </span>
                    <span className="font-semibold uppercase tracking-wide text-sm text-zinc-900 dark:text-zinc-100">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  data-testid="checkout-payment-cash-on-delivery"
                  onClick={() => setPaymentMethod("cash_on_delivery")}
                  className={`w-full flex items-center gap-4 p-4 rounded-none border-2 text-left transition-all ${
                    paymentMethod === "cash_on_delivery"
                      ? "border-zinc-900 dark:border-zinc-100 bg-amber-50 dark:bg-amber-900/20"
                      : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <span className="w-12 h-12 rounded-none flex items-center justify-center text-white shrink-0 bg-amber-600">
                    <Banknote className="w-6 h-6" />
                  </span>
                  <span className="font-semibold uppercase tracking-wide text-sm text-black dark:text-white">
                    Cash on Delivery <span className="text-red-500">*</span>
                  </span>
                  {paymentMethod === "cash_on_delivery" && (
                    <CheckCircle2 className="w-5 h-5 text-amber-600 ml-auto shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {isVerificationPanelOpen && (
            <div className="border border-black/10 bg-black/[0.02] px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/55">
                    Large Order Check
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-black">
                    Confirm your email to continue this order.
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-black/65">
                    New customers ordering more than {MAX_NEW_CUSTOMER_ITEMS} items need a quick email verification before checkout completes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => {
                    if (verificationChallengeId) {
                      setIsVerificationPanelOpen(false);
                    }
                  }}
                >
                  Later
                </Button>
              </div>

              <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Verification Code
                  </label>
                  <Input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="Enter the 6-digit code"
                    className="h-14 rounded-none border-gray-200 tracking-[0.3em] uppercase"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 rounded-none px-6 uppercase tracking-[0.16em] text-[10px] font-bold"
                    disabled={isRequestingVerification || verificationResendRemainingSeconds > 0}
                    onClick={async () => {
                      const normalizedEmail = email.trim().toLowerCase();
                      if (!normalizedEmail || totalQuantity <= MAX_NEW_CUSTOMER_ITEMS || verificationResendRemainingSeconds > 0) return;
                      setIsRequestingVerification(true);
                      try {
                        const result = await requestOrderVerification({
                          email: normalizedEmail,
                          quantity: totalQuantity,
                        });
                        if (result.code === "VERIFICATION_RESEND_COOLDOWN" && result.challengeId) {
                          applyVerificationChallenge({
                            challengeId: result.challengeId,
                            nextEmail: normalizedEmail,
                            quantity: totalQuantity,
                            resendSeconds:
                              result.resendAvailableInSeconds ?? result.resendCooldownSeconds ?? DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS,
                          });
                          setFormError("A verification code was already sent. Enter it to continue this order.");
                          return;
                        }
                        if (!result.success || !result.required || !result.challengeId) {
                          setFormError(result.error || "Failed to resend verification email.");
                          return;
                        }
                        applyVerificationChallenge({
                          challengeId: result.challengeId,
                          nextEmail: normalizedEmail,
                          quantity: totalQuantity,
                          resendSeconds:
                            result.resendAvailableInSeconds ?? result.resendCooldownSeconds ?? DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS,
                        });
                        setFormError("A fresh code was sent. Enter it to continue.");
                        toast({
                          title: "Code resent",
                          description: `We sent a new verification code to ${normalizedEmail}.`,
                        });
                      } finally {
                        setIsRequestingVerification(false);
                      }
                    }}
                  >
                    {isRequestingVerification
                      ? "Sending..."
                      : verificationResendRemainingSeconds > 0
                        ? `Resend in ${formatVerificationCountdown(verificationResendRemainingSeconds)}`
                        : "Resend Code"}
                  </Button>
                  <Button
                    type="button"
                    className="h-14 rounded-none bg-black px-6 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                    disabled={isConfirmingVerification}
                    onClick={handleConfirmLargeOrderVerification}
                  >
                    {isConfirmingVerification ? "Verifying..." : "Verify & Continue"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <Button
            type="submit"
            data-testid="checkout-submit"
            className="w-full h-16 bg-black text-white rounded-none uppercase tracking-[0.2em] text-xs font-bold"
            disabled={isPending || isRequestingVerification || isConfirmingVerification}
          >
            {isPending ? "Processing..." : "Confirm Order"}
          </Button>
        </form>

        <div className="w-full lg:w-[450px] bg-zinc-50 dark:bg-zinc-900 p-10 h-fit rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100">
          <div className="space-y-6 mb-10">
            {items.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-24 h-32 bg-muted shrink-0 relative rounded-sm overflow-hidden">
                  <img src={item.product.images[0]} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 bg-black text-white text-[10px] flex items-center justify-center rounded-sm font-bold shadow-sm">{item.quantity}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">{item.product.name}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.variant.size}</p>
                  {Number(item.product.originalPrice ?? item.product.price) > item.product.price && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      <BadgePercent className="h-3 w-3" />
                      Deal applied
                    </div>
                  )}
                </div>
                <div className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                  <div>{formatPrice(item.product.price)}</div>
                  {Number(item.product.originalPrice ?? item.product.price) > item.product.price && (
                    <div className="mt-1 text-[8px] text-zinc-500 dark:text-zinc-400 line-through">
                      {formatPrice(Number(item.product.originalPrice))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-10">
            <div className="flex-1 relative">
              <Input 
                placeholder="Gift card or discount code" 
                data-testid="checkout-promo-input"
                className={`h-12 rounded-none bg-white border-gray-200 uppercase dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${appliedPromo ? "pr-10 border-emerald-500" : ""}`} 
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                disabled={!!appliedPromo}
              />
              {appliedPromo && (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoCodeInput("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button 
              type="button"
              data-testid="checkout-apply-promo"
              variant="secondary" 
              className="h-12 rounded-none px-6 text-xs uppercase tracking-widest font-bold"
              onClick={handleApplyPromo}
              disabled={isValidatingPromo || !!appliedPromo || !promoCodeInput}
            >
              {isValidatingPromo ? "..." : "Apply"}
            </Button>
          </div>

          <div className="space-y-4 text-[10px] uppercase tracking-widest font-bold text-zinc-600 dark:text-zinc-300 pt-8 border-t border-zinc-200 dark:border-zinc-700">
            {productDiscountTotal > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-lime-300/10 to-amber-200/10 px-4 py-4 text-emerald-700">
                <div className="mt-0.5 rounded-full bg-emerald-500/15 p-2">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] uppercase tracking-[0.2em] font-black">Product Discount Live</p>
                  <p className="mt-1 text-[11px] normal-case tracking-normal font-semibold">
                    Discounted item pricing is already included in this subtotal.
                  </p>
                </div>
                <span className="text-[12px] font-black">-{formatPrice(productDiscountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-black">{formatPrice(subtotal)}</span>
            </div>
            {productDiscountTotal > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span className="inline-flex items-center gap-2">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Product Savings
                </span>
                <span className="font-black">-{formatPrice(productDiscountTotal)}</span>
              </div>
            )}
            {appliedPromo && (
              <div className="flex justify-between items-center text-emerald-600">
                <span>Discount ({appliedPromo.code})</span>
                <span className="font-black">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-300">
              <span>Shipping</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-black">{formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between text-zinc-900 dark:text-zinc-100 text-sm font-extrabold pt-4">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
