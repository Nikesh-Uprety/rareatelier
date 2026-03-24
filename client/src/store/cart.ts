import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Product } from '@/lib/mockData';
import { apiRequest } from '@/lib/queryClient';

export interface CartItem {
  id: string;
  product: Product;
  variant: { size: string; color: string };
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variant: { size: string; color: string }, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  get subtotal(): number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, variant, quantity = 1) => {
    let shouldNotify = false;
    let notifyPayload: {
      action: "add" | "update" | "remove";
      productName: string;
      size?: string;
      color?: string;
      quantity?: number;
    } | null = null;

    set((state) => {
      // Create a unique ID based on product and variant
      const cartItemId = `${product.id}-${variant.size}-${variant.color}`;
      
      const existingItem = state.items.find(item => item.id === cartItemId);
      if (existingItem) {
        shouldNotify = true;
        notifyPayload = {
          action: "update",
          productName: product.name,
          size: variant.size,
          color: variant.color,
          quantity: existingItem.quantity + quantity,
        };
        return {
          items: state.items.map(item =>
            item.id === cartItemId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        };
      }
      
      shouldNotify = true;
      notifyPayload = {
        action: "add",
        productName: product.name,
        size: variant.size,
        color: variant.color,
        quantity,
      };
      return {
        items: [...state.items, { id: cartItemId, product, variant, quantity }]
      };
    });

    if (shouldNotify && notifyPayload) {
      void apiRequest("POST", "/api/user-activity/cart", notifyPayload).catch(() => {
        // Don't block cart UX if notifications fail.
      });
    }
      },
      removeItem: (id) => {
    let target: CartItem | undefined;
    set((state) => ({
      items: state.items.filter((item) => {
        if (item.id === id) target = item;
        return item.id !== id;
      }),
    }));

    if (target) {
      void apiRequest("POST", "/api/user-activity/cart", {
        action: "remove",
        productName: target.product.name,
        size: target.variant.size,
        color: target.variant.color,
        quantity: target.quantity,
      }).catch(() => {
        // Don't block cart UX if notifications fail.
      });
    }
      },
      updateQuantity: (id, quantity) => {
    let target: CartItem | undefined;
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;
        target = item;
        return { ...item, quantity: Math.max(1, quantity) };
      }),
    }));

    if (target) {
      void apiRequest("POST", "/api/user-activity/cart", {
        action: "update",
        productName: target.product.name,
        size: target.variant.size,
        color: target.variant.color,
        quantity: Math.max(1, quantity),
      }).catch(() => {
        // Don't block cart UX if notifications fail.
      });
    }
      },
      clearCart: () => set({ items: [] }),
      get subtotal() {
        return get().items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      }
    }),
    {
      name: "ra-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
