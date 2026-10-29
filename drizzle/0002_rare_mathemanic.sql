ALTER TABLE "orders" ADD COLUMN "business_date" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "default_daily_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "allowance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD COLUMN "overtime_pay" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_outlet_user_date_unique" UNIQUE("outlet_id","user_id","date");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_outlet_date_type_queue_unique" UNIQUE("outlet_id","business_date","vehicle_type","queue_seq");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_unique" UNIQUE("order_id");