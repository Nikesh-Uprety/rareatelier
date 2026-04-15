import { db } from "../db";
import { bills, orders, orderItems, products, productVariants, customers } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import type { Bill } from "../../shared/schema";
import { billSelectColumns } from "../billSelect";

// Generates next bill number: RARE-INV-000123
async function generateBillNumber(): Promise<string> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM bills`
  );
  const count = parseInt((result.rows[0] as any).count, 10) + 1;
  return `RARE-INV-${String(count).padStart(6, "0")}`;
}

// Auto-called when order status changes to "completed"
export async function generateBillFromOrder(
  orderId: string,
  processedById: string,
  processedByName: string
): Promise<Bill> {
  // Fetch order with all fields needed
  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      email: orders.email,
      fullName: orders.fullName,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      source: orders.source,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new Error(`Order ${orderId} not found`);

  // Look up customer phone by email
  let customerPhone: string | null = null;
  if (order.email) {
    const [customer] = await db
      .select({ phoneNumber: customers.phoneNumber })
      .from(customers)
      .where(eq(customers.email, order.email))
      .limit(1);
    if (customer) {
      customerPhone = customer.phoneNumber;
    }
  }

  // Check if bill already exists for this order
  const [existing] = await db
    .select(billSelectColumns)
    .from(bills)
    .where(eq(bills.orderId, orderId))
    .limit(1);

  if (existing) return existing;

  // Fetch order items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  // Build bill items from order items with color, size, sku from productVariants
  const billItems = await Promise.all(
    items.map(async (item) => {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      let variantColor = "";
      let size = item.size || "";
      let sku = "";

      if (item.variantId) {
        const [variant] = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId))
          .limit(1);
        if (variant) {
          variantColor = variant.color || "";
          size = variant.size || size;
          sku = variant.sku || "";
        }
      }

      return {
        productId: item.productId,
        productName: product?.name ?? "Unknown Product",
        variantColor,
        size,
        sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: item.quantity * Number(item.unitPrice),
      };
    })
  );

  const subtotal = billItems.reduce((s, i) => s + i.lineTotal, 0);
  const taxRate = 13;
  const taxAmount = Math.round(subtotal * 0.13);
  const totalAmount = Number(order.total);
  const discountAmount = Math.max(0, subtotal + taxAmount - totalAmount);

  const customerName = order.fullName || "Walk-in Customer";

  const billNumber = await generateBillNumber();

  const billId = crypto.randomUUID();

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
      processed_by,
      processed_by_id,
      bill_type,
      status
    ) values (
      ${billId},
      ${billNumber},
      ${orderId},
      ${order.userId ?? null},
      ${customerName},
      ${order.email ?? null},
      ${customerPhone ?? null},
      ${JSON.stringify(billItems)}::jsonb,
      ${String(subtotal)},
      ${String(taxRate)},
      ${String(taxAmount)},
      ${String(discountAmount)},
      ${String(totalAmount)},
      ${order.paymentMethod ?? "card"},
      ${order.source ?? "website"},
      ${processedByName},
      ${processedById},
      ${"sale"},
      ${"issued"}
    )
  `);

  const [newBill] = await db
    .select(billSelectColumns)
    .from(bills)
    .where(eq(bills.id, billId))
    .limit(1);

  if (!newBill) {
    throw new Error(`Failed to load generated bill ${billId}`);
  }

  return newBill;
}

export { generateBillNumber };
