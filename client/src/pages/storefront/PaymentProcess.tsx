import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  cacheLatestOrder,
  cancelOrder,
  clearPendingCheckout,
  createCheckoutSession,
  createOrder,
  fetchOrderById,
  fetchPaymentQrConfig,
  getCachedLatestOrder,
  getPendingCheckout,
  simulateStripePaymentSuccess,
  updateOrderPaymentMethod,
  updatePendingCheckoutPaymentMethod,
  uploadPaymentProof,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import {
  Upload,
  CheckCircle2,
  Loader2,
  CreditCard,
  ExternalLink,
  AlertCircle,
  X,
  ZoomIn,
  Download,
  Phone,
} from "lucide-react";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { useCartStore } from "@/store/cart";

function useSearchQuery() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

const FALLBACK_PAYMENT_QR = {
  esewa: "/images/esewa-qr.webp",
  khalti:
    "https://blog.khalti.com/wp-content/uploads/2023/03/MPQRCode-HYLEbgp9z64hDoqP9L8ZyQ-pdf.jpg",
  fonepay:
    "https://cdn11.bigcommerce.com/s-tgrcca6nho/images/stencil/original/products/65305/136311/Quick-Scan-Pay-Stand-Scan1_136310__37301.1758003923.jpg",
} as const;

const CHECKOUT_FORM_KEY = "ra-checkout-form-data";

const PAYMENT_RECEIVER = {
  name: "Aaryan Raj Pradhan",
  primaryPhone: "970-5211511",
  alternatePhone: "+977 984-3203050",
  bankName: "Global IME Bank",
  accountNumber: "01234567890123",
} as const;

const PAYMENT_METHOD_SWITCH_OPTIONS = [
  { id: "esewa", label: "eSewa" },
  { id: "khalti", label: "Khalti" },
  { id: "fonepay", label: "Fonepay" },
  { id: "stripe", label: "Card" },
] as const;

function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load QR image"));
    image.src = src;
  });
}

