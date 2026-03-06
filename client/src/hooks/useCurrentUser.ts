import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface CurrentUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface MeResponse {
  success: boolean;
  data?: CurrentUser;
  error?: string;
}

export function useCurrentUser() {
  const { data, isLoading } = useQuery<MeResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<MeResponse>({ on401: "returnNull" }),
  });

  const user = data?.success ? data.data ?? null : null;
  const isAuthenticated = !!user;

  return { user, isLoading, isAuthenticated };
}

