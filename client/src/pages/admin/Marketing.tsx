import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AdvancedEmailEditor } from "@/components/admin/AdvancedEmailEditor";
import {
  addNewsletterEmail,
  importNewsletterEmails,
  deleteNewsletterEmail,
  deleteAllNewsletterEmails,
} from "@/lib/adminApi";
import {
  Activity,
  BarChart3,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Trash2,
  PlusCircle,
  Upload,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emailTemplates = {
  template1: {
    name: "Simple Announcement",
    subject: "A quick update from RARE",
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1f2937; border: 1px solid #e5e7eb;">
<div style="padding: 32px 28px; border-bottom: 1px solid #e5e7eb;">
  <p style="margin: 0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #6b7280;">Rare Atelier</p>
  <h1 style="margin: 12px 0 0; font-size: 28px; line-height: 1.2; color: #111827;">A quick update for you</h1>
</div>
<div style="padding: 28px;">
  <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7;">We wanted to share a short and helpful update with our community.</p>
  <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7;">You can replace this section with your campaign message, new arrivals, delivery notice, or special offer.</p>
  <a href="https://rarenp.com" style="display: inline-block; padding: 12px 20px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Visit RARE</a>
</div>
</div>`,
  },
  template2: {
    name: "Clean Product Highlight",
    subject: "New arrival now live",
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fcfcfb; color: #1f2937;">
<div style="padding: 40px 30px 24px; text-align: center;">
  <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #9ca3af;">New Collection</p>
  <h1 style="margin: 14px 0 10px; font-size: 30px; line-height: 1.2;">Simple, clean, and ready to wear</h1>
  <p style="margin: 0 auto; max-width: 420px; font-size: 15px; line-height: 1.7; color: #4b5563;">Introduce a featured item, a limited release, or a curated drop without overwhelming the reader.</p>
</div>
<div style="padding: 0 30px 36px;">
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
    <h2 style="margin: 0 0 12px; font-size: 20px;">Featured piece</h2>
    <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.7; color: #4b5563;">Add sizing notes, fabric details, delivery timing, or a launch message here.</p>
    <a href="https://rarenp.com" style="display: inline-block; padding: 11px 18px; border: 1px solid #111827; color: #111827; text-decoration: none; border-radius: 999px; font-size: 13px; font-weight: 600;">Shop now</a>
  </div>
</div>
</div>`,
  },
  template3: {
    name: "Helpful Newsletter",
    subject: "Your weekly update from RARE",
    html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #222222;">
<div style="padding: 34px 28px;">
  <h1 style="margin: 0 0 10px; font-size: 30px; line-height: 1.2;">This week's update</h1>
  <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #555555;">Use this layout for tips, announcements, short stories, or helpful updates for your customers.</p>
  <ul style="padding-left: 18px; margin: 0 0 24px; color: #444444; line-height: 1.8; font-size: 15px;">
    <li>Highlight one important update</li>
    <li>Share one helpful detail</li>
    <li>Point readers to the next action</li>
  </ul>
  <a href="https://rarenp.com" style="display: inline-block; padding: 12px 18px; background: #ede9e1; color: #111827; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Read more</a>
</div>
</div>`,
  },
  template4: {
    name: "Colorful Creative",
    subject: "🎨 Creative Update from RARE",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #ffecd2 0%, #fcb69f 100%);">
<div style="padding: 50px 30px; text-align: center;">
  <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
  <h1 style="font-size: 32px; color: #2c2c2c; margin: 0 0 12px 0; font-weight: 700;">Something Special</h1>
  <p style="font-size: 16px; color: #555; margin: 0; line-height: 1.6;">We've curated something amazing for you</p>
</div>
<div style="background: white; margin: 20px; border-radius: 8px; padding: 30px; text-align: center;">
  <h3 style="font-size: 18px; color: #2c2c2c; margin: 0 0 12px 0;">Explore Now</h3>
  <p style="font-size: 14px; color: #666; margin: 0 0 20px 0;">[Add description here]</p>
  <a href="https://rarenp.com" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 13px;">Discover</a>
</div>
<div style="padding: 20px; text-align: center; font-size: 11px; color: rgba(44,44,44,0.6);">
  <p style="margin: 0;">© RARE Nepal 2026</p>
</div>
</div>`,
  },
  template5: {
    name: "Dark Luxe",
    subject: "Exclusive Access: Limited Edition Drop",
    html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #f0f0f0;">
<div style="padding: 50px 30px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); text-align: center; border-bottom: 3px solid #d4af37;">
  <div style="font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: #d4af37; margin-bottom: 16px;">Limited Edition</div>
  <h1 style="font-size: 36px; color: #f0f0f0; margin: 0; font-weight: 300;">RARE Exclusive</h1>
</div>
<div style="padding: 40px 30px; text-align: center;">
  <p style="font-size: 16px; color: #d4af37; margin: 0 0 12px 0; letter-spacing: 1px;">NOW AVAILABLE</p>
  <h2 style="font-size: 24px; color: #f0f0f0; margin: 0 0 20px 0; line-height: 1.4;">Members Get Early Access</h2>
  <p style="font-size: 14px; color: #b0b0b0; margin: 0 0 24px 0; line-height: 1.6;">Join our exclusive collection today</p>
  <a href="https://rarenp.com" style="display: inline-block; padding: 14px 40px; border: 2px solid #d4af37; color: #d4af37; text-decoration: none; font-weight: 600; letter-spacing: 1px; font-size: 12px;">UNLOCK ACCESS</a>
</div>
<div style="background: #0a0a0a; padding: 24px; text-align: center; border-top: 1px solid #333; font-size: 11px; color: #666;">
  <p style="margin: 0;">Unsubscribe • Contact • Website</p>
</div>
</div>`,
  },
  template6: {
    name: "Professional Campaign",
    subject: "Important Update: Q1 2026 Business Highlights",
    html: `<div style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #2c3e50;">
<div style="background: linear-gradient(90deg, #34495e 0%, #2c3e50 100%); padding: 40px 30px; text-align: left;">
  <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #ecf0f1; margin-bottom: 8px; font-weight: 600;">RARE NEPAL</div>
  <h1 style="font-size: 28px; color: #ecf0f1; margin: 0; font-weight: 400; letter-spacing: 0.5px;">Business Update</h1>
</div>
<div style="padding: 40px 30px;">
  <h2 style="font-size: 20px; color: #2c3e50; margin: 0 0 16px 0; font-weight: 500;">Dear Valued Partner,</h2>
  <p style="font-size: 14px; color: #34495e; line-height: 1.8; margin: 0 0 20px 0;">We are pleased to share the highlights and key metrics from our operations this quarter.</p>
  <div style="background: #ecf0f1; border-left: 4px solid #34495e; padding: 20px; margin: 24px 0; border-radius: 4px;">
    <p style="font-size: 13px; color: #2c3e50; margin: 0; font-weight: 500;">📊 Key Metrics</p>
    <p style="font-size: 12px; color: #34495e; margin: 12px 0 0 0; line-height: 1.6;">• Revenue Growth: [+X%]<br>• Customer Satisfaction: [+X%]<br>• Market Expansion: [Details]</p>
  </div>
  <p style="font-size: 14px; color: #34495e; line-height: 1.8; margin: 24px 0;">We continue our commitment to excellence and innovation in the global marketplace.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://rarenp.com" style="display: inline-block; padding: 12px 32px; background: #34495e; color: #ecf0f1; text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 4px; letter-spacing: 0.5px;">VIEW FULL REPORT</a>
  </div>
</div>
<div style="background: #34495e; padding: 24px 30px; text-align: center; font-size: 11px; color: #bdc3c7;">
  <p style="margin: 0;">© 2026 RARE Nepal Ltd. All rights reserved.</p>
  <p style="margin: 8px 0 0 0;">This is an official business communication.</p>
</div>
</div>`,
  },
  template7: {
    name: "Minimalist News",
    subject: "The Weekly Edit — Perspective and Insights",
    html: `<div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #111;">
<header style="border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
  <h1 style="font-size: 18px; font-weight: 600; margin: 0;">RARE WEEKLY</h1>
</header>
<main>
  <h2 style="font-size: 24px; line-height: 1.3; margin-bottom: 15px;">Minimalism in Design: A New Era</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #444; margin-bottom: 25px;">Exploring the intersection of function and form in modern architecture and fashion...</p>
  <div style="background: #f9f9f9; padding: 20px; margin-bottom: 25px;">
    <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 10px;">Featured</h3>
    <p style="font-size: 15px; margin: 0;">Exclusive interview with Lead Designer Sarah Chen on the future of sustainable fabrics.</p>
  </div>
  <a href="#" style="color: #111; font-weight: 600; text-decoration: underline;">Read the full story</a>
</main>
<footer style="margin-top: 50px; color: #888; font-size: 12px;">
  <p>© 2026 RARE. All rights reserved.</p>
</footer>
</div>`,
  },
  template8: {
    name: "Season's Greetings",
    subject: "Warm Wishes from the RARE Atelier team",
    html: `<div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; background: #fffcf5; color: #4a3728; border: 15px solid #4a3728; padding: 40px;">
<div style="text-align: center;">
  <div style="font-size: 40px; margin-bottom: 20px;">🌿</div>
  <h1 style="font-size: 32px; letter-spacing: 2px; margin-bottom: 30px;">HOLIDAY GREETINGS</h1>
  <p style="font-size: 18px; font-style: italic; line-height: 1.6; margin-bottom: 40px;">"The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart."</p>
  <div style="border-top: 1px solid #4a3728; border-bottom: 1px solid #4a3728; padding: 20px 0; margin-bottom: 40px;">
    <p style="font-size: 14px; letter-spacing: 1px; margin: 0;">THANK YOU FOR A WONDERFUL YEAR</p>
  </div>
  <p style="font-size: 16px; margin-bottom: 30px;">We're taking a short break to reflect and recharge. See you in the New Year!</p>
  <div style="font-family: 'Sacramento', cursive; font-size: 24px;">The RARE Team</div>
</div>
</div>`,
  },
} as const;

export default function AdminMarketingPage() {
  const { toast, success, error, warning } = useToast();
  const queryClient = useQueryClient();

  type MarketingCustomerEmail = { email: string };
  type MarketingCustomerPhone = {
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
  };
  type MarketingAnalyticsData = {
    totalReach: number;
    newsletterSubscribers: number;
    customerEmails: number;
    smsReachableCustomers: number;
    interactions30d: number;
    totalOrders30d: number;
    interactionRatePct: number;
    revenue30d: number;
    deliveryUpdates30d: number;
  };
  type MarketingChannelStatusData = {
    smtp: {
      configured: boolean;
      missing: string[];
    };
    sms: {
      provider: string;
      configured: boolean;
      missing: string[];
    };
    notes: {
      orderCheckoutEmails: boolean;
      orderStatusEmails: boolean;
    };
  };
  type BroadcastRecipient = { email: string; source: "newsletter" | "customer" };

  const [marketingSubject, setMarketingSubject] = useState<string>(emailTemplates.template5.subject);
  const [marketingBody, setMarketingBody] = useState<string>(emailTemplates.template5.html);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [newSubscriberEmail, setNewSubscriberEmail] = useState("");
  const [showSplitEditor, setShowSplitEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template5");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBroadcastConfirmOpen, setIsBroadcastConfirmOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [isIncludeAllSmsTargets, setIsIncludeAllSmsTargets] = useState(true);

  const [includeCustomers, setIncludeCustomers] = useState(true);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const tpl = emailTemplates[selectedTemplate as keyof typeof emailTemplates];
    if (tpl) {
      setMarketingSubject(tpl.subject);
      setMarketingBody(tpl.html);
    }
  }, []);

  const subscribersQuery = useQuery<{ success: boolean; data: { email: string; createdAt: string }[] }>({
    queryKey: ["admin", "newsletter", "subscribers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/newsletter/subscribers");
      return res.json();
    },
  });

  const customersQuery = useQuery<MarketingCustomerEmail[]>({
    queryKey: ["admin", "customers", "emails"],
    enabled: includeCustomers,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/customers/emails");
      const json = await res.json();
      return json.data;
    },
  });

  const customerPhonesQuery = useQuery<MarketingCustomerPhone[]>({
    queryKey: ["admin", "customers", "phones"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/customers/phones");
      const json = await res.json();
      return json.data;
    },
  });

  const marketingAnalyticsQuery = useQuery<MarketingAnalyticsData>({
    queryKey: ["admin", "marketing", "analytics", "30d"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/marketing/analytics");
      const json = await res.json();
      return json.data;
    },
  });

  const channelStatusQuery = useQuery<MarketingChannelStatusData>({
    queryKey: ["admin", "marketing", "channels", "status"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/marketing/channels/status");
      const json = await res.json();
      return json.data;
    },
  });

  const subscribers = subscribersQuery.data?.data ?? [];
  const customers = customersQuery.data ?? [];
  const customerPhones = customerPhonesQuery.data ?? [];
  const marketingAnalytics = marketingAnalyticsQuery.data;
  const channelStatus = channelStatusQuery.data;
  const smtpConfigured = channelStatus?.smtp.configured ?? false;
  const smsConfigured = channelStatus?.sms.configured ?? false;
  
  const newsletterEmailSet = useMemo(
    () => new Set(subscribers.map((subscriber) => subscriber.email.toLowerCase())),
    [subscribers],
  );

  const allSubscribers = useMemo(() => {
    const unique = new Map<string, BroadcastRecipient>();
    subscribers.forEach((subscriber) => {
      const email = subscriber.email.trim().toLowerCase();
      if (!email) return;
      unique.set(email, { email, source: "newsletter" });
    });

    if (includeCustomers) {
      customers.forEach((customer) => {
        const email = customer.email.trim().toLowerCase();
        if (!email || unique.has(email)) return;
        unique.set(email, { email, source: "customer" });
      });
    }

    return Array.from(unique.values());
  }, [subscribers, customers, includeCustomers]);

  const filteredSubscribers = useMemo(() => 
    allSubscribers.filter(s => s.email.toLowerCase().includes(subscriberSearch.toLowerCase())),
    [allSubscribers, subscriberSearch]
  );

  const visibleRecipientEmails = useMemo(
    () => filteredSubscribers.map((subscriber) => subscriber.email),
    [filteredSubscribers],
  );

  const selectedNewsletterEmails = useMemo(
    () =>
      Array.from(selectedRecipientEmails).filter((email) =>
        newsletterEmailSet.has(email.toLowerCase()),
      ),
    [selectedRecipientEmails, newsletterEmailSet],
  );

  const selectedRecipientCount = selectedRecipientEmails.size;

  const allPhoneTargets = useMemo(
    () =>
      Array.from(
        new Set(
          customerPhones
            .map((entry) => entry.phoneNumber?.trim())
            .filter((phone): phone is string => !!phone),
        ),
      ),
    [customerPhones],
  );
  const smsRecipientCount = isIncludeAllSmsTargets
    ? allPhoneTargets.length
    : selectedPhoneNumbers.size;

  useEffect(() => {
    setSelectedRecipientEmails((prev) => {
      const available = new Set(allSubscribers.map((subscriber) => subscriber.email));
      if (available.size === 0) return new Set();
      if (prev.size === 0) return new Set(available);

      const next = new Set<string>();
      prev.forEach((email) => {
        if (available.has(email)) next.add(email);
      });
      return next;
    });
  }, [allSubscribers]);

  useEffect(() => {
    setSelectedPhoneNumbers((prev) => {
      if (allPhoneTargets.length === 0) return new Set();
      if (prev.size === 0) return new Set(allPhoneTargets);
      const available = new Set(allPhoneTargets);
      const next = new Set<string>();
      prev.forEach((phone) => {
        if (available.has(phone)) next.add(phone);
      });
      return next;
    });
  }, [allPhoneTargets]);

  const interactionRate =
    marketingAnalytics?.interactionRatePct ??
    (allSubscribers.length > 0
      ? Number(((marketingAnalytics?.interactions30d ?? 0) / allSubscribers.length * 100).toFixed(2))
      : 0);

  const stats = useMemo(
    () => [
      {
        label: "Total Reach",
        value: marketingAnalytics?.totalReach ?? allSubscribers.length,
        icon: Mail,
        color:
          "from-[#F3E8FF] via-[#E9D5FF] to-[#DDD6FE] dark:from-[#2E1A45] dark:via-[#4A2771] dark:to-[#6334A0]",
        iconClass: "text-violet-700 dark:text-violet-200",
        valueClass: "text-violet-950 dark:text-violet-50",
      },
      {
        label: "Interactions (30d)",
        value: marketingAnalytics?.interactions30d ?? 0,
        icon: Activity,
        color:
          "from-[#DCFCE7] via-[#BBF7D0] to-[#86EFAC] dark:from-[#183C2D] dark:via-[#226746] dark:to-[#2FA95D]",
        iconClass: "text-emerald-700 dark:text-emerald-200",
        valueClass: "text-emerald-950 dark:text-emerald-50",
      },
      {
        label: "Interaction Rate",
        value: `${interactionRate.toFixed(2)}%`,
        icon: MessageSquare,
        color:
          "from-[#DBEAFE] via-[#BFDBFE] to-[#93C5FD] dark:from-[#172C4F] dark:via-[#224579] dark:to-[#2C63AC]",
        iconClass: "text-blue-700 dark:text-blue-200",
        valueClass: "text-blue-950 dark:text-blue-50",
      },
      {
        label: "Order Revenue (30d)",
        value: `Rs ${Number(marketingAnalytics?.revenue30d ?? 0).toLocaleString("en-NP")}`,
        icon: BarChart3,
        color:
          "from-[#FFEDD5] via-[#FED7AA] to-[#FDBA74] dark:from-[#4A2A16] dark:via-[#7A431E] dark:to-[#A85A25]",
        iconClass: "text-orange-700 dark:text-orange-200",
        valueClass: "text-orange-950 dark:text-orange-50",
      },
    ],
    [allSubscribers.length, interactionRate, marketingAnalytics],
  );

  const addEmailMutation = useMutation({
    mutationFn: async () => {
      if (!newSubscriberEmail.trim()) throw new Error("Email is required");
      const result = await addNewsletterEmail(newSubscriberEmail);
      if (!result.success) throw new Error(result.message || "Failed to add email");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Email added successfully" });
      setNewSubscriberEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter", "subscribers"] });
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await deleteNewsletterEmail(email);
      if (!result.success) throw new Error(result.message || "Failed to delete email");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Email removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter", "subscribers"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const res = await apiRequest("POST", "/api/admin/newsletter/bulk-delete", {
        emails,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Bulk delete failed");
      return json as { success: boolean; deleted: number };
    },
    onSuccess: (result) => {
      toast({ title: `Deleted ${result.deleted} subscribers` });
      setSelectedRecipientEmails((prev) => {
        const next = new Set(prev);
        selectedNewsletterEmails.forEach((email) => next.delete(email));
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter", "subscribers"] });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk delete failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const result = await deleteAllNewsletterEmails();
      if (!result.success) throw new Error(result.message || "Failed to delete all subscribers");
      return result;
    },
    onSuccess: () => {
      toast({ title: "All newsletter subscribers removed" });
      setSelectedRecipientEmails((prev) => {
        const next = new Set(prev);
        subscribers.forEach((subscriber) => next.delete(subscriber.email.toLowerCase()));
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter", "subscribers"] });
    },
    onError: (err: Error) => {
      toast({ title: "Delete all failed", description: err.message, variant: "destructive" });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (payload: { subject: string; html: string; selectedEmails: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/marketing/broadcast", payload);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        success(`Broadcast sent`, `Sent to ${result.sent ?? result.count ?? 0} subscribers`);
        setIsBroadcastConfirmOpen(false);
      } else {
        error("Broadcast failed", result.error || "SMTP failed");
      }
    },
    onError: (err: Error) => {
      error("Broadcast failed", err.message);
    }
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (payload: { message: string; selectedNumbers?: string[]; sendToAll?: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/marketing/sms/send", payload);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        success("SMS sent", `Sent to ${result.sent ?? 0} recipients`);
        setSmsMessage("");
      } else {
        error("SMS failed", result.error || "Failed to send SMS");
      }
    },
    onError: (err: Error) => {
      error("SMS failed", err.message);
    },
  });
  
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = String(event.target?.result ?? "");
        const extractedEmails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
        const uniqueEmails = Array.from(new Set(extractedEmails.map((email) => email.toLowerCase())));

        if (uniqueEmails.length === 0) {
          toast({
            title: "Import failed",
            description: "No valid email addresses were found in the file.",
            variant: "destructive",
          });
          return;
        }

        const result = await importNewsletterEmails(uniqueEmails);
        toast({
          title: "Import complete",
          description: `Added ${result.added} of ${result.total} emails.`,
        });
        setIsImportDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["admin", "newsletter", "subscribers"] });
      } catch (err: any) {
        toast({
          title: "Import failed",
          description: err?.message || "Unable to import emails from the file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Marketing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build relationships and grow your community with tailored broadcasts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="h-9">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* 7.2: Marketing Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`cursor-default rounded-2xl border border-white/70 dark:border-white/10 bg-gradient-to-br p-6 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_34px_-22px_rgba(0,0,0,0.7)] transition-transform hover:scale-[1.02] ${stat.color} group`}
          >
            <div className="flex items-center justify-between">
              <stat.icon className={`h-5 w-5 transition-colors ${stat.iconClass}`} />
              <span className={`text-2xl font-bold tracking-tight ${stat.valueClass}`}>{stat.value}</span>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-black/70 dark:text-white/80">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-6 transition-all duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Subscribers
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Include Customers</span>
                <input 
                  type="checkbox" 
                  checked={includeCustomers} 
                  onChange={(e) => setIncludeCustomers(e.target.checked)}
                  className="h-3 w-3 rounded border-border"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Add email..." 
                value={newSubscriberEmail}
                onChange={(e) => setNewSubscriberEmail(e.target.value)}
                className="h-9"
              />
              <Button size="sm" onClick={() => addEmailMutation.mutate()} disabled={addEmailMutation.isPending}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={() => {
                    setSelectedRecipientEmails((prev) => {
                      const next = new Set(prev);
                      visibleRecipientEmails.forEach((email) => next.add(email));
                      return next;
                    });
                  }}
                  disabled={visibleRecipientEmails.length === 0}
                >
                  Select visible
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={() => setSelectedRecipientEmails(new Set(allSubscribers.map((s) => s.email)))}
                  disabled={allSubscribers.length === 0}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={() => setSelectedRecipientEmails(new Set())}
                  disabled={selectedRecipientCount === 0}
                >
                  Clear
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 text-[10px] max-sm:flex-1"
                  disabled={
                    bulkDeleteMutation.isPending ||
                    selectedNewsletterEmails.length === 0
                  }
                  onClick={() => bulkDeleteMutation.mutate(selectedNewsletterEmails)}
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Remove selected ({selectedNewsletterEmails.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 max-sm:flex-1"
                  disabled={deleteAllMutation.isPending || subscribers.length === 0}
                  onClick={() => {
                    const ok = window.confirm("Delete all newsletter subscribers?");
                    if (ok) deleteAllMutation.mutate();
                  }}
                >
                  Delete all
                </Button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-[#E5E5E0] dark:border-border rounded-xl">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E5E5E0] dark:divide-border">
                  {filteredSubscribers.map((s) => {
                    const isNewsletterSubscriber = s.source === "newsletter";
                    const isSelected = selectedRecipientEmails.has(s.email);
                    return (
                    <tr
                      key={s.email}
                      className={cn(
                        "transition-colors",
                        "cursor-pointer hover:bg-muted/10",
                        isSelected && "bg-emerald-50/70 dark:bg-emerald-950/20",
                      )}
                      onClick={() => {
                        setSelectedRecipientEmails((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.email)) next.delete(s.email);
                          else next.add(s.email);
                          return next;
                        });
                      }}
                    >
                      <td className="pl-3 pr-1 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedRecipientEmails((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(s.email);
                              else next.delete(s.email);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3 w-3 rounded border-border"
                          aria-label={`Select ${s.email} as recipient`}
                        />
                      </td>
                      <td className="px-4 py-2 truncate max-w-[150px]">
                        <div className="flex flex-col">
                          <span className="font-medium">{s.email}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{s.source}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isNewsletterSubscriber && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEmailMutation.mutate(s.email);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-6 transition-all duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Email Composer
              </h2>
              <select 
                value={selectedTemplate}
                onChange={(e) => {
                  const tpl = emailTemplates[e.target.value as keyof typeof emailTemplates];
                  setSelectedTemplate(e.target.value);
                  setMarketingSubject(tpl.subject);
                  setMarketingBody(tpl.html);
                }}
                className="text-xs border rounded-lg px-3 py-2 bg-white dark:bg-card cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                {Object.entries(emailTemplates).map(([key, t]) => (
                  <option key={key} value={key}>{t.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".html,.htm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        setMarketingBody(content);
                        toast({ title: "Template uploaded" });
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="hidden"
                  id="template-upload"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => document.getElementById("template-upload")?.click()}
                  className="h-8 text-[10px]"
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Upload HTML
                </Button>
              </div>
            </div>

            <Input 
              placeholder="Subject Line" 
              value={marketingSubject}
              onChange={(e) => setMarketingSubject(e.target.value)}
              className="h-10"
            />

            <AdvancedEmailEditor
              htmlContent={marketingBody}
              onHtmlChange={setMarketingBody}
              showSplitView={showSplitEditor}
              onSplitViewChange={setShowSplitEditor}
            />

            <div className="flex justify-between items-center">
              <p className="text-[11px] text-muted-foreground">
                Broadcast will be sent only to selected recipients in the Subscribers list.
              </p>
              <Button 
                className="bg-[#2C3E2D] hover:bg-[#2C3E2D]/90"
                onClick={() => {
                  if (selectedRecipientCount === 0) {
                    warning("No recipients selected", "Please select at least one subscriber.");
                    return;
                  }
                  setIsBroadcastConfirmOpen(true);
                }}
                disabled={
                  !marketingSubject.trim() ||
                  !marketingBody.trim() ||
                  selectedRecipientCount === 0
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Broadcast to {selectedRecipientCount}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Marketing Analytics (Last 30 Days)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Total Reach</p>
              <p className="text-lg font-semibold">{marketingAnalytics?.totalReach ?? allSubscribers.length}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Interactions</p>
              <p className="text-lg font-semibold">{marketingAnalytics?.interactions30d ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Orders</p>
              <p className="text-lg font-semibold">{marketingAnalytics?.totalOrders30d ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Delivery Updates</p>
              <p className="text-lg font-semibold">{marketingAnalytics?.deliveryUpdates30d ?? 0}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Newsletter subscribers: {marketingAnalytics?.newsletterSubscribers ?? subscribers.length}</p>
            <p>Customer emails: {marketingAnalytics?.customerEmails ?? customers.length}</p>
            <p>SMS reachable customers: {marketingAnalytics?.smsReachableCustomers ?? allPhoneTargets.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Channel Controls (SMTP + SMS)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-[11px] uppercase text-muted-foreground">SMTP Email</p>
              <p className="text-sm font-medium">{smtpConfigured ? "Configured" : "Not configured"}</p>
              {!smtpConfigured && channelStatus?.smtp?.missing?.length ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Missing: {channelStatus.smtp.missing.join(", ")}
                </p>
              ) : null}
              <p className="text-[11px] text-muted-foreground mt-1">
                Used on checkout, order confirmation, and order status updates.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3">
              <p className="text-[11px] uppercase text-muted-foreground">SMS ({channelStatus?.sms?.provider ?? "twilio"})</p>
              <p className="text-sm font-medium">{smsConfigured ? "Configured" : "Not configured"}</p>
              {!smsConfigured && channelStatus?.sms?.missing?.length ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Missing: {channelStatus.sms.missing.join(", ")}
                </p>
              ) : null}
              <p className="text-[11px] text-muted-foreground mt-1">
                Add API keys later to enable live SMS delivery.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">SMS Recipients</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isIncludeAllSmsTargets}
                  onChange={(e) => setIsIncludeAllSmsTargets(e.target.checked)}
                  className="h-3 w-3 rounded border-border"
                />
                Send to all phone numbers
              </label>
            </div>

            <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
              {customerPhones.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No customer phone numbers found.</p>
              ) : (
                customerPhones.map((entry) => {
                  const phone = entry.phoneNumber?.trim();
                  if (!phone) return null;
                  const isChecked = selectedPhoneNumbers.has(phone);
                  return (
                    <label key={`${entry.email}-${phone}`} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/30">
                      <input
                        type="checkbox"
                        disabled={isIncludeAllSmsTargets}
                        checked={isIncludeAllSmsTargets ? true : isChecked}
                        onChange={(e) => {
                          setSelectedPhoneNumbers((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(phone);
                            else next.delete(phone);
                            return next;
                          });
                        }}
                        className="h-3 w-3 rounded border-border"
                      />
                      <span className="truncate">{phone}</span>
                      <span className="text-muted-foreground truncate">({entry.email})</span>
                    </label>
                  );
                })
              )}
            </div>

            <Input
              placeholder="SMS message"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              className="h-9"
            />

            <Button
              className="bg-[#2C3E2D] hover:bg-[#2C3E2D]/90"
              disabled={sendSmsMutation.isPending || !smsMessage.trim() || smsRecipientCount === 0}
              onClick={() => {
                if (!smsMessage.trim()) {
                  warning("Message is empty", "Please write an SMS message first.");
                  return;
                }
                if (smsRecipientCount === 0) {
                  warning("No SMS recipients", "Please select at least one phone number.");
                  return;
                }

                if (!smsConfigured) {
                  error(
                    "SMS not configured",
                    channelStatus?.sms?.missing?.length
                      ? `Missing: ${channelStatus.sms.missing.join(", ")}`
                      : "Please add SMS provider credentials first.",
                  );
                  return;
                }

                sendSmsMutation.mutate(
                  isIncludeAllSmsTargets
                    ? { message: smsMessage, sendToAll: true }
                    : { message: smsMessage, selectedNumbers: Array.from(selectedPhoneNumbers) },
                );
              }}
            >
              {sendSmsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send SMS to {smsRecipientCount}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isBroadcastConfirmOpen} onOpenChange={setIsBroadcastConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Broadcast?</DialogTitle>
            <DialogDescription>
              This will send the email to {selectedRecipientCount} recipient
              {selectedRecipientCount === 1 ? "" : "s"} immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastConfirmOpen(false)}>Cancel</Button>
            <Button 
              className="bg-[#2C3E2D]"
              onClick={() =>
                broadcastMutation.mutate({
                  subject: marketingSubject,
                  html: marketingBody,
                  selectedEmails: Array.from(selectedRecipientEmails),
                })
              }
              loading={broadcastMutation.isPending}
              loadingText="Sending..."
            >
              Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Subscribers</DialogTitle>
            <DialogDescription>
              Upload a .txt or .csv file with one email per line.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="file" accept=".txt,.csv" onChange={handleImportFile} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
