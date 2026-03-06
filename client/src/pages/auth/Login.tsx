import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, isLoading } = useCurrentUser();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const res = await apiRequest("POST", "/api/auth/login", values);
      return (await res.json()) as {
        success: boolean;
        data?: { id: string; email: string; name?: string; role: string };
        error?: string;
      };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" />
    );
  }

  if (user) {
    const target =
      user.role === "admin" || user.role === "staff" ? "/admin" : "/";
    if (location !== target) {
      setLocation(target);
    }
    return null;
  }

  const onSubmit = async (values: LoginFormValues) => {
    const result = await mutateAsync(values);
    if (!result.success || !result.data) return;

    const target =
      result.data.role === "admin" || result.data.role === "staff"
        ? "/admin"
        : "/";
    setLocation(target);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-10 shadow-sm">
        <div className="mb-8 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            RARE.NP
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Rare Atelier
          </p>
        </div>

        <div className="mb-6 space-y-1">
          <h1 className="font-serif text-[28px] leading-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
              Email
            </label>
            <Input
              type="email"
              autoComplete="email"
              {...register("email")}
              className="h-11 rounded-xl bg-background/40 border-[var(--border)]"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                className="h-11 pr-10 rounded-xl bg-background/40 border-[var(--border)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500">
              {(error as Error).message ?? "Failed to sign in"}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] text-xs uppercase tracking-[0.25em] font-semibold"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            &copy; 2025 Rare Atelier. All rights reserved.
          </p>
        </div>

        <details className="mt-6 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer select-none">
            Developer credentials
          </summary>
          <div className="mt-2 space-y-1">
            <p>Admin: admin@rare.np / admin123</p>
            <p>Staff: staff@rare.np / staff123</p>
          </div>
        </details>
      </div>
    </div>
  );
}
