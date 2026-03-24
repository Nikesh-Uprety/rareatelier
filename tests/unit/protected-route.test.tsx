import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const setLocationMock = vi.fn();
const useCurrentUserMock = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", setLocationMock],
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to the admin login", async () => {
    useCurrentUserMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute requireAdmin>
        <div>Secret</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith("/admin/login");
    });
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("blocks authenticated non-admin users from admin routes", async () => {
    useCurrentUserMock.mockReturnValue({
      user: { id: "1", email: "user@example.com", role: "customer" },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute requireAdmin>
        <div>Secret</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("renders children for authorized admin users", () => {
    useCurrentUserMock.mockReturnValue({
      user: { id: "1", email: "admin@example.com", role: "admin" },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute requireAdmin>
        <div>Secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });
});
