import { db } from "./server/db";
import { users } from "./shared/schema";

async function run() {
  const allUsers = await db.select().from(users);
  console.log("Users:", allUsers.map(u => ({ id: u.id, email: u.username, profileImageUrl: u.profileImageUrl })));
  process.exit(0);
}
run().catch(console.error);
