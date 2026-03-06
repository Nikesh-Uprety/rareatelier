import { useState } from "react";
import { useRoute } from "wouter";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const { toast } = useToast();
  const product = MOCK_PRODUCTS.find(p => p.id === params?.id);
  const addItem = useCartStore(state => state.addItem);
  
  const [selectedVariant, setSelectedVariant] = useState(product?.variants[0]);
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const colors = Array.from(new Set(product.variants.map(v => v.color)));
  const sizes = Array.from(new Set(product.variants.map(v => v.size)));

  const handleAddToCart = () => {
    if (selectedVariant) {
      addItem(product, selectedVariant, quantity);
      toast({ title: "Added to bag" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-32 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-16">
        <div className="flex-1 space-y-4">
          <div className="aspect-[4/5] bg-muted overflow-hidden">
            <img src={product.images[0]} className="w-full h-full object-cover" />
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
          <p className="text-2xl font-light mb-8">Rs.{product.price.toFixed(2)}</p>

          <div className="space-y-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Color</p>
              <div className="flex gap-3">
                {colors.map(c => (
                  <button key={c} className={`w-8 h-8 rounded-full border-2 ${selectedVariant?.color === c ? 'border-black' : 'border-transparent'}`} style={{ backgroundColor: c.toLowerCase() }} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Size</p>
              <div className="flex gap-2">
                {sizes.map(s => (
                  <button key={s} className={`w-12 h-10 border text-xs font-medium transition-all ${selectedVariant?.size === s ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-black'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Quantity</p>
              <div className="flex items-center border border-gray-200 w-fit">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50">-</button>
                <span className="w-10 text-center text-sm">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50">+</button>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button onClick={handleAddToCart} className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-none uppercase tracking-[0.2em] text-xs font-bold">
                Add to Bag
              </Button>
              <Button variant="outline" className="w-full h-14 border-black text-black hover:bg-black hover:text-white rounded-none uppercase tracking-[0.2em] text-xs font-bold transition-all">
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
          {MOCK_PRODUCTS.filter(p => p.id !== product.id).slice(0, 4).map(p => (
            <Link key={p.id} href={`/product/${p.id}`} className="group">
              <div className="aspect-[3/4] bg-muted overflow-hidden mb-4">
                <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest">{p.name}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Rs.{p.price.toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}