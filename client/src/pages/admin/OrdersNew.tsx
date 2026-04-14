import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchProducts, type ProductApi } from "@/lib/api";
import { createAdminOrder, type AdminCreateOrderInput } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/queryClient";

type OrderItemDraft = {
  productId: string;
  color?: string;
  size?: string;
  quantity: number;
  priceAtTime: number;
};

function parseJsonArray(input: string | null | undefined): string[] {
  if (!input) return [];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export default function AdminOrdersNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [items, setItems] = useState<OrderItemDraft[]>([
    { productId: "", quantity: 1, priceAtTime: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [status, setStatus] = useState<AdminCreateOrderInput["status"]>("pending");
  const [deliveryFee, setDeliveryFee] = useState(100);
  const [customerName, setCustomerName] = useState("");
  const [shipping, setShipping] = useState({
    email: "",
    phone: "",
    deliveryLocation: "",
  });

  const { data: productsData } = useQuery<{ products: ProductApi[]; total: number }>({
    queryKey: ["admin", "orders", "products"],
    queryFn: () => fetchProducts({ limit: 200 }),
    staleTime: 60_000,
  });
  const products = productsData?.products ?? [];
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const subtotal = items.reduce((sum, item) => sum + item.priceAtTime * item.quantity, 0);
  const orderTotal = Math.max(0, subtotal + deliveryFee);

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const addRow = () => {
    setItems((prev) => [...prev, { productId: "", quantity: 1, priceAtTime: 0 }]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminCreateOrderInput) => createAdminOrder(payload),
    onSuccess: (data) => {
      toast({
        title: "Order created",
        description: data?.orderNumber ? `Order ${data.orderNumber} is ready.` : "Order created successfully.",
      });
      setLocation("/admin/orders");
    },
    onError: (error) => {
      toast({
        title: "Failed to create order",
        description: getErrorMessage(error, "Please review the order details and try again."),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const filteredItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 1,
        priceAtTime: Number(item.priceAtTime) || 0,
      }));

    if (!filteredItems.length) {
      toast({ title: "Add at least one product", variant: "destructive" });
      return;
    }

    const fullName = customerName.trim();
    const [firstName = "", ...lastParts] = fullName.split(/\s+/).filter(Boolean);
    const lastName = lastParts.join(" ");

    mutation.mutate({
      items: filteredItems,
      shipping: {
        fullName: fullName || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: shipping.email || undefined,
        phone: shipping.phone || undefined,
        deliveryLocation: shipping.deliveryLocation || undefined,
      },
      paymentMethod,
      deliveryFee,
      source: "admin",
      status: status || undefined,
    });
  };

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
          Create Order
        </h1>
        <p className="text-muted-foreground">
          Add products first, then capture only the essentials needed to place the order fast.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Products</h2>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" /> Add product
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              {items.map((item, index) => {
                const product = item.productId ? productById.get(item.productId) : null;
                const availableColors = parseJsonArray(product?.colorOptions);
                const availableSizes = parseJsonArray(product?.sizeOptions);
                return (
                  <div key={`${item.productId}-${index}`} className="rounded-xl border border-border/60 p-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                      <div className="space-y-3">
                        <Select
                          value={item.productId}
                          onValueChange={(value) => {
                            const selected = productById.get(value);
                            updateItem(index, {
                              productId: value,
                              priceAtTime: Number(selected?.price ?? 0),
                              color: "",
                              size: "",
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select
                            value={item.color ?? ""}
                            onValueChange={(value) => updateItem(index, { color: value })}
                            disabled={!availableColors.length}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Color" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableColors.map((color) => (
                                <SelectItem key={color} value={color}>
                                  {color}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={item.size ?? ""}
                            onValueChange={(value) => updateItem(index, { size: value })}
                            disabled={!availableSizes.length}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSizes.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <PriceInput
                          aria-label="Item price"
                          min={0}
                          value={item.priceAtTime}
                          onChange={(val) => updateItem(index, { priceAtTime: val })}
                          placeholder="Price"
                        />
                        <Input
                          type="number"
                          min={1}
                          name={`items.${index}.quantity`}
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label="Item quantity"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value)) })}
                        />
                      </div>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeRow(index)}
                          disabled={items.length === 1}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {product?.imageUrl ? (
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
                        <span>{product.name}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="order-customer-name" className="text-[11px] font-semibold text-muted-foreground">
                  Customer name
                </label>
                <Input
                  id="order-customer-name"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Customer name…"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="order-email" className="text-[11px] font-semibold text-muted-foreground">
                  Email
                </label>
                <Input
                  id="order-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email…"
                  value={shipping.email}
                  onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="order-phone" className="text-[11px] font-semibold text-muted-foreground">
                  Phone
                </label>
                <Input
                  id="order-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Phone…"
                  value={shipping.phone}
                  onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="order-delivery-location" className="text-[11px] font-semibold text-muted-foreground">
                  Delivery location
                </label>
                <Input
                  id="order-delivery-location"
                  name="deliveryLocation"
                  autoComplete="off"
                  placeholder="Delivery location…"
                  value={shipping.deliveryLocation}
                  onChange={(e) => setShipping((s) => ({ ...s, deliveryLocation: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment</h2>
            <div className="mt-4 space-y-3">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_on_delivery">Cash on delivery</SelectItem>
                  <SelectItem value="esewa">Esewa</SelectItem>
                  <SelectItem value="khalti">Khalti</SelectItem>
                  <SelectItem value="fonepay">Fonepay</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status ?? "pending"} onValueChange={(value) => setStatus(value as AdminCreateOrderInput["status"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <label htmlFor="order-delivery-fee" className="text-[11px] font-semibold text-muted-foreground">
                  Delivery charge
                </label>
                <PriceInput
                  aria-label="Delivery charge"
                  id="order-delivery-fee"
                  min={0}
                  value={deliveryFee}
                  onChange={(val) => setDeliveryFee(Math.max(0, val))}
                  placeholder="Delivery charge"
                />
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Products subtotal</span>
                  <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Delivery charge</span>
                  <span className="font-medium text-foreground">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="h-px bg-border/70" />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Order total</p>
                  <p className="text-lg font-semibold text-foreground">{formatPrice(orderTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <Button
              type="button"
              className="w-full"
              loading={mutation.isPending}
              loadingText="Creating..."
              onClick={handleSubmit}
            >
              Create Order
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setLocation("/admin/orders")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
