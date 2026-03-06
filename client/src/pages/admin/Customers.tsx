import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminCustomers,
  fetchCustomerById,
  type AdminCustomer,
  type AdminCustomerDetail,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: customers,
    isLoading,
    isError,
  } = useQuery<AdminCustomer[]>({
    queryKey: ["admin", "customers", search],
    queryFn: () => fetchAdminCustomers(search || undefined),
  });

  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery<AdminCustomerDetail | null>({
    queryKey: ["admin", "customers", selectedId],
    queryFn: () =>
      selectedId ? fetchCustomerById(selectedId) : Promise.resolve(null),
    enabled: !!selectedId,
  });

  const list = customers ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
            Customers
          </h1>
          <p className="text-muted-foreground mt-1">
            {list.length} customers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="bg-white dark:bg-card border-[#E5E5E0] dark:border-border text-[#2C3E2D] dark:text-foreground"
          >
            Export
          </Button>
          <Button className="bg-[#2C3E2D] hover:bg-[#1A251B] text-white dark:bg-primary dark:text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative w-full mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-9 bg-white dark:bg-card border-[#E5E5E0] dark:border-border rounded-full h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-transparent flex-1 overflow-y-auto pr-4 space-y-2">
            {isLoading || isError
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl border border-transparent"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                      <div>
                        <div className="h-3 w-24 bg-muted animate-pulse mb-2" />
                        <div className="h-3 w-32 bg-muted animate-pulse" />
                      </div>
                    </div>
                    <div className="h-3 w-16 bg-muted animate-pulse" />
                  </div>
                ))
              : list.map((customer, i) => {
                  const bgColors = [
                    "bg-[#2C5234]",
                    "bg-[#1E40AF]",
                    "bg-[#8B2020]",
                    "bg-[#926019]",
                    "bg-[#1B6A68]",
                    "bg-[#4B3B6D]",
                  ];
                  const bgColor = bgColors[i % bgColors.length];
                  const initials = `${customer.firstName[0] ?? ""}${
                    customer.lastName[0] ?? ""
                  }`.toUpperCase();

                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-white dark:hover:bg-card transition-colors cursor-pointer group border border-transparent hover:border-[#E5E5E0] dark:hover:border-border"
                      onClick={() => setSelectedId(customer.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full ${bgColor} text-white flex items-center justify-center font-medium text-sm`}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-[#2C3E2D] dark:text-foreground group-hover:text-primary transition-colors">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                      <div className="font-medium">
                    {formatPrice(customer.totalSpent)}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Customer Detail Pane */}
        <div className="hidden lg:flex w-80 bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border flex-col p-8 text-sm">
          {detailLoading && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          )}
          {!detail && !detailLoading && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a customer</p>
            </div>
          )}
          {detail && !detailLoading && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">
                  {detail.firstName} {detail.lastName}
                </h3>
                <p className="text-muted-foreground text-xs">{detail.email}</p>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Orders: {detail.orderCount}</p>
                <p>
                  Total spent: {formatPrice(detail.totalSpent)}
                </p>
              </div>
              <div className="pt-4 border-t border-[#E5E5E0] dark:border-border space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Recent orders
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {detail.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex justify-between text-xs"
                    >
                      <span>{order.id.slice(0, 8)}</span>
                      <span>
                        {formatPrice(order.total)} · {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}