import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
} from "@/lib/adminApi";
import type { ProductApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const productSchema = z.object({
  name: z.string().min(2, "Name required"),
  category: z.enum([
    "HOODIE",
    "SWEATPANTS",
    "JACKET",
    "PULLOVER",
    "POLO",
    "SWEATSHIRT",
  ]),
  collection: z.string().default("s25w"),
  price: z.coerce.number().min(1, "Price required"),
  stock: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductApi | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
    }),
    [search, categoryFilter],
  );

  const {
    data: products,
    isLoading,
    isError,
  } = useQuery<ProductApi[]>({
    queryKey: ["admin", "products", filters],
    queryFn: () => fetchAdminProducts(filters),
  });

  const addForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "HOODIE",
      collection: "s25w",
      price: 0,
      stock: 0,
      description: "",
    },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "HOODIE",
      collection: "s25w",
      price: 0,
      stock: 0,
      description: "",
    },
  });

  useEffect(() => {
    if (editProduct) {
      editForm.reset({
        name: editProduct.name,
        category: (editProduct.category as ProductFormValues["category"]) ??
          "HOODIE",
        collection: "s25w",
        price: Number(editProduct.price),
        stock: editProduct.stock,
        description: editProduct.description ?? "",
      });
    }
  }, [editProduct, editForm]);

  const addMutation = useMutation({
    mutationFn: async (values: ProductFormValues) =>
      createAdminProduct({
        name: values.name,
        description: values.description ?? "",
        price: values.price,
        imageUrl: null,
        category: values.category,
        stock: values.stock,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast({ title: "Product added" });
      setAddOpen(false);
      addForm.reset({
        name: "",
        category: "HOODIE",
        collection: "s25w",
        price: 0,
        stock: 0,
        description: "",
      });
    },
    onError: () => {
      toast({ title: "Failed to add product" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!editProduct) throw new Error("No product selected");
      return updateAdminProduct(editProduct.id, {
        name: values.name,
        description: values.description ?? "",
        price: values.price,
        category: values.category,
        stock: values.stock,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast({ title: "Product updated" });
      setEditOpen(false);
      setEditProduct(null);
    },
    onError: () => {
      toast({ title: "Failed to update product" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminProduct(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "products"] });
      const previous = queryClient.getQueryData<ProductApi[]>([
        "admin",
        "products",
        filters,
      ]);
      if (previous) {
        queryClient.setQueryData<ProductApi[]>(
          ["admin", "products", filters],
          previous.filter((p) => p.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["admin", "products", filters],
          context.previous,
        );
      }
      toast({ title: "Failed to delete product" });
    },
    onSuccess: () => {
      toast({ title: "Product deleted" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || (p.category ?? "").toLowerCase() ===
          categoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">
            {filteredProducts.length} products • All
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <Button
              className="bg-[#2C3E2D] hover:bg-[#1A251B] text-white dark:bg-primary dark:text-primary-foreground"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
            <SheetContent
              side="right"
              className="sm:max-w-[480px] w-full overflow-y-auto"
            >
              <SheetHeader className="mb-6">
                <SheetTitle>Add New Product</SheetTitle>
              </SheetHeader>
              <Form {...addForm}>
                <form
                  onSubmit={addForm.handleSubmit((values) =>
                    addMutation.mutate(values),
                  )}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Basic Info
                    </h3>
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Two-Way Zip Hoodie" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="HOODIE">Hoodie</SelectItem>
                              <SelectItem value="SWEATPANTS">
                                Sweatpants
                              </SelectItem>
                              <SelectItem value="JACKET">Jacket</SelectItem>
                              <SelectItem value="PULLOVER">Pullover</SelectItem>
                              <SelectItem value="POLO">Polo</SelectItem>
                              <SelectItem value="SWEATSHIRT">
                                Sweatshirt
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="collection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection</FormLabel>
                          <FormControl>
                            <Input placeholder="s25w" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Pricing &amp; Stock
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (NPR) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Description
                    </h3>
                    <FormField
                      control={addForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              rows={4}
                              placeholder="Short description for this product..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddOpen(false);
                        addForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addMutation.isPending}
                    >
                      Save Product
                    </Button>
                  </div>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9 bg-white dark:bg-card border-[#E5E5E0] dark:border-border rounded-full h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          <Button 
            variant={categoryFilter === "all" ? "default" : "outline"}
            className={`rounded-full ${categoryFilter === "all" ? "bg-[#2C3E2D] text-white dark:bg-primary" : "bg-white dark:bg-card border-[#E5E5E0] dark:border-border"}`}
            onClick={() => setCategoryFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={categoryFilter === "tops" ? "default" : "ghost"}
            className={`rounded-full ${categoryFilter === "tops" ? "bg-[#2C3E2D] text-white dark:bg-primary" : ""}`}
            onClick={() => setCategoryFilter("tops")}
          >
            Tops
          </Button>
          <Button 
            variant={categoryFilter === "bottoms" ? "default" : "ghost"}
            className={`rounded-full ${categoryFilter === "bottoms" ? "bg-[#2C3E2D] text-white dark:bg-primary" : ""}`}
            onClick={() => setCategoryFilter("bottoms")}
          >
            Bottoms
          </Button>
          <Button 
            variant={categoryFilter === "accessories" ? "default" : "ghost"}
            className={`rounded-full ${categoryFilter === "accessories" ? "bg-[#2C3E2D] text-white dark:bg-primary" : ""}`}
            onClick={() => setCategoryFilter("accessories")}
          >
            Accessories
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading || isError
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border overflow-hidden"
              >
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-20 bg-muted animate-pulse" />
                  <div className="h-4 w-40 bg-muted animate-pulse" />
                  <div className="h-3 w-24 bg-muted animate-pulse" />
                </div>
              </div>
            ))
          : filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-card rounded-xl border border-[#E5E5E0] dark:border-border overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="aspect-[4/3] bg-muted relative">
                  <button
                    type="button"
                    onClick={() => {
                      setEditProduct(product);
                      setEditOpen(true);
                    }}
                    className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 shadow-sm transition-opacity"
                    aria-label="Edit product"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <img
                    src={product.imageUrl ?? ""}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {product.category}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mr-2 -mt-2 text-muted-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(product.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-serif font-medium text-lg mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 truncate">
                    {product.category ?? "Uncategorized"}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-medium">
                      {formatPrice(product.price)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`border-none ${
                        product.stock > 10
                          ? "bg-[#E8F3EB] text-[#2C5234] dark:bg-green-950 dark:text-green-300"
                          : product.stock > 0
                            ? "bg-[#FFF4E5] text-[#8C5A14] dark:bg-yellow-950 dark:text-yellow-300"
                            : "bg-[#FDECEC] text-[#9A2D2D] dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {product.stock} in stock
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="right"
          className="sm:max-w-[480px] w-full overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editProduct ? `Edit — ${editProduct.name}` : "Edit Product"}
            </SheetTitle>
          </SheetHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((values) =>
                editMutation.mutate(values),
              )}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Basic Info
                </h3>
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Two-Way Zip Hoodie" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HOODIE">Hoodie</SelectItem>
                          <SelectItem value="SWEATPANTS">
                            Sweatpants
                          </SelectItem>
                          <SelectItem value="JACKET">Jacket</SelectItem>
                          <SelectItem value="PULLOVER">Pullover</SelectItem>
                          <SelectItem value="POLO">Polo</SelectItem>
                          <SelectItem value="SWEATSHIRT">
                            Sweatshirt
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="collection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection</FormLabel>
                      <FormControl>
                        <Input placeholder="s25w" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Pricing &amp; Stock
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (NPR) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Description
                </h3>
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Short description for this product..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Variants
                </h3>
                <p className="text-xs text-muted-foreground">
                  Variants are currently managed via seed data or API. Editing
                  from the dashboard will be added later.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setEditProduct(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editMutation.isPending || !editProduct}
                  >
                    Save Changes
                  </Button>
                </div>

                {editProduct && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full mt-4"
                      >
                        Delete Product
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete this product?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone. All variant and image data will
                          be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteMutation.mutate(editProduct.id, {
                              onSuccess: () => {
                                setEditOpen(false);
                                setEditProduct(null);
                              },
                            });
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}