import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, Menu, User, Sun, Moon, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme";
import { useCartStore } from "@/store/cart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { theme, setTheme } = useThemeStore();
  const [location] = useLocation();
  const cartItemsCount = useCartStore(state => state.items.reduce((acc, item) => acc + item.quantity, 0));

  const isStorefront = !location.startsWith('/admin');

  if (!isStorefront) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-12">
        <div className="flex justify-between items-center h-20">
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/products" className="text-sm font-medium hover:text-primary/60 transition-colors">Store</Link>
            <Link href="/products?collection=exclusive" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Exclusive</Link>
            <Link href="/stories" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Stories</Link>
          </nav>

          <div className="flex-1 md:flex-none md:absolute md:left-1/2 md:-translate-x-1/2">
            <Link href="/" className="text-2xl font-bold tracking-[0.2em] uppercase">
              Urban Threads
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  {theme === 'light' && <Sun className="w-5 h-5" />}
                  {theme === 'dark' && <Moon className="w-5 h-5" />}
                  {theme === 'warm' && <Coffee className="w-5 h-5" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('warm')}>Warm</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/admin" className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Account
            </Link>
            
            <Link href="/cart" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline">My Bag ({cartItemsCount})</span>
              {cartItemsCount > 0 && <span className="sm:hidden bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{cartItemsCount}</span>}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}