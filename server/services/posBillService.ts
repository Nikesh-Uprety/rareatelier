import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { bills, customers, orderItems, orders, productVariants, products } from "../../shared/schema";
import { billSelectColumns } from "../billSelect";
import { db } from "../db";
import { storage } from "../storage";
import { generateBillNumber } from "./billService";

type PosSaleItemInput = {
  productId: string;
  productName?: string;
  variantId?: number | string | null;
  variantColor?: string | null;
  color?: string | null;
  size?: string | null;
  selectedSize?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
};

export type PosSaleInput = {
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: PosSaleItemInput[];
  source?: string;
  paymentMethod: string;
  deliveryRequired?: boolean;
  deliveryProvider?: string | null;
  deliveryLocation?: string | null;
  deliveryAddress?: string | null;
  discountAmount?: number;
};

type IssuePosBillFromOrderInput = {
  orderId: string;
  processedById?: string | null;
  processedByName: string;
  isPaid?: boolean;
  cashReceived?: number | null;
  notes?: string | null;
};

function normalizePosSource(source?: string): string {
  return (source || "pos").toLowerCase();
}

function isSocialPosSource(source: string): boolean {
  return !["pos", "website", "store"].includes(source);
}

function buildEffectiveCustomerIdentity(input: PosSaleInput) {
  const effectiveCustomerName = input.customerName?.trim() || "Walk-in Customer";
  const effectiveCustomerEmail =
    input.customerEmail?.trim().toLowerCase() ||
    `pos-${Date.now()}-${Math.round(Math.random() * 1_000_000)}@local.rare`;

  return { effectiveCustomerName, effectiveCustomerEmail };
}

function assertValidPosSaleInput(input: PosSaleInput, normalizedSource: string) {
  if (!input.items.length) {
    throw new Error("At least one POS item is required");
  }

  if (!input.paymentMethod.trim()) {
    throw new Error("Payment method is required");
  }

  if (
    isSocialPosSource(normalizedSource) &&
    (!input.customerName?.trim() ||
      !input.customerPhone?.trim() ||
      !input.deliveryProvider?.trim() ||
      !input.deliveryLocation?.trim())
  ) {
    throw new Error(
      "Customer name, phone, delivery partner and delivery location are required for social orders.",
    );
  }
}

function calculatePosTotals(items: PosSaleItemInput[], discountAmount = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.lineTotal ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0)),
    0,
  );
  const taxAmount = Math.round(subtotal * 0.13);
  const total = subtotal + taxAmount - discountAmount;
  return { subtotal, taxAmount, total };
}

async function getCustomerPhoneByEmail(email: string | null | undefined) {
  if (!email) return null;

  const [customer] = await db
    .select({ phoneNumber: customers.phoneNumber })
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);

  return customer?.phoneNumber ?? null;
}

async function buildBillItems(orderId: string) {
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return Promise.all(
    items.map(async (item) => {
      const [product] = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      let variantColor = item.color || "";
      let size = item.size || "";
      let sku = "";

      if (item.variantId) {
        const [variant] = await db
          .select({
            color: productVariants.color,
            size: productVariants.size,
            sku: productVariants.sku,
          })
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);

        if (variant) {
          variantColor = variant.color || variantColor;
          size = variant.size || size;
          sku = variant.sku || sku;
        }
      }

      const unitPrice = Number(item.unitPrice ?? 0);
      return {
        productId: item.productId,
        productName: product?.name ?? "Unknown Product",
        variantColor,
        size,
        sku,
        quantity: item.quantity,
        unitPrice,
        lineTotal: item.quantity * unitPrice,
      };
    }),
  );
}

async function decrementStockForOrder(orderId: string) {
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    const productId = String(item.productId);
    const size = item.size || null;
    const color = item.color || null;
    const requestedVariantId = item.variantId ? Number(item.variantId) : null;

    let variantToUpdate:
      | { id: number; stock: number | null }
      | undefined;

    if (requestedVariantId) {
      [variantToUpdate] = await db
        .select({ id: productVariants.id, stock: productVariants.stock })
        .from(productVariants)
        .where(eq(productVariants.id, requestedVariantId))
        .limit(1);
    }

    if (!variantToUpdate && size) {
      if (color) {
        [variantToUpdate] = await db
          .select({ id: productVariants.id, stock: productVariants.stock })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, productId),
              eq(productVariants.size, size),
              eq(productVariants.color, color),
            ),
          )
          .limit(1);
      }

      if (!variantToUpdate) {
        [variantToUpdate] = await db
          .select({ id: productVariants.id, stock: productVariants.stock })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, productId),
              eq(productVariants.size, size),
            ),
          )
          .limit(1);
      }
    }

    if (variantToUpdate) {
      const newStock = Math.max(0, (variantToUpdate.stock ?? 0) - Number(item.quantity ?? 0));
      await db
        .update(productVariants)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(productVariants.id, variantToUpdate.id));
    }

    const allVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    if (allVariants.length > 0) {
      const totalStock = allVariants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);

      await db
        .update(products)
        .set({
          stock: totalStock,
          isActive: totalStock > 0 ? sql`${products.isActive}` : false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
      continue;
    }

    const [existingProduct] = await db
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!existingProduct) continue;

    const newStock = Math.max(0, (existingProduct.stock ?? 0) - Number(item.quantity ?? 0));
    await db
      .update(products)
      .set({
        stock: newStock,
        isActive: newStock > 0 ? sql`${products.isActive}` : false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  }
}

