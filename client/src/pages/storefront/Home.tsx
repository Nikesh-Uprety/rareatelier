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
                <p className="font-medium text-lg">${product.price.toFixed(2)}</p>
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
                <p className="text-muted-foreground text-xs mt-1">${product.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-32 bg-muted/50 text-center border-y">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-serif font-medium mb-4">Join the Urban Community</h2>
          <p className="text-muted-foreground mb-10">Sign up for early access to new drops and exclusive stories.</p>
          <form className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
            <input 
              className="flex-grow bg-background border border-border px-6 py-4 focus:outline-none focus:ring-1 focus:ring-primary" 
              placeholder="Enter your email" 
              type="email"
              required
            />
            <button className="bg-primary text-primary-foreground px-10 py-4 font-medium text-sm tracking-widest uppercase hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}