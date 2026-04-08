import { QueryClient, QueryFunction } from "@tanstack/react-query";

type ApiErrorBody = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
  errors?: unknown;
  code?: unknown;
};

function formatValidationErrors(errors: unknown): string | null {
  if (!Array.isArray(errors) || errors.length === 0) return null;

  const messages = errors
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object") return null;

      const record = entry as {
        message?: unknown;
        path?: unknown;
      };

      if (typeof record.message === "string" && record.message.trim()) {
        return record.message.trim();
      }

      if (Array.isArray(record.path) && record.path.length > 0) {
        return record.path.map(String).join(".");
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (!messages.length) return null;
  return Array.from(new Set(messages)).join(" ");
}

function humanizeConstraintMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Something went wrong";

  const normalized = trimmed.replace(/^error:\s*/i, "");
  const lower = normalized.toLowerCase();

  if (
    lower.includes("already exists") ||
    lower.includes("not found") ||
    lower.includes("not allowed") ||
    lower.includes("not authorized") ||
    lower.includes("required") ||
    lower.includes("invalid")
  ) {
    return normalized;
  }

  if (lower.includes("duplicate key value violates unique constraint")) {
    if (lower.includes("products_name_unique")) {
      return "A product with this name already exists. Please choose a different name.";
    }
    if (lower.includes("categories_slug_unique")) {
      return "A category with this name already exists. Please choose a different name.";
    }
    if (lower.includes("customers_email")) {
      return "A customer with this email already exists.";
    }
    if (lower.includes("newsletter") && lower.includes("email")) {
      return "This email is already subscribed.";
    }
    if (lower.includes("promo") && lower.includes("code")) {
      return "A promo code with this code already exists.";
    }
    if (lower.includes("users_username") || lower.includes("users_email")) {
      return "A user with this email already exists.";
    }
    if (lower.includes("pages_slug") || lower.includes("slug_redirects_from_slug")) {
      return "This slug is already in use. Please choose a different one.";
    }
    return "This record already exists. Please choose a different value.";
  }

  if (lower.includes("violates foreign key constraint")) {
    return "This item is still linked to other records and cannot be changed or deleted yet.";
  }

  if (lower.includes("violates not-null constraint")) {
    return "Some required information is missing. Please review the form and try again.";
  }

  if (lower === "conflict") {
    return "This change conflicts with existing data. Please review your input and try again.";
  }

  if (lower === "internal server error") {
    return "The server could not finish this request. Please try again.";
  }

  return normalized;
}

function extractApiErrorMessage(body: ApiErrorBody, fallback: string): string {
  const error =
    typeof body.error === "string" && body.error.trim().length > 0 ? body.error.trim() : "";
  const message =
    typeof body.message === "string" && body.message.trim().length > 0 ? body.message.trim() : "";
  const details =
    typeof body.details === "string" && body.details.trim().length > 0 ? body.details.trim() : "";
  const validation = formatValidationErrors(body.errors);

  if (message === "Validation failed" && validation) {
    return humanizeConstraintMessage(validation);
  }

  if (error && error !== "Conflict" && error !== "Internal server error") {
    return humanizeConstraintMessage(error);
  }

  if (message && message !== "Validation failed") {
    return humanizeConstraintMessage(message);
  }

  if (details) {
    return humanizeConstraintMessage(details);
  }

  if (validation) {
    return humanizeConstraintMessage(validation);
  }

  if (error) {
    return humanizeConstraintMessage(error);
  }

  return fallback;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  return humanizeConstraintMessage(error.message || fallback);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    const contentType = res.headers.get("content-type") || "";

    try {
      if (contentType.includes("application/json")) {
        const body = (await res.json()) as ApiErrorBody;
        message = extractApiErrorMessage(body, message);
      } else {
        const text = (await res.text()).trim();
        if (text) message = humanizeConstraintMessage(text);
      }
    } catch {
      // Keep the default HTTP status text if the response body is unreadable.
    }

    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes cache for static data (SWR)
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