export async function createPosOrderSession(input: PosSaleInput) {
  const normalizedSource = normalizePosSource(input.source);
  assertValidPosSaleInput(input, normalizedSource);

  const discountAmount = Number(input.discountAmount ?? 0);
  const { total } = calculatePosTotals(input.items, discountAmount);
  const { effectiveCustomerName, effectiveCustomerEmail } = buildEffectiveCustomerIdentity(input);

  await storage.upsertCustomerFromOrder(
    effectiveCustomerEmail,
    effectiveCustomerName.split(" ").slice(0, 1).join(" ") || "Walk-in",
    effectiveCustomerName.split(" ").slice(1).join(" ") || "Customer",
    input.customerPhone || null,
  );

  const order = await storage.createOrder({
    email: effectiveCustomerEmail,
    fullName: effectiveCustomerName,
    addressLine1: input.deliveryAddress || input.deliveryLocation || "POS Counter",
    addressLine2: null,
    city: input.deliveryLocation || "POS",
    region: input.deliveryLocation || "POS",
    postalCode: "00000",
    country: "Nepal",
    total,
    paymentMethod: input.paymentMethod,
    source: normalizedSource,
    deliveryRequired: isSocialPosSource(normalizedSource) ? true : (input.deliveryRequired ?? false),
    deliveryProvider: input.deliveryProvider ?? null,
    deliveryLocation: input.deliveryLocation ?? null,
    deliveryAddress: input.deliveryAddress ?? null,
    promoDiscountAmount: discountAmount,
    items: input.items.map((item) => ({
      productId: String(item.productId),
      variantId: item.variantId ? Number(item.variantId) : null,
      size: item.size || item.selectedSize || "",
      color: item.variantColor || item.color || null,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
    })),
  });

  return {
    order,
    normalizedSource,
  };
}

export async function issuePosBillFromOrder(input: IssuePosBillFromOrderInput) {
  const [existing] = await db
    .select(billSelectColumns)
    .from(bills)
    .where(eq(bills.orderId, input.orderId))
    .limit(1);

  if (existing) return existing;

  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      email: orders.email,
      fullName: orders.fullName,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      source: orders.source,
      deliveryRequired: orders.deliveryRequired,
      deliveryProvider: orders.deliveryProvider,
      deliveryLocation: orders.locationCoordinates,
      deliveryAddress: orders.deliveryAddress,
      promoDiscountAmount: orders.promoDiscountAmount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);

  if (!order) {
    throw new Error(`Order ${input.orderId} not found`);
  }

  const billItems = await buildBillItems(order.id);
  const subtotal = billItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * 0.13);
  const totalAmount = Number(order.total ?? 0);
  const discountAmount = Math.max(0, subtotal + taxAmount - totalAmount);
  const customerPhone = await getCustomerPhoneByEmail(order.email);
  const billNumber = await generateBillNumber();
  const billId = crypto.randomUUID();
  const cashReceived = input.cashReceived ?? null;
  const change =
    order.paymentMethod === "cash" && cashReceived !== null
      ? Math.max(0, cashReceived - totalAmount)
      : 0;

  await db.execute(sql`
    insert into bills (
      id,
      bill_number,
      order_id,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      items,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total_amount,
      payment_method,
      source,
      is_paid,
      delivery_required,
      delivery_provider,
      delivery_address,
      cash_received,
      change_given,
      processed_by,
      processed_by_id,
      notes,
      bill_type,
      status
    ) values (
      ${billId},
      ${billNumber},
      ${order.id},
      ${order.userId ?? null},
      ${order.fullName || "Walk-in Customer"},
      ${order.email ?? null},
      ${customerPhone ?? null},
      ${JSON.stringify(billItems)}::jsonb,
      ${String(subtotal)},
      ${"13"},
      ${String(taxAmount)},
      ${String(discountAmount)},
      ${String(totalAmount)},
      ${order.paymentMethod ?? "cash"},
      ${order.source ?? "pos"},
      ${input.isPaid ?? true},
      ${order.deliveryRequired ?? false},
      ${order.deliveryProvider ?? null},
      ${order.deliveryLocation
        ? [order.deliveryLocation, order.deliveryAddress].filter(Boolean).join(" — ")
        : (order.deliveryAddress ?? null)},
      ${cashReceived !== null ? String(cashReceived) : null},
      ${change > 0 ? String(change) : null},
      ${input.processedByName},
      ${input.processedById ?? null},
      ${input.notes ?? null},
      ${"pos"},
      ${"issued"}
    )
  `);

  await decrementStockForOrder(order.id);

  if (order.status !== "pos") {
    await storage.updateOrderStatus(order.id, "pos");
  }

  const [bill] = await db
    .select(billSelectColumns)
    .from(bills)
    .where(eq(bills.id, billId))
    .limit(1);

  if (!bill) {
    throw new Error(`Failed to load generated POS bill ${billId}`);
  }

  return bill;
}
