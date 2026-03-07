import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  type AdminCustomer,
  type AdminOrder,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";

interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  status: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied";
  createdAt: string;
}

export default function AdminProfilePage() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const {
    data: adminUsers = [],
    isLoading: usersLoading,
  } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      const json = (await res.json()) as {
        success: boolean;
        data?: AdminUser[];
      };
      return json.data ?? [];
    },
    enabled: !!user,
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/profile/password", {
        current: passwordCurrent,
        newPassword: passwordNew,
        confirm: passwordConfirm,
      });
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({
          title: "Password not updated",
          description: result.error ?? "Please check your inputs.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Password updated",
        description: "Your password has been changed.",
      });
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
    },
    onError: (err: Error) => {
      toast({
        title: "Password not updated",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const twoFAMutation = useMutation({
    mutationFn: async ({
      id,
      enabled,
    }: {
      id: string;
      enabled: boolean;
    }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${id}/2fa`, {
        enabled,
      });
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({
          title: "Could not update 2FA",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Two-factor updated",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update 2FA",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({
          title: "Could not revoke access",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Access revoked",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not revoke access",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      role: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/users/invite", payload);
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result, variables) => {
      if (!result.success) {
        toast({
          title: "Invite not sent",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Invite sent",
        description: `Invite sent to ${variables.email}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Invite not sent",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account, security, and admin team.
          </p>
        </div>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">All Admin Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="invite">Create User</TabsTrigger>}
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Account tab */}
        <TabsContent value="account" className="mt-4">
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-[#2D4A35] text-white flex items-center justify-center text-2xl font-semibold">
                {(user?.name || user?.email || "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <Badge variant="outline" className="text-[11px]">
                {user?.role === "admin" ? "ADMIN" : "STAFF"}
              </Badge>
            </div>
            <div className="flex-1 w-full space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Display name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Email
                </label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="h-10 bg-muted/40"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled
                  className="h-10"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security tab */}
        <TabsContent value="security" className="mt-4 space-y-6">
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Reset Password
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={passwordCurrent}
                  onChange={(e) => setPasswordCurrent(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                className="h-9"
                disabled={passwordMutation.isPending}
                onClick={() => passwordMutation.mutate()}
              >
                Update Password
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-muted-foreground">
                  When enabled, you&apos;ll receive a 6-digit code on your email
                  every time you log in from a new device.
                </p>
              </div>
              <Switch
                checked={!!user?.twoFactorEnabled}
                onCheckedChange={(enabled) => {
                  if (!user) return;
                  twoFAMutation.mutate({ id: user.id, enabled });
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* All Admin Users tab */}
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Admin Users
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-[#E5E5E0] dark:border-border text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 text-left font-semibold">
                        User
                      </th>
                      <th className="py-2 pr-4 text-left font-semibold">
                        Role
                      </th>
                      <th className="py-2 pr-4 text-left font-semibold">
                        2FA
                      </th>
                      <th className="py-2 pr-4 text-left font-semibold">
                        Last Login
                      </th>
                      <th className="py-2 pl-2 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td className="py-3 pr-4">
                            <div className="h-3 w-24 bg-muted animate-pulse rounded mb-1" />
                            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="h-3 w-8 bg-muted animate-pulse rounded" />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <div className="h-7 w-20 bg-muted animate-pulse rounded-full ml-auto" />
                          </td>
                        </tr>
                      ))}
                    {!usersLoading &&
                      adminUsers.map((u) => (
                        <tr key={u.id} className="border-b border-[#F0F0EB]">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-[12px]">
                              {u.name || u.email}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {u.email}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {u.role.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-[11px]">
                              {u.twoFactorEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-[11px] text-muted-foreground">
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleString(
                                  "en-NP",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </td>
                          <td className="py-3 pl-2 text-right">
                            {u.id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() => revokeMutation.mutate(u.id)}
                              >
                                Revoke Access
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    {!usersLoading && adminUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          No admin users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}

        {/* Create User tab */}
        {isAdmin && (
          <TabsContent value="invite" className="mt-4">
            <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Invite Admin User
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    Full Name
                  </label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Full name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(
                        e.target.value === "admin" ? "admin" : "staff",
                      )
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={inviteMutation.isPending}
                  onClick={() =>
                    inviteMutation.mutate({
                      name: inviteName,
                      email: inviteEmail,
                      role: inviteRole,
                    })
                  }
                >
                  Send Invite
                </Button>
              </div>
            </div>
          </TabsContent>
        )}

        {/* Messages tab placeholder - wired in Feature 6 */}
        <TabsContent value="messages" className="mt-4">
          <div className="bg-white dark:bg-card rounded-2xl border border-dashed border-[#E5E5E0] dark:border-border p-6 text-sm text-muted-foreground">
            Contact messages UI will appear here (implemented with Feature 6).
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

