import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BarPlot } from "@mui/x-charts/BarChart";
import { ScatterPlot } from "@mui/x-charts/ScatterChart";
import { ChartsXAxis } from "@mui/x-charts/ChartsXAxis";
import { ChartsYAxis } from "@mui/x-charts/ChartsYAxis";
import { ChartsGrid } from "@mui/x-charts/ChartsGrid";
import { ChartDataProvider } from "@mui/x-charts/ChartDataProvider";
import { ChartsSurface } from "@mui/x-charts/ChartsSurface";
import { ChartsTooltip } from "@mui/x-charts/ChartsTooltip";
import { legendClasses, ChartsLegend } from "@mui/x-charts/ChartsLegend";
import type { AdminCustomer } from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewMode = "orders" | "revenue";

interface CustomerSpendingChartProps {
  customers: AdminCustomer[];
}

export default function CustomerSpendingChart({ customers }: CustomerSpendingChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) =>
      viewMode === "revenue"
        ? Number(b.totalSpent) - Number(a.totalSpent)
        : b.orderCount - a.orderCount,
    );
  }, [customers, viewMode]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize);
  const pageCustomers = sortedCustomers.slice(page * pageSize, (page + 1) * pageSize);

  const chartData = useMemo(() => {
    return [...pageCustomers].map((c, i) => {
      const name = `${c.firstName} ${c.lastName}`.trim() || c.email || `Customer ${i + 1}`;
      return {
        id: c.id,
        name,
        orders: c.orderCount,
        revenue: Number(c.totalSpent),
        email: c.email,
      };
    }).reverse();
  }, [pageCustomers]);

  const valueFormatter = (value: number | null) =>
    value !== null ? (viewMode === "revenue" ? formatPrice(value) : `${value} orders`) : "";

  const scatterValueFormatter = (value: { x: number } | null) =>
    value !== null ? `${value.x} orders` : "";

  if (chartData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-2xl border border-[#E5E5E0] bg-white dark:border-border dark:bg-card">
        <p className="text-sm text-muted-foreground">No customer data to display yet.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...chartData.map((d) => d.orders), 1);

  return (
    <div className="rounded-2xl border border-[#E5E5E0] bg-white p-5 dark:border-border dark:bg-card">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Customer Leaderboard
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top {pageCustomers.length} of {sortedCustomers.length} customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#E5E5E0] dark:border-border overflow-hidden">
            <button
              onClick={() => { setViewMode("revenue"); setPage(0); }}
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
              onClick={() => { setViewMode("orders"); setPage(0); }}
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
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-7 w-7 rounded-md border border-[#E5E5E0] dark:border-border text-xs font-medium disabled:opacity-40 hover:bg-muted dark:hover:bg-muted transition-colors"
              >
                ‹
              </button>
              <span className="text-xs text-muted-foreground w-12 text-center">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="h-7 w-7 rounded-md border border-[#E5E5E0] dark:border-border text-xs font-medium disabled:opacity-40 hover:bg-muted dark:hover:bg-muted transition-colors"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      <Box
        sx={{
          width: "100%",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <ChartDataProvider
          dataset={chartData}
          series={[
            {
              id: "bar",
              type: "bar",
              layout: "horizontal",
              dataKey: viewMode === "revenue" ? "revenue" : "orders",
              label: viewMode === "revenue" ? "Total Spent" : "Total Orders",
              valueFormatter,
              color: viewMode === "revenue" ? "#2C5234" : "#81a074",
            },
            {
              id: "scatter",
              type: "scatter",
              datasetKeys: {
                id: "id",
                x: viewMode === "revenue" ? "orders" : "revenue",
                y: "name",
              },
              label: viewMode === "revenue" ? "Order Count" : "Revenue",
              valueFormatter:
                viewMode === "revenue" ? scatterValueFormatter : (v: { x: number } | null) =>
                  v !== null ? formatPrice(v.x) : "",
              markerSize: 5,
              color: viewMode === "revenue" ? "#d4a843" : "#d4a843",
            },
          ]}
          yAxis={[{ scaleType: "band", dataKey: "name", width: 120 }]}
          xAxis={[
            {
              id: "bar",
              label: viewMode === "revenue" ? "Revenue (NPR)" : "Orders",
              dataKey: viewMode === "revenue" ? "revenue" : "orders",
              colorMap: {
                type: "piecewise" as const,
                thresholds: [viewMode === "revenue" ? maxRevenue * 0.5 : maxOrders * 0.5],
                colors: viewMode === "revenue"
                  ? ["#81a074", "#2C5234"]
                  : ["#a8c5a0", "#81a074"],
              },
            },
            {
              id: "scatter",
              label: viewMode === "revenue" ? "Order Count" : "Revenue (NPR)",
              dataKey: viewMode === "revenue" ? "orders" : "revenue",
            },
          ]}
          height={Math.max(400, chartData.length * 28)}
          margin={{ left: 120, right: 40, top: 10, bottom: 10 }}
        >
          <ChartsLegend />
          <ChartsTooltip />
          <ChartsSurface>
            <ChartsGrid horizontal />
            <BarPlot />
            <ScatterPlot />
            <ChartsXAxis axisId="bar" />
            <ChartsYAxis />
          </ChartsSurface>
        </ChartDataProvider>
      </Box>
    </div>
  );
}
