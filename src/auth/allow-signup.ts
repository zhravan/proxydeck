import { count } from "drizzle-orm";
import { db } from "../db/client";
import { user } from "../db/schema";

export async function allowSignup(): Promise<boolean> {
  const [row] = await db.select({ c: count() }).from(user);
  const n = Number(row?.c ?? 0);
  return n === 0;
}
