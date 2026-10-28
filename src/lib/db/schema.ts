import { randomUUID } from "node:crypto";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { VehicleType } from "@/lib/types";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// Better Auth tables
// ---------------------------------------------------------------------------

export const outlets = pgTable("outlets", {
  id: id(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  receiptFooter: text("receipt_footer"),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  ...timestamps(),
});

export const user = pgTable("user", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("kasir"),
  phone: text("phone"),
  outletId: text("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
  dailyRate: integer("daily_rate").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps(),
});

export const session = pgTable("session", {
  id: id(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps(),
});

export const account = pgTable("account", {
  id: id(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps(),
});

export const verification = pgTable("verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps(),
});

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

export const servicePackages = pgTable(
  "service_packages",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    vehicleType: text("vehicle_type").notNull(),
    price: integer("price").notNull(),
    durationMin: integer("duration_min").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    unique("service_packages_outlet_vehicle_name_unique").on(
      table.outletId,
      table.vehicleType,
      table.name,
    ),
  ],
);

export const addons = pgTable(
  "addons",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    unitLabel: text("unit_label").notNull().default("pcs"),
    vehicleTypes: jsonb("vehicle_types")
      .$type<VehicleType[]>()
      .notNull()
      .default(["motor", "mobil"]),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [unique("addons_outlet_name_unique").on(table.outletId, table.name)],
);

export const banks = pgTable("banks", {
  id: id(),
  outletId: text("outlet_id")
    .notNull()
    .references(() => outlets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps(),
});

export const customers = pgTable("customers", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  ...timestamps(),
});

export const vehicles = pgTable("vehicles", {
  id: id(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  plate: text("plate").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  brand: text("brand"),
  color: text("color"),
  ...timestamps(),
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    clientId: text("client_id").unique(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    invoiceNo: text("invoice_no").notNull(),
    vehicleType: text("vehicle_type").notNull(),
    status: text("status").notNull().default("menunggu"),
    queueSeq: integer("queue_seq").notNull(),
    queuePrefix: text("queue_prefix").notNull(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    vehicleId: text("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    plate: text("plate"),
    total: integer("total").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    grandTotal: integer("grand_total").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
    cancelledBy: text("cancelled_by").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (table) => [
    unique("orders_outlet_invoice_unique").on(table.outletId, table.invoiceNo),
  ],
);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  refId: text("ref_id"),
  nameSnapshot: text("name_snapshot").notNull(),
  priceSnapshot: integer("price_snapshot").notNull(),
  qty: integer("qty").notNull().default(1),
  subtotal: integer("subtotal").notNull(),
  ...timestamps(),
});

export const payments = pgTable("payments", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  amount: integer("amount").notNull(),
  tender: integer("tender"),
  changeAmount: integer("change_amount"),
  bank: text("bank"),
  referenceNo: text("reference_no"),
  proofUrl: text("proof_url"),
  verifiedBy: text("verified_by").references(() => user.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps(),
});

export const attendance = pgTable("attendance", {
  id: id(),
  outletId: text("outlet_id")
    .notNull()
    .references(() => outlets.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status").notNull(),
  checkIn: timestamp("check_in", { withTimezone: true }),
  checkOut: timestamp("check_out", { withTimezone: true }),
  note: text("note"),
  recordedBy: text("recorded_by")
    .notNull()
    .references(() => user.id),
  ...timestamps(),
});

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    status: text("status").notNull().default("draft"),
    generatedBy: text("generated_by").references(() => user.id, { onDelete: "set null" }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    unique("payroll_runs_outlet_period_unique").on(table.outletId, table.period),
  ],
);

export const payrollItems = pgTable("payroll_items", {
  id: id(),
  payrollRunId: text("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  daysPresent: integer("days_present").notNull().default(0),
  dailyRate: integer("daily_rate").notNull().default(0),
  overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).notNull().default("0"),
  gross: integer("gross").notNull().default(0),
  deductions: integer("deductions").notNull().default(0),
  net: integer("net").notNull().default(0),
  ...timestamps(),
});

export const cashShifts = pgTable("cash_shifts", {
  id: id(),
  outletId: text("outlet_id")
    .notNull()
    .references(() => outlets.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  openedBy: text("opened_by")
    .notNull()
    .references(() => user.id),
  openingCash: integer("opening_cash").notNull().default(0),
  closedBy: text("closed_by").references(() => user.id, { onDelete: "set null" }),
  closingCash: integer("closing_cash"),
  expectedCash: integer("expected_cash"),
  difference: integer("difference"),
  note: text("note"),
  ...timestamps(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  outletId: text("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ...timestamps(),
});

export type AppDatabase = NodePgDatabase<typeof import("./schema")>;
