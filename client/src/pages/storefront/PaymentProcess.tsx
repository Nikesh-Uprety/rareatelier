import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  cacheLatestOrder,
  cancelOrder,
  clearPendingCheckout,
  createFonepayQrPayment,
  createFonepayWebPayment,
  createCheckoutSession,
  createOrder,
  fetchOrderById,
  fetchFonepayStatus,
  fetchPaymentQrConfig,
  getCachedLatestOrder,
  getPendingCheckout,
  simulateStripePaymentSuccess,
  updateOrderPaymentMethod,
  updatePendingCheckoutPaymentMethod,
  uploadPaymentProof,
  verifyFonepayQrPayment,
} from "@/lib/api";
import {
  FONEPAY_PROVIDER_CHARGE_NOTE,
  FONEPAY_QR_BENEFIT_RATE,
  FONEPAY_QR_PROMO_CEILING_RATE,
  FONEPAY_RARE_ATELIER_FEE_NPR,
  getFonepayEstimatedQrSavings,
  getFonepayQrPreviewSource,
  resolveFonepayQrPreviewSource,
} from "@/lib/fonepay";
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
  ScanLine,
  Wallet,
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

function clearSavedCheckoutFormData() {
  try {
    localStorage.removeItem(CHECKOUT_FORM_KEY);
  } catch {
  }
}

const PAYMENT_METHOD_SWITCH_OPTIONS = [
  { id: "esewa", label: "eSewa" },
  { id: "khalti", label: "Khalti" },
  { id: "fonepay", label: "Fonepay" },
  { id: "stripe", label: "Card" },
] as const;

