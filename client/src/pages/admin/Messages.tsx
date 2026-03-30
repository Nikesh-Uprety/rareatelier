import { Headset, MailCheck } from "lucide-react";
import MessagesSection from "@/components/admin/MessagesSection";

export default function AdminMessagesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-2xl border border-[#E5E5E0] bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
              Customer Care
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View all customer inquiries in one place and send replies quickly.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <Headset className="h-3.5 w-3.5" />
            Customer Support Inbox
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <MailCheck className="h-4 w-4" />
          Open a message to mark it as read, then reply directly from the same workspace.
        </div>
      </div>

      <MessagesSection />
    </div>
  );
}
