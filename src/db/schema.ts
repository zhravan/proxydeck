import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { DomainEnrichment } from "../domains/enrichment/types";

/** Better Auth core + username plugin */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("displayUsername"),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
    mode: "date",
    precision: 3,
  }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
    mode: "date",
    precision: 3,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
});

export const configHistory = pgTable("config_history", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  payload: jsonb("payload").notNull(),
  provider: text("provider").notNull(),
  comment: text("comment"),
});

/** User-scoped domain portfolio (manual fields; automated checks come in a later phase). */
export const domains = pgTable(
  "domains",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull(),
    registrarName: text("registrarName"),
    expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }),
    notes: text("notes"),
    /** Last server-side public lookup (RDAP, DNS, TLS, optional geo). */
    enrichment: jsonb("enrichment").$type<DomainEnrichment | null>(),
    enrichedAt: timestamp("enrichedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("domains_userId_hostname_unique").on(t.userId, t.hostname)]
);

export const authSchema = {
  user,
  session,
  account,
  verification,
};
