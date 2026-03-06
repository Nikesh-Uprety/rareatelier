import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchProductById, type ProductApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export default function ProductDetail() {
  const [, params] = useRoute<{ id: string }>("/product/:id");
  const { toast } = useToast();
  const addItem = useCartStore((state) => state.addItem);

  const productId = params?.id ?? "";

  const { data: product, isLoading } = useQuery<ProductApi | null>({
    queryKey: ["products", productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
  });

  const [quantity, setQuantity] = useState(1);

  if (isLoading || !product) {
    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-32 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="aspect-[4/5] bg-muted animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse" />
              <div className="h-6 w-1/3 bg-muted animate-pulse" />
              <div className="h-24 w-full bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-32 max-w-7xl text-center">
        <p className="uppercase text-[10px] tracking-widest font-bold text-muted-foreground">
          Product not found.
        </p>
        <Button asChild className="mt-6 rounded-none px-10">
          <Link href="/products">Back to collection</Link>
        </Button>
      </div>
    );
  }

  const colors: string[] = [];
  const sizes: string[] = [];

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        stock: product.stock,
        category: product.category ?? "",
        images: [product.imageUrl ?? ""],
        variants: [],
      },
      { size: "M", color: "Default" },
      quantity,
    );
    toast({ title: "Added to bag" });
  };

  return (
    <div className="container mx-auto px-4 py-32 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-16">
        <div className="flex-1 space-y-4">
          <div className="aspect-[4/5] bg-muted overflow-hidden">
            <img src={product.imageUrl ?? ""} className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="aspect-square bg-muted border-2 border-black" />
            <div className="aspect-square bg-muted" />
            <div className="aspect-square bg-muted" />
            <div className="aspect-square bg-muted" />
          </div>
        </div>

        <div className="w-full lg:w-[450px]">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">{product.name}</h1>
          <p className="text-2xl font-light mb-8">
            {formatPrice(product.price)}
          </p>

          <div className="space-y-8">
            {colors.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">
                  Color
                </p>
                <div className="flex gap-3">
                  {colors.map((c) => (
                    <button
                      key={c}
                      className="w-8 h-8 rounded-full border-2 border-transparent"
                      style={{ backgroundColor: c.toLowerCase() }}
                    />
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">
                  Size
                </p>
                <div className="flex gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      className="w-12 h-10 border text-xs font-medium transition-all border-gray-200 hover:border-black"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Quantity</p>
              <div className="flex items-center border border-gray-200 w-fit">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50">-</button>
                <span className="w-10 text-center text-sm">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50">+</button>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleAddToCart}
                className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-none uppercase tracking-[0.2em] text-xs font-bold"
              >
                Add to Bag
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 border-black text-black hover:bg-black hover:text-white rounded-none uppercase tracking-[0.2em] text-xs font-bold transition-all"
              >
                Buy Now
              </Button>
            </div>

            <div className="pt-10 space-y-6">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold">Product Details</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
              <ul className="text-xs space-y-3 text-muted-foreground list-disc pl-4">
                <li>Fit: Regular fit, designed for comfort and style.</li>
                <li>Material: 100% premium combed cotton.</li>
                <li>Construction: Double-needle hems for durability.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32">
        <h2 className="text-xl font-black uppercase tracking-tighter text-center mb-16">You May Also Like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Related products could be fetched here in a follow-up task */}
        </div>
      </div>
    </div>
  );
}