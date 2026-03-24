export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number | null;
  salePercentage?: number | null;
  saleActive?: boolean | null;
  stock: number;
  category: string;
  images: string[];
  variants: { size: string; color: string }[];
  description?: string;
}

export const MOCK_PRODUCTS: Product[] = [
  // HOODIE
  {
    id: "h_1",
    name: "TWO-WAY ZIP-HOODIE-BLACK",
    sku: "HOODIE-001",
    price: 3200,
    stock: 15,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-7962.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },
  {
    id: "h_2",
    name: "TWO-WAY ZIP HOODIE-MELANGE GREY",
    sku: "HOODIE-002",
    price: 3200,
    stock: 12,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-milance-grey-front-2731.webp",
    ],
    variants: [{ size: "M", color: "Melange Grey" }],
  },
  {
    id: "h_3",
    name: "TWO-WAY ZIP HOODIE-NAVY BLUE",
    sku: "HOODIE-003",
    price: 3200,
    stock: 10,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-blue-front-2356.webp",
    ],
    variants: [{ size: "M", color: "Navy Blue" }],
  },
  {
    id: "h_4",
    name: "TWO-WAY ZIP HOODIE-GREEN",
    sku: "HOODIE-004",
    price: 3200,
    stock: 10,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-green-2105.webp",
    ],
    variants: [{ size: "M", color: "Green" }],
  },
  {
    id: "h_5",
    name: "ESSENTIAL HOODIE-JET BLACK",
    sku: "HOODIE-005",
    price: 3200,
    stock: 20,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-6214.webp",
    ],
    variants: [{ size: "L", color: "Jet Black" }],
  },
  {
    id: "h_6",
    name: "ESSENTIAL HOODIE-STONE GRAY",
    sku: "HOODIE-006",
    price: 3200,
    stock: 18,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-grey-back-2315.webp",
    ],
    variants: [{ size: "M", color: "Stone Gray" }],
  },
  {
    id: "h_7",
    name: "ESSENTIAL HOODIE-DEEP MAROON",
    sku: "HOODIE-007",
    price: 3200,
    stock: 16,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-marron-front-2913.webp",
    ],
    variants: [{ size: "M", color: "Deep Maroon" }],
  },
  {
    id: "h_8",
    name: "ESSENTIAL HOODIE-PRUSSIAN BLUE",
    sku: "HOODIE-008",
    price: 3200,
    stock: 16,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-blue-front-6771.webp",
    ],
    variants: [{ size: "M", color: "Prussian Blue" }],
  },
  {
    id: "h_9",
    name: "GREY DUAL ZIP-HOODIE",
    sku: "HOODIE-009",
    price: 2800,
    stock: 14,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-milance-grey-7268.webp",
    ],
    variants: [{ size: "M", color: "Grey" }],
  },
  {
    id: "h_10",
    name: "MOCHA ANTIPEELING HOODIE",
    sku: "HOODIE-010",
    price: 2800,
    stock: 12,
    category: "HOODIE",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-brown-6161.webp",
    ],
    variants: [{ size: "M", color: "Mocha" }],
  },

  // TROUSER
  {
    id: "tr_1",
    name: "ESSENTIAL SWEATPANTS-STONE GREY",
    sku: "TROUSER-001",
    price: 2450,
    stock: 18,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-ash-grey-1256.webp",
    ],
    variants: [{ size: "M", color: "Stone Grey" }],
  },
  {
    id: "tr_2",
    name: "ESSENTIAL SWEATPANTS-DEEP MAROON",
    sku: "TROUSER-002",
    price: 2450,
    stock: 18,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-beige-3777.webp",
    ],
    variants: [{ size: "M", color: "Deep Maroon" }],
  },
  {
    id: "tr_3",
    name: "ESSENTIAL SWEATPANTS-PRUSSIAN BLUE",
    sku: "TROUSER-003",
    price: 2450,
    stock: 18,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-green-1925.webp",
    ],
    variants: [{ size: "M", color: "Prussian Blue" }],
  },
  {
    id: "tr_4",
    name: "ESSENTIAL SWEATPANTS-JET BLACK",
    sku: "TROUSER-004",
    price: 2450,
    stock: 18,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-grey-4295.webp",
    ],
    variants: [{ size: "M", color: "Jet Black" }],
  },
  {
    id: "tr_5",
    name: "SMOKEY BLACK RELAXED FIT TROUSER",
    sku: "TROUSER-005",
    price: 1750,
    stock: 25,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-7793.webp",
    ],
    variants: [{ size: "L", color: "Smokey Black" }],
  },
  {
    id: "tr_6",
    name: "ASH GREY RELAXED FIT TROUSER",
    sku: "TROUSER-006",
    price: 1750,
    stock: 25,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-grey-front-8501.webp",
    ],
    variants: [{ size: "L", color: "Ash Grey" }],
  },
  {
    id: "tr_7",
    name: "OFF WHITE WAFFLE TROUSER",
    sku: "TROUSER-007",
    price: 1750,
    stock: 20,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-cream-01-5969.webp",
    ],
    variants: [{ size: "M", color: "Off White" }],
  },
  {
    id: "tr_8",
    name: "MOCHA WAFFLE TROUSER",
    sku: "TROUSER-008",
    price: 1750,
    stock: 20,
    category: "TROUSER",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-brown-01-2488.webp",
    ],
    variants: [{ size: "M", color: "Mocha" }],
  },

  // TSHIRTS
  {
    id: "ts_1",
    name: "THE MINIMALIST VII",
    sku: "TSHIRT-001",
    price: 1850,
    stock: 30,
    category: "TSHIRTS",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-back-5041.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },
  {
    id: "ts_2",
    name: "THE MINIMALIST VI",
    sku: "TSHIRT-002",
    price: 1850,
    stock: 30,
    category: "TSHIRTS",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-v2-front-5960.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },

  // WINTER '25
  {
    id: "w25_1",
    name: "CREW SWEATSHIRT- BLUE",
    sku: "W25-001",
    price: 2450,
    stock: 12,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-crew-sweatshirt-blue-0831.webp",
    ],
    variants: [{ size: "M", color: "Blue" }],
  },
  {
    id: "w25_2",
    name: "COLLAR POLO-BLACK",
    sku: "W25-002",
    price: 2400,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-4507.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },
  {
    id: "w25_3",
    name: "COLLAR POLO-MELANGE GREY",
    sku: "W25-003",
    price: 2400,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-milance-3757.webp",
    ],
    variants: [{ size: "M", color: "Melange Grey" }],
  },
  {
    id: "w25_4",
    name: "COLLAR POLO-NAVY",
    sku: "W25-004",
    price: 2400,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-8195.webp",
    ],
    variants: [{ size: "M", color: "Navy" }],
  },
  {
    id: "w25_5",
    name: "WIDE RIB QUARTER PULLOVER-CREAM",
    sku: "W25-005",
    price: 2600,
    stock: 8,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-cream-3993.webp",
    ],
    variants: [{ size: "M", color: "Cream" }],
  },
  {
    id: "w25_6",
    name: "WIDE RIB QUARTER PULLOVER-GREEN",
    sku: "W25-006",
    price: 2600,
    stock: 8,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-green-3069.webp",
    ],
    variants: [{ size: "M", color: "Green" }],
  },
  {
    id: "w25_7",
    name: "WIDE RIB QUARTER ZIP PULLOVER-BROWN",
    sku: "W25-007",
    price: 2600,
    stock: 8,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-brown(1)-9592.webp",
    ],
    variants: [{ size: "M", color: "Brown" }],
  },
  {
    id: "w25_8",
    name: "TWO-WAY ZIP-HOODIE-BLACK",
    sku: "W25-008",
    price: 3200,
    stock: 12,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-7962.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },
  {
    id: "w25_9",
    name: "TWO-WAY ZIP HOODIE-MELANGE GREY",
    sku: "W25-009",
    price: 3200,
    stock: 12,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-milance-grey-front-2731.webp",
    ],
    variants: [{ size: "M", color: "Melange Grey" }],
  },
  {
    id: "w25_10",
    name: "TWO-WAY ZIP HOODIE-NAVY BLUE",
    sku: "W25-010",
    price: 3200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-blue-front-2356.webp",
    ],
    variants: [{ size: "M", color: "Navy Blue" }],
  },
  {
    id: "w25_11",
    name: "TWO-WAY ZIP HOODIE-GREEN",
    sku: "W25-011",
    price: 3200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-green-2105.webp",
    ],
    variants: [{ size: "M", color: "Green" }],
  },
  {
    id: "w25_12",
    name: "ESSENTIAL SWEATPANTS-STONE GREY",
    sku: "W25-012",
    price: 2450,
    stock: 18,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-ash-grey-1256.webp",
    ],
    variants: [{ size: "M", color: "Stone Grey" }],
  },
  {
    id: "w25_13",
    name: "ESSENTIAL SWEATPANTS-DEEP MAROON",
    sku: "W25-013",
    price: 2450,
    stock: 18,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-beige-3777.webp",
    ],
    variants: [{ size: "M", color: "Deep Maroon" }],
  },
  {
    id: "w25_14",
    name: "ESSENTIAL SWEATPANTS-PRUSSIAN BLUE",
    sku: "W25-014",
    price: 2450,
    stock: 18,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-green-1925.webp",
    ],
    variants: [{ size: "M", color: "Prussian Blue" }],
  },
  {
    id: "w25_15",
    name: "ESSENTIAL SWEATPANTS-JET BLACK",
    sku: "W25-015",
    price: 2450,
    stock: 18,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-grey-4295.webp",
    ],
    variants: [{ size: "M", color: "Jet Black" }],
  },
  {
    id: "w25_16",
    name: "ESSENTIAL HOODIE-JET BLACK",
    sku: "W25-016",
    price: 3200,
    stock: 20,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-front-6214.webp",
    ],
    variants: [{ size: "L", color: "Jet Black" }],
  },
  {
    id: "w25_17",
    name: "ESSENTIAL HOODIE-STONE GRAY",
    sku: "W25-017",
    price: 3200,
    stock: 18,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-grey-back-2315.webp",
    ],
    variants: [{ size: "M", color: "Stone Gray" }],
  },
  {
    id: "w25_18",
    name: "ESSENTIAL HOODIE-DEEP MAROON",
    sku: "W25-018",
    price: 3200,
    stock: 16,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-marron-front-2913.webp",
    ],
    variants: [{ size: "M", color: "Deep Maroon" }],
  },
  {
    id: "w25_19",
    name: "ESSENTIAL HOODIE-PRUSSIAN BLUE",
    sku: "W25-019",
    price: 3200,
    stock: 16,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-blue-front-6771.webp",
    ],
    variants: [{ size: "M", color: "Prussian Blue" }],
  },
  {
    id: "w25_20",
    name: "BEIGE DUAL ZIP-HOODIE",
    sku: "W25-020",
    price: 2800,
    stock: 14,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-cream-2567.webp",
    ],
    variants: [{ size: "M", color: "Beige" }],
  },
  {
    id: "w25_21",
    name: "ASH GREY DUAL ZIP-HOODIE",
    sku: "W25-021",
    price: 2800,
    stock: 14,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-ash-grey-3006.webp",
    ],
    variants: [{ size: "M", color: "Ash Grey" }],
  },
  {
    id: "w25_22",
    name: "GREEN DUAL ZIP HOODIE",
    sku: "W25-022",
    price: 2800,
    stock: 14,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-ash-grey-copy-2298.webp",
    ],
    variants: [{ size: "M", color: "Green" }],
  },
  {
    id: "w25_23",
    name: "GREY DUAL ZIP-HOODIE",
    sku: "W25-023",
    price: 2800,
    stock: 14,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-milance-grey-7268.webp",
    ],
    variants: [{ size: "M", color: "Grey" }],
  },
  {
    id: "w25_24",
    name: "SUEDE BLACK 1/2 ZIP UP",
    sku: "W25-024",
    price: 2200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-img_0508-4816.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },
  {
    id: "w25_25",
    name: "SUEDE BEIGE 1/2 ZIP",
    sku: "W25-025",
    price: 2200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-img_0515-4365.webp",
    ],
    variants: [{ size: "M", color: "Beige" }],
  },
  {
    id: "w25_26",
    name: "SUEDE GREY QUARTER ZIP",
    sku: "W25-026",
    price: 2200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-img_9145-9677.webp",
    ],
    variants: [{ size: "M", color: "Grey" }],
  },
  {
    id: "w25_27",
    name: "SUEDE NAVY BLUE QUARTER ZIP",
    sku: "W25-027",
    price: 2200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-img_9147-6936.webp",
    ],
    variants: [{ size: "M", color: "Navy Blue" }],
  },
  {
    id: "w25_28",
    name: "SUEDE BEIGE QUARTER ZIP",
    sku: "W25-028",
    price: 2200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-img_9146-8773.webp",
    ],
    variants: [{ size: "M", color: "Beige" }],
  },
  {
    id: "w25_29",
    name: "SUEDE BLACK QUARTER ZIP",
    sku: "W25-029",
    price: 2200,
    stock: 10,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-img_9144-1742.webp",
    ],
    variants: [{ size: "M", color: "Black" }],
  },
  {
    id: "w25_30",
    name: "BEIGE MID WEIGHT FLEECE JACKET",
    sku: "W25-030",
    price: 3000,
    stock: 5,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-beige-7907.webp",
    ],
    variants: [{ size: "L", color: "Beige" }],
  },
  {
    id: "w25_31",
    name: "BLUE MID WEIGHT FLEECE JACKET",
    sku: "W25-031",
    price: 3000,
    stock: 5,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-blue-6719.webp",
    ],
    variants: [{ size: "L", color: "Blue" }],
  },
  {
    id: "w25_32",
    name: "GREY MID WEIGHT FLEECE JACKET",
    sku: "W25-032",
    price: 3000,
    stock: 5,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-grey-4706.webp",
    ],
    variants: [{ size: "L", color: "Grey" }],
  },
  {
    id: "w25_33",
    name: "BLACK MID WEIGHT FLEECE JACKET",
    sku: "W25-033",
    price: 3000,
    stock: 5,
    category: "WINTER_25",
    images: [
      "https://wsrv.nl/?w=560&url=https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-black-3424.webp",
    ],
    variants: [{ size: "L", color: "Black" }],
  },
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
