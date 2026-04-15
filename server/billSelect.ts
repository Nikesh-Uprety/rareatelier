import { sql } from "drizzle-orm";

import { bills } from "../shared/schema";

export const billSelectColumns = {
  id: bills.id,
  billNumber: bills.billNumber,
  orderId: bills.orderId,
  customerId: bills.customerId,
  customerName: bills.customerName,
  customerEmail: bills.customerEmail,
  customerPhone: bills.customerPhone,
  source: bills.source,
  items: bills.items,
  subtotal: bills.subtotal,
  taxRate: bills.taxRate,
  taxAmount: bills.taxAmount,
  discountAmount: bills.discountAmount,
  totalAmount: bills.totalAmount,
  paymentMethod: bills.paymentMethod,
  isPaid: bills.isPaid,
  deliveryRequired: bills.deliveryRequired,
  deliveryProvider: bills.deliveryProvider,
  deliveryAddress: bills.deliveryAddress,
  trackingToken: sql<string | null>`null`,
  cashReceived: bills.cashReceived,
  changeGiven: bills.changeGiven,
  processedBy: bills.processedBy,
  processedById: bills.processedById,
  notes: bills.notes,
  billType: bills.billType,
  status: bills.status,
  createdAt: bills.createdAt,
};
