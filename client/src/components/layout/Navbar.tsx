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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-background border-b border-gray-100 dark:border-border">
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-12">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-black tracking-tighter uppercase transition-colors hover:opacity-80">
              RARENP
            </Link>
          </div>

          <nav className="hidden md:flex items-center bg-gray-50 dark:bg-muted/50 rounded-full px-2 py-1 space-x-1">
            <Link href="/" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${location === '/' ? 'bg-white dark:bg-background shadow-sm' : 'text-muted-foreground hover:text-primary'}`}>Home</Link>
            <Link href="/products" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${location === '/products' ? 'bg-white dark:bg-background shadow-sm' : 'text-muted-foreground hover:text-primary'}`}>Shop</Link>
            <Link href="/products?collection=new" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${location.includes('collection=new') ? 'bg-white dark:bg-background shadow-sm' : 'text-muted-foreground hover:text-primary'}`}>New Collection</Link>
            <Link href="/contact" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${location === '/contact' ? 'bg-white dark:bg-background shadow-sm' : 'text-muted-foreground hover:text-primary'}`}>Contact</Link>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
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

            <Link href="/cart" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors relative">
              <ShoppingBag className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold">{cartItemsCount}</span>
              )}
            </Link>
            
            <Link href="/login">
              <Button variant="default" className="rounded-full px-6 bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 h-10 text-xs uppercase tracking-widest font-bold">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}