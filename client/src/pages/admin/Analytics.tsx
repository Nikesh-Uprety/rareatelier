/**
 * AdminAnalytics.tsx — RARE.NP "Antigravity" redesign
 * Requires: Syne + DM Mono fonts in index.html, --ag-* CSS vars in index.css
 * Dark mode: toggled via .dark class on <html> (Tailwind darkMode: 'class')
 */

import { ExportButton } from "@/components/admin/ExportButton";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deletePlatform,
  exportAnalyticsCSV,
  fetchAnalytics,
  fetchAnalyticsCalendar,
  fetchPlatforms,
  upsertPlatform,
  type AdminAnalytics,
  type AdminAnalyticsCalendarDay,
  type AdminPlatform,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type RangeKey = "7d" | "30d" | "90d" | "1y";
type CalendarView = "year" | "month";

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
};

const PAYMENT_LABELS: Record<string, string> = {
  esewa: "eSewa",
  cash_on_delivery: "COD",
  card: "Card",
  bank_transfer: "Bank",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSafeNum(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g,"");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

function formatTrend(value: number): { label: string; isPositive: boolean } {
  const val = toSafeNum(value);
  if (!Number.isFinite(val) || val === 0)
    return { label: "0%", isPositive: true };
  const rounded = Math.round(val);
  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    isPositive: rounded >= 0,
  };
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────

const AgTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--ag-bg2)",
        border: "0.5px solid var(--ag-border2)",
        borderRadius: 10,
        padding: "8px 12px",
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: "var(--ag-text)",
        boxShadow: "0 4px 24px rgba(0,0,0,.10)",
      }}
    >
      {label && (
        <div style={{ color: "var(--ag-text3)", marginBottom: 4 }}>{label}</div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color ?? "var(--ag-text)", marginBottom: 2 }}>
          {formatter ? formatter(p) : `${p.name}: ${p.value}`}
        </div>
      ))}
    </div>
  );
};

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useAnalytics(range: RangeKey) {
  return useQuery<AdminAnalytics>({
    queryKey: ["admin", "analytics", range],
    queryFn: () => fetchAnalytics(range),
  });
}

