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
  // HOODIES
  {
    id: "h_1",
    name: "TWO-WAY ZIP-HOODIE-BLACK",
    sku: "HOODIE-001",
    price: 3200,
    stock: 15,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-7962.webp"],
    variants: [{ size: "M", color: "Black" }, { size: "L", color: "Black" }],
    description: "Premium two-way zip hoodie in black. Perfect for layering and street style."
  },
  {
    id: "h_2",
    name: "TWO-WAY ZIP HOODIE-MELANGE GREY",
    sku: "HOODIE-002",
    price: 3200,
    stock: 12,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-milance-grey-front-2731.webp"],
    variants: [{ size: "M", color: "Melange Grey" }]
  },
  {
    id: "h_3",
    name: "TWO-WAY ZIP HOODIE-NAVY BLUE",
    sku: "HOODIE-003",
    price: 3200,
    stock: 10,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-blue-front-2356.webp"],
    variants: [{ size: "M", color: "Navy Blue" }]
  },
  {
    id: "h_5",
    name: "ESSENTIAL HOODIE-JET BLACK",
    sku: "HOODIE-005",
    price: 3200,
    stock: 20,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-6214.webp"],
    variants: [{ size: "L", color: "Jet Black" }]
  },
  
  // TROUSERS
  {
    id: "tr_1",
    name: "ESSENTIAL SWEATPANTS-STONE GREY",
    sku: "TROUSER-001",
    price: 2450,
    stock: 18,
    category: "Bottoms",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-ash-grey-1256.webp"],
    variants: [{ size: "M", color: "Stone Grey" }]
  },
  {
    id: "tr_5",
    name: "SMOKEY BLACK RELAXED FIT TROUSER",
    sku: "TROUSER-005",
    price: 1750,
    stock: 25,
    category: "Bottoms",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-7793.webp"],
    variants: [{ size: "L", color: "Smokey Black" }]
  },

  // TSHIRTS
  {
    id: "ts_1",
    name: "THE MINIMALIST VII",
    sku: "TSHIRT-001",
    price: 1850,
    stock: 30,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-back-5041.webp"],
    variants: [{ size: "M", color: "Black" }]
  },

  // WINTER '25 (Unique items)
  {
    id: "w25_1",
    name: "CREW SWEATSHIRT- BLUE",
    sku: "W25-001",
    price: 2450,
    stock: 12,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-crew-sweatshirt-blue-0831.webp"],
    variants: [{ size: "M", color: "Blue" }]
  },
  {
    id: "w25_5",
    name: "WIDE RIB QUARTER PULLOVER-CREAM",
    sku: "W25-005",
    price: 2600,
    stock: 8,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-cream-3993.webp"],
    variants: [{ size: "M", color: "Cream" }]
  },
  {
    id: "w25_30",
    name: "BEIGE Mid Weight Fleece JACKET",
    sku: "W25-030",
    price: 3000,
    stock: 5,
    category: "Tops",
    images: ["https://wsrv.nl/?w=800&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-beige-7907.webp"],
    variants: [{ size: "L", color: "Beige" }]
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
  { id: "o_1", orderNumber: "UX-2025-0042", customerName: "Guest User", customerEmail: "guest@example.com", date: "Mar 6, 2025", items: 1, status: "Completed", amount: 3200.00 },
];
