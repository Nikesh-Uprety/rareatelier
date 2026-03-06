import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MOCK_PRODUCTS } from "@/lib/mockData";

export default function Home() {
  const featuredProducts = MOCK_PRODUCTS.slice(0, 2);
  const newArrivals = MOCK_PRODUCTS.slice(2, 6);

  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative h-[calc(100vh-80px)] w-full overflow-hidden">
        <img 
          alt="Minimalist street style" 
          className="w-full h-full object-cover" 
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center text-center text-white p-4">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="font-serif text-5xl md:text-7xl lg:text-9xl font-bold leading-tight tracking-tight">
              Beyond Trends.<br />Beyond Time.
            </h1>
            <p className="mt-6 text-lg md:text-xl tracking-[0.3em] uppercase opacity-90">
              Authenticity In Motion
            </p>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-2xl md:text-4xl italic font-serif text-foreground/80 leading-relaxed">
            "Products are made in a factory but brands are created in the mind."
          </p>
          <p className="mt-8 text-sm tracking-widest uppercase text-muted-foreground">— Walter Landor</p>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-24 container mx-auto px-6 max-w-7xl">
        <h2 className="text-2xl font-medium mb-12 uppercase tracking-widest">Featured Collection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {featuredProducts.map((product) => (
            <Link key={product.id} href={`/product/${product.id}`} className="group cursor-pointer">
              <div className="overflow-hidden bg-muted aspect-[4/5]">
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
              </div>
              <div className="mt-6 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{product.name}</h3>
                  <p className="text-muted-foreground text-sm uppercase tracking-wider mt-1">{product.category}</p>
                </div>
                <p className="font-medium text-lg">Rs.{product.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Journey Section */}
      <section className="relative h-[80vh] w-full overflow-hidden">
        <img 
          alt="Brand journey" 
          className="w-full h-full object-cover" 
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center text-center text-white p-4">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl md:text-6xl font-bold mb-4">Explore the journey behind</h2>
            <p className="text-xl opacity-90 font-light">our Urban collection.</p>
            <Button variant="outline" className="mt-8 rounded-none px-12 py-6 border-white text-white hover:bg-white hover:text-black transition-all">
              Read Story
            </Button>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24 container mx-auto px-6 max-w-7xl">
        <h2 className="text-2xl font-medium text-center mb-16 uppercase tracking-widest">New Arrivals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {newArrivals.map((product) => (
            <Link key={product.id} href={`/product/${product.id}`} className="group cursor-pointer">
              <div className="overflow-hidden bg-muted aspect-[3/4]">
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium">{product.name}</h3>
                <p className="text-muted-foreground text-xs mt-1">Rs.{product.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer / Newsletter */}
      <footer className="bg-[#111111] text-white py-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-1">
              <h2 className="text-3xl font-black tracking-tighter mb-6">RARE</h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Khusibu, Nayabazar, Kathmandu<br />
                (+977)-9705208960<br />
                rarenepal999@gmail.com
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs">Legals</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Policy</Link></li>
                <li><Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs">FIND US</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Facebook</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs">Newsletter</h4>
              <p className="text-sm text-gray-400 mb-4">Join the community for early access.</p>
              <form className="flex">
                <input className="bg-transparent border-b border-gray-700 py-2 flex-1 focus:outline-none focus:border-white transition-colors text-sm" placeholder="Email Address" />
                <button className="ml-4 text-sm font-bold uppercase tracking-widest">Join</button>
              </form>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-gray-500">
            <p>© 2025 Rare Nepal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}