ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "service_packages" ADD COLUMN "royalty_price" integer;