import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { type CartProduct, type CartState, useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShoppingBag, Banknote, BadgePercent, Sparkles, ArrowLeft } from "lucide-react";
import { DeliveryLocationSelect } from "@/components/DeliveryLocationSelect";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  cacheLatestOrder,
  cachePendingCheckout,
  clearPendingCheckout,
  confirmOrderVerification,
  createOrder,
  fetchFonepayStatus,
  requestOrderVerification,
  type OrderInput,
  validatePromoCode,
} from "@/lib/api";
import {
  FONEPAY_PROVIDER_CHARGE_NOTE,
  FONEPAY_QR_BENEFIT_RATE,
  FONEPAY_QR_PROMO_CEILING_RATE,
  FONEPAY_RARE_ATELIER_FEE_NPR,
  getFonepayEstimatedQrSavings,
} from "@/lib/fonepay";
import { formatStorefrontPrice as formatPrice } from "@/lib/format";
import { buildStorefrontPresetImageUrl, getStorefrontImagePresetOptions } from "@/lib/storefrontImage";
import { StorefrontSeo } from "@/components/seo/StorefrontSeo";

const CHECKOUT_FORM_KEY = "ra-checkout-form-data";
const MAX_NEW_CUSTOMER_ITEMS = 5;
const DEFAULT_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
const NEPAL_PHONE_COUNTRY_CODE = "+977";
const NEPAL_PHONE_LOCAL_LENGTH = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_SUMMARY_IMAGE_DIMENSIONS = getStorefrontImagePresetOptions("galleryThumb");

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
  landmarkVal: string;
  phoneVal: string;
  deliveryLocationVal: string;
};

type AdminSeedItemProduct = Partial<CartProduct> & {
  id?: string;
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
  category?: string;
  images?: string[];
  variants?: Array<{ id?: number; size: string; color: string; stock?: number | null }>;
};

type AdminSeedItem = {
  id?: string;
  quantity?: number;
  variant?: { id?: number; size?: string; color?: string };
  product?: AdminSeedItemProduct;
};

type AdminSeedCustomer = {
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  landmark?: string;
};

type AdminOrderSeedPayload = {
  customer?: AdminSeedCustomer;
  items?: AdminSeedItem[];
};

function decodeAdminOrderSeed(raw: string | null): AdminOrderSeedPayload | null {
  if (!raw) return null;

  try {
    if (typeof window === "undefined" || typeof window.atob !== "function") {
      return null;
    }
    const json = decodeURIComponent(escape(window.atob(raw)));
    const parsed = JSON.parse(json) as AdminOrderSeedPayload;
    return parsed && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeSeedProduct(product: AdminSeedItemProduct | undefined): CartProduct | null {
  if (!product?.id || !product.name) return null;
  return {
    id: String(product.id),
    name: String(product.name),
    sku: String(product.sku ?? product.id),
    price: Number(product.price ?? 0),
    stock: Number(product.stock ?? 0),
    category: String(product.category ?? ""),
    images: Array.isArray(product.images) ? product.images.filter((image: unknown): image is string => typeof image === "string") : [],
    variants: Array.isArray(product.variants) && product.variants.length
      ? product.variants.map((variant: { id?: number; size: string; color: string; stock?: number | null }) => ({
          id: typeof variant.id === "number" ? variant.id : undefined,
          size: variant.size,
          color: variant.color,
          stock: typeof variant.stock === "number" ? variant.stock : null,
        }))
      : [{ size: "One Size", color: "Default", stock: Number(product.stock ?? 0) }],
  };
}

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

function normalizeNepalPhoneLocal(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("977")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0") && digits.length > NEPAL_PHONE_LOCAL_LENGTH) {
    digits = digits.slice(1);
  }

  return digits.slice(0, NEPAL_PHONE_LOCAL_LENGTH);
}

function buildNepalPhoneNumber(value: string) {
  const localDigits = normalizeNepalPhoneLocal(value);
  return localDigits ? `${NEPAL_PHONE_COUNTRY_CODE}${localDigits}` : "";
}

function getEmailError(value: string, required: boolean) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Email is required for large-order verification." : undefined;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return undefined;
}

