import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchAnalytics, type AdminAnalytics } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";

const COLORS = ["#2C5234", "#557B5A", "#A3B8A6", "#E5E5E0"];

export default function AdminAnalytics() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const { data, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ["admin", "analytics", range],
    queryFn: () => fetchAnalytics(range),
  });

  const barData = useMemo(
    () =>
      data?.revenueByDay.map((d) => ({
        name: d.date.slice(5), // MM-DD
        value: d.revenue,
      })) ?? [],
    [data],
  );

  const pieData = data?.salesByCategory ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            {range === "7d"
              ? "Last 7 days"
              : range === "30d"
                ? "Last 30 days"
                : range === "90d"
                  ? "Last 90 days"
                  : "Last year"}{" "}
            — live data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(["7d", "30d", "90d", "1y"] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              className="bg-white dark:bg-card border-[#E5E5E0] dark:border-border text-[#2C3E2D] dark:text-foreground"
              onClick={() => setRange(r)}
            >
              {r === "7d"
                ? "7 days"
                : r === "30d"
                  ? "30 days"
                  : r === "90d"
                    ? "90 days"
                    : "1 year"}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6 space-y-3"
            >
              <div className="h-3 w-24 bg-muted animate-pulse" />
              <div className="h-7 w-20 bg-muted animate-pulse" />
              <div className="h-3 w-32 bg-muted animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                Revenue
              </div>
              <div className="text-3xl font-serif font-medium mb-2">
                {formatPrice(data.totalRevenue)}
              </div>
              <div className="flex items-center text-sm font-medium text-[#2C5234] dark:text-green-400">
                <ArrowUp className="w-3 h-3 mr-1" /> Live
              </div>
            </div>

            <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                Orders
              </div>
              <div className="text-3xl font-serif font-medium mb-2">
                {data.totalOrders}
              </div>
              <div className="flex items-center text-sm font-medium text-[#2C5234] dark:text-green-400">
                <ArrowUp className="w-3 h-3 mr-1" /> Live
              </div>
            </div>

            <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                Avg. Order Value
              </div>
              <div className="text-3xl font-serif font-medium mb-2">
                {formatPrice(data.avgOrderValue)}
              </div>
              <div className="flex items-center text-sm font-medium text-[#2C5234] dark:text-green-400">
                <ArrowUp className="w-3 h-3 mr-1" /> Live
              </div>
            </div>

            <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                New Customers
              </div>
              <div className="text-3xl font-serif font-medium mb-2">
                {data.newCustomers}
              </div>
              <div className="flex items-center text-sm font-medium text-[#9A2D2D] dark:text-red-400">
                <ArrowDown className="w-3 h-3 mr-1" /> Live
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6 lg:col-span-2">
          <h3 className="font-serif font-medium text-lg mb-1">
            Revenue Over Time
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Daily revenue for this period
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#888" }}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="value" fill="#557B5A" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border p-6">
          <h3 className="font-serif font-medium text-lg mb-1">
            Sales by Category
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Revenue share this period
          </p>
          <div className="h-40 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((entry, index) => (
              <div
                key={entry.category}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="text-muted-foreground">
                    {entry.category}
                  </span>
                </div>
                <span className="font-medium">
                  {entry.percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}