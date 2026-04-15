import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminImagesPage from "@/pages/admin/Images";
import StorefrontImagePicker from "@/pages/admin/StorefrontImagePicker";
import { renderWithProviders } from "./test-utils";

const fetchAdminImagesPageMock = vi.fn();
const fetchAdminImagesMock = vi.fn();
const fetchAdminPaymentQrConfigMock = vi.fn();
const deleteAdminImageMock = vi.fn();
const deleteAdminStorefrontImageMock = vi.fn();
const uploadAdminImageMock = vi.fn();
const activateAdminPaymentQrMock = vi.fn();
const apiRequestMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

vi.mock("@/lib/adminApi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adminApi")>("@/lib/adminApi");
  return {
    ...actual,
    fetchAdminImagesPage: (...args: unknown[]) => fetchAdminImagesPageMock(...args),
    fetchAdminImages: (...args: unknown[]) => fetchAdminImagesMock(...args),
    fetchAdminPaymentQrConfig: (...args: unknown[]) => fetchAdminPaymentQrConfigMock(...args),
    deleteAdminImage: (...args: unknown[]) => deleteAdminImageMock(...args),
    deleteAdminStorefrontImage: (...args: unknown[]) => deleteAdminStorefrontImageMock(...args),
    uploadAdminImage: (...args: unknown[]) => uploadAdminImageMock(...args),
    activateAdminPaymentQr: (...args: unknown[]) => activateAdminPaymentQrMock(...args),
  };
});

describe("admin image previews", () => {
  beforeEach(() => {
    fetchAdminImagesPageMock.mockReset();
    fetchAdminImagesMock.mockReset();
    fetchAdminPaymentQrConfigMock.mockReset();
    deleteAdminImageMock.mockReset();
    deleteAdminStorefrontImageMock.mockReset();
    uploadAdminImageMock.mockReset();
    activateAdminPaymentQrMock.mockReset();
    apiRequestMock.mockReset();
    toastMock.mockReset();

    fetchAdminPaymentQrConfigMock.mockResolvedValue({
      esewa: { id: null, url: "/esewa-default.webp", thumbnailUrl: "/esewa-default.webp", previewUrl: "/esewa-default.webp", createdAt: null },
      khalti: { id: null, url: "/khalti-default.webp", thumbnailUrl: "/khalti-default.webp", previewUrl: "/khalti-default.webp", createdAt: null },
      fonepay: { id: null, url: "/fonepay-default.webp", thumbnailUrl: "/fonepay-default.webp", previewUrl: "/fonepay-default.webp", createdAt: null },
    });
    fetchAdminImagesPageMock.mockResolvedValue({
      data: [
        {
          id: "asset-1",
          url: "/cdn/full-hero.webp",
          thumbnailUrl: "/cdn/thumb-hero.webp",
          previewUrl: "/cdn/preview-hero.webp",
          provider: "cloudinary",
          category: "product",
          publicId: "product/hero",
          filename: "hero-shot.jpg",
          bytes: 2048,
          width: 1800,
          height: 2400,
          createdAt: "2026-04-15T00:00:00.000Z",
        },
      ],
      total: 1,
    });
    fetchAdminImagesMock.mockResolvedValue([
      {
        id: "asset-2",
        url: "https://cdn.example.com/full-campaign.webp",
        thumbnailUrl: "https://cdn.example.com/thumb-campaign.webp",
        previewUrl: "https://cdn.example.com/preview-campaign.webp",
        provider: "cloudinary",
        category: "website",
        publicId: "website/campaign",
        filename: "campaign-shot.webp",
        bytes: 4096,
        width: 1800,
        height: 1200,
        createdAt: "2026-04-15T00:00:00.000Z",
      },
    ]);
    apiRequestMock.mockResolvedValue({
      json: async () => ({ success: true, data: [] }),
    });
  });

  it("uses thumbnail images in the admin grid and preview images in the modal", async () => {
    const user = userEvent.setup();

    renderWithProviders(<AdminImagesPage />);

    const gridImage = await screen.findByAltText("hero shot");
    expect(gridImage).toHaveAttribute("src", "/cdn/thumb-hero.webp");

    await user.click(gridImage);

    const previewImage = await screen.findByAltText("hero-shot.jpg");
    expect(previewImage).toHaveAttribute("src", "/cdn/preview-hero.webp");
  });

  it("keeps storefront selection mapped to the original url while rendering lightweight previews", async () => {
    const user = userEvent.setup();

    renderWithProviders(<StorefrontImagePicker />);

    const libraryImage = await screen.findByAltText("campaign-shot.webp");
    expect(libraryImage).toHaveAttribute("src", "https://cdn.example.com/thumb-campaign.webp");

    await user.click(screen.getByRole("button", { name: /pick campaign-shot\.webp/i }));

    await waitFor(() => {
      expect(screen.getByAltText("Active slot preview")).toHaveAttribute(
        "src",
        "https://cdn.example.com/preview-campaign.webp",
      );
    });
  });
});
