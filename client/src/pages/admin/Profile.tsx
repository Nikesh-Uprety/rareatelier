import { useState, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  Camera,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MessagesSection = lazy(() => import("@/components/admin/MessagesSection"));

interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  status: string;
  profileImageUrl?: string | null;
}

export default function AdminProfilePage() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("account");
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImageUrl || null);
  const [editEmail, setEditEmail] = useState(user?.email ?? "");
  const [isEmailVerifyOpen, setIsEmailVerifyOpen] = useState(false);
  const [emailTempToken, setEmailTempToken] = useState("");
  const [emailVerifyCode, setEmailVerifyCode] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState<string | null>(null);

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAdmin = user?.role === "admin";

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
    enabled: activeTab === "users",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({
          title: "Could not delete user",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "User deleted",
        description: "The user has been permanently removed.",
      });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not delete user",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; profileImageUrl?: string }) => {
      const res = await apiRequest("PUT", "/api/admin/profile/update", data);
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Profile not updated", description: result.error, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Profile not updated", description: err.message, variant: "destructive" });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const res = await apiRequest("POST", "/api/admin/profile/upload-avatar", { imageBase64 });
      return (await res.json()) as { success: boolean; url?: string; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success || !result.url) {
        toast({ title: "Upload failed", description: result.error, variant: "destructive" });
        return;
      }
      setProfileImage(result.url);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile picture updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const emailChangeMutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const res = await apiRequest("POST", "/api/admin/profile/update-email", { newEmail });
      return (await res.json()) as { success: boolean; tempToken?: string; code?: string; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Email change failed", description: result.error, variant: "destructive" });
        return;
      }
      setEmailTempToken(result.tempToken || "");
      setEmailOtpCode(result.code || null);
      setIsEmailVerifyOpen(true);
      toast({ title: "Verification code sent", description: "Check your new email for the code." });
    },
    onError: (err: Error) => {
      toast({ title: "Email change failed", description: err.message, variant: "destructive" });
    },
  });

  const emailVerifyMutation = useMutation({
    mutationFn: async (data: { tempToken: string; code: string; newEmail: string }) => {
      const res = await apiRequest("POST", "/api/admin/profile/verify-email", data);
      return (await res.json()) as { success: boolean; error?: string };
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Verification failed", description: result.error, variant: "destructive" });
        return;
      }
      setIsEmailVerifyOpen(false);
      setEmailVerifyCode("");
      setEmailOtpCode(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Email updated", description: "Your email has been changed successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and admin settings.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
          <TabsTrigger value="account">Account</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">All Admin Users</TabsTrigger>}
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-4 space-y-6">
          {/* Basic Profile */}
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-20 h-20 rounded-full bg-[#2D4A35] text-white flex items-center justify-center text-2xl font-semibold overflow-hidden cursor-pointer group"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.name || user?.email || "U")
                    .slice(0, 2)
                    .toUpperCase()
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result as string;
                    avatarMutation.mutate(base64);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <Badge variant="outline" className="text-[11px]">
                {user?.role?.toUpperCase() || "STAFF"}
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
                <div className="flex gap-2">
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-10 flex-1"
                  />
                  {editEmail !== (user?.email ?? "") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs"
                      loading={emailChangeMutation.isPending}
                      loadingText="Sending..."
                      onClick={() => emailChangeMutation.mutate(editEmail)}
                    >
                      Verify & Update
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  loading={profileMutation.isPending}
                  loadingText="Saving..."
                  disabled={displayName === (user?.name ?? "")}
                  className="h-10"
                  onClick={() => profileMutation.mutate({ displayName })}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Account Security
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
                  Confirm Password
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
                className="h-10"
                loading={passwordMutation.isPending}
                loadingText="Updating..."
                disabled={!passwordNew}
                onClick={() => passwordMutation.mutate()}
              >
                Update Password
              </Button>
            </div>
          </div>

          {/* 2FA Section */}
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-muted-foreground">
                  Secure your account by requiring an email verification code at login.
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

        {/* Admin Management */}
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Admin Team
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-[#E5E5E0] dark:border-border text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 text-left font-semibold">User</th>
                      <th className="py-2 pr-4 text-left font-semibold">Role</th>
                      <th className="py-2 pr-4 text-left font-semibold">2FA</th>
                      <th className="py-2 pr-4 text-left font-semibold">Last Login</th>
                      <th className="py-2 pl-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5} className="py-8 text-center animate-pulse text-muted-foreground">
                            Loading team data...
                          </td>
                        </tr>
                      ))
                    ) : (
                      adminUsers.map((u) => (
                        <tr key={u.id} className="border-b border-[#F0F0EB] dark:border-border/50">
                          <td className="py-3 pr-4">
                            <div className="font-medium">{u.name || u.email}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className="text-[10px]">
                              {u.role.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            {u.twoFactorEnabled ? "Enabled" : "Disabled"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 pl-2 text-right">
                            {u.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteUserId(u.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="messages" className="mt-4">
          <Suspense fallback={<div className="h-64 flex items-center justify-center"><BrandedLoader /></div>}>
            <MessagesSection />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isEmailVerifyOpen} onOpenChange={setIsEmailVerifyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Verify Email Change</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to <strong>{editEmail}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {emailOtpCode && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-1">Dev Code</p>
                <p className="text-2xl font-bold tracking-[8px] text-amber-700">{emailOtpCode}</p>
              </div>
            )}
            <Input
              placeholder="000000"
              value={emailVerifyCode}
              onChange={(e) => setEmailVerifyCode(e.target.value)}
              className="text-center text-lg tracking-[8px] h-12"
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailVerifyOpen(false)}>Cancel</Button>
            <Button
              loading={emailVerifyMutation.isPending}
              loadingText="Verifying..."
              disabled={emailVerifyCode.length < 6}
              onClick={() => {
                emailVerifyMutation.mutate({
                  tempToken: emailTempToken,
                  code: emailVerifyCode,
                  newEmail: editEmail,
                });
              }}
            >
              Verify & Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Permanent removal of admin access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              loadingText="Deleting..."
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
