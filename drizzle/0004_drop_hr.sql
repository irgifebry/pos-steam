DROP TABLE "attendance" CASCADE;--> statement-breakpoint
DROP TABLE "payroll_items" CASCADE;--> statement-breakpoint
DROP TABLE "payroll_runs" CASCADE;--> statement-breakpoint
ALTER TABLE "outlets" DROP COLUMN "default_daily_rate";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "daily_rate";