#!/usr/bin/env python3
"""
Redesign Orders admin page with new minimal design system.
This script applies surgical styling changes while preserving all logic.
"""

import re
import sys

# Read the Orders.tsx file
with open("client/src/pages/admin/Orders.tsx", "r") as f:
    content = f.read()

# REPLACEMENTS: Apply styling updates while preserving logic

# 1. Main container styling
content = re.sub(
    r'return \(\s*<div className="space-y-8 animate-in fade-in duration-500">',
    'return (\n    <div className="min-h-screen bg-[#F4F3EE]">\n      {/* Page Header */}\n      <div className="px-6 py-8 max-w-7xl mx-auto">',
    content,
    count=1
)

# 2. Page header styling
content = re.sub(
    r'<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">\s*<div>\s*<h1 className="text-3xl font-serif font-medium text-\[#2C3E2D\] dark:text-foreground">\s*Orders',
    '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">\n          <div>\n            <h1 className="text-[22px] font-medium text-[#111827]">\n              Orders',
    content,
    count=1
)

# 3. Page subtitle styling
content = re.sub(
    r'<p className="text-muted-foreground mt-1">',
    '<p className="text-[13px] text-[#6B7280] mt-1">',
    content,
    count=1
)

# 4. Add Order button styling
content = re.sub(
    r'<Button onClick=\{\(\) => setLocation\("/admin/orders/new"\)\}>',
    '<Button\n              onClick={() => setLocation("/admin/orders/new")}\n              className="h-9 bg-black text-white text-[13px] font-medium hover:bg-black/85"\n            >',
    content,
    count=1
)

# 5. Update Pagination component location
content = re.sub(
    r'          </div>\s*</div>\s*<Pagination',
    '            <div className="border-t border-[#E5E7EB] pt-3 px-4 flex justify-between items-center">\n              <div className="text-[12px] text-[#6B7280]">\n                Page size:\n                <Select value={orderPageSize.toString()} onValueChange={(v) => setOrderPageSize(Number(v))}>\n                  <SelectTrigger className="h-7 w-20 ml-2 border-[#E5E7EB] text-[12px]">\n                    <SelectValue />\n                  </SelectTrigger>\n                  <SelectContent>\n                    <SelectItem value="15">15</SelectItem>\n                    <SelectItem value="25">25</SelectItem>\n                    <SelectItem value="50">50</SelectItem>\n                  </SelectContent>\n                </Select>\n              </div>\n              <Pagination',
    content,
    count=1
)

# 6. Close Pagination wrapper
content = re.sub(
    r'(onChange=\{setOrderPage\}\s*\/>\s*)',
    r'\1\n            </div>',
    content,
    count=1
)

# 7. Update section toggle styling
content = re.sub(
    r'<div className="inline-flex w-fit rounded-xl border border-\[#D6DAE0\] bg-\[#F9FAFB\] p-1">',
    '<div className="inline-flex w-fit rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-1 mb-8">',
    content,
    count=1
)

# 8. Update toggle button classes - Orders button
content = re.sub(
    r'className=\{cn\(\s*"rounded-lg px-4 py-2 text-sm font-medium transition-colors",\s*activeSection === "orders" \? "bg-white text-\[#111827\] shadow-sm" : "text-\[#6B7280\] hover:text-\[#111827\]",\s*\)\}\s*onClick=\{\(\) => setActiveSection\("orders"\)\}',
    'className={cn(\n            "rounded-md px-4 py-2 text-[13px] font-medium transition-colors",\n            activeSection === "orders"\n              ? "bg-white text-[#111827] border border-[#E5E7EB]"\n              : "text-[#6B7280] hover:text-[#111827]",\n          )}\n          onClick={() => setActiveSection("orders")}',
    content,
    count=1
)

# 9. Update toggle button classes - Chart button
content = re.sub(
    r'className=\{cn\(\s*"rounded-lg px-4 py-2 text-sm font-medium transition-colors",\s*activeSection === "chart" \? "bg-white text-\[#111827\] shadow-sm" : "text-\[#6B7280\] hover:text-\[#111827\]",\s*\)\}\s*onClick=\{\(\) => setActiveSection\("chart"\)\}',
    'className={cn(\n            "rounded-md px-4 py-2 text-[13px] font-medium transition-colors",\n            activeSection === "chart"\n              ? "bg-white text-[#111827] border border-[#E5E7EB]"\n              : "text-[#6B7280] hover:text-[#111827]",\n          )}\n          onClick={() => setActiveSection("chart")}',
    content,
    count=1
)

# 10. Update filters bar styling - close opening <> and open filters container
content = re.sub(
    r'<>\s*<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">',
    '<>\n          {/* Filters Bar */}\n          <div className="px-6 max-w-7xl mx-auto">\n            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">',
    content,
    count=1
)

