import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/mockData";
import { useCartStore } from "@/store/cart";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: apiRequestMock,
}));

const product: Product = {
  id: "prod-1",
  name: "Test Hoodie",
  sku: "SKU-1",
  price: 3200,
  stock: 5,
  category: "hoodies",
  images: ["/hoodie.webp"],
  variants: [{ size: "M", color: "Black" }],
};

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    apiRequestMock.mockClear();
  });

  it("adds a new item and computes subtotal", async () => {
    useCartStore.getState().addItem(product, { size: "M", color: "Black" }, 2);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({
      id: "prod-1-M-Black",
      quantity: 2,
    });
    const subtotal = useCartStore
      .getState()
      .items.reduce((total, item) => total + item.product.price * item.quantity, 0);
    expect(subtotal).toBe(6400);
    expect(apiRequestMock).toHaveBeenCalledWith(
      "POST",
      "/api/user-activity/cart",
      expect.objectContaining({
        action: "add",
        productName: "Test Hoodie",
        quantity: 2,
      }),
    );
  });

  it("merges duplicate variants into the same cart line", () => {
    const store = useCartStore.getState();

    store.addItem(product, { size: "M", color: "Black" }, 1);
    store.addItem(product, { size: "M", color: "Black" }, 3);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.quantity).toBe(4);
  });

  it("clamps quantity updates to a minimum of one", () => {
    const store = useCartStore.getState();

    store.addItem(product, { size: "M", color: "Black" }, 2);
    store.updateQuantity("prod-1-M-Black", 0);

    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
  });

  it("removes items and clears the cart", () => {
    const store = useCartStore.getState();

    store.addItem(product, { size: "M", color: "Black" }, 1);
    store.removeItem("prod-1-M-Black");

    expect(useCartStore.getState().items).toHaveLength(0);

    store.addItem(product, { size: "M", color: "Black" }, 1);
    store.clearCart();

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("swallows cart activity notification failures", async () => {
    apiRequestMock.mockRejectedValueOnce(new Error("network down"));

    expect(() => {
      useCartStore.getState().addItem(product, { size: "M", color: "Black" }, 1);
    }).not.toThrow();

    await Promise.resolve();
  });
});
