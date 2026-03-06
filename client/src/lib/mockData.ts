export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: 'Tops' | 'Bottoms' | 'Accessories' | 'Footwear';
  images: string[];
  variants: { size: string; color: string }[];
  description?: string;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p_1",
    name: "Winds In The North Hoodie",
    sku: "SKU-1024",
    price: 120.00,
    stock: 12,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Navy" },
      { size: "L", color: "Navy" }
    ],
    description: "A heavy-duty pullover hoodie designed for the elements. Features a double-lined hood and reinforced stitching."
  },
  {
    id: "p_2",
    name: "North Expedition Parka",
    sku: "SKU-0882",
    price: 380.00,
    stock: 5,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Slate" },
      { size: "L", color: "Slate" }
    ],
    description: "Our signature parka, tested in the harshest conditions. Fur-lined hood and waterproof exterior."
  },
  {
    id: "p_3",
    name: "Wine in the Sheater",
    sku: "SKU-1156",
    price: 95.00,
    stock: 15,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Charcoal" },
      { size: "L", color: "Charcoal" }
    ]
  },
  {
    id: "p_4",
    name: "New Artislenist Tee",
    sku: "SKU-0991",
    price: 65.00,
    stock: 25,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "S", color: "Navy" },
      { size: "M", color: "Navy" }
    ]
  },
  {
    id: "p_5",
    name: "The Manang Sweatshirt",
    sku: "SKU-2041",
    price: 145.00,
    stock: 10,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Sage" },
      { size: "L", color: "Sage" }
    ]
  },
  {
    id: "p_6",
    name: "Haade-Herris Jacket",
    sku: "SKU-2055",
    price: 210.00,
    stock: 8,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1544022613-e87ce71c8599?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Light Grey" }
    ]
  }
];

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  items: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  amount: number;
}

export const MOCK_ORDERS: Order[] = [
  { id: "o_1", orderNumber: "UX-2025-0042", customerName: "Mia Laurent", customerEmail: "mia.laurent@email.com", date: "Mar 1, 2025", items: 3, status: "Completed", amount: 485.00 },
  { id: "o_2", orderNumber: "UX-2025-0041", customerName: "James Okafor", customerEmail: "james.o@email.com", date: "Mar 1, 2025", items: 1, status: "Pending", amount: 120.00 },
  { id: "o_3", orderNumber: "UX-2025-0040", customerName: "Sofia Reyes", customerEmail: "s.reyes@email.com", date: "Feb 28, 2025", items: 2, status: "Completed", amount: 275.00 },
];
