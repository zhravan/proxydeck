CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"forgotPasswordEnabled" boolean DEFAULT false NOT NULL,
	"emailVerificationEnabled" boolean DEFAULT false NOT NULL,
	"requireVerifiedSignIn" boolean DEFAULT false NOT NULL,
	"smtpHost" text DEFAULT '' NOT NULL,
	"smtpPort" integer DEFAULT 587 NOT NULL,
	"smtpSecure" boolean DEFAULT false NOT NULL,
	"smtpUser" text DEFAULT '' NOT NULL,
	"smtpFrom" text DEFAULT '' NOT NULL,
	"smtpPassEncrypted" text,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_settings" ("id") VALUES ('global') ON CONFLICT ("id") DO NOTHING;