type FonepayCheckoutMode = "redirect" | "qr";

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
  const fonepayStatus = query.get("fonepay_status");
  const fonepayMessage = query.get("message");
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
  const [redirectingToFonepay, setRedirectingToFonepay] = useState(false);
  const [fonepayMode, setFonepayMode] = useState<FonepayCheckoutMode>("redirect");
  const [generatingFonepayQr, setGeneratingFonepayQr] = useState(false);
  const [pollingFonepayQr, setPollingFonepayQr] = useState(false);
  const [fonepayQrPrn, setFonepayQrPrn] = useState<string | null>(null);
  const [fonepayQrPreviewSrc, setFonepayQrPreviewSrc] = useState<string | null>(null);
  const [fonepayQrMeta, setFonepayQrMeta] = useState<{
    orderId: string;
    amount: string;
    merchantName: string | null;
    expiresAt: string | null;
    rawQrText: string | null;
  } | null>(null);
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
  const fonepayStatusQuery = useQuery({
    queryKey: ["payments", "fonepay", "status"],
    queryFn: fetchFonepayStatus,
    staleTime: 30_000,
    enabled: method === "fonepay",
  });
  const fonepayGateway = fonepayStatusQuery.data?.data;
  const fonepayWebAvailable = Boolean(fonepayGateway?.web.available);
  const fonepayQrAvailable = Boolean(fonepayGateway?.qr.available);
  const fonepayAnyAvailable = fonepayWebAvailable || fonepayQrAvailable;
  const activeFonepayStatus =
    fonepayMode === "qr" ? fonepayGateway?.qr : fonepayGateway?.web;

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
    if (!fonepayStatus) return;

    const message =
      fonepayMessage
        ? fonepayMessage
        : fonepayStatus === "failed"
          ? "Fonepay payment was not completed. You can retry or switch methods."
          : "We could not verify your Fonepay payment yet. Please try again.";

    toast({
      title:
        fonepayStatus === "failed"
          ? "Fonepay payment not completed"
          : "Fonepay verification issue",
      description: message,
      variant: "destructive",
    });

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("fonepay_status");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, [fonepayMessage, fonepayStatus, toast]);

  useEffect(() => {
    if (method !== "fonepay") {
      clearFonepayQrSession();
      setFonepayMode("redirect");
    }
  }, [method]);

  useEffect(() => {
    if (method !== "fonepay") return;

    if (fonepayMode === "redirect" && !fonepayWebAvailable && fonepayQrAvailable) {
      setFonepayMode("qr");
      return;
    }

    if (fonepayMode === "qr" && !fonepayQrAvailable && fonepayWebAvailable) {
      clearFonepayQrSession();
      setFonepayMode("redirect");
    }
  }, [fonepayMode, fonepayQrAvailable, fonepayWebAvailable, method]);

  useEffect(() => {
    if (!fonepayQrPrn || !fonepayQrMeta?.orderId) return;

    let cancelled = false;

    const poll = async () => {
      setPollingFonepayQr(true);

      try {
        const result = await verifyFonepayQrPayment(fonepayQrPrn);
        if (cancelled) return;

        if (result.success && result.data?.paymentStatus) {
          toast({
            title: "Fonepay payment confirmed",
            description: "Redirecting you to your order now.",
          });
          clearFonepayQrSession();
          setTimeout(() => {
            setLocation(`/order-confirmation/${fonepayQrMeta.orderId}`);
          }, 900);
          return;
        }
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) {
          setPollingFonepayQr(false);
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      setPollingFonepayQr(false);
    };
  }, [fonepayQrMeta, fonepayQrPrn, setLocation, toast]);

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

  const clearFonepayQrSession = () => {
    setFonepayQrPrn(null);
    setFonepayQrMeta(null);
    setFonepayQrPreviewSrc(null);
    setPollingFonepayQr(false);
  };

  const getLatestFonepayStatus = async () => {
    const latest = await fonepayStatusQuery.refetch();
    return latest.data?.data ?? fonepayGateway ?? null;
  };

  const ensureFonepayOrder = async () => {
    if (order) {
      return order;
    }

    if (!pendingCheckout?.orderInput?.items?.length) {
      toast({ title: "Checkout session expired. Please start again.", variant: "destructive" });
      setLocation("/checkout");
      return null;
    }

    const createResult = await createOrder(pendingCheckout.orderInput);
    if (!createResult.success || !createResult.data) {
      if (createResult.code === "ORDER_VERIFICATION_REQUIRED") {
        toast({
          title: createResult.error || "Email verification required before this large order can continue.",
          variant: "destructive",
        });
        setLocation("/checkout?returning=1");
        return null;
      }

      toast({ title: createResult.error || "Failed to create order", variant: "destructive" });
      return null;
    }

    const nextOrder = createResult.data.order;
    setOrder(nextOrder);
    cacheLatestOrder(nextOrder);
    clearPendingCheckout();
    clearSavedCheckoutFormData();
    clearCart();
    return nextOrder;
  };

  const handleFonepayCheckout = async () => {
    setRedirectingToFonepay(true);

    try {
      const latestStatus = await getLatestFonepayStatus();
      if (!latestStatus?.web.available) {
        toast({
          title: latestStatus?.web.issues[0] || "Fonepay hosted checkout is unavailable right now.",
          variant: "destructive",
        });
        if (latestStatus?.qr.available) {
          setFonepayMode("qr");
        }
        return;
      }

      clearFonepayQrSession();
      const nextOrder = await ensureFonepayOrder();
      if (!nextOrder) return;
      if (!orderId) {
        setLocation(`/checkout/payment?orderId=${nextOrder.id}&method=fonepay`);
      }

      const shortOrderId = nextOrder.id.slice(-8).toUpperCase();
      const result = await createFonepayWebPayment(nextOrder.id, {
        remarks1: `Order ${shortOrderId}`,
        remarks2: "RARE Atelier",
      });

      if (result.success && result.data?.paymentUrl) {
        window.location.href = result.data.paymentUrl;
        return;
      }

      toast({
        title: result.error || "Failed to start Fonepay checkout",
        variant: "destructive",
      });

      setLocation(`/checkout/payment?orderId=${nextOrder.id}&method=fonepay`);
    } catch {
      toast({
        title: "Failed to connect to Fonepay. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRedirectingToFonepay(false);
    }
  };

  const handleGenerateFonepayQr = async () => {
    setGeneratingFonepayQr(true);

    try {
      const latestStatus = await getLatestFonepayStatus();
      if (!latestStatus?.qr.available) {
        toast({
          title: latestStatus?.qr.issues[0] || "Fonepay dynamic QR is unavailable right now.",
          variant: "destructive",
        });
        if (latestStatus?.web.available) {
          setFonepayMode("redirect");
        }
        return;
      }

      const nextOrder = await ensureFonepayOrder();
      if (!nextOrder) return;
      if (!orderId) {
        setLocation(`/checkout/payment?orderId=${nextOrder.id}&method=fonepay`);
      }

      const shortOrderId = nextOrder.id.slice(-8).toUpperCase();
      const result = await createFonepayQrPayment(nextOrder.id, {
        remarks1: `Order ${shortOrderId}`,
        remarks2: "RARE Atelier",
      });

      if (!result.success || !result.data) {
        toast({
          title: result.error || "Failed to generate Fonepay QR",
          variant: "destructive",
        });
        return;
      }

      setFonepayQrPrn(result.data.prn);
      setFonepayQrMeta({
        orderId: nextOrder.id,
        amount: result.data.amount,
        merchantName: result.data.qrPayload?.merchantName ?? null,
        expiresAt: result.data.qrPayload?.expiresAt ?? null,
        rawQrText: result.data.qrPayload?.rawQrText ?? null,
      });

      const immediatePreview = getFonepayQrPreviewSource(result.data.qrPayload);
      setFonepayQrPreviewSrc(immediatePreview);

      try {
        const resolvedPreview = await resolveFonepayQrPreviewSource(result.data.qrPayload);
        setFonepayQrPreviewSrc(resolvedPreview);
      } catch {
        setFonepayQrPreviewSrc(immediatePreview);
      }

      toast({
        title: "Dynamic Fonepay QR ready",
        description: "Scan it in your banking app. We’ll confirm the payment automatically.",
      });
    } catch {
      toast({
        title: "Failed to prepare the Fonepay QR",
        variant: "destructive",
      });
    } finally {
      setGeneratingFonepayQr(false);
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
  const fonepayEstimatedSavings = getFonepayEstimatedQrSavings(orderTotal);
  const confirmationOrderId = order?.id ?? orderId;
  const hasInlineCheckoutContext = Boolean(
    order || fonepayQrMeta || generatingFonepayQr || redirectingToFonepay || pollingFonepayQr,
  );
  const fonepayModeUnavailable =
    method === "fonepay" &&
    (fonepayMode === "redirect" ? !fonepayWebAvailable : !fonepayQrAvailable);
  const activeFonepayIssues = activeFonepayStatus?.issues ?? [];
  const activeFonepayWarnings = activeFonepayStatus?.warnings ?? [];
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
  const qrPreviewImageSrc =
    method === "fonepay" && fonepayMode === "qr" ? (fonepayQrPreviewSrc || resolvedQrImageSrc) : resolvedQrImageSrc;

  useEffect(() => {
    setQrImageLoading(true);
  }, [resolvedQrImageSrc]);

  if (!orderId && !hasPendingManualOrder && !hasInlineCheckoutContext) {
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

  if (method === "fonepay") {
    return (
      <div className="container mx-auto max-w-3xl px-4 pb-12 pt-4 sm:pb-16 sm:pt-6">
        <div className="mb-6 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Change Payment Method
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHOD_SWITCH_OPTIONS.filter((option) => option.id !== "fonepay").map((option) => (
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
          Pay with Fonepay
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Order total: {formatPrice(orderTotal)}. Choose between hosted bank selection and a live exact-amount QR handoff.
        </p>

        <section
          data-testid="fonepay-value-strip"
          className="mb-6 overflow-hidden border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="grid gap-0 md:grid-cols-[1.2fr_auto_1fr_auto_1fr]">
            <div className="flex flex-col gap-3 p-4 md:p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {Math.round(FONEPAY_QR_BENEFIT_RATE * 100)}% QR benefit live
                </Badge>
                <Badge variant="outline">
                  Promo windows up to {Math.round(FONEPAY_QR_PROMO_CEILING_RATE * 100)}%
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Estimated QR savings
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                  NPR {fonepayEstimatedSavings}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Estimated shopper benefit when the current Fonepay QR offer is active for this order.
                </p>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden h-full md:block" />

            <div className="flex flex-col justify-center gap-2 p-4 md:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Rare Atelier charge
              </p>
              <p className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                NPR {FONEPAY_RARE_ATELIER_FEE_NPR}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                We do not add any extra platform fee on the Fonepay handoff.
              </p>
            </div>

            <Separator orientation="vertical" className="hidden h-full md:block" />

            <div className="flex flex-col justify-center gap-2 p-4 md:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Provider charge
              </p>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Usually minimal
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {FONEPAY_PROVIDER_CHARGE_NOTE}
              </p>
            </div>
          </div>
        </section>

        {!fonepayStatusQuery.isPending && !fonepayAnyAvailable ? (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">
            <p className="font-semibold uppercase tracking-[0.16em] text-[10px]">Fonepay unavailable</p>
            <p className="mt-2">
              {fonepayStatusQuery.isError
                ? "We could not confirm the Fonepay gateway status for this store."
                : fonepayGateway?.web.issues[0] || fonepayGateway?.qr.issues[0] || "The gateway is not ready for checkout right now."}
            </p>
            <p className="mt-2 text-xs leading-6">
              Switch to eSewa, Khalti, card, or cash while the callback URL or merchant credentials are fixed.
            </p>
          </div>
        ) : null}

        {fonepayAnyAvailable && activeFonepayWarnings.length > 0 ? (
          <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            <p className="font-semibold uppercase tracking-[0.16em] text-[10px]">Gateway note</p>
            <p className="mt-2">{activeFonepayWarnings[0]}</p>
          </div>
        ) : null}

        <div className="mb-8 border border-gray-200 bg-gradient-to-br from-[#f7faf8] to-[#eef5f0] p-5 sm:p-8 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-9 flex items-center justify-center overflow-hidden">
              <img
                src="/images/fonepay-logo.png"
                alt="Fonepay"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-100">
                Secure Fonepay Payment
              </p>
              <p className="text-xs text-muted-foreground">
                Hosted bank selection for desktop or a live QR for mobile-first checkout
              </p>
            </div>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-2xl border p-4 text-left transition-colors ${
                !fonepayWebAvailable
                  ? "cursor-not-allowed border-dashed border-zinc-300 bg-white/50 opacity-60 dark:border-zinc-700 dark:bg-zinc-950/30"
                  : fonepayMode === "redirect"
                  ? "border-[#1c8f4d] bg-white shadow-sm dark:bg-zinc-900"
                  : "border-gray-200 bg-white/70 hover:border-[#1c8f4d] dark:border-zinc-700 dark:bg-zinc-950/40"
              }`}
              onClick={() => {
                if (!fonepayWebAvailable) return;
                setFonepayMode("redirect");
              }}
              disabled={!fonepayWebAvailable}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Redirect
                </p>
                {!fonepayWebAvailable ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">
                    Unavailable
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Open Fonepay checkout
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Best for desktop and standard web checkout. Fonepay shows the supported banks, and the shopper signs in on the hosted banking page there.
              </p>
            </button>

            <button
              type="button"
              className={`rounded-2xl border p-4 text-left transition-colors ${
                !fonepayQrAvailable
                  ? "cursor-not-allowed border-dashed border-zinc-300 bg-white/50 opacity-60 dark:border-zinc-700 dark:bg-zinc-950/30"
                  : fonepayMode === "qr"
                  ? "border-[#1c8f4d] bg-white shadow-sm dark:bg-zinc-900"
                  : "border-gray-200 bg-white/70 hover:border-[#1c8f4d] dark:border-zinc-700 dark:bg-zinc-950/40"
              }`}
              onClick={() => {
                if (!fonepayQrAvailable) return;
                setFonepayMode("qr");
              }}
              disabled={!fonepayQrAvailable}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Dynamic QR
                </p>
                {fonepayQrAvailable ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1c8f4d]">
                    Recommended
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600">
                    Unavailable
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Scan and confirm instantly
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Best for Nepal mobile-first checkout. The QR keeps the exact order amount locked and updates the order automatically once payment clears.
              </p>
            </button>
          </div>

          {fonepayMode === "redirect" ? (
            <>
              <div className="mb-4 border border-gray-200 bg-white p-5 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    Amount
                  </span>
                  <span className="text-lg font-black">{formatPrice(orderTotal)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll redirect you to Fonepay&apos;s hosted page. The shopper chooses Mobile Banking or Internet Banking there, signs in there, and returns to the order automatically after payment.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/70">
                  <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Fonepay handles the bank list and Internet Banking or Mobile Banking login on its own hosted page. Rare Atelier never asks for bank usernames or passwords.
                  </p>
                </div>
                {activeFonepayIssues.length > 0 ? (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/70">
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800 dark:text-red-300">
                      {activeFonepayIssues[0]}
                    </p>
                  </div>
                ) : null}
                {isLocalTesting ? (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/70">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Localhost cannot receive hosted Fonepay callbacks. Expose the backend on a public HTTPS URL with ngrok or a tunnel before testing the redirect flow.
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Dynamic QR checkout
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generate a live Fonepay QR, have the shopper scan it in a supported Fonepay or mobile banking app, and we&apos;ll move the order forward automatically once the gateway confirms payment.
                    </p>
                    {fonepayQrMeta ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          Session ref: <span className="font-semibold text-zinc-950 dark:text-zinc-50">{fonepayQrPrn?.slice(-10)}</span>
                        </p>
                        <p>
                          Amount: <span className="font-semibold text-zinc-950 dark:text-zinc-50">NPR {fonepayQrMeta.amount}</span>
                        </p>
                        {fonepayQrMeta.merchantName ? (
                          <p>
                            Merchant: <span className="font-semibold text-zinc-950 dark:text-zinc-50">{fonepayQrMeta.merchantName}</span>
                          </p>
                        ) : null}
                        {fonepayQrMeta.expiresAt ? (
                          <p>
                            Valid until: <span className="font-semibold text-zinc-950 dark:text-zinc-50">{fonepayQrMeta.expiresAt}</span>
                          </p>
                        ) : null}
                        {fonepayQrMeta.rawQrText ? (
                          <p className="break-all">
                            QR payload: <span className="font-semibold text-zinc-950 dark:text-zinc-50">{fonepayQrMeta.rawQrText}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {pollingFonepayQr ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Waiting for payment
                      </>
                    ) : fonepayQrPrn ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        QR live
                      </>
                    ) : (
                      "Ready to generate"
                    )}
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
                  {fonepayQrPreviewSrc ? (
                    <div className="mx-auto max-w-[280px] space-y-4">
                      <button
                        type="button"
                        onClick={() => setQrPreviewOpen(true)}
                        className="block w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <img
                          src={fonepayQrPreviewSrc}
                          alt="Fonepay dynamic QR"
                          className="aspect-square w-full object-contain"
                        />
                      </button>
                      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Tap to preview the live QR
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                      {generatingFonepayQr ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-[#1c8f4d]" />
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            Preparing your dynamic QR
                          </p>
                        </>
                      ) : (
                        <>
                          <ScanLine className="h-8 w-8 text-zinc-400" />
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            Generate the live QR when the shopper is ready to scan
                          </p>
                          <p className="max-w-sm text-xs leading-6 text-muted-foreground">
                            This is the recommended mobile-first Fonepay flow for Nepal commerce. It keeps the payment amount locked to the order and confirms automatically.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {activeFonepayIssues.length > 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs leading-6 text-red-900 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                    {activeFonepayIssues[0]}
                  </div>
                ) : null}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs leading-6 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                  We&apos;ll keep checking the gateway every few seconds. As soon as Fonepay reports success, we&apos;ll redirect you to the order confirmation automatically.
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 text-xs leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
                  The exact amount is locked to this order. Cross-wallet scanning such as eSewa depends on your acquiring bank&apos;s interoperability settings, so use a supported Fonepay or mobile banking app unless your bank confirms broader QR compatibility.
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={fonepayMode === "redirect" ? handleFonepayCheckout : handleGenerateFonepayQr}
          disabled={
            fonepayStatusQuery.isPending ||
            fonepayModeUnavailable ||
            (fonepayMode === "redirect"
              ? redirectingToFonepay
              : generatingFonepayQr || pollingFonepayQr)
          }
          className="w-full h-14 bg-[#1c8f4d] text-white rounded-none uppercase tracking-widest text-xs font-bold hover:bg-[#177742] transition-colors"
        >
          {fonepayStatusQuery.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Checking Fonepay...
            </>
          ) : fonepayMode === "redirect" ? (
            redirectingToFonepay ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Redirecting to Fonepay...
              </>
            ) : !fonepayWebAvailable ? (
              <>
                <AlertCircle className="w-5 h-5 mr-2" />
                Redirect unavailable
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5 mr-2" />
                Continue to Fonepay
              </>
            )
          ) : generatingFonepayQr ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating dynamic QR...
            </>
          ) : !fonepayQrAvailable ? (
            <>
              <AlertCircle className="w-5 h-5 mr-2" />
              Dynamic QR unavailable
            </>
          ) : fonepayQrPrn ? (
            <>
              <ScanLine className="w-5 h-5 mr-2" />
              Refresh Dynamic QR
            </>
          ) : (
            <>
              <ScanLine className="w-5 h-5 mr-2" />
              Generate Dynamic QR
            </>
          )}
        </Button>

        <div className="mt-8 grid gap-2 border-t border-gray-100 dark:border-zinc-800 pt-6 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-11 rounded-none text-xs">
            <Link href="/checkout?returning=1">← Back to Checkout</Link>
          </Button>
          {confirmationOrderId ? (
            <Button asChild variant="ghost" className="h-11 rounded-none text-xs text-muted-foreground">
              <Link href={`/order-confirmation/${confirmationOrderId}`}>← Back to Order</Link>
            </Button>
          ) : (
            <div />
          )}
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

  const manualPaymentSteps = isBankTransfer
    ? [
        {
          icon: Wallet,
          title: "Open your banking app",
          description: "Use the account details below to begin the transfer.",
        },
        {
          icon: CreditCard,
          title: "Pay exact amount",
          description: "Transfer the exact order total and complete the payment.",
        },
        {
          icon: CheckCircle2,
          title: "Save screenshot",
          description: "Take a clear screenshot of the successful transfer confirmation.",
        },
      ]
    : [
        {
          icon: ScanLine,
          title: `Open ${paymentLabel} app`,
          description: "Scan the QR code.",
        },
        {
          icon: Wallet,
          title: "Pay exact amount",
          description: "Enter exact amount and complete payment.",
        },
        {
          icon: CheckCircle2,
          title: "Save screenshot",
          description: "Take clear screenshot of confirmation.",
        },
      ];
  const uploadPanelDescription = isBankTransfer
    ? "Upload the bank transfer confirmation screenshot so we can verify the payment quickly."
    : `Upload the ${paymentLabel} payment screenshot so we can verify the payment quickly.`;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-6 sm:pt-8">
      <div className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Payment Confirmation
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[2.35rem]">
              Complete your payment
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {isBankTransfer
                ? "Transfer the order amount, then upload the confirmation so we can verify the payment quickly."
                : `Scan the ${paymentLabel} QR, complete the exact payment, and upload one clean screenshot to finish your order.`}
            </p>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-zinc-200/80 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:min-w-[320px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Order total
              </span>
              <span className="text-xl font-black text-zinc-950 dark:text-zinc-50">{formatPrice(orderTotal)}</span>
            </div>
            {confirmationOrderId ? (
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span className="uppercase tracking-[0.18em]">Order ref</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {confirmationOrderId.slice(-8).toUpperCase()}
                </span>
              </div>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                Your order will be created as soon as the payment proof is confirmed.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[24px] border border-zinc-200/80 bg-zinc-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Payment method
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch method before you upload proof if you need a different payment route.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHOD_SWITCH_OPTIONS.map((option) => {
              const isCurrent = option.id === method;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isCurrent || switchingPaymentMethod !== null}
                  onClick={() => handleChangePaymentMethod(option.id)}
                  className={`h-10 rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                    isCurrent
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
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
            <Button asChild variant="ghost" className="h-10 rounded-full px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Link href="/checkout?returning=1">Back to Checkout</Link>
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:gap-12">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6 rounded-[30px] border border-zinc-200/80 bg-zinc-50/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:p-8"
          >
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                STEP 1
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950 dark:text-zinc-50">
                {isBankTransfer ? "TRANSFER THE AMOUNT" : `PAY WITH ${paymentLabel.toUpperCase()}`}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {isBankTransfer
                  ? "Use the transfer details below, pay the exact amount, and keep the confirmation visible for the final upload step."
                  : `Use the QR card below, pay the exact order amount, and keep the confirmation screen ready for upload.`}
              </p>
            </div>

            {isBankTransfer ? (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Bank name
                      </p>
                      <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{PAYMENT_RECEIVER.bankName}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Account name
                      </p>
                      <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{PAYMENT_RECEIVER.name}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Account number
                      </p>
                      <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{PAYMENT_RECEIVER.accountNumber}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Exact amount
                      </p>
                      <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{formatPrice(orderTotal)}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Contact numbers
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        <span>{PAYMENT_RECEIVER.primaryPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-zinc-500" />
                        <span>{PAYMENT_RECEIVER.alternatePhone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {manualPaymentSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.title}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 transition-shadow duration-300 hover:shadow-lg"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Step {index + 1}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mx-auto max-w-[320px] space-y-4">
                    <button
                      type="button"
                      onClick={() => !qrImageLoading && setQrPreviewOpen(true)}
                      className="group relative block w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-lg"
                    >
                      {qrImageLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/92 dark:bg-zinc-950/92">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Loading QR</span>
                          </div>
                        </div>
                      ) : null}
                      <img
                        src={resolvedQrImageSrc}
                        alt={`${paymentLabel} QR Code`}
                        className={`aspect-square w-full object-contain transition-opacity duration-300 ${qrImageLoading ? "opacity-0" : "opacity-100"}`}
                        onLoad={() => setQrImageLoading(false)}
                        onError={() => setQrImageLoading(false)}
                      />
                      <div className="absolute inset-x-0 bottom-3 flex justify-center">
                        <span className={`rounded-full bg-black/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity duration-300 ${qrImageLoading ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}>
                          Tap to preview
                        </span>
                      </div>
                    </button>

                    <Button
                      type="button"
                      onClick={handleDownloadQr}
                      disabled={downloadingQr}
                      className="h-11 w-full rounded-xl bg-black text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      {downloadingQr ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download QR
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Exact amount
                      </p>
                      <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{formatPrice(orderTotal)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Enter this amount exactly while paying.</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Receiver
                      </p>
                      <p className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{PAYMENT_RECEIVER.name}</p>
                      <div className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-zinc-500" />
                          <span>{PAYMENT_RECEIVER.primaryPhone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-zinc-500" />
                          <span>{PAYMENT_RECEIVER.alternatePhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {manualPaymentSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={step.title}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 transition-shadow duration-300 hover:shadow-lg"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Step {index + 1}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
            className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.1)] sm:p-8"
          >
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                STEP 2
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950 dark:text-zinc-50">
                UPLOAD PAYMENT PROOF
              </h2>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">{uploadPanelDescription}</p>
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
              <div className="mt-8 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Payment proof uploaded successfully.</p>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                      We&apos;re redirecting you to your order now.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                <div className="rounded-[28px] border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
                  {selectedProofPreview ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Selected screenshot
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            {selectedProofFile?.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Review the preview below and make sure the confirmation is clearly readable.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full px-4"
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

                      <button
                        type="button"
                        data-testid="payment-proof-trigger"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="group block w-full overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-3 transition-all duration-300 hover:scale-[1.01] hover:border-zinc-900 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                          <img
                            src={selectedProofPreview}
                            alt="Payment screenshot preview"
                            className="max-h-[420px] w-full object-contain"
                          />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="payment-proof-trigger"
                      className="group flex min-h-[360px] w-full flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-8 text-center transition-all duration-300 hover:scale-[1.01] hover:border-zinc-900 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-1 dark:bg-white dark:text-black">
                        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                      </span>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                          Choose Payment Screenshot
                        </h3>
                        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                          Upload one clear screenshot after payment. The amount, payment app, and success state should all be visible.
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        PNG / JPG / WEBP • MAX 5MB
                      </p>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedProofPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mx-auto h-11 w-full max-w-md rounded-xl border-zinc-200 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:border-zinc-900 hover:bg-zinc-50"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Another Screenshot
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    onClick={handleConfirmPaymentScreenshot}
                    disabled={!selectedProofPreview || uploading}
                    className="mx-auto h-12 w-full max-w-md rounded-xl bg-black text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm Payment
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      A clean screenshot speeds up verification. We only use it to confirm your payment and complete the order.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        </div>

        <div className="flex flex-col gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="rounded-full border border-zinc-200 px-3 py-2 dark:border-zinc-800">Exact amount</span>
            <span className="rounded-full border border-zinc-200 px-3 py-2 dark:border-zinc-800">Readable proof</span>
            <span className="rounded-full border border-zinc-200 px-3 py-2 dark:border-zinc-800">Fast verification</span>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
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
                    src={qrPreviewImageSrc}
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
