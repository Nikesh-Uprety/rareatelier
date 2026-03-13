
import { db } from "./db";
import { products } from "@shared/schema";
import { eq, ne, and, sql } from "drizzle-orm";

async function updateFeatured() {
  console.log("Finding exact products by name...");
  
  const name1 = "TWO-WAY ZIP HOODIE-NAVY BLUE";
  const name2 = "ESSENTIAL HOODIE-PRUSSIAN BLUE";

  const [p1] = await db.select().from(products).where(eq(products.name, name1));
  const [p2] = await db.select().from(products).where(eq(products.name, name2));

  if (!p1 || !p2) {
    console.error("Could not find one or both products by name.");
    if (!p1) console.error(`Missing: ${name1}`);
    if (!p2) console.error(`Missing: ${name2}`);
    process.exit(1);
  }

  console.log(`Bumping down other products from rankings 1 and 2...`);
  await db.update(products)
    .set({ ranking: 999 })
    .where(and(ne(products.id, p1.id), ne(products.id, p2.id), sql`ranking <= 2`));

  console.log(`Updating Product 1 (ID: ${p1.id}): ${name1}`);
  await db.update(products).set({
    ranking: 1,
    price: "3200",
    category: "HOODIE",
    shortDetails: "winter'25",
    description: "Essential layers series: DUAL ZIP HOODIE\n400 gsm anti pilling fabric\nMILANGE GRAY / NAVY BLUE / BLACK / GREEN\n\nEssential LAYERS : TWO-WAY ZIP HOODIE",
    imageUrl: "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-blue-front-2356.webp",
    galleryUrls: JSON.stringify([
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-blue-front-2356.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-navy-blue-back-7457.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc03420-5805.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc03423-6408.webp"
    ]),
    sizeOptions: JSON.stringify(["M", "L", "XL"]),
    colorOptions: JSON.stringify(["NAVY BLUE"])
  }).where(eq(products.id, p1.id));

  console.log(`Updating Product 2 (ID: ${p2.id}): ${name2}`);
  await db.update(products).set({
    ranking: 2,
    price: "3200",
    category: "HOODIE",
    shortDetails: "winter'25",
    description: "The Rare Relaxed essential hoodie gets a new build - now with a seamless stitch, kangaroo pocket, and a crisp unwashed finish. It keeps the signature print, and a cleaner, more structured feel. Cut in our heavyweight 400gsm cotton brushed fleece with boxy silhouette.",
    imageUrl: "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-blue-front-6771.webp",
    galleryUrls: JSON.stringify([
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-blue-front-6771.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-blue-back-2985.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc02288-edit-2-8008.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc02294-edit-2-0908.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc02423-edit-2-6934.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc02435-edit-2-7396.webp",
      "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-3-0954.webp"
    ]),
    sizeOptions: JSON.stringify(["M", "L", "XL"]),
    colorOptions: JSON.stringify(["PRUSSIAN BLUE"])
  }).where(eq(products.id, p2.id));

  console.log("Successfully updated featured products and rankings.");
  process.exit(0);
}

updateFeatured().catch(err => {
  console.error("Error updating featured products:", err);
  process.exit(1);
});
