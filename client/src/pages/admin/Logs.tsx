import { Terminal, Shield, Activity, Clock } from "lucide-react";
import SecuritySection from "@/components/admin/SecuritySection";

export default function AdminLogsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Security Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of application security and access logs.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6">
        <SecuritySection />
      </div>
    </div>
  );
}