function getPhoneError(value: string, options?: { live?: boolean }) {
  const localDigits = normalizeNepalPhoneLocal(value);
  if (!localDigits) {
    return options?.live ? undefined : "Enter your 10-digit Nepal mobile number.";
  }
  if (localDigits.length < NEPAL_PHONE_LOCAL_LENGTH) {
    const remainingDigits = NEPAL_PHONE_LOCAL_LENGTH - localDigits.length;
    return `Add ${remainingDigits} more digit${remainingDigits === 1 ? "" : "s"} to complete your mobile number.`;
  }
  if (!/^9\d{9}$/.test(localDigits)) {
    return "Use a valid Nepal mobile number starting with 9.";
  }
  return undefined;
}

function resolveCheckoutItemColor(item: CartState["items"][number]) {
  const explicitColor = String(item.variant.color ?? "").trim();
  if (explicitColor && explicitColor.toLowerCase() !== "default") {
    return explicitColor;
  }

  const matchedVariantColor = item.product.variants
    ?.find((variant) => {
      const sameSize = String(variant.size ?? "").trim() === String(item.variant.size ?? "").trim();
      const sameColor = String(variant.color ?? "").trim() === explicitColor;
      return sameSize && (sameColor || !explicitColor || explicitColor.toLowerCase() === "default");
    })
    ?.color
    ?.trim();

  if (matchedVariantColor && matchedVariantColor.toLowerCase() !== "default") {
    return matchedVariantColor;
  }

  const firstAvailableColor = item.product.variants
    ?.map((variant) => String(variant.color ?? "").trim())
    .find((color) => color && color.toLowerCase() !== "default");

  return firstAvailableColor || explicitColor || "Default";
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, replaceItems, hasHydrated = true } = useCartStore((state: CartState) => state);
  const { toast } = useToast();
  const fonepayStatusQuery = useQuery({
    queryKey: ["payments", "fonepay", "status"],
    queryFn: fetchFonepayStatus,
    staleTime: 30_000,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("cash_on_delivery");
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [adminSeedPending, setAdminSeedPending] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("admin_order_seed");
  });
  const fonepayGateway = fonepayStatusQuery.data?.data;
  const fonepayAnyAvailable = Boolean(fonepayGateway?.web.available || fonepayGateway?.qr.available);
  const isFonepayUnavailable =
    fonepayStatusQuery.isError || (fonepayStatusQuery.isSuccess && !fonepayAnyAvailable);

  useEffect(() => {
    if (paymentMethod !== "fonepay" || !isFonepayUnavailable) return;
    setPaymentMethod("cash_on_delivery");
  }, [isFonepayUnavailable, paymentMethod]);

  useEffect(() => {
    if (!hasHydrated || !adminSeedPending || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const rawSeed = params.get("admin_order_seed");
    const seed = decodeAdminOrderSeed(rawSeed);

    if (!seed?.items?.length) {
      setAdminSeedPending(false);
      return;
    }

    const seededItems = seed.items
      .map((seedItem) => {
        const product = normalizeSeedProduct(seedItem.product);
        if (!product) return null;

        const variant = {
          id: typeof seedItem.variant?.id === "number" ? seedItem.variant.id : undefined,
          size: typeof seedItem.variant?.size === "string" && seedItem.variant.size.trim() ? seedItem.variant.size : "One Size",
          color: typeof seedItem.variant?.color === "string" && seedItem.variant.color.trim() ? seedItem.variant.color : "Default",
        };
        const quantity = Math.max(1, Number(seedItem.quantity ?? 1));

        return {
          id: `${product.id}-${variant.size}-${variant.color}`,
          product,
          variant,
          quantity,
        };
      })
      .filter((item): item is CartState["items"][number] => Boolean(item));

    if (!seededItems.length) {
      setAdminSeedPending(false);
      return;
    }

    replaceItems(seededItems);

    if (seed.customer) {
      if (seed.customer.fullName) setFullName(seed.customer.fullName);
      if (seed.customer.phone) setPhone(normalizeNepalPhoneLocal(seed.customer.phone));
      if (seed.customer.email) setEmail(seed.customer.email);
      if (seed.customer.city) setDeliveryLocation(seed.customer.city);
      if (seed.customer.address) setAddress(seed.customer.address);
      if (seed.customer.landmark) setLandmark(seed.customer.landmark);
    }

    params.delete("admin_order_seed");
    const nextSearch = params.toString();
    window.history.replaceState(window.history.state, "", nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname);
    setAdminSeedPending(false);
  }, [adminSeedPending, hasHydrated, replaceItems]);

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
        if (data.landmark) setLandmark(data.landmark);
        if (data.phone) setPhone(normalizeNepalPhoneLocal(data.phone));
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
        landmark,
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
  const fonepayEstimatedSavings = getFonepayEstimatedQrSavings(total);
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

  if (items.length === 0 && step !== 3 && !adminSeedPending) {
    setLocation("/cart");
    return null;
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createOrder,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const fieldRefs = {
    email: useRef<HTMLInputElement>(null),
    fullName: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    landmark: useRef<HTMLInputElement>(null),
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

  const setFieldError = (field: string, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
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
    landmarkVal,
    phoneVal,
    deliveryLocationVal,
  }: PendingCheckoutContinuation) => {
    if (manualPayment) {
      saveFormData({
        email: emailVal,
        fullName: fullNameVal,
        address: addressVal,
        landmark: landmarkVal,
        phone: normalizeNepalPhoneLocal(phoneVal),
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
        description:
          paymentMethod === "fonepay"
            ? "Continue to the Fonepay handoff to choose hosted checkout or a live exact-amount QR."
            : "Upload your payment screenshot to complete and create the order.",
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
    const newErrors: Record<string, string> = {};

    const formData = new FormData(event.currentTarget);

    const emailVal = (email || String(formData.get("email") || "")).trim();
    const fullNameVal = (fullName || String(formData.get("fullName") || "")).trim();
    const addressVal = (address || String(formData.get("address") || "")).trim();
    const landmarkVal = (landmark || String(formData.get("landmark") || "")).trim();
    const phoneLocalVal = normalizeNepalPhoneLocal(phone || String(formData.get("phone") || ""));
    const phoneVal = buildNepalPhoneNumber(phoneLocalVal);
    const deliveryLocationVal = deliveryLocation.trim() || String(formData.get("deliveryLocation") || "").trim();

    if (!fullNameVal) newErrors.fullName = "Full name is required.";

    const phoneError = getPhoneError(phoneLocalVal);
    if (phoneError) newErrors.phone = phoneError;

    const emailError = getEmailError(emailVal, totalQuantity > MAX_NEW_CUSTOMER_ITEMS);
    if (emailError) newErrors.email = emailError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError("Please fill in all required fields.");
      
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
        email: emailVal || undefined,
        phone: phoneVal,
        address: addressVal || undefined,
        city: "",
        zip: "00000",
        country: "Nepal",
        locationCoordinates: deliveryLocationVal || undefined,
        deliveryLocation: deliveryLocationVal || undefined,
      },
      paymentMethod,
      source: "website",
      deliveryRequired: true,
      deliveryProvider: null,
      deliveryAddress: landmarkVal || null,
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
        landmarkVal,
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
      <div
        className="container mx-auto max-w-7xl px-4 pb-16 lg:pb-20"
        style={{ paddingTop: "calc(var(--nav-h) + 2rem)" }}
      >
      <div className="flex flex-col gap-16 lg:flex-row">
        <form
          data-testid="checkout-form"
          className="flex-1 space-y-14"
          onSubmit={handlePlaceOrder}
        >
          <div className="space-y-12">
            <div>
              <div className="mb-6 border-b border-zinc-200 pb-4">
                <h2 className="text-xl font-black uppercase tracking-tighter">Contact</h2>
                <p className="mt-2 text-sm text-muted-foreground">Use the phone number our delivery team should call if they need help reaching you.</p>
              </div>
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
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearError("fullName"); }}
                    className={`h-14 rounded-none transition-colors ${errors.fullName ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                  {errors.fullName && <p className="text-[10px] text-red-500 uppercase font-bold">{errors.fullName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`relative flex h-14 overflow-hidden rounded-none border transition-colors ${
                      errors.phone ? "border-2 border-red-500" : "border-gray-200"
                    }`}
                  >
                    <div className="pointer-events-none flex items-center gap-2 border-r border-gray-200 bg-zinc-50 px-4">
                      <img src="/nepal-flag-icon.svg" alt="Nepal flag" className="h-4 w-6 object-cover" />
                      <span className="text-sm font-semibold tracking-wide text-zinc-700">{NEPAL_PHONE_COUNTRY_CODE}</span>
                    </div>
                    <Input
                      ref={fieldRefs.phone}
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="98XXXXXXXX"
                      data-testid="checkout-phone"
                      value={phone}
                      onChange={(e) => {
                        const nextPhone = normalizeNepalPhoneLocal(e.target.value);
                        setPhone(nextPhone);
                        setFieldError("phone", getPhoneError(nextPhone, { live: true }));
                      }}
                      onBlur={(e) => {
                        setFieldError("phone", getPhoneError(e.target.value));
                      }}
                      className="h-full rounded-none border-0 px-4 shadow-none focus-visible:ring-0"
                      maxLength={NEPAL_PHONE_LOCAL_LENGTH}
                      aria-describedby="checkout-phone-feedback"
                      aria-invalid={Boolean(errors.phone)}
                    />
                  </div>
                  <p
                    id="checkout-phone-feedback"
                    aria-live="polite"
                    className={errors.phone ? "text-[11px] font-medium text-red-600" : "text-[11px] text-muted-foreground"}
                  >
                    {errors.phone || "Nepal mobile number only. The +977 country code is already added for you."}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-5">
                <h2 className="text-xl font-black uppercase tracking-tighter">Additional Details</h2>
                <p className="mt-2 text-sm text-muted-foreground">Add address notes, landmark details, and any extra context that helps the rider find you faster.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Email Address {totalQuantity > MAX_NEW_CUSTOMER_ITEMS ? <span className="text-red-500">*</span> : null}
                  </label>
                  <Input
                    ref={fieldRefs.email}
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    data-testid="checkout-email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
                    onBlur={(e) => {
                      const nextError = getEmailError(e.target.value, totalQuantity > MAX_NEW_CUSTOMER_ITEMS);
                      if (nextError) {
                        setErrors((prev) => ({ ...prev, email: nextError }));
                      }
                    }}
                    className={`h-14 rounded-none transition-colors ${errors.email ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                  {errors.email && <p className="text-[10px] text-red-500 uppercase font-bold">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Address
                  </label>
                  <Input
                    ref={fieldRefs.address}
                    name="address"
                    placeholder="Address"
                    data-testid="checkout-address"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); clearError("address"); }}
                    className={`h-14 rounded-none transition-colors ${errors.address ? "border-red-500 border-2" : "border-gray-200"}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Landmark
                  </label>
                  <Input
                    ref={fieldRefs.landmark}
                    name="landmark"
                    placeholder="Nearby chowk, school, temple, office, or shop"
                    data-testid="checkout-landmark"
                    value={landmark}
                    onChange={(e) => {
                      setLandmark(e.target.value);
                      clearError("landmark");
                    }}
                    className="h-14 rounded-none border-gray-200 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Delivery Location
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
                  {errors.deliveryLocation && <p className="text-[10px] text-red-500 uppercase font-bold">{errors.deliveryLocation}</p>}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-6 flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter">
                  Payment Option <span className="text-red-500">*</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose how you&apos;d like to complete the order. Online methods move you to the correct payment handoff, while cash on delivery finishes directly from checkout.
                </p>
              </div>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground md:block">
                Select one route
              </span>
            </div>

            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const isSelected = paymentMethod === opt.id;
                  const isFonepayOption = opt.id === "fonepay";
                  const isDisabled = isFonepayOption && isFonepayUnavailable;
                  const availabilityMessage = isFonepayOption
                    ? fonepayStatusQuery.isError
                      ? "Availability check failed. Please use another payment method for now."
                      : fonepayGateway?.qr.available && fonepayGateway?.web.available
                        ? "Hosted bank redirect and live QR are both available."
                        : fonepayGateway?.qr.available
                          ? "Live exact-amount QR is available right now."
                          : fonepayGateway?.web.available
                            ? "Hosted bank redirect is available right now."
                            : fonepayGateway?.web.issues[0] || fonepayGateway?.qr.issues[0] || null
                    : null;
                  const benefitDescription = isFonepayOption
                    ? `Estimated QR savings for this cart: NPR ${fonepayEstimatedSavings} at ${Math.round(FONEPAY_QR_BENEFIT_RATE * 100)}% when the current partner offer is active.`
                    : null;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`checkout-payment-${opt.id}`}
                      onClick={() => {
                        if (isDisabled) return;
                        setPaymentMethod(opt.id);
                      }}
                      disabled={isDisabled}
                      className={`group relative flex min-h-[104px] flex-col justify-between border px-5 py-4 text-left transition-all ${
                        isDisabled
                          ? "cursor-not-allowed border-zinc-200 bg-zinc-100/70 opacity-70"
                          : isSelected
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span
                          className={`h-11 min-w-[124px] flex items-center justify-start overflow-hidden ${
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
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${
                              isSelected ? "bg-white" : "bg-transparent"
                            }`}
                          />
                        </span>
                      </div>

                      <div className="mt-5 space-y-1">
                        <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-zinc-900">
                          {opt.label}
                        </span>
                        {availabilityMessage ? (
                          <span
                            className={`block text-[11px] leading-5 ${
                              isDisabled ? "text-red-600" : "text-muted-foreground"
                            }`}
                          >
                            {availabilityMessage}
                          </span>
                        ) : null}
                        {isFonepayOption ? (
                          <div
                            data-testid="checkout-fonepay-benefits"
                            className="mt-3 flex flex-col gap-2 text-left"
                          >
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {Math.round(FONEPAY_QR_BENEFIT_RATE * 100)}% QR benefit
                              </Badge>
                              <Badge variant="outline">
                                Promo windows up to {Math.round(FONEPAY_QR_PROMO_CEILING_RATE * 100)}%
                              </Badge>
                              <Badge variant="outline">
                                Rare Atelier fee NPR {FONEPAY_RARE_ATELIER_FEE_NPR}
                              </Badge>
                            </div>
                            <span className="block text-[11px] leading-5 text-muted-foreground">
                              {benefitDescription}
                            </span>
                            <span className="block text-[11px] leading-5 text-muted-foreground">
                              {FONEPAY_PROVIDER_CHARGE_NOTE}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-zinc-200 pt-5">
                <button
                  type="button"
                  data-testid="checkout-payment-cash-on-delivery"
                  onClick={() => setPaymentMethod("cash_on_delivery")}
                  className={`flex w-full items-center gap-4 border px-5 py-4 text-left transition-all ${
                    paymentMethod === "cash_on_delivery"
                      ? "border-zinc-900 bg-amber-50"
                      : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50/60"
                  }`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center border ${
                    paymentMethod === "cash_on_delivery"
                      ? "border-amber-300 bg-amber-100 text-amber-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700"
                  }`}>
                    <Banknote className="w-5 h-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-zinc-900">
                      Cash on Delivery <span className="text-red-500">*</span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Keep it simple and pay when your order arrives.
                    </span>
                  </span>

                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      paymentMethod === "cash_on_delivery"
                        ? "border-zinc-900 bg-zinc-900"
                        : "border-zinc-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        paymentMethod === "cash_on_delivery" ? "bg-white" : "bg-transparent"
                      }`}
                    />
                  </span>
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
            {items.map((item) => {
              const summaryColor = resolveCheckoutItemColor(item);
              const sizeLabel = String(item.variant.size ?? "").trim() || "One Size";
              const variantSummary = summaryColor && summaryColor !== "Default"
                ? `${sizeLabel} · ${summaryColor}`
                : sizeLabel;
              const checkoutImage = item.product.images[0] ?? "";

              return (
                <div key={item.id} className="flex gap-4">
                  <div className="w-24 h-32 bg-muted shrink-0 relative rounded-sm overflow-hidden">
                    {checkoutImage ? (
                      <img
                        src={
                          buildStorefrontPresetImageUrl(checkoutImage, "galleryThumb") ||
                          checkoutImage
                        }
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        width={CHECKOUT_SUMMARY_IMAGE_DIMENSIONS.width}
                        height={CHECKOUT_SUMMARY_IMAGE_DIMENSIONS.height}
                        sizes="96px"
                      />
                    ) : null}
                    <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 bg-black text-white text-[10px] flex items-center justify-center rounded-sm font-bold shadow-sm">{item.quantity}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest">{item.product.name}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase">{variantSummary}</p>
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
              );
            })}
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
