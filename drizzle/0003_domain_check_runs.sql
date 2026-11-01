CREATE TABLE "domain_check_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "domainId" text NOT NULL,
  "checkedAt" timestamp (3) DEFAULT now() NOT NULL,
  "result" jsonb NOT NULL,
  "error" text
);
--> statement-breakpoint
ALTER TABLE "domain_check_runs" ADD CONSTRAINT "domain_check_runs_domainId_domains_id_fk"
  FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "domain_check_runs_domainId_checkedAt_idx" ON "domain_check_runs" USING btree ("domainId", "checkedAt");
