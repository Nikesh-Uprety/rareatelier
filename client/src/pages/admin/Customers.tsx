import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Mail, Phone, MapPin, ShoppingBag, Calendar, User as UserIcon, MoreVertical, ExternalLink, Download, Loader2, ChevronRight, Upload, SlidersHorizontal, Settings2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAdminCustomersPage,
  fetchCustomerById,
  fetchCustomerOrders,
  createAdminCustomer,
  updateAdminCustomer,
  deleteAdminCustomer,
  exportCustomersCSV,
  type AdminCustomer,
  type AdminCustomerDetail,
  type AdminCustomerOrderHistoryItem,
} from "@/lib/adminApi";
import { formatPrice, displayEmptyField } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Paper from "@mui/material/Paper";
import { DataGrid, type GridColDef, type GridRowSelectionModel } from "@mui/x-data-grid";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "@/components/admin/Pagination";
import CustomerSpendingChart from "@/components/admin/CustomerSpendingChart";

export default function AdminCustomers() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"customers" | "analytics">("customers");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AdminCustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<AdminCustomer | null>(null);
  const [isExportingCustomers, setIsExportingCustomers] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [customerPage, setCustomerPage] = useState(1);
  const customerPageSize = 10;
  const [chartTimeRange, setChartTimeRange] = useState<"1w" | "1m" | "all">("1w");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (activeSection !== "customers") {
      setExpandedId(null);
      setExpandedOrderId(null);
      setRowSelectionModel({ type: "include", ids: new Set() });
    }
  }, [activeSection]);

  const {
    data: customerPageData,
    isLoading,
    isError,
  } = useQuery<{ data: AdminCustomer[]; total: number }>({
    queryKey: ["admin", "customers", "list", { search, page: customerPage, limit: customerPageSize }],
    queryFn: () =>
      fetchAdminCustomersPage({
        search: search || undefined,
        page: customerPage,
        limit: customerPageSize,
        includeZeroOrders: false,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: chartCustomersData } = useQuery<{ data: AdminCustomer[]; total: number }>({
    queryKey: ["admin", "customers", "chart", search, chartTimeRange],
    queryFn: () =>
      fetchAdminCustomersPage({
        search: search || undefined,
        timeRange: chartTimeRange === "all" ? undefined : chartTimeRange,
        page: 1,
        limit: 100,
        includeZeroOrders: false,
      }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery<AdminCustomerDetail | null>({
    queryKey: ["admin", "customers", expandedId],
    queryFn: () =>
      expandedId ? fetchCustomerById(expandedId) : Promise.resolve(null),
    enabled: !!expandedId,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
  } = useQuery<AdminCustomerOrderHistoryItem[]>({
    queryKey: ["admin", "customers", expandedId, "orders"],
    queryFn: () =>
      expandedId ? fetchCustomerOrders(expandedId) : Promise.resolve([]),
    enabled: !!expandedId,
  });

  useEffect(() => {
    setCustomerPage(1);
  }, [search]);

  const listCustomers = customerPageData?.data ?? [];
  const totalCustomers = customerPageData?.total ?? 0;
  const chartCustomers = chartCustomersData?.data ?? [];
  const selectedCustomerIds = useMemo(
    () => Array.from(rowSelectionModel.ids).map((id) => String(id)),
    [rowSelectionModel],
  );
  const selectedCustomerRevenue = useMemo(
    () =>
      orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
    [orders],
  );
  const selectedCustomerOnlineOrders = useMemo(
    () => orders.filter((order) => order.source === "online").length,
    [orders],
  );
  const latestOrder = orders[0] ?? null;
  const latestOrderPaymentState = useMemo(() => {
    if (!latestOrder) return "N/A";
    const status = String(latestOrder.status ?? "").toLowerCase();

    if (["completed", "paid", "issued", "delivered"].includes(status)) {
      return "Paid";
    }
    if (["cancelled", "failed", "void", "unpaid"].includes(status)) {
      return "Unpaid";
    }
    return "Pending";
  }, [latestOrder]);

  const customerTotalPages = Math.max(1, Math.ceil(totalCustomers / customerPageSize));
  const paginatedCustomers = listCustomers;
  const activeCustomers = useMemo(
    () => chartCustomers.filter((customer) => customer.orderCount > 0).length,
    [chartCustomers],
  );
  const inactiveCustomers = Math.max(0, chartCustomers.length - activeCustomers);
  const averageLifetimeSpend =
    chartCustomers.length > 0
      ? chartCustomers.reduce((sum, customer) => sum + Number(customer.totalSpent ?? 0), 0) / chartCustomers.length
      : 0;

  const handleOpenCustomerPanel = (id: string) => {
    setExpandedOrderId(null);
    setExpandedId(id);
  };

  const getInitials = (first: string, last: string) => {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
  };

  const addMutation = useMutation({
    mutationFn: createAdminCustomer,
    onSuccess: () => {
      toast({ title: "Customer created successfully" });
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create customer", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAdminCustomer(id, data),
    onSuccess: () => {
      toast({ title: "Customer updated successfully" });
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update customer", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCustomer,
    onSuccess: () => {
      toast({ title: "Customer deleted successfully" });
      setDeletingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete customer", description: error.message, variant: "destructive" });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => deleteAdminCustomer(id)));
      const failed = results.filter((result) => result.status === "rejected").length;
      return { total: ids.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      setIsBulkDeleteOpen(false);
      setRowSelectionModel({ type: "include", ids: new Set() });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      if (failed > 0) {
        toast({
          title: "Bulk delete partially completed",
          description: `${total - failed} deleted, ${failed} failed.`,
          variant: "destructive",
        });
        return;
      }
      toast({ title: `Deleted ${total} customers successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete selected customers", description: error.message, variant: "destructive" });
    },
  });

  const selectedCustomersOnPage = useMemo(
    () => paginatedCustomers.filter((customer) => selectedCustomerIds.includes(customer.id)),
    [paginatedCustomers, selectedCustomerIds],
  );

  const handleExportSelectedCustomers = () => {
    if (selectedCustomersOnPage.length === 0) {
      toast({ title: "No selected customers to export" });
      return;
    }

    const csvHeader = "firstName,lastName,email,phoneNumber,totalSpent,orderCount";
    const csvRows = selectedCustomersOnPage.map((customer) =>
      [
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phoneNumber ?? "",
        String(customer.totalSpent ?? 0),
        String(customer.orderCount ?? 0),
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );

    const blob = new Blob([[csvHeader, ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "selected-customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({ title: `Exported ${selectedCustomersOnPage.length} selected customers` });
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    const email = fd.get("email") as string;
    const phoneNumber = fd.get("phoneNumber") as string;

    if (!firstName || !lastName) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }

    addMutation.mutate({ firstName, lastName, email, phoneNumber });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const fd = new FormData(e.currentTarget);
    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    const email = fd.get("email") as string;
    const phoneNumber = fd.get("phoneNumber") as string;

    updateMutation.mutate({ 
      id: editingCustomer.id, 
      data: { firstName, lastName, email, phoneNumber } 
    });
  };

  const handleExportCustomers = async () => {
    if (isExportingCustomers) return;
    setIsExportingCustomers(true);
    try {
      await exportCustomersCSV();
      toast({ title: "Customers CSV downloaded" });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Failed to export customers",
        variant: "destructive",
      });
    } finally {
      setIsExportingCustomers(false);
    }
  };

  const bgGradients = [
    "bg-gradient-to-br from-[#2C5234] to-[#1A3320]",
    "bg-gradient-to-br from-[#1E40AF] to-[#112361]",
    "bg-gradient-to-br from-[#8B2020] to-[#591414]",
    "bg-gradient-to-br from-[#926019] to-[#5C3C0F]",
    "bg-gradient-to-br from-[#1B6A68] to-[#103D3C]",
    "bg-gradient-to-br from-[#4B3B6D] to-[#2B2240]",
    "bg-gradient-to-br from-indigo-500 to-indigo-900",
    "bg-gradient-to-br from-emerald-500 to-emerald-900",
  ];

  type CustomerGridRow = {
    id: string;
    customerName: string;
    email: string;
    phoneNumber: string;
    activeStatus: "Active" | "Inactive";
    orderCount: number;
    totalSpent: number;
    orderPlacedAt: string;
    profileImageUrl: string | null;
    firstName: string;
    lastName: string;
    avatarGradient: string;
  };

  const customerRows = useMemo<CustomerGridRow[]>(
    () =>
      paginatedCustomers.map((customer, index) => ({
        id: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phoneNumber: customer.phoneNumber || "No phone number",
        activeStatus: customer.orderCount > 0 ? "Active" : "Inactive",
        orderCount: customer.orderCount,
        totalSpent: Number(customer.totalSpent ?? 0),
        orderPlacedAt: customer.lastOrderAt ?? customer.createdAt,
        profileImageUrl: customer.profileImageUrl ?? null,
        firstName: customer.firstName,
        lastName: customer.lastName,
        avatarGradient: bgGradients[index % bgGradients.length],
      })),
    [paginatedCustomers],
  );

  const customerColumns = useMemo<GridColDef<CustomerGridRow>[]>(
    () => [
      {
        field: "customerName",
        headerName: "Customer Info",
        flex: 2.2,
        minWidth: 320,
        sortable: false,
        cellClassName: "customer-info-cell",
        renderCell: (params) => {
          const row = params.row;
          const isActive = row.orderCount > 0;
          return (
            <div className="flex h-full min-w-0 cursor-pointer items-start gap-3 py-1.5">
              <Avatar className={cn("mt-0.5 h-10 w-10 shrink-0 border border-black/5", !row.profileImageUrl && row.avatarGradient)}>
                {row.profileImageUrl ? (
                  <img src={row.profileImageUrl} alt={row.customerName} className="h-full w-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-transparent text-xs font-bold text-white">
                    {getInitials(row.firstName, row.lastName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-semibold text-[#1A1F2B]">{row.customerName}</p>
                <p className="truncate text-xs text-muted-foreground">{displayEmptyField(row.email)}</p>
                <p className="truncate text-xs text-muted-foreground">{displayEmptyField(row.phoneNumber)}</p>
                <p className={cn("text-[11px] font-medium", isActive ? "text-emerald-700" : "text-slate-500")}>
                  {isActive ? "Active customer" : "No orders yet"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        field: "orderPlacedAt",
        headerName: "Order Placed",
        minWidth: 140,
        flex: 0.8,
        valueFormatter: (value) => new Date(String(value)).toLocaleDateString(),
      },
      {
        field: "activeStatus",
        headerName: "Status",
        minWidth: 120,
        flex: 0.7,
        sortable: false,
        renderCell: (params) => (
          <Badge
            className={cn(
              "h-6 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
              params.row.activeStatus === "Active"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-600",
            )}
          >
            {params.row.activeStatus}
          </Badge>
        ),
      },
      {
        field: "orderCount",
        headerName: "Orders",
        minWidth: 110,
        flex: 0.7,
        type: "number",
      },
      {
        field: "totalSpent",
        headerName: "Total Spent",
        minWidth: 140,
        flex: 0.9,
        type: "number",
        valueFormatter: (value) => formatPrice(Number(value ?? 0)),
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 88,
        maxWidth: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const customer = paginatedCustomers.find((item) => item.id === params.row.id);
          if (!customer) return null;
          return (
            <div onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl border-border shadow-lg">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setEditingCustomer(customer)}>
                    <Edit className="mr-2 h-4 w-4 text-primary" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => setDeletingCustomer(customer)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [bgGradients, paginatedCustomers],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-[#E3E5E8] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[#1A1F2B]">Customers</h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Customer invoicing and relationship management workspace
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="h-10 border-[#D6DAE0] bg-white text-[#1F2937]"
                onClick={handleExportCustomers}
                disabled={isExportingCustomers}
              >
                {isExportingCustomers ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
              <Button
                variant="outline"
                className="h-10 border-[#D6DAE0] bg-white text-[#1F2937]"
                onClick={() => toast({ title: "Import will be available in the next update." })}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button className="h-10 bg-[#D66B2B] text-white hover:bg-[#BF5D22]" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
          </div>

          <div className="inline-flex w-fit rounded-xl border border-[#D6DAE0] bg-[#F9FAFB] p-1">
            <button
              type="button"
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeSection === "customers"
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]",
              )}
              onClick={() => setActiveSection("customers")}
            >
              Customer List
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeSection === "analytics"
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]",
              )}
              onClick={() => setActiveSection("analytics")}
            >
              Analytics
            </button>
          </div>

          {activeSection === "customers" ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[#E3E5E8] bg-[#FAFBFC] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">All customers</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">{totalCustomers}</p>
                </div>
                <div className="rounded-xl border border-[#E3E5E8] bg-[#FAFBFC] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Active buyers</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">{activeCustomers}</p>
                </div>
                <div className="rounded-xl border border-[#E3E5E8] bg-[#FAFBFC] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Inactive</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">{inactiveCustomers}</p>
                </div>
                <div className="rounded-xl border border-[#E3E5E8] bg-[#FAFBFC] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Avg lifetime value</p>
                  <p className="mt-2 text-3xl font-semibold text-[#111827]">{formatPrice(averageLifetimeSpend)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search customers"
                      className="h-10 rounded-lg border-[#D6DAE0] bg-white pl-9"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setSearch("");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#374151]"
                  >
                    1/1/2023 - 12/31/2023
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="h-10 border-[#D6DAE0] bg-white text-[#374151]">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    More filters
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 border-[#D6DAE0] bg-white text-[#374151]">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {paginatedCustomers.length} of {totalCustomers} customers
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[#E3E5E8] bg-[#FAFBFC] p-4">
              <h2 className="text-lg font-semibold text-[#1A1F2B]">Customer Leaderboard</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Revenue and customer activity trend in a separate analytics section.
              </p>
            </div>
          )}
        </div>
      </div>

      {activeSection === "customers" ? (
        <>
          {selectedCustomerIds.length > 0 ? (
            <div className="rounded-2xl border border-[#E3E5E8] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-[#1A1F2B]">
                  {selectedCustomerIds.length} customer{selectedCustomerIds.length > 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="h-9" onClick={handleExportSelectedCustomers}>
                    Export selected
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-9"
                    onClick={() => setIsBulkDeleteOpen(true)}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    {bulkDeleteMutation.isPending ? "Deleting..." : "Delete selected"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9"
                    onClick={() => setRowSelectionModel({ type: "include", ids: new Set() })}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#E3E5E8] bg-white shadow-sm">
            <Paper sx={{ height: 640, width: "100%", borderRadius: "1rem", overflow: "hidden", boxShadow: "none" }}>
              <DataGrid
                rows={customerRows}
                columns={customerColumns}
                loading={isLoading}
                paginationMode="server"
                rowCount={totalCustomers}
                pageSizeOptions={[10, 20, 50]}
                paginationModel={{ page: Math.max(0, customerPage - 1), pageSize: customerPageSize }}
                onPaginationModelChange={(model) => {
                  if (model.page + 1 !== customerPage) {
                    setCustomerPage(model.page + 1);
                    setExpandedId(null);
                    setRowSelectionModel({ type: "include", ids: new Set() });
                  }
                }}
                checkboxSelection
                disableRowSelectionOnClick
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={(selection) => {
                  setRowSelectionModel(selection);
                }}
                onRowClick={(params) => {
                  handleOpenCustomerPanel(String(params.id));
                }}
                getRowHeight={() => 96}
                sx={{
                  border: 0,
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#F8FAFC",
                    borderBottom: "1px solid #E5E7EB",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "#6B7280",
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: "1px solid #EEF2F7",
                    alignItems: "center",
                    py: 0,
                  },
                  "& .customer-info-cell": {
                    alignItems: "flex-start",
                  },
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "#F8FAFF",
                  },
                  "& .MuiDataGrid-row.Mui-selected": {
                    backgroundColor: "#EEF4FF",
                  },
                  "& .MuiCheckbox-root": {
                    color: "#9CA3AF",
                  },
                }}
              />
            </Paper>
          </div>

          <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <Pagination
              currentPage={customerPage}
              totalPages={customerTotalPages}
              onPageChange={(page) => {
                setCustomerPage(page);
                setExpandedId(null);
                setRowSelectionModel({ type: "include", ids: new Set() });
              }}
              totalItems={totalCustomers}
              pageSize={customerPageSize}
            />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[#E3E5E8] bg-white p-5 shadow-sm">
          <CustomerSpendingChart
            customers={chartCustomers}
            timeRange={chartTimeRange}
            onTimeRangeChange={setChartTimeRange}
          />
        </div>
      )}

      <Sheet
        open={Boolean(expandedId)}
        onOpenChange={(open) => {
          if (!open) {
            setExpandedId(null);
            setExpandedOrderId(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[620px] overflow-y-auto p-0 bg-white">
          <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
            <SheetTitle className="text-base font-semibold text-[#1A1F2B]">Customer Details</SheetTitle>
          </SheetHeader>
          <div className="px-6 py-5">
            {detailLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading customer details...
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Customer Summary</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-semibold text-[#1A1F2B]">{detail.firstName} {detail.lastName}</p>
                    <p className="text-muted-foreground">{displayEmptyField(detail.email)}</p>
                    <p className="text-muted-foreground">{displayEmptyField(detail.phoneNumber)}</p>
                    <p className="text-muted-foreground">Joined {new Date(detail.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Customer Address</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4" />
                      <div>
                        <p>{displayEmptyField(detail.deliveryAddress?.street || latestOrder?.deliveryAddress || "", "N/A")}</p>
                        {(detail.deliveryAddress?.city || detail.deliveryAddress?.region) ? (
                          <p>
                            {[displayEmptyField(detail.deliveryAddress?.city, ""), displayEmptyField(detail.deliveryAddress?.region, "")].filter(Boolean).join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Commercial Stats</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/60 bg-white p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Lifetime Orders</p>
                      <p className="mt-1 text-lg font-semibold text-[#1A1F2B]">{ordersLoading ? "..." : orders.length}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-white p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Website Orders</p>
                      <p className="mt-1 text-lg font-semibold text-[#1A1F2B]">{ordersLoading ? "..." : selectedCustomerOnlineOrders}</p>
                    </div>
                    <div className="col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-primary/70">Total Revenue</p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {formatPrice(ordersLoading ? detail.totalSpent : selectedCustomerRevenue)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent Order Summary</p>
                  {ordersLoading ? (
                    <p className="mt-3 text-sm text-muted-foreground">Loading recent order...</p>
                  ) : latestOrder ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="font-semibold text-[#1A1F2B]">Order #{latestOrder.id.slice(0, 8)}</p>
                      <p className="text-muted-foreground">Placed {new Date(latestOrder.createdAt).toLocaleString()}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "h-6 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            latestOrderPaymentState === "Paid"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : latestOrderPaymentState === "Unpaid"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700",
                          )}
                        >
                          {latestOrderPaymentState}
                        </Badge>
                        <Badge variant="secondary" className="h-6 text-[10px] uppercase tracking-[0.12em]">
                          {latestOrder.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Payment method: <span className="font-medium text-foreground">{latestOrder.paymentMethod || "N/A"}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{formatPrice(latestOrder.total)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Items: <span className="font-medium text-foreground">{latestOrder.items.length}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No orders found for this customer.</p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Order History</h4>
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                      {ordersLoading ? "Loading..." : `${orders.length} orders`}
                    </Badge>
                  </div>
                  <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {ordersLoading ? (
                      <div className="rounded-xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
                        Loading order history...
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
                        No transactions found
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div
                          key={order.id}
                          className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/5 p-3 transition-colors hover:bg-muted/10"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-primary shadow-sm">
                              <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-bold">Order #{order.id.slice(0, 8)}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <Badge
                                  className={cn(
                                    "h-4 border-0 px-1.5 text-[9px] leading-none uppercase",
                                    order.source === "pos"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                                  )}
                                >
                                  {order.source === "pos" ? "POS" : "ONLINE"}
                                </Badge>
                              </div>

                              <div className="mt-2 space-y-1">
                                {order.items.slice(0, 3).map((it, idx) => (
                                  <div key={`${order.id}-${idx}`} className="flex items-center justify-between gap-3">
                                    <span className="max-w-[200px] truncate text-[10px] text-muted-foreground">{it.name}</span>
                                    <span className="text-[10px] font-semibold text-foreground">{it.quantity}x</span>
                                  </div>
                                ))}
                                {order.items.length > 3 ? (
                                  <div className="text-[10px] text-muted-foreground">+{order.items.length - 3} more items</div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                                className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary hover:text-primary/80"
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-3 w-3 transition-transform",
                                    expandedOrderId === order.id && "rotate-90",
                                  )}
                                />
                                Order details
                              </button>

                              {expandedOrderId === order.id ? (
                                <div className="mt-3 rounded-lg border border-border/60 bg-background/80 p-3">
                                  <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                                    <MapPin className="mt-0.5 h-3 w-3" />
                                    <span>{displayEmptyField(order.deliveryAddress, "N/A")}</span>
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {order.items.map((item, index) => (
                                      <div key={`${order.id}-item-${index}`} className="flex items-center gap-3">
                                        <div className="h-9 w-9 overflow-hidden rounded-md border border-border bg-muted/30">
                                          {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                                              N/A
                                            </div>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-xs font-semibold">{item.name}</p>
                                          <p className="text-[10px] text-muted-foreground">Qty {item.quantity}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <div className="text-xs font-bold">{formatPrice(order.total)}</div>
                              <div className="text-[10px] capitalize text-muted-foreground">{order.paymentMethod}</div>
                              <div
                                className={cn(
                                  "text-[10px] font-semibold uppercase tracking-tighter",
                                  order.status === "completed" || order.status === "issued"
                                    ? "text-green-600"
                                    : "text-yellow-600",
                                )}
                              >
                                {order.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">Unable to load customer details.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Customer Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" required className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" required className="rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="customer@example.com" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" name="phoneNumber" placeholder="e.g. 9812345678" className="rounded-lg" />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-full">Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending} className="rounded-full bg-[#2C3E2D] hover:bg-[#1A251B] text-white">
                {addMutation.isPending ? "Saving..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Edit Customer Profile</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input id="edit-firstName" name="firstName" defaultValue={editingCustomer.firstName} required className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input id="edit-lastName" name="lastName" defaultValue={editingCustomer.lastName} required className="rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editingCustomer.email} className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input id="edit-phoneNumber" name="phoneNumber" defaultValue={editingCustomer.phoneNumber || ""} className="rounded-lg" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)} className="rounded-full">Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} className="rounded-full bg-[#2C3E2D] hover:bg-[#1A251B] text-white">
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-destructive">Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deletingCustomer?.firstName} {deletingCustomer?.lastName}</strong> from your records.
              This action cannot be undone, although their order history will remain in the database for accounting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-destructive">Delete selected customers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{selectedCustomerIds.length}</strong> selected customers from your records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={bulkDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedCustomerIds)}
              className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={bulkDeleteMutation.isPending || selectedCustomerIds.length === 0}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
