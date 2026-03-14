import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Tags, Trash2, Edit2, Copy, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { fetchAdminPromoCodes, createAdminPromoCode, updateAdminPromoCode, deleteAdminPromoCode, type PromoCode } from "@/lib/adminApi";

const promoSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(50),
  discountPct: z.coerce.number().min(1, "Discount must be at least 1%").max(100),
  maxUses: z.coerce.number().min(1, "Must allow at least 1 use"),
  active: z.boolean().default(true),
});

type PromoFormValues = z.infer<typeof promoSchema>;

export default function AdminPromoCodes() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["admin", "promo-codes"],
    queryFn: fetchAdminPromoCodes,
  });

  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      code: "",
      discountPct: 10,
      maxUses: 100,
      active: true,
    },
  });

  const handleEditClick = (promo: PromoCode) => {
    form.reset({
      code: promo.code,
      discountPct: promo.discountPct,
      maxUses: promo.maxUses,
      active: promo.active,
    });
    setEditingPromo(promo);
    setIsAddOpen(true);
  };

  const handleAddClick = () => {
    form.reset({
      code: "",
      discountPct: 10,
      maxUses: 100,
      active: true,
    });
    setEditingPromo(null);
    setIsAddOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: PromoFormValues) => {
      if (editingPromo) {
        return updateAdminPromoCode(editingPromo.id, values);
      } else {
        return createAdminPromoCode(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
      toast({ title: editingPromo ? "Promo Code Updated" : "Promo Code Created" });
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Operation failed", description: err.message || "Failed to save promo code", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminPromoCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promo-codes"] });
      toast({ title: "Promo Code Deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete promo code", variant: "destructive" });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">Promo Codes</h1>
          <p className="text-muted-foreground mt-1">Manage discount codes</p>
        </div>
        <Button onClick={handleAddClick} className="bg-[#2C3E2D] hover:bg-[#1A251B] text-white dark:bg-primary dark:text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Create Promo
        </Button>
      </div>

      <div className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold px-6">Code</TableHead>
              <TableHead className="font-semibold">Discount</TableHead>
              <TableHead className="font-semibold">Uses</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="text-right px-6 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 opacity-60">
                  <div className="flex justify-center mb-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C3E2D] dark:border-primary"></div>
                  </div>
                  Loading promo codes...
                </TableCell>
              </TableRow>
            ) : promos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 opacity-60">
                  <Tags className="w-8 h-8 md:w-10 md:h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm">No promo codes found.</p>
                </TableCell>
              </TableRow>
            ) : (
              promos.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="px-6 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm uppercase tracking-wider font-bold">
                        {promo.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(promo.code)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedCode === promo.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">{promo.discountPct}%</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min(100, (promo.usedCount / promo.maxUses) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {promo.usedCount} / {promo.maxUses}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${promo.active ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm capitalize">{promo.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(promo.createdAt || new Date()), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#2C3E2D] hover:bg-[#2C3E2D]/10 dark:text-gray-300 dark:hover:bg-muted"
                        onClick={() => handleEditClick(promo)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => {
                          if (confirm(`Delete promo code ${promo.code}?`)) {
                            deleteMutation.mutate(promo.id!);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SUMMER25" className="uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Uses</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <p className="text-[10px] text-muted-foreground">
                        Enable or disable this promo code.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 rounded-none">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  loading={saveMutation.isPending} 
                  loadingText="Saving..."
                  className="bg-[#2C3E2D] text-white hover:bg-[#1A251B] dark:bg-primary dark:text-primary-foreground"
                >
                  Save Code
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
