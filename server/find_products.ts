
import { db } from "./db";
import { products } from "@shared/schema";
import { ilike } from "drizzle-orm";

async function findProducts() {
  const p1 = await db.select().from(products).where(ilike(products.name, "%TWO-WAY ZIP%"));
  const p2 = await db.select().from(products).where(ilike(products.name, "%ESSENTIAL HOODIE%"));
  
  console.log("TWO-WAY ZIP match:");
  console.log(JSON.stringify(p1, null, 2));
  
  console.log("\nESSENTIAL HOODIE match:");
  console.log(JSON.stringify(p2, null, 2));
  
  process.exit(0);
}

findProducts().catch(err => {
  console.error(err);
  process.exit(1);
});
