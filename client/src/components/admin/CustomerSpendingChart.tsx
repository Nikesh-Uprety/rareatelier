import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Area,
  ReferenceLine,
} from "recharts";
import type { AdminCustomer } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewMode = "orders" | "revenue";
type TimeRange = "1w" | "1m" | "all";

interface CustomerSpendingChartProps {
  customers: AdminCustomer[];
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1w": "1 Week",
  "1m": "1 Month",
  all: "All Time",
};

const BAR_GRADIENTS = [
  { from: "#2C5234", to: "#4ADE80" },
  { from: "#3B6B45", to: "#5CDB95" },
  { from: "#4A8456", to: "#6EE7A7" },
  { from: "#599D67", to: "#80F0B8" },
  { from: "#68B678", to: "#92F5C4" },
  { from: "#77CF89", to: "#A5FAD0" },
  { from: "#86E89A", to: "#B8FEDC" },
  { from: "#2C5234", to: "#4ADE80" },
  { from: "#3B6B45", to: "#5CDB95" },
  { from: "#4A8456", to: "#6EE7A7" },
  { from: "#599D67", to: "#80F0B8" },
  { from: "#68B678", to: "#92F5C4" },
  { from: "#77CF89", to: "#A5FAD0" },
  { from: "#86E89A", to: "#B8FEDC" },
  { from: "#2C5234", to: "#4ADE80" },
];

