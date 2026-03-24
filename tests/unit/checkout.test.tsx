import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkout from "@/pages/storefront/Checkout";
import { renderWithProviders } from "./test-utils";

const setLocationMock = vi.fn();
const clearCartMock = vi.fn();
const toastMock = vi.fn();
const mockCartState = {
  items: [
    {
      id: "prod-1-M-Black",
      product: {
        id: "prod-1",
        name: "Test Hoodie",
        price: 3200,
        stock: 5,
        category: "hoodies",
        sku: "SKU-1",
        images: ["/hoodie.webp"],
        variants: [{ size: "M", color: "Black" }],
      },
      variant: { size: "M", color: "Black" },
      quantity: 1,
    },
  ],
  clearCart: clearCartMock,
};

const createOrderMock = vi.fn();
const validatePromoCodeMock = vi.fn();
const cacheLatestOrderMock = vi.fn();
const useCartStoreMock = vi.fn(() => mockCartState);

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  useLocation: () => ["/checkout", setLocationMock],
}));

vi.mock("@/store/cart", () => ({
  useCartStore: () => useCartStoreMock(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/api", () => ({
  createOrder: (...args: unknown[]) => createOrderMock(...args),
  validatePromoCode: (...args: unknown[]) => validatePromoCodeMock(...args),
  cacheLatestOrder: (...args: unknown[]) => cacheLatestOrderMock(...args),
}));

describe("Checkout", () => {
  beforeEach(() => {
    setLocationMock.mockReset();
    clearCartMock.mockReset();
    toastMock.mockReset();
    createOrderMock.mockReset();
    validatePromoCodeMock.mockReset();
    cacheLatestOrderMock.mockReset();
    useCartStoreMock.mockImplementation(() => mockCartState);
    localStorage.clear();
  });

  it("redirects back to cart when no cart items are present", () => {
    useCartStoreMock.mockImplementation(() => ({ items: [], clearCart: clearCartMock }));

    renderWithProviders(<Checkout />);

    expect(setLocationMock).toHaveBeenCalledWith("/cart");
  });

  it("blocks submission when required fields are missing", async () => {
    const user = userEvent.setup();

    renderWithProviders(<Checkout />);
    await user.click(screen.getByTestId("checkout-submit"));

    expect(await screen.findByText("Please fill in all required fields.")).toBeInTheDocument();
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("applies promo codes and shows success feedback", async () => {
    const user = userEvent.setup();
    validatePromoCodeMock.mockResolvedValueOnce({
      valid: true,
      data: { id: "promo-1", code: "RARE10", discountPct: 10 },
    });

    renderWithProviders(<Checkout />);

    await user.type(screen.getByTestId("checkout-promo-input"), "rare10");
    await user.click(screen.getByTestId("checkout-apply-promo"));

    await waitFor(() => {
      expect(validatePromoCodeMock).toHaveBeenCalledWith("RARE10", ["prod-1"]);
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Promo code applied!",
      }),
    );
  });

  it("creates a cash-on-delivery order and routes to confirmation", async () => {
    const user = userEvent.setup();
    createOrderMock.mockResolvedValueOnce({
      success: true,
      data: {
        orderNumber: "ORD-1",
        total: 3300,
        order: { id: "order-1" },
      },
    });

    renderWithProviders(<Checkout />);

    await user.type(screen.getByTestId("checkout-email"), "buyer@example.com");
    await user.type(screen.getByTestId("checkout-first-name"), "Nikesh");
    await user.type(screen.getByTestId("checkout-last-name"), "Uprety");
    await user.type(screen.getByTestId("checkout-address"), "Lazimpat");
    await user.type(screen.getByTestId("checkout-city"), "Kathmandu");
    await user.type(screen.getByTestId("checkout-phone"), "9800000000");
    await user.type(screen.getByTestId("checkout-delivery-location"), "Kathmandu");
    await user.click(await screen.findByRole("button", { name: "Kathmandu Inside Ring Road" }));
    await user.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalled();
      expect(cacheLatestOrderMock).toHaveBeenCalledWith({ id: "order-1" });
      expect(clearCartMock).toHaveBeenCalled();
      expect(setLocationMock).toHaveBeenCalledWith("/order-confirmation/order-1");
    });
  });

  it("routes online payment orders to the payment page", async () => {
    const user = userEvent.setup();
    createOrderMock.mockResolvedValueOnce({
      success: true,
      data: {
        orderNumber: "ORD-2",
        total: 3300,
        order: { id: "order-2" },
      },
    });

    renderWithProviders(<Checkout />);

    await user.type(screen.getByTestId("checkout-email"), "buyer@example.com");
    await user.type(screen.getByTestId("checkout-first-name"), "Nikesh");
    await user.type(screen.getByTestId("checkout-last-name"), "Uprety");
    await user.type(screen.getByTestId("checkout-address"), "Lazimpat");
    await user.type(screen.getByTestId("checkout-city"), "Kathmandu");
    await user.type(screen.getByTestId("checkout-phone"), "9800000000");
    await user.type(screen.getByTestId("checkout-delivery-location"), "Kathmandu");
    await user.click(await screen.findByRole("button", { name: "Kathmandu Inside Ring Road" }));
    await user.click(screen.getByTestId("checkout-payment-esewa"));
    await user.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => {
      expect(cacheLatestOrderMock).toHaveBeenCalledWith({ id: "order-2" });
      expect(clearCartMock).toHaveBeenCalled();
      expect(setLocationMock).toHaveBeenCalledWith("/checkout/payment?orderId=order-2&method=esewa");
    });
  });
});
