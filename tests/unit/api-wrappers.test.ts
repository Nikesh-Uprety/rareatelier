import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOrder,
  fetchProducts,
  validatePromoCode,
  type OrderInput,
} from "@/lib/api";
import { fetchAdminOrders } from "@/lib/adminApi";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: apiRequestMock,
}));

describe("API wrappers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("builds product query strings correctly", async () => {
    apiRequestMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [{ id: "1", name: "A" }] })),
    );

    await fetchProducts({ category: "hoodies", search: "zip", page: 2, limit: 24 });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "GET",
      "/api/products?category=hoodies&search=zip&page=2&limit=24",
    );
  });

  it("posts order payloads unchanged", async () => {
    const payload: OrderInput = {
      items: [{ productId: "1", quantity: 2, priceAtTime: 3200 }],
      shipping: {
        firstName: "Nikesh",
        lastName: "Uprety",
        email: "nikesh@example.com",
        phone: "9800000000",
        address: "Lazimpat",
        city: "Kathmandu",
        zip: "00000",
        country: "Nepal",
        deliveryLocation: "Kathmandu Inside Ring Road",
      },
      paymentMethod: "cash_on_delivery",
      source: "website",
    };

    apiRequestMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { orderNumber: "ORD-1", total: 3200, order: { id: "order-1" } } })),
    );

    await createOrder(payload);

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/orders", payload);
  });

  it("sends promo validation item ids in the expected shape", async () => {
    apiRequestMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ valid: true, data: { id: "promo-1", code: "RARE10", discountPct: 10 } })),
    );

    await validatePromoCode("rare10", ["1", 2]);

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/promo/validate", {
      code: "rare10",
      items: [{ productId: "1" }, { productId: 2 }],
    });
  });

  it("normalizes admin order discount amounts", async () => {
    apiRequestMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: "1", fullName: "Customer", email: "c@example.com", total: 5000, status: "pending", createdAt: "2026-03-23", promoDiscountAmount: 450 },
          ],
        }),
      ),
    );

    const orders = await fetchAdminOrders({ status: "pending", search: "customer" });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "GET",
      "/api/admin/orders?status=pending&search=customer",
    );
    expect(orders[0]?.discountAmount).toBe(450);
  });
});
