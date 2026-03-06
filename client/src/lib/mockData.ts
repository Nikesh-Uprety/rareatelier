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
    name: "KEHARMETTEN JENUE",
    sku: "SKU-1024",
    price: 278.00,
    stock: 12,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "S", color: "Black" },
      { size: "M", color: "Black" },
      { size: "L", color: "Black" },
      { size: "XL", color: "Black" }
    ],
    description: "Discover the pinnacle of street fashion with the Keharmetten Jenue jacket. This piece is meticulously crafted for those who command attention and appreciate the fine details in urban wear."
  },
  {
    id: "p_2",
    name: "RED DSTR WASS",
    sku: "SKU-0882",
    price: 359.00,
    stock: 5,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Black" }
    ]
  },
  {
    id: "p_3",
    name: "MACIAH WARR",
    sku: "SKU-1156",
    price: 179.00,
    stock: 15,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Black" }
    ]
  },
  {
    id: "p_4",
    name: "SCREAM LIGHT-SHIRT",
    sku: "SKU-0991",
    price: 280.00,
    stock: 25,
    category: "Tops",
    images: ["https://images.unsplash.com/photo-1544022613-e87ce71c8599?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Black" }
    ]
  },
  {
    id: "p_5",
    name: "WFKSHLETT-SHIRT",
    sku: "SKU-2041",
    price: 139.00,
    stock: 10,
    category: "Bottoms",
    images: ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800"],
    variants: [
      { size: "M", color: "Black" }
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
];