async function convertImageToJpegBlob(src: string) {
  const response = await fetch(src, { mode: "cors" });
  if (!response.ok) {
    throw new Error("Download request failed");
  }

  const originalBlob = await response.blob();
  const objectUrl = URL.createObjectURL(originalBlob);

  try {
    const image = await loadImageElement(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (jpegBlob) => {
          if (jpegBlob) {
            resolve(jpegBlob);
            return;
          }
          reject(new Error("Unable to create JPEG file"));
        },
        "image/jpeg",
        0.92,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function PaymentProcess() {
  const query = useSearchQuery();
  const [, setLocation] = useLocation();
  const orderId = query.get("orderId") ?? "";
  const method = query.get("method") ?? "esewa";
  const stripeStatus = query.get("stripe_status");
  const { toast } = useToast();
  const clearCart = useCartStore((state) => state.clearCart);
  const pendingCheckout = getPendingCheckout();
  const hasPendingManualOrder = !orderId && !!pendingCheckout?.orderInput?.items?.length;
  const [order, setOrder] = useState<Awaited<ReturnType<typeof fetchOrderById>>>(() =>
    orderId ? getCachedLatestOrder(orderId) : null,
  );
  const [isResolved, setIsResolved] = useState(() =>
    orderId ? !!getCachedLatestOrder(orderId) : true,
  );
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [switchingPaymentMethod, setSwitchingPaymentMethod] = useState<string | null>(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [qrImageLoading, setQrImageLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLocalTesting =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const paymentQrQuery = useQuery({
    queryKey: ["storefront", "payment-qr"],
    queryFn: fetchPaymentQrConfig,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!orderId) return;

    if (stripeStatus === "success") {
      toast({ title: "Payment confirmed! Redirecting to your order..." });
      setTimeout(() => {
        setLocation(`/order-confirmation/${orderId}`);
      }, 1500);
      return;
    }

    if (stripeStatus === "cancelled") {
      toast({ title: "Payment was cancelled. You can try again below.", variant: "destructive" });
    }

    const cached = getCachedLatestOrder(orderId);
    if (cached) {
      setOrder(cached);
      setIsResolved(true);
      return;
    }

    let cancelled = false;

    fetchOrderById(orderId)
      .then((fetched) => {
        if (cancelled) return;
        setOrder(fetched ?? getCachedLatestOrder(orderId));
      })
      .finally(() => {
        if (cancelled) return;
        setIsResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, stripeStatus, toast, setLocation]);

  useEffect(() => {
    return () => {
      if (selectedProofPreview) {
        URL.revokeObjectURL(selectedProofPreview);
      }
    };
  }, [selectedProofPreview]);

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file (PNG, JPG)", variant: "destructive" });
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB. Please use a smaller image.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (selectedProofPreview) {
      URL.revokeObjectURL(selectedProofPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedProofFile(file);
    setSelectedProofPreview(previewUrl);
    setUploaded(false);
    toast({ title: "Screenshot selected", description: "Review the preview and confirm to complete your order." });
    e.target.value = "";
  };

  const convertProofToBase64 = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      const maxDimension = 1800;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas not supported");
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.86);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleConfirmPaymentScreenshot = async () => {
    if (!selectedProofFile) {
      toast({ title: "Choose a payment screenshot first.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const base64 = await convertProofToBase64(selectedProofFile);

      if (!orderId) {
        if (!pendingCheckout?.orderInput?.items?.length) {
          toast({ title: "Checkout session expired. Please start again.", variant: "destructive" });
          setLocation("/checkout");
          return;
        }

        const createResult = await createOrder(pendingCheckout.orderInput);
        if (!createResult.success || !createResult.data) {
          if (createResult.code === "ORDER_VERIFICATION_REQUIRED") {
            toast({
              title: createResult.error || "Email verification required before this large order can continue.",
              variant: "destructive",
            });
            setLocation("/checkout?returning=1");
            return;
          }
          toast({ title: createResult.error || "Failed to create order", variant: "destructive" });
          return;
        }

        const createdOrder = createResult.data.order;
        const uploadResult = await uploadPaymentProof(createdOrder.id, base64);

        if (!uploadResult.success) {
          try {
            await cancelOrder(createdOrder.id);
          } catch {
          }

          toast({
            title: uploadResult.error || "Payment upload failed, so the order was not saved.",
            variant: "destructive",
          });
          return;
        }

        const refreshedCreatedOrder = await fetchOrderById(createdOrder.id).catch(() => null);
        const nextCreatedOrder = refreshedCreatedOrder ?? createdOrder;

        cacheLatestOrder(nextCreatedOrder);
        clearPendingCheckout();
        clearCart();
        try {
          localStorage.removeItem(CHECKOUT_FORM_KEY);
        } catch {
        }

        setOrder(nextCreatedOrder);
        setUploaded(true);
        toast({ title: "Payment screenshot uploaded. Order created successfully." });

        setTimeout(() => {
          setLocation(`/order-confirmation/${nextCreatedOrder.id}`);
        }, 900);
        return;
      }

      const result = await uploadPaymentProof(orderId, base64);
      if (result.success) {
        const refreshedOrder = await fetchOrderById(orderId).catch(() => null);
        const nextOrder = refreshedOrder ?? order;
        if (nextOrder) {
          cacheLatestOrder(nextOrder);
          setOrder(nextOrder);
        }

        clearCart();
        clearPendingCheckout();
        try {
          localStorage.removeItem(CHECKOUT_FORM_KEY);
        } catch {
        }
        setUploaded(true);
        toast({ title: "Payment screenshot uploaded. We will verify shortly." });
        setTimeout(() => {
          setLocation(`/order-confirmation/${orderId}`);
        }, 900);
      } else {
        toast({ title: result.error || "Upload failed", variant: "destructive" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const isTooLarge = message.startsWith("413");
      toast({
        title: isTooLarge
          ? `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB. Please use a smaller image.`
          : "Upload failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!orderId) return;

    if (isLocalTesting) {
      setSimulatingPayment(true);
      try {
        const result = await simulateStripePaymentSuccess(orderId);
        if (result.success) {
          toast({ title: "Test payment completed. Redirecting to your order..." });
          setTimeout(() => {
            setLocation(`/order-confirmation/${orderId}`);
          }, 1200);
        } else {
          toast({ title: result.error || "Test payment failed", variant: "destructive" });
        }
      } catch {
        toast({ title: "Failed to simulate test payment", variant: "destructive" });
      } finally {
        setSimulatingPayment(false);
      }
      return;
    }

    setRedirectingToStripe(true);
    try {
      const result = await createCheckoutSession(orderId);
      if (result.success && result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        toast({ title: result.error || "Failed to start checkout", variant: "destructive" });
        setRedirectingToStripe(false);
      }
    } catch (err) {
      toast({ title: "Failed to connect to Stripe. Please try again.", variant: "destructive" });
      setRedirectingToStripe(false);
    }
  };

  const handleChangePaymentMethod = async (
    nextMethod: "esewa" | "khalti" | "fonepay" | "stripe",
  ) => {
    if (nextMethod === method) return;

    setSwitchingPaymentMethod(nextMethod);
    try {
      if (!orderId) {
        updatePendingCheckoutPaymentMethod(nextMethod);
        const nextLabel =
          PAYMENT_METHOD_SWITCH_OPTIONS.find((option) => option.id === nextMethod)?.label ??
          nextMethod;

        if (nextMethod === "stripe") {
          toast({ title: `Switched to ${nextLabel}. Complete checkout to pay by card.` });
          setLocation("/checkout?returning=1");
          return;
        }

        toast({ title: `Payment method changed to ${nextLabel}` });
        setLocation(`/checkout/payment?method=${nextMethod}`);
        return;
      }

      const result = await updateOrderPaymentMethod(orderId, nextMethod);
      if (!result.success) {
        toast({ title: result.error || "Failed to change payment method", variant: "destructive" });
        return;
      }

      const nextLabel =
        PAYMENT_METHOD_SWITCH_OPTIONS.find((option) => option.id === nextMethod)?.label ??
        nextMethod;
      toast({ title: `Payment method changed to ${nextLabel}` });
      setLocation(`/checkout/payment?orderId=${orderId}&method=${nextMethod}`);
    } catch {
      toast({ title: "Failed to change payment method", variant: "destructive" });
    } finally {
      setSwitchingPaymentMethod(null);
    }
  };

  const orderTotal = Number(order?.total ?? pendingCheckout?.total ?? 0);
  const confirmationOrderId = order?.id ?? orderId;
  const normalizedMethod =
    method === "esewa" || method === "khalti" || method === "fonepay" || method === "bank"
      ? method
      : "esewa";
  const title =
    normalizedMethod === "esewa"
      ? "Pay with eSewa"
      : normalizedMethod === "khalti"
        ? "Pay with Khalti"
        : normalizedMethod === "fonepay"
          ? "Pay with Fonepay"
          : "Bank Transfer";
  const qrConfig = paymentQrQuery.data;
  const paymentLabel =
    normalizedMethod === "esewa"
      ? "eSewa"
      : normalizedMethod === "khalti"
        ? "Khalti"
        : normalizedMethod === "fonepay"
          ? "Fonepay"
          : "Bank Transfer";
  const isBankTransfer = normalizedMethod === "bank";
  const qrImageSrc =
    normalizedMethod === "khalti"
      ? qrConfig?.khaltiQrUrl
      : normalizedMethod === "fonepay"
        ? qrConfig?.fonepayQrUrl
        : qrConfig?.esewaQrUrl;
  const resolvedQrImageSrc =
    qrImageSrc ||
    (normalizedMethod === "khalti"
      ? FALLBACK_PAYMENT_QR.khalti
      : normalizedMethod === "fonepay"
        ? FALLBACK_PAYMENT_QR.fonepay
        : FALLBACK_PAYMENT_QR.esewa);

  useEffect(() => {
    setQrImageLoading(true);
  }, [resolvedQrImageSrc]);

  if (!orderId && !hasPendingManualOrder) {
    return (
      <div className="container mx-auto px-4 py-12 text-center sm:py-16">
        <p className="text-muted-foreground">Invalid payment link.</p>
        <Button asChild className="mt-6 rounded-none">
          <Link href="/cart">Back to Cart</Link>
        </Button>
      </div>
    );
  }

  if (!isResolved && orderId && !order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <BrandedLoader />
      </div>
    );
  }

  if (orderId && !order) {
    return (
      <div className="container mx-auto px-4 py-12 text-center sm:py-16">
        <p className="text-muted-foreground">We could not load this order.</p>
        <Button asChild className="mt-6 rounded-none">
          <Link href="/cart">Back to Cart</Link>
        </Button>
      </div>
    );
  }

  if (method === "stripe" && !orderId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center sm:py-16">
        <p className="text-muted-foreground">Card payment starts from checkout for now.</p>
        <Button asChild className="mt-6 rounded-none">
          <Link href="/checkout?returning=1">Back to Checkout</Link>
        </Button>
      </div>
    );
  }

  if (method === "stripe" && order) {
    return (
      <div className="container mx-auto max-w-3xl px-4 pb-12 pt-4 sm:pb-16 sm:pt-6">
        <div className="mb-6 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Change Payment Method
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHOD_SWITCH_OPTIONS.filter((option) => option.id !== "stripe").map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                className="h-11 rounded-none text-[11px] uppercase tracking-widest"
                disabled={switchingPaymentMethod !== null}
                onClick={() => handleChangePaymentMethod(option.id)}
              >
                {switchingPaymentMethod === option.id ? "Switching..." : option.label}
              </Button>
            ))}
          </div>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
          Pay by Card
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Order total: {formatPrice(orderTotal)}
        </p>

        <div className="mb-8 border border-gray-200 bg-gradient-to-br from-slate-50 to-gray-50 p-5 sm:p-8 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-9 flex items-center justify-center overflow-hidden">
              <img
                src="/images/stripe-logo.svg"
                alt="Stripe"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-100">Secure Card Payment</p>
              <p className="text-xs text-muted-foreground">Powered by Stripe</p>
            </div>
          </div>

          <div className="mb-4 border border-gray-200 bg-white p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Amount</span>
              <span className="text-lg font-black">{formatPrice(orderTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You will be charged in USD at the current exchange rate.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/70">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {isLocalTesting
                ? "Local testing mode: Stripe redirect is skipped and your payment will be marked successful instantly."
                : "You will be redirected to Stripe&apos;s secure checkout page to enter your card details. After payment, you will be redirected back here."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleStripeCheckout}
          disabled={redirectingToStripe || simulatingPayment}
          className="w-full h-14 bg-[#635bff] text-white rounded-none uppercase tracking-widest text-xs font-bold hover:bg-[#4b45c6] transition-colors"
        >
          {redirectingToStripe || simulatingPayment ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {isLocalTesting ? "Completing test payment..." : "Redirecting to Stripe..."}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              {isLocalTesting ? "Complete Test Payment" : "Proceed to Secure Checkout"}
              {!isLocalTesting && <ExternalLink className="w-4 h-4 ml-2" />}
            </>
          )}
        </Button>

        <div className="mt-8 grid gap-2 border-t border-gray-100 dark:border-zinc-800 pt-6 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-11 rounded-none text-xs">
            <Link href="/checkout?returning=1">← Back to Checkout</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 rounded-none text-xs text-muted-foreground">
            <Link href={`/order-confirmation/${orderId}`}>← Back to Order</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleDownloadQr = async () => {
    setDownloadingQr(true);
    try {
      const jpegBlob = await convertImageToJpegBlob(resolvedQrImageSrc);
      downloadBlob(jpegBlob, `rare-${normalizedMethod}-qr.jpg`);
      toast({ title: `${paymentLabel} QR downloaded as JPG` });
    } catch {
      const fallbackLink = document.createElement("a");
      fallbackLink.href = resolvedQrImageSrc;
      fallbackLink.target = "_blank";
      fallbackLink.rel = "noopener noreferrer";
      fallbackLink.download = `rare-${normalizedMethod}-qr.jpg`;
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
      toast({
        title: "We could not convert the QR automatically. It has been opened so you can save it manually.",
      });
    } finally {
      setDownloadingQr(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-12 pt-4 sm:pb-16 sm:pt-6">
      <div className="space-y-12">
        <div className="flex flex-col gap-6 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Payment Confirmation
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {isBankTransfer
                ? "Finish this order in two simple steps: make the transfer, then upload the proof so we can verify it quickly."
                : `Finish this order in two simple steps: pay in ${paymentLabel}, then upload the proof so we can verify it quickly.`}
            </p>
          </div>

          <div className="grid min-w-full gap-2 border-t border-zinc-200 pt-4 text-sm sm:min-w-[300px] sm:border-t-0 sm:pt-0 lg:max-w-[340px]">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Order total
              </span>
              <span className="text-lg font-black text-zinc-950 dark:text-zinc-50">{formatPrice(orderTotal)}</span>
            </div>
            {confirmationOrderId ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase tracking-[0.18em]">Order ref</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{confirmationOrderId.slice(-8).toUpperCase()}</span>
              </div>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                Your order will be created as soon as the payment screenshot is confirmed.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Change Payment Method
          </p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHOD_SWITCH_OPTIONS.map((option) => {
              const isCurrent = option.id === method;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isCurrent || switchingPaymentMethod !== null}
                  onClick={() => handleChangePaymentMethod(option.id)}
                  className={`h-10 border px-4 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                    isCurrent
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                  }`}
                >
                  {switchingPaymentMethod === option.id
                    ? "Switching..."
                    : isCurrent
                      ? `${option.label} selected`
                      : option.label}
                </button>
              );
            })}
            <Button asChild variant="ghost" className="h-10 rounded-none px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Link href="/checkout?returning=1">Back to Checkout</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <section className="border border-zinc-200 bg-zinc-50/70 p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Step 1</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
                  {isBankTransfer ? "Transfer the amount" : `Pay with ${paymentLabel}`}
                </h2>
              </div>
              <span className="max-w-[180px] text-right text-xs leading-5 text-muted-foreground">
                {isBankTransfer ? "Use the account details exactly as shown." : "Use the QR below and pay the exact amount shown above."}
              </span>
            </div>

            {isBankTransfer ? (
              <div className="mt-8 space-y-6">
                <div className="border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Bank Name</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{PAYMENT_RECEIVER.bankName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Account Name</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{PAYMENT_RECEIVER.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Account No.</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{PAYMENT_RECEIVER.accountNumber}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 border-t border-dashed border-zinc-200 pt-5 sm:grid-cols-2 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Primary contact</p>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        <span>{PAYMENT_RECEIVER.primaryPhone}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Alternate contact</p>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        <span>{PAYMENT_RECEIVER.alternatePhone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Transfer exactly {formatPrice(orderTotal)} and keep the completed payment screen visible.</p>
                  <p>Upload one clear confirmation screenshot in the next step so we can verify the payment quickly.</p>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(250px,320px)_1fr] lg:items-start">
                <div className="mx-auto w-full max-w-[320px]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-900 dark:text-zinc-100">{paymentLabel} QR</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open the full-size QR if you need a cleaner scan.</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Exact amount</p>
                  </div>

                  <div
                    className="group relative aspect-square w-full cursor-pointer overflow-hidden border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                    onClick={() => !qrImageLoading && setQrPreviewOpen(true)}
                  >
                    {qrImageLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-950/90">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-[11px] uppercase tracking-[0.18em]">Loading QR</span>
                        </div>
                      </div>
                    ) : null}
                    <img
                      src={resolvedQrImageSrc}
                      alt={`${paymentLabel} QR Code`}
                      className={`h-full w-full object-contain transition-opacity duration-300 ${qrImageLoading ? "opacity-0" : "opacity-100"}`}
                      onLoad={() => setQrImageLoading(false)}
                      onError={() => setQrImageLoading(false)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/10">
                      <ZoomIn className={`h-8 w-8 text-white drop-shadow-lg transition-opacity duration-200 ${qrImageLoading ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">1</span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Open {paymentLabel}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Scan the QR and complete the payment with the exact order amount.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">2</span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Save the confirmation screen</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Keep the amount, payment app, and successful status visible in one clean screenshot.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">3</span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upload it on this page</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Once you confirm the screenshot, we verify the payment and move you to the order page.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="group relative h-12 w-full overflow-hidden rounded-none border-zinc-200 bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-900 transition-colors duration-200 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:hover:bg-zinc-900 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
                      onClick={() => setQrPreviewOpen(true)}
                    >
                      <ZoomIn className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">Preview Full QR</span>
                    </Button>
                    <Button
                      type="button"
                      className="group relative h-12 w-full overflow-hidden rounded-none bg-black px-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-zinc-800 disabled:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
                      onClick={handleDownloadQr}
                      disabled={downloadingQr}
                    >
                      {downloadingQr ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                          <span className="truncate">Saving JPG...</span>
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">Download JPG</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="border-t border-dashed border-zinc-200 pt-5 dark:border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Receiver</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{PAYMENT_RECEIVER.name}</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        <span>{PAYMENT_RECEIVER.primaryPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        <span>Alternate: {PAYMENT_RECEIVER.alternatePhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Step 2</p>
                  <h2 className="mt-2 text-xl font-black uppercase tracking-tighter text-zinc-950 dark:text-zinc-50">
                    Upload payment proof
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Upload one clear screenshot with the amount, payment app, and successful status visible. PNG, JPG, or WEBP up to 5 MB.
                  </p>
                </div>
                <span className="max-w-[150px] text-right text-xs leading-5 text-muted-foreground">
                  Final step: once confirmed, we&apos;ll redirect you to the order page.
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                data-testid="payment-proof-input"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading || uploaded}
              />

              {uploaded ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Payment proof uploaded successfully.</p>
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">We&apos;re redirecting you to your order now.</p>
                    </div>
                  </div>
                </div>
              ) : selectedProofPreview ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Selected file</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedProofFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Make sure everything is readable before you confirm.</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-none"
                      onClick={() => {
                        if (selectedProofPreview) URL.revokeObjectURL(selectedProofPreview);
                        setSelectedProofPreview(null);
                        setSelectedProofFile(null);
                      }}
                      disabled={uploading}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="overflow-hidden border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                    <img
                      src={selectedProofPreview}
                      alt="Payment screenshot preview"
                      className="max-h-[460px] w-full object-contain"
                    />
                  </div>

                  <div className="rounded-none border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/40">
                    A clean screenshot helps us verify your payment faster.
                  </div>

                  <div className="border border-zinc-200 bg-white/90 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="group relative h-11 w-full overflow-hidden rounded-none px-6 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 hover:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">Choose Another Screenshot</span>
                      </Button>
                      <Button
                        type="button"
                        className="group relative h-11 w-full overflow-hidden rounded-none bg-black px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
                        onClick={handleConfirmPaymentScreenshot}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                            <span className="truncate">Confirming Proof...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">Confirm Payment</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="payment-proof-trigger"
                  className="group flex min-h-[280px] w-full flex-col items-center justify-center gap-5 border border-dashed border-zinc-300 bg-zinc-50/70 px-6 text-center transition-all duration-200 hover:border-zinc-500 hover:bg-zinc-50 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/40"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                  </span>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-900 dark:text-zinc-100">
                      {uploading ? "Preparing upload..." : "Choose payment screenshot"}
                    </p>
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      After payment, choose one clean screenshot from your gallery. One clear image is enough.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">PNG / JPG / WEBP</span>
                    <span className="border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">Max 5 MB</span>
                  </div>
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="border border-zinc-200 px-3 py-2 dark:border-zinc-800">Exact amount</span>
            <span className="border border-zinc-200 px-3 py-2 dark:border-zinc-800">Readable proof</span>
            <span className="border border-zinc-200 px-3 py-2 dark:border-zinc-800">Fast verification</span>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-none">
            <Link href="/checkout?returning=1">Back to Checkout</Link>
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {qrPreviewOpen && !isBankTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setQrPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQrPreviewOpen(false)}
                className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-colors hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                aria-label="Close QR preview"
              >
                <X className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              </button>
              <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl dark:bg-zinc-900">
                <div className="aspect-square w-full bg-white dark:bg-zinc-950">
                  <img
                    src={resolvedQrImageSrc}
                    alt={`${paymentLabel} QR Code Full Size`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