# 11. Update status tabs styling
content = re.sub(
    r'className=\{cn\(\s*"px-3 py-1\.5 rounded-full text-xs font-medium border transition-all",\s*\(tab === \'All\' \? statusFilter === \'all\' : statusFilter === tab\.toLowerCase\(\)\)\s*\? "bg-primary text-primary-foreground border-primary"\s*: "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"\s*\)\s*\}',
    'className={cn(\n                      "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all",\n                      (tab === \'All\' ? statusFilter === \'all\' : statusFilter === tab.toLowerCase())\n                        ? "bg-[#111827] text-white border-[#111827]"\n                        : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#111827] hover:text-[#111827]"\n                    )}',
    content,
    count=1
)

# 12. Update time range select styling
content = re.sub(
    r'<div className="flex items-center gap-1\.5 bg-white dark:bg-card border border-\[#E5E5E0\] dark:border-border rounded-lg px-2 py-1 shadow-sm">',
    '<div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-lg px-2 py-1.5">',
    content,
    count=1
)

# 13. Update Clock icon styling
content = re.sub(
    r'<Clock className="h-3 w-3 text-muted-foreground" />',
    '<Clock className="h-3.5 w-3.5 text-[#6B7280]" />',
    content,
    count=1
)

# 14. Update SelectTrigger styling
content = re.sub(
    r'<SelectTrigger className="h-7 border-0 bg-transparent px-0 shadow-none focus:ring-0 text-xs font-medium">',
    '<SelectTrigger className="h-6 border-0 bg-transparent px-0 shadow-none focus:ring-0 text-[12px] font-medium">',
    content,
    count=1
)

# 15. Update search input styling
content = re.sub(
    r'<Input\s*placeholder="Search orders, customers\.\.\."\s*data-testid="admin-orders-search"\s*className="pl-9 bg-white dark:bg-card border-\[#E5E5E0\] dark:border-border rounded-full h-11"',
    '<Input\n                    placeholder="Search orders, customers..."\n                    data-testid="admin-orders-search"\n                    className="pl-9 bg-white border-[#E5E7EB] rounded-lg h-9 text-[13px]"',
    content,
    count=1
)

# 16. Update search input wrapper
content = re.sub(
    r'<div className="relative w-full sm:w-72">',
    '<div className="relative flex-1 sm:flex-none sm:w-72">',
    content,
    count=1
)

# 17. Update Search icon styling
content = re.sub(
    r'<Search className="absolute left-3 top-1\/2 -translate-y-1\/2 h-4 w-4 text-muted-foreground" />',
    '<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />',
    content,
    count=1
)

# 18. Update Clear button styling
content = re.sub(
    r'className="absolute right-3 top-1\/2 -translate-y-1\/2 text-xs text-muted-foreground hover:text-foreground"',
    'className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#6B7280] hover:text-[#111827]"',
    content,
    count=1
)

# 19. Update filters bar closing div and table card opening
content = re.sub(
    r'</div>\s*</div>\s*<div className="bg-white dark:bg-card rounded-xl border border-\[#E5E5E0\] dark:border-border overflow-hidden">',
    '              </div>\n            </div>\n          </div>\n\n          {/* Table Card */}\n          <div className="px-6 max-w-7xl mx-auto mb-8">\n            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">',
    content,
    count=1
)

# 20. Update table header styling
content = re.sub(
    r'<thead className="bg-transparent border-b border-\[#E5E5E0\] dark:border-border text-xs uppercase text-muted-foreground font-semibold tracking-wider">',
    '<thead className="bg-transparent border-b border-[#E5E7EB] text-[11px] uppercase text-[#6B7280] font-semibold tracking-[0.06em]">',
    content,
    count=1
)

# 21. Update table header cell padding
content = re.sub(
    r'<th className="px-3 py-3 font-medium whitespace-nowrap text-center">',
    '<th className="px-4 py-3 font-semibold whitespace-nowrap text-center">',
    content
)
content = re.sub(
    r'<th className="px-3 py-3 font-medium text-left">',
    '<th className="px-4 py-3 font-semibold text-left">',
    content
)
content = re.sub(
    r'<th className="px-3 py-3 font-medium whitespace-nowrap text-left">',
    '<th className="px-4 py-3 font-semibold whitespace-nowrap text-left">',
    content
)
content = re.sub(
    r'<th className="px-3 py-3 font-medium whitespace-nowrap text-right">',
    '<th className="px-4 py-3 font-semibold whitespace-nowrap text-right">',
    content
)

# 22. Update tbody styling
content = re.sub(
    r'<tbody className="divide-y divide-\[#E5E5E0\] dark:divide-border">',
    '<tbody className="divide-y divide-[#F3F4F6]">',
    content,
    count=1
)

# Save the modified content
with open("client/src/pages/admin/Orders.tsx", "w") as f:
    f.write(content)

print("✓ Orders.tsx redesign script completed")