function useAnalyticsCalendar(year: number) {
  return useQuery<AdminAnalyticsCalendarDay[]>({
    queryKey: ["admin", "analytics", "calendar", year],
    queryFn: () => fetchAnalyticsCalendar(year),
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skel = ({ w = "100%", h = 16 }: { w?: string | number; h?: number }) => (
  <div
    className="animate-pulse rounded-lg"
    style={{ width: w, height: h, background: "var(--ag-bg4)" }}
  />
);

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "var(--ag-bg2)",
  border: "0.5px solid var(--ag-border)",
  borderRadius: 14,
  padding: 16,
  position: "relative",
  overflow: "hidden",
};

const monoLabel: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.14em",
  color: "var(--ag-text3)",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 4,
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ag-text2)",
  letterSpacing: "0.05em",
  marginBottom: 12,
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPI_ACCENT: Record<number, string> = {
  0: "var(--ag-green)",
  1: "var(--ag-amber)",
  2: "var(--ag-blue)",
  3: "var(--ag-purple)",
};

const SPARK_COLOR: Record<number, string> = {
  0: "#39e88e",
  1: "#f5a623",
  2: "#5b8def",
  3: "#9b7cf8",
};

function KpiCard({
  label, value, trend, subtitle, sparkData, idx, isLoading,
}: {
  label: string; value: string; trend: number; subtitle: string;
  sparkData: number[]; idx: number; isLoading: boolean;
}) {
  const trendInfo = formatTrend(trend);
  const TrendIcon = trendInfo.isPositive ? ArrowUpRight : ArrowDownRight;
  const accent = KPI_ACCENT[idx];
  const sparkColor = SPARK_COLOR[idx];

  return (
    <div style={{ ...card, borderTop: `2px solid ${accent}44` }}>
      {isLoading ? (
        <div className="space-y-3">
          <Skel w={80} h={10} />
          <Skel w={120} h={28} />
          <Skel w={90} h={10} />
        </div>
      ) : (
        <>
          <span style={monoLabel}>{label}</span>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 26, fontWeight: 700,
            letterSpacing: "-0.5px", lineHeight: 1,
            color: "var(--ag-text)", margin: "6px 0 6px",
          }}>
            {value}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11,
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 7px", borderRadius: 20,
              background: trendInfo.isPositive ? "var(--ag-green-l)" : "var(--ag-red-l)",
              color: trendInfo.isPositive ? "var(--ag-green)" : "var(--ag-red)",
            }}>
              <TrendIcon size={11} />
              {trendInfo.label}
            </span>
            <span style={{
              fontSize: 10, color: "var(--ag-text3)",
              fontFamily: "'DM Mono', monospace",
            }}>
              {subtitle}
            </span>
          </div>
          <div style={{ marginTop: 8, marginLeft: -4, marginRight: -4 }}>
            <AreaChart width={200} height={38} data={sparkData.map((v) => ({ v }))}>
              <defs>
                <linearGradient id={`spark-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={sparkColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v"
                stroke={sparkColor} strokeWidth={1.5}
                fill={`url(#spark-${idx})`} dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [range, setRange] = useState<RangeKey>("30d");
  const { data, isLoading } = useAnalytics(range);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarView, setCalendarView] = useState<CalendarView>("year");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const { data: calendar, isLoading: isCalendarLoading } = useAnalyticsCalendar(calendarYear);

  const queryClient = useQueryClient();
  const { data: platforms = [] } = useQuery<AdminPlatform[]>({
    queryKey: ["admin", "platforms"],
    queryFn: fetchPlatforms,
  });
  const upsertPlatformMutation = useMutation({
    mutationFn: upsertPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "platforms"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
  const deletePlatformMutation = useMutation({
    mutationFn: deletePlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "platforms"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
  const [newPlatformKey, setNewPlatformKey] = useState("");
  const [newPlatformLabel, setNewPlatformLabel] = useState("");

  // ── Derived data ─────────────────────────────────────────────────────────

  const combinedByDay = useMemo(() => {
    const revenueByDate = new Map((data?.revenueByDay ?? []).map((d) => [d.date, toSafeNum(d.revenue)] as const));
    const ordersByDate  = new Map((data?.ordersByDay   ?? []).map((d) => [d.date, toSafeNum(d.count)]   as const));
    const custByDate    = new Map((data?.newCustomersByDay ?? []).map((d) => [d.date, toSafeNum(d.count)] as const));
    const allDates = Array.from(new Set([
      ...(data?.revenueByDay ?? []).map((d) => d.date),
      ...(data?.ordersByDay  ?? []).map((d) => d.date),
      ...(data?.newCustomersByDay ?? []).map((d) => d.date),
    ])).sort();
    return allDates.map((date) => {
      const revenue = revenueByDate.get(date) ?? 0;
      const orders  = ordersByDate.get(date)  ?? 0;
      const newCustomers = custByDate.get(date) ?? 0;
      return { date, label: date.slice(5), revenue, orders, newCustomers, aov: orders > 0 ? revenue / orders : 0 };
    });
  }, [data]);

  const ordersStatusData = useMemo(() => {
    if (!data) return [];
    return [
      { status: "Completed", key: "completed", value: toSafeNum(data.ordersByStatus.completed), color: "var(--ag-green)", hex: "#39e88e" },
      { status: "Pending",   key: "pending",   value: toSafeNum(data.ordersByStatus.pending),   color: "var(--ag-amber)", hex: "#f5a623" },
      { status: "Cancelled", key: "cancelled", value: toSafeNum(data.ordersByStatus.cancelled), color: "var(--ag-red)",   hex: "#ff4d4d" },
    ];
  }, [data]);

  const paymentMethodsData = useMemo(() => {
    if (!data) return [];
    return data.paymentMethods.map((m) => ({
      method: PAYMENT_LABELS[m.method] ?? m.method,
      count: toSafeNum(m.count), percent: toSafeNum(m.percent),
    }));
  }, [data]);

  const ordersByDayOfWeekData = useMemo(
    () => data?.ordersByDayOfWeek.map((d) => ({ day: d.day, count: toSafeNum(d.count) })) ?? [],
    [data],
  );

  // ── Calendar ────────────────────────────────────────────────────────────

  const calendarLayout = useMemo(() => {
    if (!calendar || calendar.length === 0) return null;
    const startDate = new Date(calendar[0].date);
    const getWeekIndex = (date: Date) =>
      Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const cells = calendar.map((day) => {
      const dateObj = new Date(day.date);
      return { ...day, revenue: toSafeNum(day.revenue), weekIndex: getWeekIndex(dateObj), weekday: (dateObj.getDay() + 6) % 7 };
    });
    const weeksCount = cells.length > 0 ? Math.max(...cells.map((c) => c.weekIndex)) + 1 : 0;
    const monthLabels: { weekIndex: number; label: string }[] = [];
    const seenMonths = new Set<string>();
    for (const cell of cells) {
      const dateObj = new Date(cell.date);
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
      if (!seenMonths.has(key) && cell.weekday === 0) {
        seenMonths.add(key);
        monthLabels.push({ weekIndex: cell.weekIndex, label: dateObj.toLocaleString("default", { month: "short" }) });
      }
    }
    const revenues = cells.map((c) => c.revenue).filter((v) => v > 0);
    return { cells, weeksCount, monthLabels, maxRevenue: revenues.length ? Math.max(...revenues) : 0 };
  }, [calendar]);

  const monthLayout = useMemo(() => {
    if (!calendarLayout) return null;
    const start = new Date(calendarYear, calendarMonth, 1);
    const end   = new Date(calendarYear, calendarMonth + 1, 1);
    const startMonday = new Date(start);
    startMonday.setDate(startMonday.getDate() - ((startMonday.getDay() + 6) % 7));
    const endSunday = new Date(end);
    endSunday.setDate(endSunday.getDate() + (6 - ((endSunday.getDay() + 6) % 7)));
    const byDate = new Map(calendarLayout.cells.map((c) => [c.date, c]));
    const dates: { date: string; cell?: (typeof calendarLayout.cells)[number] }[] = [];
    for (let d = new Date(startMonday); d < endSunday; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dates.push({ date: key, cell: byDate.get(key) });
    }
    return { dates, weeksCount: Math.ceil(dates.length / 7), maxRevenue: calendarLayout.maxRevenue };
  }, [calendarLayout, calendarYear, calendarMonth]);

  // ── KPI cards data ───────────────────────────────────────────────────────

  const kpis = data?.kpis;
  const kpiCards = [
    { label: "Total Revenue",   value: kpis ? formatPrice(kpis.revenue)                   : "Rs. 0", trend: toSafeNum(kpis?.trends.revenue       ?? 0), subtitle: "vs last period", sparkData: combinedByDay.map((d) => d.revenue)     },
    { label: "Total Orders",    value: kpis ? kpis.orders.toLocaleString("en-NP")          : "0",     trend: toSafeNum(kpis?.trends.orders         ?? 0), subtitle: "vs last period", sparkData: combinedByDay.map((d) => d.orders)      },
    { label: "Avg Order Value", value: kpis ? formatPrice(kpis.avgOrderValue)               : "Rs. 0", trend: toSafeNum(kpis?.trends.avgOrderValue  ?? 0), subtitle: "vs last period", sparkData: combinedByDay.map((d) => d.aov)         },
    { label: "New Customers",   value: kpis ? kpis.newCustomers.toLocaleString("en-NP")    : "0",     trend: toSafeNum(kpis?.trends.newCustomers    ?? 0), subtitle: "vs last period", sparkData: combinedByDay.map((d) => d.newCustomers) },
  ];

  // ── Heat colour ──────────────────────────────────────────────────────────

  const heatColor = (revenue: number, max: number, isHoliday: boolean) => {
    if (revenue <= 0 && isHoliday) return "var(--ag-amber-l)";
    if (revenue <= 0)              return "var(--ag-bg4)";
    const r = max > 0 ? revenue / max : 0;
    if (r > 0.75) return "var(--ag-green)";
    if (r > 0.5)  return "var(--ag-green-m)";
    if (r > 0.25) return "#4db885";
    return "var(--ag-green-l)";
  };

  // ── Tab style helpers ────────────────────────────────────────────────────

  const pillTab = (active: boolean): React.CSSProperties => ({
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em",
    padding: "3px 9px", border: active ? "0.5px solid var(--ag-border2)" : "none",
    borderRadius: 6,
    background: active ? "var(--ag-bg2)" : "transparent",
    color:  active ? "var(--ag-text)" : "var(--ag-text3)",
    cursor: "pointer",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,.06)" : "none",
  });

  const rangeTab = (active: boolean): React.CSSProperties => ({
    fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "3px 8px",
    border: "none", borderRadius: 5,
    background: active ? "var(--ag-text)" : "transparent",
    color:  active ? "var(--ag-bg)"  : "var(--ag-text3)",
    cursor: "pointer", letterSpacing: "0.08em",
  });

  // ────────────────────────────────────────────────────────────────────────

  const commonPieColors = ["#39e88e","#5b8def","#9b7cf8","#f5a623","#ff4d4d"];

  return (
    <div style={{ background: "var(--ag-bg)", minHeight: "100vh", padding: "0 0 40px", fontFamily: "'Syne', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "0.5px solid var(--ag-border)", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "0.15em", color: "var(--ag-text)", lineHeight: 1 }}>
            ANALYTICS
          </h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--ag-text3)", marginTop: 4, letterSpacing: "0.06em" }}>
            {RANGE_LABELS[range].toLowerCase()} — historical performance
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 3, background: "var(--ag-bg2)", border: "0.5px solid var(--ag-border)", borderRadius: 8, padding: 3 }}>
            {(["7d", "30d", "90d", "1y"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} style={rangeTab(range === r)}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <ExportButton onExport={() => exportAnalyticsCSV(range)} />
        </div>
      </div>

      {/* Bento Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "0 24px" }}>

        {/* KPI Row */}
        {kpiCards.map((c, idx) => (
          <KpiCard key={c.label} {...c} idx={idx} isLoading={isLoading} />
        ))}

        {/* Revenue + Orders combo — 3 cols */}
        <div style={{ ...card, gridColumn: "span 3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={sectionTitle}>Revenue & Orders</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--ag-text3)", marginTop: -8 }}>
                Daily revenue (line) · order volume (bars)
              </p>
            </div>
            <div style={{ display: "flex", gap: 4, background: "var(--ag-bg3)", borderRadius: 8, padding: 3, border: "0.5px solid var(--ag-border)" }}>
              <button style={pillTab(true)}>Revenue</button>
              <button style={pillTab(false)}>Orders</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={combinedByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#39e88e" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#39e88e" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ag-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} interval="preserveStartEnd" />
              <YAxis yAxisId="orders"  orientation="left"  tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} allowDecimals={false} />
              <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={(v) => `Rs.${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
              <RechartsTooltip content={<AgTooltip formatter={(p: any) => p.name === "orders" ? `${p.value.toLocaleString("en-NP")} orders` : formatPrice(p.value)} />} />
              <Bar  dataKey="orders"  yAxisId="orders"  fill="var(--ag-amber)" fillOpacity={0.25} stroke="var(--ag-amber)" strokeOpacity={0.5} strokeWidth={0.5} radius={[3,3,0,0]} barSize={12} />
              <Area dataKey="revenue" yAxisId="revenue" type="monotone" stroke="var(--ag-green)" strokeWidth={2} fill="url(#rev-fill)" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Order status donut — 1 col */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={sectionTitle}>Order Status</div>
          <div style={{ display: "flex", justifyContent: "center", minHeight: 140 }}>
            {ordersStatusData.length > 0 && (
              <PieChart width={140} height={140}>
                <Pie
                  data={ordersStatusData}
                  dataKey="value"
                  isAnimationActive={false}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  stroke="none"
                >
                  {ordersStatusData.map((e, i) => (
                    <Cell key={i} fill={e.hex} />
                  ))}
                </Pie>
                <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${p.payload?.status}: ${p.value?.toLocaleString("en-NP")}`} />} />
              </PieChart>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
            {ordersStatusData.map((row) => {
              const total = ordersStatusData.reduce((s,o)=>s+o.value,0);
              const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: row.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ color: "var(--ag-text2)" }}>{row.status}</span>
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--ag-text)" }}>
                    {row.value.toLocaleString("en-NP")} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products — 2 cols */}
        <TopProductsSection analytics={data} isLoading={isLoading} style={{ gridColumn: "span 2" }} />

        {/* Orders by weekday */}
        <div style={card}>
          <div style={sectionTitle}>Orders by Day</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={ordersByDayOfWeekData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ag-border)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
              <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${p.value.toLocaleString("en-NP")} orders`} />} />
              <Bar dataKey="count" radius={[4,4,0,0]} fill="var(--ag-purple)" fillOpacity={0.3} stroke="var(--ag-purple)" strokeWidth={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment methods */}
        <div style={card}>
          <div style={sectionTitle}>Payment Methods</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={paymentMethodsData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="method" axisLine={false} tickLine={false} width={40} tick={{ fill: "var(--ag-text2)", fontSize: 11, fontFamily: "'DM Mono', monospace" }} />
              <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${p.value.toLocaleString("en-NP")} · ${p.payload?.percent?.toFixed(1)}%`} />} />
              <Bar dataKey="count" radius={[0,4,4,0]} barSize={14} fill="var(--ag-blue)" fillOpacity={0.3} stroke="var(--ag-blue)" strokeWidth={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Platform — 2 cols */}
        <div style={{ ...card, gridColumn: "span 2" }}>
          <div style={sectionTitle}>Revenue by Platform</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={(data?.revenueByPlatform ?? []).slice(0, 8)} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ag-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} tickFormatter={(v) => v >= 1000 ? `Rs.${Math.round(v / 1000)}k` : `Rs.${v}`} />
              <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${formatPrice(p.value)} · ${p.payload?.percent?.toFixed(1)}%`} />} />
              <Bar dataKey="revenue" radius={[4,4,0,0]} fill="var(--ag-green)" fillOpacity={0.35} stroke="var(--ag-green)" strokeWidth={0.5} />
            </BarChart>
          </ResponsiveContainer>
          <Collapsible>
            <div style={{ paddingTop: 8, borderTop: "0.5px solid var(--ag-border)", marginTop: 8 }}>
              <CollapsibleTrigger asChild>
                <button type="button" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ag-text3)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                  Platform management <ChevronDown size={14} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Input placeholder="key (e.g. instagram)" value={newPlatformKey} onChange={(e) => setNewPlatformKey(e.target.value.toLowerCase())} className="h-8 text-xs" />
                    <Input placeholder="label" value={newPlatformLabel} onChange={(e) => setNewPlatformLabel(e.target.value)} className="h-8 text-xs" />
                    <Button type="button" size="sm" className="h-8 px-3 text-xs"
                      disabled={!newPlatformKey || !newPlatformLabel || upsertPlatformMutation.isPending}
                      onClick={() => upsertPlatformMutation.mutate({ key: newPlatformKey, label: newPlatformLabel, isActive: true }, { onSuccess: () => { setNewPlatformKey(""); setNewPlatformLabel(""); } })}
                    >Add</Button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {platforms.map((p) => (
                      <div key={p.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ag-bg3)", border: "0.5px solid var(--ag-border)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--ag-text2)" }}>
                        {p.label}
                        <button type="button" style={{ color: "var(--ag-text3)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }} disabled={deletePlatformMutation.isPending} onClick={() => deletePlatformMutation.mutate(p.key)}>×</button>
                      </div>
                    ))}
                    {platforms.length === 0 && <p style={{ fontSize: 11, color: "var(--ag-text3)", fontFamily: "'DM Mono', monospace" }}>No custom platforms yet.</p>}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Revenue by Category */}
        <div style={card}>
          <div style={sectionTitle}>Revenue by Category</div>
          <div style={{ display: "flex", justifyContent: "center", minHeight: 180 }}>
            <PieChart width={180} height={180}>
              <Pie
                data={(data?.salesByCategory ?? []).map(c=>({...c, revenue: toSafeNum(c.revenue)}))}
                dataKey="revenue"
                isAnimationActive={false}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                stroke="none"
              >
                {(data?.salesByCategory ?? []).map((_, i) => (
                  <Cell key={i} fill={commonPieColors[i % commonPieColors.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${p.payload?.category}: ${formatPrice(p.value)}`} />} />
            </PieChart>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            {(data?.salesByCategory ?? []).slice(0, 4).map((cat, i) => (
              <div key={cat.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: commonPieColors[i % commonPieColors.length], flexShrink: 0, display: "inline-block" }} />
                  <span style={{ color: "var(--ag-text2)", fontFamily: "'DM Mono', monospace" }}>{cat.category}</span>
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--ag-text)" }}>{formatPrice(cat.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* New Customers */}
        <div style={{ ...card, borderTop: "2px solid var(--ag-purple)44" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={sectionTitle}>New Customers</div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "var(--ag-purple-l)", color: "var(--ag-purple)" }}>
              {kpis?.newCustomers ?? 0} this period
            </span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={combinedByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cust-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#9b7cf8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#9b7cf8" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--ag-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ag-text3)", fontSize: 10, fontFamily: "'DM Mono', monospace" }} allowDecimals={false} />
              <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${p.value} signups`} />} />
              <Area type="monotone" dataKey="newCustomers" stroke="#9b7cf8" strokeWidth={2} fill="url(#cust-fill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Heatmap — full width */}
        <div style={{ ...card, gridColumn: "span 4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={sectionTitle}>Sales Activity — {calendarYear}</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--ag-text3)", marginTop: -8 }}>GitHub-style calendar of daily revenue</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 3, background: "var(--ag-bg3)", border: "0.5 solid var(--ag-border)", borderRadius: 8, padding: 3 }}>
                {(["year","month"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setCalendarView(v)} style={pillTab(calendarView === v)}>
                    {v === "year" ? "Year" : "Month"}
                  </button>
                ))}
              </div>
              <Input type="number" value={calendarYear} onChange={(e) => setCalendarYear(toSafeNum(e.target.value) || new Date().getFullYear())} className="h-8 w-20 text-xs" min={2020} max={new Date().getFullYear() + 1} />
              {calendarView === "month" && (
                <Select value={String(calendarMonth)} onValueChange={(v) => setCalendarMonth(toSafeNum(v))}>
                  <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i} value={String(i)}>{new Date(calendarYear, i, 1).toLocaleString("default", { month: "short" })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {isCalendarLoading || !calendarLayout ? (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--ag-text3)" }}>Loading calendar…</div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                {calendarView === "year" ? (
                  <div style={{ display: "inline-flex", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 20, paddingRight: 6, fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--ag-text3)", gap: 2 }}>
                      {["M","T","W","T","F","S","S"].map((d, i) => (
                        <span key={i} style={{ height: 13, lineHeight: "13px", opacity: [0,2,4].includes(i) ? 1 : 0 }}>{d}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", fontSize: 9, fontFamily: "'DM Mono', monospace", color: "var(--ag-text3)", marginBottom: 2 }}>
                        {Array.from({ length: calendarLayout.weeksCount }).map((_, wi) => {
                          const m = calendarLayout.monthLabels.find((ml) => ml.weekIndex === wi);
                          return <div key={wi} style={{ width: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 2 }}>{m?.label ?? ""}</div>;
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: calendarLayout.weeksCount }, (_, wi) => (
                          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {Array.from({ length: 7 }, (_, wd) => {
                              const cell = calendarLayout.cells.find((c) => c.weekIndex === wi && c.weekday === wd);
                              if (!cell) return <div key={wd} style={{ width: 13, height: 13, borderRadius: 3, background: "transparent" }} />;
                              return (
                                <div key={wd} title={cell.revenue > 0 ? `${cell.date} · ${formatPrice(cell.revenue)}` : `${cell.date} · No sales`}
                                  style={{ width: 13, height: 13, borderRadius: 3, background: heatColor(cell.revenue, calendarLayout.maxRevenue, cell.isHoliday), border: "0.5px solid var(--ag-border)", cursor: "default" }}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "inline-flex", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingTop: 20, paddingRight: 6, fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--ag-text3)", gap: 2 }}>
                      {["M","T","W","T","F","S","S"].map((d, i) => (
                        <span key={i} style={{ height: 13, lineHeight: "13px", opacity: [0,2,4].includes(i) ? 1 : 0 }}>{d}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 2, paddingTop: 20 }}>
                      {Array.from({ length: monthLayout?.weeksCount ?? 0 }).map((_, wi) => (
                        <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {Array.from({ length: 7 }, (_, wd) => {
                            const idx = wi * 7 + wd;
                            const entry = monthLayout?.dates[idx];
                            const cell = entry?.cell;
                            const inMonth = entry && new Date(entry.date).getFullYear() === calendarYear && new Date(entry.date).getMonth() === calendarMonth;
                            return (
                              <div key={wd} title={cell?.revenue && cell.revenue > 0 ? `${entry?.date} · ${formatPrice(cell.revenue)}` : `${entry?.date ?? ""} · No sales`}
                                style={{ width: 13, height: 13, borderRadius: 3, background: heatColor(cell?.revenue ?? 0, monthLayout?.maxRevenue ?? 0, cell?.isHoliday ?? false), border: "0.5px solid var(--ag-border)", opacity: inMonth ? 1 : 0.35, cursor: "default" }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--ag-text3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {[{ label: "No sales", bg: "var(--ag-bg4)" },{ label: "Low", bg: "var(--ag-green-l)" },{ label: "Medium", bg: "#4db885" },{ label: "High", bg: "var(--ag-green-m)" },{ label: "Peak", bg: "var(--ag-green)" }].map((s) => (
                    <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 13, height: 13, borderRadius: 3, background: s.bg, border: "0.5px solid var(--ag-border)", display: "inline-block" }} />
                      {s.label}
                    </span>
                  ))}
                </div>
                <span>Less ← → More</span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Top Products Section ─────────────────────────────────────────────────────

function TopProductsSection({ analytics, isLoading, style }: { analytics: AdminAnalytics | undefined; isLoading: boolean; style?: React.CSSProperties }) {
  const products = analytics?.topProducts ?? [];
  const top3 = useMemo(() => products.slice(0, 3).map(p=>({...p, revenue: toSafeNum(p.revenue)})), [products]);
  const pieColors = ["#39e88e","#5b8def","#9b7cf8","#f5a623","#ff4d4d"];

  const totalRevenue = useMemo(() => products.reduce((sum, pr) => sum + toSafeNum(pr.revenue), 0), [products]);

  return (
    <div style={{ background: "var(--ag-bg2)", border: "0.5px solid var(--ag-border)", borderRadius: 14, padding: 16, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={sectionTitle}>Top Products</div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--ag-text3)" }}>Ranked by revenue, top 10</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{Array.from({ length: 5 }).map((_, i) => <Skel key={i} h={40} />)}</div>
          ) : products.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ag-text3)", fontFamily: "'DM Mono', monospace" }}>No products in this period.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {products.slice(0, 10).map((p, idx) => {
                const calcPct = totalRevenue > 0 ? (toSafeNum(p.revenue) / totalRevenue * 100) : 0;
                return (
                  <div key={`${p.name}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "0.5px solid var(--ag-border)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: "var(--ag-bg3)", border: "0.5px solid var(--ag-border)", flexShrink: 0, overflow: "hidden" }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ag-text3)" }}>#{idx + 1}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ag-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--ag-green)", flexShrink: 0, marginLeft: 8 }}>{formatPrice(p.revenue)}</div>
                      </div>
                      <div style={{ height: 3, background: "var(--ag-bg4)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(calcPct, 100)}%`, background: "var(--ag-green-m)", borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ background: "var(--ag-bg3)", borderRadius: 10, border: "0.5px solid var(--ag-border)", padding: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ag-text3)", marginBottom: 4 }}>Top 3 share</div>
          <div style={{ display: "flex", justifyContent: "center", minHeight: 160 }}>
            {top3.length > 0 && (
              <PieChart width={160} height={160}>
                <Pie
                  data={top3}
                  dataKey="revenue"
                  isAnimationActive={false}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={75}
                  stroke="none"
                >
                  {top3.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <RechartsTooltip content={<AgTooltip formatter={(p: any) => `${p.payload?.name}: ${formatPrice(p.value)}`} />} />
              </PieChart>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            {top3.map((p, i) => {
              const displayPct = totalRevenue > 0 ? (toSafeNum(p.revenue) / totalRevenue * 100).toFixed(1) : "0.0";
              return (
                <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: pieColors[i], flexShrink: 0, display: "inline-block" }} />
                    <span style={{ color: "var(--ag-text2)", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{p.name}</span>
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--ag-text)" }}>{displayPct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