function CustomerAvatarTick({ x, y, payload, customers }: any) {
  const customer = customers.find((c: any) => c.id === payload?.value);
  if (!customer) return null;

  const displayName = `${customer.firstName} ${customer.lastName}`.trim() || customer.email || "Unknown";
  const displayLabel = customer.phoneNumber
    ? `${displayName} (${customer.phoneNumber})`
    : displayName;

  const avatarUrl = customer.profileImageUrl;
  const initials = `${customer.firstName?.[0] ?? ""}${customer.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-240} y={-12} width={230} height={24}>
        {/* @ts-expect-error foreignObject needs xmlns for SVG */}
        <div xmlns="http://www.w3.org/1999/xhtml" className="flex items-center gap-2 h-full">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-border"
              style={{ width: 20, height: 20 }}
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[8px] font-bold"
              style={{ width: 20, height: 20, backgroundColor: customer.avatarColor || "#2C5234" }}
            >
              {initials}
            </div>
          )}
          <span
            className="text-xs truncate"
            style={{ fontSize: 11, fill: "hsl(var(--foreground))", color: "hsl(var(--foreground))" }}
          >
            {displayLabel}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

const CustomTooltip = ({ active, payload, viewMode }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
      <div className="font-semibold mb-1">{data.name}</div>
      <div className="space-y-0.5">
        {viewMode === "revenue" ? (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium">{formatPrice(data.revenue)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Orders:</span>
              <span className="font-medium">{data.orders}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Orders:</span>
              <span className="font-medium">{data.orders}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium">{formatPrice(data.revenue)}</span>
            </div>
          </>
        )}
        {data.email && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium truncate max-w-[160px]">{data.email}</span>
          </div>
        )}
      </div>
    </div>
  );
};

function RangeBarChart({ data }: { data: any[] }) {
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 40, left: 240, bottom: 10 }}
      >
        <defs>
          {data.map((_, i) => (
            <linearGradient key={`grad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={BAR_GRADIENTS[i % BAR_GRADIENTS.length].from} stopOpacity={0.25} />
              <stop offset="100%" stopColor={BAR_GRADIENTS[i % BAR_GRADIENTS.length].to} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="[&_line]:stroke-border" />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => `${v}`}
          className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="id"
          axisLine={false}
          tickLine={false}
          tick={(props) => <CustomerAvatarTick {...props} customers={data} />}
          width={240}
        />
        <Tooltip
          content={<CustomTooltip viewMode="orders" />}
          cursor={{ fill: "rgba(128,128,128,0.08)" }}
        />
        {/* Background track bar (full range) */}
        <Bar
          dataKey="orders"
          radius={[0, 8, 8, 0]}
          barSize={22}
        >
          {data.map((_, index) => (
            <Cell key={`track-${index}`} fill="hsl(var(--muted))" opacity={0.3} />
          ))}
        </Bar>
        {/* Value bar with gradient (range bar style) */}
        <Bar
          dataKey="orders"
          radius={[0, 8, 8, 0]}
          barSize={22}
        >
          {data.map((d, index) => (
            <Cell
              key={`bar-${index}`}
              fill={`url(#barGrad-${index})`}
              width={(d.orders / maxOrders) * 100 + "%"}
            />
          ))}
        </Bar>
        {/* Revenue sparkline overlay */}
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#d4a843"
          strokeWidth={2}
          fill="rgba(212,168,67,0.06)"
          yAxisId="right"
          dot={{ r: 3, fill: "#d4a843", stroke: "hsl(var(--card))", strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: "#d4a843", stroke: "hsl(var(--card))", strokeWidth: 2 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          type="number"
          hide
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function CustomerSpendingChart({ customers }: CustomerSpendingChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue");
  const [timeRange, setTimeRange] = useState<TimeRange>("1w");

  const chartData = useMemo(() => {
    const normalized = new Map<string, AdminCustomer>();
    customers.forEach((customer) => {
      const first = (customer.firstName ?? "").trim();
      const last = (customer.lastName ?? "").trim();
      const nameKey = `${first} ${last}`.trim().toLowerCase();
      const emailKey = (customer.email ?? "").trim().toLowerCase();
      const phoneKey = (customer.phoneNumber ?? "").trim().replace(/\s+/g, "");
      const key = nameKey || emailKey || phoneKey || customer.id;

      if ((customer.orderCount ?? 0) <= 0) return;

      const existing = normalized.get(key);
      if (!existing) {
        normalized.set(key, customer);
        return;
      }

      const existingOrders = existing.orderCount ?? 0;
      const candidateOrders = customer.orderCount ?? 0;
      const existingRevenue = Number(existing.totalSpent ?? 0);
      const candidateRevenue = Number(customer.totalSpent ?? 0);

      if (
        candidateOrders > existingOrders ||
        (candidateOrders === existingOrders && candidateRevenue > existingRevenue)
      ) {
        normalized.set(key, customer);
      }
    });

    const sorted = Array.from(normalized.values()).sort((a, b) =>
      viewMode === "revenue"
        ? Number(b.totalSpent) - Number(a.totalSpent)
        : b.orderCount - a.orderCount,
    );

    const displayCustomers = sorted.slice(0, 15);

    return displayCustomers.map((c, i) => {
      const name = `${c.firstName} ${c.lastName}`.trim() || c.email || `Customer ${i + 1}`;
      return {
        id: c.id,
        name,
        orders: c.orderCount,
        revenue: Number(c.totalSpent),
        email: c.email,
        phoneNumber: c.phoneNumber,
        profileImageUrl: c.profileImageUrl,
        avatarColor: c.avatarColor,
        firstName: c.firstName,
        lastName: c.lastName,
      };
    }).reverse();
  }, [customers, viewMode]);

  const valueFormatter = (value: number | null) =>
    value !== null ? (viewMode === "revenue" ? formatPrice(value) : `${value}`) : "";

  if (chartData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-2xl border border-[#E5E5E0] bg-white dark:border-border dark:bg-card">
        <p className="text-sm text-muted-foreground">No customer data to display yet.</p>
      </div>
    );
  }

  const chartHeight = Math.max(400, chartData.length * 40);

  return (
    <div className="rounded-2xl border border-[#E5E5E0] bg-white p-5 dark:border-border dark:bg-card">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Customer Leaderboard
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {TIME_RANGE_LABELS[timeRange]} · {chartData.length} customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#E5E5E0] dark:border-border overflow-hidden">
            {(["1w", "1m", "all"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-2.5 py-1.5 text-[10px] font-medium transition-colors uppercase tracking-wider",
                  timeRange === range
                    ? "bg-[#2C5234] text-white"
                    : "bg-white text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-muted",
                )}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-[#E5E5E0] dark:border-border overflow-hidden">
            <button
              onClick={() => setViewMode("revenue")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "revenue"
                  ? "bg-[#2C5234] text-white"
                  : "bg-white text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-muted",
              )}
            >
              By Revenue
            </button>
            <button
              onClick={() => setViewMode("orders")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors border-l border-[#E5E5E0] dark:border-border",
                viewMode === "orders"
                  ? "bg-[#2C5234] text-white"
                  : "bg-white text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-muted",
              )}
            >
              By Orders
            </button>
          </div>
        </div>
      </div>

      <div className="w-full" style={{ height: chartHeight }}>
        {viewMode === "orders" ? (
          <RangeBarChart data={chartData} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 40, left: 240, bottom: 10 }}
            >
              <defs>
                {chartData.map((_, i) => (
                  <linearGradient key={`revGrad-${i}`} id={`revGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={BAR_GRADIENTS[i % BAR_GRADIENTS.length].from} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={BAR_GRADIENTS[i % BAR_GRADIENTS.length].to} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="[&_line]:stroke-border" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={valueFormatter}
                className="[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="id"
                axisLine={false}
                tickLine={false}
                tick={(props) => <CustomerAvatarTick {...props} customers={chartData} />}
                width={240}
              />
              <Tooltip
                content={<CustomTooltip viewMode="revenue" />}
                cursor={{ fill: "rgba(128,128,128,0.08)" }}
              />
              <Bar
                dataKey="revenue"
                radius={[0, 8, 8, 0]}
                barSize={22}
              >
                {chartData.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={`url(#revGrad-${index})`} />
                ))}
              </Bar>
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#d4a843"
                strokeWidth={2}
                fill="rgba(212,168,67,0.06)"
                yAxisId="right"
                dot={{ r: 3, fill: "#d4a843", stroke: "hsl(var(--card))", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#d4a843", stroke: "hsl(var(--card))", strokeWidth: 2 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                type="number"
                hide
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
