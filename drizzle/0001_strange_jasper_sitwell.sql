CREATE TABLE "infrastructure_servers" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" text NOT NULL,
	"region" text,
	"name" text NOT NULL,
	"role" text,
	"environment" text,
	"notes" text,
	"consoleUrl" text,
	"runbookUrl" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"linkedDomainIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "infrastructure_servers" ADD CONSTRAINT "infrastructure_servers_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;