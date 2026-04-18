import { db } from "../server/db";
import { orders, orderItems, bills, customers, contactMessages } from "../shared/schema";

async function clearData() {
  console.log("Clearing order items...");
  await db.delete(orderItems);
  console.log("Clearing bills...");
  await db.delete(bills);
  console.log("Clearing orders...");
  await db.delete(orders);
  console.log("Clearing customers...");
  await db.delete(customers);
  console.log("Clearing contact messages...");
  await db.delete(contactMessages);
  console.log("Done!");
  process.exit(0);
}

clearData().catch(console.error);
