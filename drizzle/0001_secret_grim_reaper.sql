CREATE TABLE "banks" (
	"id" text PRIMARY KEY NOT NULL,
	"outlet_id" text NOT NULL,
	"name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banks" ADD CONSTRAINT "banks_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;