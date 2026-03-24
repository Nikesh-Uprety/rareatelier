import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessAdminPanel } from "@shared/auth-policy";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const [location, setLocation] = useLocation();

  // Finish the pre-loader when authentication check is complete
  useEffect(() => {
    if (!isLoading) {
      // Call finishLoading to hide the pre-loader after auth is verified
      if (typeof window !== 'undefined' && (window as any).finishLoading) {
        (window as any).finishLoading();
      }
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (location !== "/admin/login") {
        setLocation("/admin/login");
      }
      return;
    }
    if (requireAdmin && user && !canAccessAdminPanel(user.role)) {
      if (location !== "/") {
        setLocation("/");
      }
    }
  }, [isLoading, isAuthenticated, requireAdmin, user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-muted border-t-foreground animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireAdmin && user && !canAccessAdminPanel(user.role)) {
    return null;
  }

  return <>{children}</>;
}
