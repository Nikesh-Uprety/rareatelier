import { apiRequest } from "./queryClient";

export interface ProductApi {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  stock: number;
}

export interface OrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
}

export interface OrderInput {
  items: OrderItemInput[];
  shipping: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentMethod: string;
}

export async function fetchProducts(filters?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ProductApi[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const url =
    "/api/products" + (params.toString() ? `?${params.toString()}` : "");

  const res = await apiRequest("GET", url);
  const json = (await res.json()) as { success: boolean; data: ProductApi[] };
  return json.data;
}

export async function fetchProductById(id: string): Promise<ProductApi | null> {
  const res = await apiRequest("GET", `/api/products/${id}`);
  const json = (await res.json()) as {
    success: boolean;
    data?: ProductApi;
  };
  return json.data ?? null;
}

export async function createOrder(data: OrderInput) {
  const res = await apiRequest("POST", "/api/orders", data);
  return (await res.json()) as {
    success: boolean;
    data?: { orderNumber: string; total: number; order: { id: string } };
    error?: string;
  };
}

