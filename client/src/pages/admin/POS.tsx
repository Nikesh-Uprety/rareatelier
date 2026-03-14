import { BillViewer } from "@/components/admin/BillViewer";
import { motion, AnimatePresence } from "framer-motion";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useToast } from "@/hooks/use-toast";
import type { AdminBill, AdminProduct, POSSession } from "@/lib/adminApi";
import {
  closePosSession,
  createPosBill,
  fetchAdminProducts,
  fetchTodaySession,
  openPosSession,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Minus,
  ParkingCircle,
  Plus,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CartItem {
  productId: string;
  productName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export default function AdminPOS() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [discount, setDiscount] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [completedBill, setCompletedBill] = useState<AdminBill | null>(null);
  const [session, setSession] = useState<POSSession | null>(null);
  const [openingCash, setOpeningCash] = useState<string>("");
  const [closingCash, setClosingCash] = useState<string>("");
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);
  const [parkedSales, setParkedSales] = useState<
    { name: string; cart: CartItem[] }[]
  >(() => {
    try {
      const saved = localStorage.getItem("rare-pos-parked-sales");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showQR, setShowQR] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch today's session on mount
  useEffect(() => {
    fetchTodaySession()
      .then((s) => setSession(s))
      .catch(() => {});
  }, []);

  const { data: products } = useQuery<AdminProduct[]>({
    queryKey: ["admin", "products"],
    queryFn: () => fetchAdminProducts(),
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  // Persist parked sales
  useEffect(() => {
    localStorage.setItem("rare-pos-parked-sales", JSON.stringify(parkedSales));
  }, [parkedSales]);

  // Barcode Scanner Listener
  // Hardware scanners emulate rapid keyboard typing then "Enter"
  useEffect(() => {
    if (!products) return;

    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const now = Date.now();

      // If time between keystrokes is > 50ms, it's a human typing, reset buffer
      if (now - lastKeyTime > 50) {
        barcodeBuffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 0) {
          const scannedProduct = products.find(
            (p) => p.name.toLowerCase() === barcodeBuffer.toLowerCase(),
          );

          if (scannedProduct) {
            addToCart(scannedProduct);
            toast({ title: `Added ${scannedProduct.name}` });
          } else {
            toast({ title: "Product not found", variant: "destructive" });
          }
          barcodeBuffer = "";
        }
      } else if (e.key.length === 1) {
        // Collect characters
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products]);

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmount = Number(discount) || 0;
  const taxAmount = Math.round(subtotal * 0.13);
  const total = subtotal + taxAmount - discountAmount;
  const cashReceivedNum = Number(cashReceived) || 0;
  const changeAmount =
    paymentMethod === "cash" ? Math.max(0, cashReceivedNum - total) : 0;

  // Cart operations
  const addToCart = (product: AdminProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                lineTotal: (i.quantity + 1) * i.unitPrice,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl ?? "",
          unitPrice: Number(product.price),
          quantity: 1,
          lineTotal: Number(product.price),
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((i) => {
            if (i.productId !== productId) return i;
            const qty = i.quantity + delta;
            if (qty <= 0) return null;
            return { ...i, quantity: qty, lineTotal: qty * i.unitPrice };
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Checkout
  const chargeMutation = useMutation({
    mutationFn: () =>
      createPosBill({
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || undefined,
        items: cart.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          variantColor: "",
          size: "",
          sku: "",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceivedNum : null,
        discountAmount: discountAmount,
        notes: notes || undefined,
      }),
    onSuccess: (bill) => {
      setCompletedBill(bill);
      setCart([]);
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      setCashReceived("");
      setDiscount("0");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin", "bills"] });
      toast({ title: `Bill ${bill.billNumber} created!` });
    },
    onError: () => {
      toast({ title: "Failed to process sale", variant: "destructive" });
    },
  });

  // Session management
  const handleOpenSession = async () => {
    setOpeningLoading(true);
    try {
      const s = await openPosSession(Number(openingCash) || 0);
      setSession(s);
      setOpeningCash("");
      toast({ title: "POS session opened" });
    } catch {
      toast({ title: "Failed to open session", variant: "destructive" });
    } finally {
      setOpeningLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    try {
      const closed = await closePosSession(session.id, {
        closingCash: Number(closingCash) || 0,
        openedAt: session.openedAt,
      });
      setSession(null);
      setShowEndOfDay(false);
      toast({ title: "Session closed. End-of-day summary recorded." });
      // Show summary
      alert(
        `End of Day Summary:\n\nTotal Sales: ${formatPrice(closed.totalSales)}\nTotal Orders: ${closed.totalOrders}\nCash Sales: ${formatPrice(closed.totalCashSales)}\nDigital Sales: ${formatPrice(closed.totalDigitalSales)}\nOpening Cash: ${formatPrice(closed.openingCash)}\nClosing Cash: ${formatPrice(closingCash)}`,
      );
    } catch {
      toast({ title: "Failed to close session", variant: "destructive" });
    }
  };

  // Park sale
  const parkSale = () => {
    if (cart.length === 0) return;
    setParkedSales((prev) => [
      ...prev,
      { name: customerName, cart: [...cart] },
    ]);
    setCart([]);
    setCustomerName("Walk-in Customer");
    toast({ title: "Sale parked" });
  };

  const restoreParkedSale = (index: number) => {
    const sale = parkedSales[index];
    setCart(sale.cart);
    setCustomerName(sale.name);
    setParkedSales((prev) => prev.filter((_, i) => i !== index));
  };

  const paymentMethods = [
    { key: "cash", label: "Cash", icon: Banknote },
    { key: "esewa", label: "eSewa", icon: Smartphone },
    { key: "khalti", label: "Khalti", icon: Smartphone },
    { key: "card", label: "Card", icon: CreditCard },
  ];

  // ── No session? Show session opener ──────────────────
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground mb-2">
            Point of Sale
          </h1>
          <p className="text-muted-foreground">
            Start a new session to begin selling
          </p>
        </div>
        <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-8 w-full max-w-sm space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Opening Cash (NPR)
            </label>
            <Input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0"
              className="bg-background border-[#E5E5E0] dark:border-border"
            />
          </div>
          <Button
            className="w-full bg-[#2C3E2D] hover:bg-[#1A251B] text-white"
            onClick={handleOpenSession}
            loading={openingLoading}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Open Session
          </Button>
        </div>
      </div>
    );
  }

  // ── Completed bill modal ─────────────────────────────
  if (completedBill) {
    return (
      <div className="max-w-lg mx-auto py-8 animate-in fade-in">
        <BillViewer
          bill={completedBill}
          onClose={() => setCompletedBill(null)}
        />
        <div className="text-center mt-6">
          <Button
            className="bg-[#2C3E2D] hover:bg-[#1A251B] text-white"
            onClick={() => setCompletedBill(null)}
          >
            New Sale
          </Button>
        </div>
      </div>
    );
  }

  // ── Main POS interface ───────────────────────────────
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Point of Sale
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="bg-[#E8F3EB] text-[#2C5234] border-none"
            >
              <Clock className="h-3 w-3 mr-1" />
              Session active since{" "}
              {new Date(session.openedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Badge>
            {parkedSales.length > 0 && (
              <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-700 border-none"
              >
                <ParkingCircle className="h-3 w-3 mr-1" />
                {parkedSales.length} parked
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => setShowEndOfDay(true)}
        >
          End Session
        </Button>
      </div>

      {/* 65/35 split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: Products */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9 bg-white dark:bg-card border-[#E5E5E0] dark:border-border rounded-full h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          {/* Parked sales */}
          {parkedSales.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {parkedSales.map((sale, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                  onClick={() => restoreParkedSale(i)}
                >
                  <ParkingCircle className="h-3 w-3 mr-1" />
                  {sale.name} ({sale.cart.length} items)
                </Button>
              ))}
            </div>
          )}

          {/* Product grid/list */}
          <AnimatePresence mode="wait">
            {viewMode === "grid" ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              >
                {filteredProducts.map((product) => {
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <button
                      key={product.id}
                      className={cn(
                        "relative bg-white dark:bg-card rounded-xl border p-3 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                        inCart
                          ? "border-[#2C3E2D] dark:border-green-600 ring-1 ring-[#2C3E2D]/20"
                          : "border-[#E5E5E0] dark:border-border",
                        product.stock <= 0 && "opacity-40 pointer-events-none"
                      )}
                      onClick={() => addToCart(product)}
                    >
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-20 object-cover rounded-lg mb-2"
                        />
                      )}
                      <div className="text-xs font-medium line-clamp-2 mb-1">
                        {product.name}
                      </div>
                      <div className="text-sm font-bold text-[#2C3E2D] dark:text-foreground">
                        {formatPrice(product.price)}
                      </div>
                      {product.stock <= 5 && product.stock > 0 && (
                        <div className="text-[10px] text-red-500 mt-1">
                          Only {product.stock} left
                        </div>
                      )}
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-[#2C3E2D] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {inCart.quantity}
                        </div>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden"
              >
                <div className="divide-y divide-border">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.productId === product.id);
                    return (
                      <button
                        key={product.id}
                        className={cn(
                          "w-full flex items-center gap-4 p-3 text-left transition-all hover:bg-muted/50",
                          inCart && "bg-primary/5",
                          product.stock <= 0 && "opacity-40 pointer-events-none"
                        )}
                        onClick={() => addToCart(product)}
                      >
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded-lg" />
                          )}
                          {inCart && (
                            <div className="absolute -top-1 -right-1 bg-[#2C3E2D] text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold">
                              {inCart.quantity}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{product.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{product.category || "General"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatPrice(product.price)}</div>
                          <div className={cn(
                            "text-[10px] font-medium",
                            product.stock <= 5 ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {product.stock} in stock
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Cart and checkout */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-4">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mb-2 bg-background border-[#E5E5E0] dark:border-border text-sm"
            />
            <Input
              placeholder="Phone (optional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="bg-background border-[#E5E5E0] dark:border-border text-sm"
            />
          </div>

          {/* Cart items */}
          <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E0] dark:border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Cart ({cart.length})
                </span>
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-yellow-600 hover:text-yellow-700 text-xs"
                  onClick={parkSale}
                >
                  <ParkingCircle className="h-3 w-3 mr-1" />
                  Park
                </Button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Add products to cart
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 p-3 border-b border-[#f5f5f5] dark:border-border last:border-none"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.productName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-7 h-7 rounded-full border border-[#E5E5E0] dark:border-border flex items-center justify-center hover:bg-muted transition"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        className="w-7 h-7 rounded-full border border-[#E5E5E0] dark:border-border flex items-center justify-center hover:bg-muted transition"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 transition ml-1"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="w-20 text-right text-sm font-medium">
                      {formatPrice(item.lineTotal)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals + discount */}
          {cart.length > 0 && (
            <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 h-7 text-right text-sm bg-background border-[#E5E5E0]"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (13%)</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
              <div className="border-t border-[#E5E5E0] pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          )}

          {/* Payment methods */}
          {cart.length > 0 && (
            <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-4 space-y-3">
              <div className="text-sm font-medium mb-2">Payment Method</div>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        paymentMethod === pm.key
                          ? "bg-[#2C3E2D] text-white border-[#2C3E2D]"
                          : "bg-background border-[#E5E5E0] dark:border-border hover:bg-muted"
                      }`}
                      onClick={() => setPaymentMethod(pm.key)}
                    >
                      <Icon className="h-4 w-4" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>

              {/* Cash input */}
              {paymentMethod === "cash" && (
                <div className="space-y-2 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Cash Received
                    </label>
                    <Input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={String(total)}
                      className="bg-background border-[#E5E5E0] text-sm"
                    />
                  </div>
                  {cashReceivedNum > 0 && (
                    <div className="flex justify-between text-sm font-medium text-green-600">
                      <span>Change</span>
                      <span>{formatPrice(changeAmount)}</span>
                    </div>
                  )}
                  {/* Quick cash buttons */}
                  <div className="flex gap-1 flex-wrap">
                    {[100, 500, 1000, 5000].map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setCashReceived(String(amt))}
                      >
                        Rs. {amt}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setCashReceived(String(total))}
                    >
                      Exact
                    </Button>
                  </div>
                </div>
              )}

              <Input
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-[#E5E5E0] text-sm"
              />

              <Button
                className="w-full bg-[#2C3E2D] hover:bg-[#1A251B] text-white h-12 text-base font-medium"
                loading={chargeMutation.isPending}
                loadingText="Processing..."
                disabled={
                  cart.length === 0 ||
                  (paymentMethod === "cash" && cashReceivedNum < total)
                }
                onClick={() => chargeMutation.mutate()}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Charge {formatPrice(total)}
              </Button>

              {(paymentMethod === "esewa" || paymentMethod === "khalti") && (
                <Button
                  variant="outline"
                  className="w-full h-10 mt-2 border-[#2C3E2D] text-[#2C3E2D]"
                  onClick={() => setShowQR(true)}
                >
                  Show QR Code
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal for eSewa/Khalti */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6 max-w-sm w-full space-y-4 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4"
            >
              <X className="h-6 w-6 text-muted-foreground" />
            </button>
            <h2 className="text-xl font-serif font-medium mb-4">Scan to Pay</h2>
            <div className="bg-white border-2 border-[#2C3E2D] rounded-xl p-4 inline-block shadow-sm">
              <OptimizedImage
                src="/images/esewa-qr.webp"
                alt="Payment QR"
                className="w-full max-w-[250px] mx-auto rounded-lg object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Please scan this QR code with your eSewa or Khalti app to complete
              the payment of <strong>{formatPrice(total)}</strong>.
            </p>
            <Button
              className="w-full mt-4 bg-[#2C3E2D] hover:bg-[#1A251B] text-white"
              onClick={() => setShowQR(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* End of day modal */}
      {showEndOfDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-serif font-medium">Close Session</h2>
              <button onClick={() => setShowEndOfDay(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-sm text-muted-foreground">
              Session opened at{" "}
              {new Date(session.openedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Closing Cash (NPR)
              </label>
              <Input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder="Count the cash in the drawer"
                className="bg-background border-[#E5E5E0]"
              />
            </div>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCloseSession}
            >
              Close Session & Generate Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
