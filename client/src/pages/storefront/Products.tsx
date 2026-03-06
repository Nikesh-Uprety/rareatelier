import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Products() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get('category');
  
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(initialCategory || "all");
  
  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || p.category.toLowerCase() === category.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-20 mt-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Collection</h1>
          <p className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Explore our latest drops</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search products..." 
              className="w-full pl-9 h-12 bg-gray-50 border-transparent rounded-none text-sm focus:bg-white focus:ring-1 focus:ring-black transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-48 space-y-10">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Categories</h3>
            <div className="space-y-4">
              {['All', 'Tops', 'Bottoms', 'Accessories'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setCategory(cat.toLowerCase())}
                  className={`block text-xs uppercase tracking-widest transition-colors ${category === cat.toLowerCase() ? 'font-bold text-black' : 'text-muted-foreground hover:text-black'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <Link key={product.id} href={`/product/${product.id}`} className="group block">
                <div className="aspect-[3/4] overflow-hidden bg-gray-50 mb-4 relative">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[10px] uppercase tracking-widest truncate">{product.name}</h3>
                  <p className="text-muted-foreground text-[10px]">Rs.{product.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center uppercase text-[10px] tracking-widest font-bold text-muted-foreground">
              No products found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}