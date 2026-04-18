import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminOrdersNew from "../../client/src/pages/admin/OrdersNew";
import { renderWithProviders } from "./test-utils";

const { mockCreateAdminOrder, mockFetchAdminOrdersPage, mockFetchAdminProductsPage, mockToast } = vi.hoisted(() => ({
  mockCreateAdminOrder: vi.fn(),
  mockFetchAdminOrdersPage: vi.fn(),
  mockFetchAdminProductsPage: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("../../client/src/lib/adminApi", () => ({
  createAdminOrder: mockCreateAdminOrder,
  fetchAdminOrdersPage: mockFetchAdminOrdersPage,
  fetchAdminProductsPage: mockFetchAdminProductsPage,
}));

vi.mock("../../client/src/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

function buildProducts() {
  return [
    { id: "1", name: "Alpha Tee", category: "Tops", price: 1200, stock: 9, imageUrl: "https://img/alpha.jpg", galleryUrls: null },
    { id: "2", name: "Beta Pants", category: "Bottoms", price: 2500, stock: 4, imageUrl: "https://img/beta.jpg", galleryUrls: null },
    { id: "3", name: "Gamma Tote", category: "Accessories", price: 900, stock: 0, imageUrl: "https://img/gamma.jpg", galleryUrls: null },
    { id: "4", name: "Delta Shirt", category: "Tops", price: 1900, stock: 8, imageUrl: "https://img/delta.jpg", galleryUrls: null },
    { id: "5", name: "Epsilon Set", category: "Sets", price: 3200, stock: 10, imageUrl: "https://img/epsilon.jpg", galleryUrls: null },
    { id: "6", name: "Zeta Cap", category: "Accessories", price: 700, stock: 6, imageUrl: "https://img/zeta.jpg", galleryUrls: null },
    { id: "7", name: "Eta Knit", category: "Tops", price: 2100, stock: 3, imageUrl: "https://img/eta.jpg", galleryUrls: null },
    { id: "8", name: "Theta Jeans", category: "Bottoms", price: 2800, stock: 7, imageUrl: "https://img/theta.jpg", galleryUrls: null },
    { id: "9", name: "Iota Bag", category: "Accessories", price: 1600, stock: 8, imageUrl: "https://img/iota.jpg", galleryUrls: null },
  ];
}

function buildOrders() {
  return [
    {
      id: "3f4bb2c2-aaaa-bbbb-cccc-111111111111",
      email: null,
      fullName: "Sita Thapa",
      total: 3300,
      status: "completed",
      createdAt: "2026-04-18T00:00:00.000Z",
      phoneNumber: "9841000001",
      items: [{ productId: "1", quantity: 1, name: "Alpha Tee" }],
    },
  ];
}

beforeEach(() => {
  mockCreateAdminOrder.mockReset();
  mockFetchAdminOrdersPage.mockReset();
  mockFetchAdminProductsPage.mockReset();
  mockToast.mockReset();

  mockFetchAdminProductsPage.mockResolvedValue({ data: buildProducts(), total: 9 });
  mockFetchAdminOrdersPage.mockResolvedValue({ data: buildOrders(), total: 1 });

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

describe("AdminOrdersNew", () => {
  it("renders the new layout, paginates products, and filters live search", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOrdersNew />);

    expect(await screen.findByText("Alpha Tee")).toBeInTheDocument();
    expect(screen.getByText("1-8 of 9")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(await screen.findByText("Iota Bag")).toBeInTheDocument();
    expect(screen.getByText("9-9 of 9")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search by name or category..."));
    await user.type(screen.getByPlaceholderText("Search by name or category..."), "iota");

    expect(await screen.findByText("Iota Bag")).toBeInTheDocument();
    expect(screen.getByText("1-1 of 1")).toBeInTheDocument();
  });

  it("falls back product thumbnails and keeps order totals live", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOrdersNew />);

    const alphaImage = await screen.findByAltText("Alpha Tee");
    fireEvent.error(alphaImage);
    expect(screen.getByTestId("thumb-fallback-1")).toHaveTextContent("AT");

    await user.click(screen.getByRole("button", { name: "Add Alpha Tee" }));
    expect(screen.getByText("1 items selected")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,300")).toBeInTheDocument();

    const [deliveryInput, discountInput] = screen.getAllByRole("spinbutton").slice(-2);
    await user.clear(deliveryInput);
    await user.type(deliveryInput, "150");
    await user.clear(discountInput);
    await user.type(discountInput, "50");

    expect(screen.getByText("Rs. 1,300")).toBeInTheDocument();
  });


  it("requires customer name and phone before creating an order", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOrdersNew />);

    await user.click(await screen.findByRole("button", { name: "Add Alpha Tee" }));
    await user.click(screen.getByRole("button", { name: "Create order" }));

    expect(await screen.findByText("Customer name is required.")).toBeInTheDocument();
    expect(screen.getByText("Phone number is required.")).toBeInTheDocument();
    expect(mockCreateAdminOrder).not.toHaveBeenCalled();
  });

  it("opens a checkout link modal that carries the selected products into checkout", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOrdersNew />);

    await user.click(await screen.findByRole("button", { name: "Add Alpha Tee" }));
    await user.click(screen.getByRole("button", { name: /link/i }));

    expect(await screen.findByText("Checkout & tracking links")).toBeInTheDocument();

    const checkoutLinkText = screen.getByText((content) => content.includes("/checkout?admin_order_seed="));
    expect(checkoutLinkText).toBeInTheDocument();

    const openCheckoutLink = screen.getByRole("link", { name: "Open checkout in a new tab" });
    expect(openCheckoutLink).toHaveAttribute("href", expect.stringContaining("/checkout?admin_order_seed="));
  });
  it("submits through the existing API, prepends the new order, and opens the created modal", async () => {
    const user = userEvent.setup();
    mockCreateAdminOrder.mockResolvedValue({
      orderNumber: "UX-2026-0001",
      total: 1300,
      order: {
        id: "ab12cd34-1111-2222-3333-444444444444",
        email: null,
        fullName: "Nima Lama",
        total: 1300,
        status: "completed",
        createdAt: "2026-04-18T00:00:00.000Z",
        phoneNumber: "9800000000",
        trackingToken: "track-123",
        items: [{ productId: "1", quantity: 1, name: "Alpha Tee" }],
      },
    });

    renderWithProviders(<AdminOrdersNew />);

    await user.click(await screen.findByRole("button", { name: "Add Alpha Tee" }));
    await user.type(screen.getByPlaceholderText("Customer name"), "Nima Lama");
    await user.type(screen.getByPlaceholderText("+977-"), "9800000000");

    const paymentStatusSelect = screen.getAllByRole("combobox")[2];
    await user.selectOptions(paymentStatusSelect, "Paid");
    await user.click(screen.getByRole("button", { name: "Create order" }));

    await waitFor(() => {
      expect(mockCreateAdminOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "cash_on_delivery",
          status: "completed",
          deliveryFee: 100,
          items: [
            expect.objectContaining({ productId: "1", quantity: 1, priceAtTime: 1200 }),
          ],
          shipping: expect.objectContaining({
            fullName: "Nima Lama",
            phone: "9800000000",
          }),
        }),
      );
    });

    expect(await screen.findByText("Order created")).toBeInTheDocument();
    expect(screen.getByText("UX-2026-0001")).toBeInTheDocument();
    expect(screen.getAllByText("UX-2026-0001")[0]).toBeInTheDocument();
  });

  it("supports local inline editing and recent-order search", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminOrdersNew />);

    expect(await screen.findByText("Sita Thapa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sita Thapa" }));

    const customerEditor = screen.getByDisplayValue("Sita Thapa");
    await user.clear(customerEditor);
    await user.type(customerEditor, "Sita Gurung{Enter}");
    expect(screen.getByRole("button", { name: "Sita Gurung" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Paid" }));
    await user.selectOptions(screen.getByDisplayValue("Paid"), "Cancelled");
    expect(screen.getByRole("button", { name: "Cancelled" })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search orders..."), "gurung");
    expect(screen.getByRole("button", { name: "Sita Gurung" })).toBeInTheDocument();
  });
});
