import { pgTable, serial, text, boolean, integer, timestamp, json, jsonb, numeric, bigint, unique, index } from "drizzle-orm/pg-core";
import { relations, sql, eq, or, isNull, and, desc } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  menuKey: text("menu_key").notNull(),
  canView: boolean("can_view").default(true).notNull(),
  canInput: boolean("can_input").default(true).notNull(),
  canEdit: boolean("can_edit").default(true).notNull(),
  canDelete: boolean("can_delete").default(true).notNull(),
  canExport: boolean("can_export").default(true).notNull(),
  canPrint: boolean("can_print").default(true).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  authorizedDashboards: json("authorized_dashboards").$type<string[]>().default(["gudang"]).notNull(),
  permissions: json("permissions").$type<Record<string, { view: boolean, input: boolean, edit: boolean, delete: boolean, export?: boolean, print?: boolean, viewAll?: boolean }>>().notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  branchId: integer("branch_id"), // Nullable for superadmin or unassigned
  authorizedDashboards: json("authorized_dashboards").$type<string[]>().default(["gudang"]).notNull(),
  role: text("role"), // Preset role name (legacy, still used for display)
  roleId: integer("role_id").references(() => roles.id),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  usePpn: boolean("use_ppn").default(false).notNull(),
});

export const userBranches = pgTable("user_branches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  branchId: integer("branch_id").notNull(),
});

export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(), 
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// === TABLE DEFINITIONS ===
export const expeditions = pgTable("expeditions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").default(true).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  branchId: integer("branch_id"),
  city: text("city"),
  priceType: text("price_type").default("retail").notNull(),
});

export const salesCustomers = pgTable("sales_customers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  branchId: integer("branch_id"),
  city: text("city"),
  priceType: text("price_type").default("retail").notNull(),
  totalPoint: integer("total_point").default(0).notNull(),
  totalLabel: integer("total_label").default(0).notNull(),
  totalClaim: integer("total_claim").default(0).notNull(),
  totalPromo: bigint("total_promo", { mode: 'number' }).default(0).notNull(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  inputDate: timestamp("input_date").defaultNow().notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: integer("customer_id").notNull(),
  totalNotes: integer("total_notes").notNull(),
  expeditionId: integer("expedition_id").notNull(),
  destination: text("destination").notNull(),
  notes: text("notes"),
  merekId: integer("merek_id").references(() => promoBrands.id),
  branchId: integer("branch_id"),
  
  // Status: "MENUNGGU_VERIFIKASI" | "SIAP_KIRIM" | "DALAM_PENGIRIMAN" | "TERKIRIM"
  status: text("status").default("MENUNGGU_VERIFIKASI").notNull(),
  
  // Verifikasi Gudang / Packing
  totalBoxes: integer("total_boxes"),
  verificationDate: timestamp("verification_date"),
  packerName: text("packer_name"),
  
  // Pengiriman
  senderName: text("sender_name"),
  receiptNumber: text("receipt_number"),
  shippingDate: timestamp("shipping_date"),
  shippingNotes: text("shipping_notes"),
  
  // Pengembalian Faktur
  invoiceReturned: boolean("invoice_returned").default(false).notNull(),
  returnedDate: timestamp("returned_date"),
  invoiceProcessed: boolean("invoice_processed").default(false).notNull(),
}, (t) => ({
  branchIdx: index("shipments_branch_idx").on(t.branchId),
  statusIdx: index("shipments_status_idx").on(t.status),
  dateIdx: index("shipments_date_idx").on(t.inputDate),
  customerIdx: index("shipments_customer_idx").on(t.customerId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // LOGIN, CREATE, UPDATE, DELETE
  resource: text("resource").notNull(), // shipments, users, branches
  details: text("details"), // JSON string or description
  branchId: integer("branch_id").references(() => branches.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("audit_logs_user_idx").on(t.userId),
  branchIdx: index("audit_logs_branch_idx").on(t.branchId),
  timeIdx: index("audit_logs_time_idx").on(t.timestamp),
}));

export const promos = pgTable("promos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").default(true).notNull(),
  bannerUrl: text("banner_url"),
  branchId: integer("branch_id"), // Nullable for global promos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  brandCode: text("brand_code").notNull(),
  wholesalePrice: bigint("wholesale_price", { mode: 'number' }).notNull().default(0),
  semiWholesalePrice: bigint("semi_wholesale_price", { mode: 'number' }).notNull().default(0),
  retailPrice: bigint("retail_price", { mode: 'number' }).notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id),
}, (t) => ({
  unq: unique().on(t.code, t.branchId),
  branchIdx: index("items_branch_idx").on(t.branchId),
}));

export const taxes = pgTable("taxes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rate: numeric("rate").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
});

export const itemStocks = pgTable("item_stocks", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  stock: integer("stock").notNull().default(0),
}, (t) => ({
  unq: unique().on(t.code, t.branchId),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  salesmanId: integer("salesman_id").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  shopName: text("shop_name").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  expeditionName: text("expedition_name").notNull(),
  totalAmount: bigint("total_amount", { mode: 'number' }).notNull(),
  ppnRate: numeric("ppn_rate").default("0").notNull(),
  ppnAmount: bigint("ppn_amount", { mode: 'number' }).default(0).notNull(),
  finalTotal: bigint("final_total", { mode: 'number' }).notNull(),
  notes: text("notes"),
  merekId: integer("merek_id").references(() => promoBrands.id),
  status: text("status").default("menunggu").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  customerCode: text("customer_code"),
  processedBy: integer("processed_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  branchIdx: index("orders_branch_idx").on(t.branchId),
  salesmanIdx: index("orders_salesman_idx").on(t.salesmanId),
  dateIdx: index("orders_date_idx").on(t.date),
  statusIdx: index("orders_status_idx").on(t.status),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  qty: integer("qty").notNull(),
  discount: text("discount").default("0").notNull(),
  price: bigint("price", { mode: 'number' }).notNull(),
  total: bigint("total", { mode: 'number' }).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
}, (t) => ({
  orderIdx: index("order_items_order_idx").on(t.orderId),
  branchIdx: index("order_items_branch_idx").on(t.branchId),
}));

export const promoBrands = pgTable("promo_brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
});

export const promoMasters = pgTable("promo_masters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brandId: integer("brand_id").notNull().references(() => promoBrands.id, { onDelete: 'cascade' }),
  // Type: "CASHBACK" | "VOUCHER" | "TUKAR_LABEL"
  type: text("type").notNull(),
  value: numeric("value").notNull(), // percent for cashback, cash for voucher/label
  branchId: integer("branch_id").references(() => branches.id),
});

export const promoInputs = pgTable("promo_inputs", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  shopName: text("shop_name").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceTotal: bigint("invoice_total", { mode: 'number' }).notNull(),
  promoId: integer("promo_id").notNull().references(() => promoMasters.id, { onDelete: 'cascade' }),
  // the 'isi' column for vouchers/labels
  inputFactor: integer("input_factor").default(1).notNull(),
  customerCode: text("customer_code"), // Linked to sales_customers
  calculatedValue: bigint("calculated_value", { mode: 'number' }).notNull(),
  
  // Status: "PENDING" | "SELESAI"
  status: text("status").default("PENDING").notNull(),
  
  // Pelunasan / Completion
  completionDate: timestamp("completion_date"),
  // Payment: "POTONG_FAKTUR" | "CASH" | "TRANSFER"
  paymentMethod: text("payment_method"),
  paidAmount: bigint("paid_amount", { mode: 'number' }),
  completionInvoiceNumber: text("completion_invoice_number"),
  recipientName: text("recipient_name"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  completionNotes: text("completion_notes"),
  branchId: integer("branch_id").references(() => branches.id),
});

export const paymentConfirmations = pgTable("payment_confirmations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "PROMO" | "ORDER"
  referenceId: integer("reference_id").notNull(),
  amount: bigint("amount", { mode: 'number' }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  status: text("status").default("PENDING").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pointLogs = pgTable("point_logs", {
  id: serial("id").primaryKey(),
  customerCode: text("customer_code").notNull(),
  point: integer("point").notNull(),
  type: text("type").notNull(), // "earn" | "redeem"
  date: timestamp("date").defaultNow().notNull(),
  invoiceNumber: text("invoice_number"),
  productName: text("product_name"),
  notes: text("notes"),
  brandCode: text("brand_code").notNull().default("FERIO"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  customerIdx: index("point_logs_customer_idx").on(t.customerCode),
  branchIdx: index("point_logs_branch_idx").on(t.branchId),
  invoiceIdx: index("point_logs_invoice_idx").on(t.invoiceNumber),
}));

export const labelQuotas = pgTable("label_quotas", {
  id: serial("id").primaryKey(),
  customerCode: text("customer_code").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  invoiceNumber: text("invoice_number"),
  productName: text("product_name"),
  brandCode: text("brand_code").notNull().default("FERIO"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  customerIdx: index("label_quotas_customer_idx").on(t.customerCode),
  branchIdx: index("label_quotas_branch_idx").on(t.branchId),
  invoiceIdx: index("label_quotas_invoice_idx").on(t.invoiceNumber),
}));

export const labelClaims = pgTable("label_claims", {
  id: serial("id").primaryKey(),
  customerCode: text("customer_code").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
});

export const insertAppSettingSchema = z.object({
  id: z.number().optional(),
  key: z.string(),
  value: z.string(),
  branchId: z.number().nullable().optional(),
});
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// === RELATIONS ===
export const shipmentsRelations = relations(shipments, ({ one }) => ({
  customer: one(salesCustomers, {
    fields: [shipments.customerId],
    references: [salesCustomers.id],
  }),
  expedition: one(expeditions, {
    fields: [shipments.expeditionId],
    references: [expeditions.id],
  }),
  branch: one(branches, {
    fields: [shipments.branchId],
    references: [branches.id],
  }),
  brand: one(promoBrands, {
    fields: [shipments.merekId],
    references: [promoBrands.id],
  }),
}));

export const customersRelations = relations(customers, ({ many, one }) => ({
  shipments: many(shipments),
  branch: one(branches, {
    fields: [customers.branchId],
    references: [branches.id],
  }),
}));

export const salesCustomersRelations = relations(salesCustomers, ({ many }) => ({
  pointLogs: many(pointLogs),
}));

export const pointLogsRelations = relations(pointLogs, ({ one }) => ({
  customer: one(salesCustomers, {
    fields: [pointLogs.customerCode],
    references: [salesCustomers.code],
  }),
}));

export const labelQuotasRelations = relations(labelQuotas, ({ one }) => ({
  customer: one(salesCustomers, {
    fields: [labelQuotas.customerCode],
    references: [salesCustomers.code],
  }),
}));

export const labelClaimsRelations = relations(labelClaims, ({ one }) => ({
  customer: one(salesCustomers, {
    fields: [labelClaims.customerCode],
    references: [salesCustomers.code],
  }),
}));

export const expeditionsRelations = relations(expeditions, ({ many }) => ({
  shipments: many(shipments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  roleTemplate: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  userBranches: many(userBranches),
  permissions: many(userPermissions),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  shipments: many(shipments),
  customers: many(customers),
  userBranches: many(userBranches),
}));

export const userBranchesRelations = relations(userBranches, ({ one }) => ({
  user: one(users, {
    fields: [userBranches.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [userBranches.branchId],
    references: [branches.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const promosRelations = relations(promos, ({ one }) => ({
  branch: one(branches, {
    fields: [promos.branchId],
    references: [branches.id],
  }),
}));

export const promoInputsRelations = relations(promoInputs, ({ one }) => ({
  customer: one(salesCustomers, {
    fields: [promoInputs.customerCode],
    references: [salesCustomers.code],
  }),
  promo: one(promoMasters, {
    fields: [promoInputs.promoId],
    references: [promoMasters.id],
  }),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  salesman: one(users, {
    fields: [orders.salesmanId],
    references: [users.id],
  }),
  processor: one(users, {
    fields: [orders.processedBy],
    references: [users.id],
  }),
  brand: one(promoBrands, {
    fields: [orders.merekId],
    references: [promoBrands.id],
  }),
  items: many(orderItems),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  item: one(items, {
    fields: [orderItems.itemCode],
    references: [items.code],
  }),
}));

// === BASE SCHEMAS ===
export const insertBranchSchema = createInsertSchema(branches);
// @ts-ignore
export const insertExpeditionSchema = createInsertSchema(expeditions).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export const insertCustomerSchema = createInsertSchema(salesCustomers).extend({
  branchId: z.coerce.number().optional().nullable(),
});

export const insertSalesCustomerSchema = createInsertSchema(salesCustomers).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export const insertShipmentSchema = createInsertSchema(shipments).extend({
  status: z.string().optional(),
  customerId: z.coerce.number(),
  expeditionId: z.coerce.number(),
  merekId: z.coerce.number().optional().nullable(),
  branchId: z.coerce.number().optional().nullable(),
  verificationDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().nullable().optional()),
  shippingDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().nullable().optional()),
  returnedDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().nullable().optional()),
  invoiceProcessed: z.boolean().optional(),
});
export const updateShipmentSchema = createInsertSchema(shipments).partial().extend({
  customerId: z.coerce.number().optional(),
  expeditionId: z.coerce.number().optional(),
  merekId: z.coerce.number().optional().nullable(),
  branchId: z.coerce.number().optional().nullable(),
  verificationDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().nullable().optional()),
  shippingDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().nullable().optional()),
  returnedDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().nullable().optional()),
  invoiceProcessed: z.boolean().optional(),
});

export const insertPromoSchema = createInsertSchema(promos).extend({
  startDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  endDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertItemSchema = createInsertSchema(items).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export const insertItemStockSchema = createInsertSchema(itemStocks);
export const insertTaxSchema = createInsertSchema(taxes).extend({
  rate: z.coerce.string(),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertRoleSchema = createInsertSchema(roles).extend({
  branchId: z.coerce.number().optional().nullable(),
});

export const insertOrderSchema = createInsertSchema(orders).extend({
  date: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  salesmanId: z.coerce.number(),
  branchId: z.coerce.number().optional().nullable(),
});
export const insertOrderItemSchema = createInsertSchema(orderItems).extend({
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPromoBrandSchema = createInsertSchema(promoBrands);
export const insertPromoMasterSchema = createInsertSchema(promoMasters).extend({
  brandId: z.coerce.number().min(1, "Merek harus dipilih"),
  branchId: z.coerce.number().optional().nullable(),
});


export const insertPromoInputSchema = createInsertSchema(promoInputs).extend({
  date: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  promoId: z.coerce.number().min(1, "Promo harus dipilih"),
  branchId: z.coerce.number().optional().nullable(),
  customerCode: z.string().optional().nullable(),
  completionDate: z.preprocess((val) => (typeof val === "string" && val ? new Date(val) : val), z.date().nullable().optional()),
});

export const insertPaymentConfirmationSchema = createInsertSchema(paymentConfirmations).extend({
  paymentDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPointLogSchema = createInsertSchema(pointLogs).extend({
  date: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().optional()),
});
export const insertLabelQuotaSchema = createInsertSchema(labelQuotas).extend({
  date: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().optional()),
});
export const insertLabelClaimSchema = createInsertSchema(labelClaims).extend({
  date: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().optional()),
});

// === EXPLICIT API CONTRACT TYPES ===
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type Expedition = typeof expeditions.$inferSelect;
export type InsertExpedition = z.infer<typeof insertExpeditionSchema>;
export type UpdateExpeditionRequest = Partial<InsertExpedition>;

export type Customer = typeof salesCustomers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomerRequest = Partial<InsertCustomer>;

export type SalesCustomer = typeof salesCustomers.$inferSelect;
export type InsertSalesCustomer = z.infer<typeof insertSalesCustomerSchema>;
export type UpdateSalesCustomerRequest = Partial<InsertSalesCustomer>;

export type Tax = typeof taxes.$inferSelect;
export type InsertTax = z.infer<typeof insertTaxSchema>;
export type UpdateTaxRequest = Partial<InsertTax>;

export type Shipment = typeof shipments.$inferSelect;
export type ShipmentWithRelations = Shipment & { 
  customer?: SalesCustomer, 
  expedition?: Expedition, 
  branch?: Branch | null,
  brand?: { id: number, name: string } | null
};
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type UpdateShipmentRequest = z.infer<typeof updateShipmentSchema>;

export const insertUserSchema = createInsertSchema(users).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SafeUser = Omit<User, "password">;

export const insertUserBranchSchema = createInsertSchema(userBranches);
export type UserBranch = typeof userBranches.$inferSelect;
export type InsertUserBranch = z.infer<typeof insertUserBranchSchema>;

export const insertUserPermissionSchema = createInsertSchema(userPermissions);
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

export const insertAuditLogSchema = createInsertSchema(auditLogs).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type AuditLogWithUser = AuditLog & { user?: SafeUser };
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Promo = typeof promos.$inferSelect;
export type InsertPromo = z.infer<typeof insertPromoSchema>;

export type Item = typeof items.$inferSelect;
export type ItemWithStock = Item & { stock: number };
export type InsertItem = z.infer<typeof insertItemSchema>;

export type ItemStock = typeof itemStocks.$inferSelect;
export type InsertItemStock = z.infer<typeof insertItemStockSchema>;

export type Order = typeof orders.$inferSelect;
export type OrderWithItems = Order & { items: OrderItem[], salesman?: SafeUser, processor?: SafeUser };
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type PromoBrand = typeof promoBrands.$inferSelect;
export type InsertPromoBrand = z.infer<typeof insertPromoBrandSchema>;

export type PromoMaster = typeof promoMasters.$inferSelect;
export type InsertPromoMaster = z.infer<typeof insertPromoMasterSchema>;

export type PromoInput = typeof promoInputs.$inferSelect;
export type InsertPromoInput = z.infer<typeof insertPromoInputSchema>;

export type PaymentConfirmation = typeof paymentConfirmations.$inferSelect;
export type InsertPaymentConfirmation = z.infer<typeof insertPaymentConfirmationSchema>;

export type PointLog = typeof pointLogs.$inferSelect;
export type InsertPointLog = z.infer<typeof insertPointLogSchema>;

export type LabelQuota = typeof labelQuotas.$inferSelect;
export type InsertLabelQuota = z.infer<typeof insertLabelQuotaSchema>;

export type LabelClaim = typeof labelClaims.$inferSelect;
export type InsertLabelClaim = z.infer<typeof insertLabelClaimSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export const MENU_KEYS = [
  // UTAMA
  { key: "dashboard", label: "Dashboard", group: "Utama", category: "UMUM", capabilities: { view: true, create: false, edit: false, delete: false, print: false } },

  // MARKETING
  { key: "leads", label: "Calon Konsumen", group: "Marketing", category: "MKT: PROSPEK & SALES", capabilities: { view: true, create: true, edit: true, delete: true, print: false, viewAll: true } },
  { key: "follow-ups", label: "Follow Up", group: "Marketing", category: "MKT: PROSPEK & SALES", capabilities: { view: true, create: true, edit: true, delete: true, print: false, viewAll: true } },
  { key: "deposits", label: "Titipan", group: "Marketing", category: "MKT: PROSPEK & SALES", capabilities: { view: true, create: true, edit: true, delete: true, print: true, viewAll: true } },
  { key: "sales", label: "Penjualan", group: "Marketing", category: "MKT: PROSPEK & SALES", capabilities: { view: true, create: true, edit: true, delete: true, print: true, viewAll: true } },
  { key: "payments", label: "Pembayaran Konsumen", group: "Keuangan", category: "MKT: PROSPEK & SALES", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },

  { key: "customers", label: "Data Konsumen", group: "Marketing", category: "MKT: KONSUMEN", capabilities: { view: true, create: true, edit: true, delete: true, print: true, viewAll: true } },
  { key: "document-templates", label: "Template Dokumen", group: "Marketing", category: "MKT: KONSUMEN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  { key: "site-plan", label: "Siteplan", group: "Marketing", category: "MKT: PRODUK & VISUAL", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "floor-plan", label: "Denah", group: "Marketing", category: "MKT: PRODUK & VISUAL", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  { key: "price-list", label: "Price List", group: "Marketing", category: "MKT: TOOLS & LAPORAN", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },
  { key: "promos", label: "Master Promo", group: "Marketing", category: "MKT: TOOLS & LAPORAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "marketing-master", label: "Master Konsultan Property", group: "Marketing", category: "MKT: TOOLS & LAPORAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "marketing-schedule", label: "Jadwal Konsultan", group: "Marketing", category: "MKT: TOOLS & LAPORAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "financial-reports", label: "Laporan", group: "Accounting", category: "MKT: TOOLS & LAPORAN", capabilities: { view: true, create: false, edit: false, delete: false, print: true } },

  // TEKNIK
  { key: "rab", label: "RAB Proyek", group: "Teknik", category: "TEKNIK: PERENCANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },
  { key: "projects", label: "Proyek", group: "Teknik", category: "TEKNIK: PERENCANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "units", label: "Unit Properti", group: "Teknik", category: "TEKNIK: PERENCANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  
  { key: "purchase-requests", label: "Purchase Request", group: "Teknik", category: "TEKNIK: LOGISTIK", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "purchase-orders", label: "Purchase Order", group: "Teknik", category: "TEKNIK: LOGISTIK", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },
  { key: "goods-receipt", label: "Penerimaan Barang", group: "Teknik", category: "TEKNIK: LOGISTIK", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "material-usage", label: "Pemakaian Material", group: "Teknik", category: "TEKNIK: LOGISTIK", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "materials", label: "Stok Material", group: "Teknik", category: "TEKNIK: LOGISTIK", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "stock-card", label: "Kartu Stok", group: "Teknik", category: "TEKNIK: LOGISTIK", capabilities: { view: true, create: true, edit: false, delete: false, print: true } },
  
  { key: "spk", label: "SPK Kontraktor", group: "Teknik", category: "TEKNIK: PELAKSANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },
  { key: "opname", label: "Opname/Upah", group: "Teknik", category: "TEKNIK: PELAKSANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "construction-progress", label: "Progress Bangun", group: "Teknik", category: "TEKNIK: PELAKSANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "real-cost", label: "Real Cost", group: "Teknik", category: "TEKNIK: PELAKSANAAN", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },

  { key: "master-material", label: "Master Material", group: "Teknik", category: "TEKNIK: MASTER", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "material-suppliers", label: "Master Supplier", group: "Teknik", category: "TEKNIK: MASTER", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  // KEUANGAN
  { key: "petty-cash", label: "Petty Cash", group: "Keuangan", category: "FIN: MANAJEMEN KAS", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "cash-flow", label: "Cash Flow", group: "Keuangan", category: "FIN: MANAJEMEN KAS", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },
  { key: "bank-master", label: "Master Bank", group: "Keuangan", category: "FIN: MANAJEMEN KAS", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  { key: "supplier-payables", label: "Hutang Supplier", group: "Keuangan", category: "FIN: HUTANG PIUTANG", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "customer-receivables", label: "Piutang Konsumen", group: "Keuangan", category: "FIN: HUTANG PIUTANG", capabilities: { view: true, create: false, edit: false, delete: false, print: true } },
  { key: "kpr-disbursement", label: "Pencairan KPR", group: "Keuangan", category: "FIN: HUTANG PIUTANG", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  { key: "supplier-payments", label: "Pembayaran Supplier", group: "Keuangan", category: "FIN: VERIFIKASI & BAYAR", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "verification-queue", label: "Antrian Verifikasi", group: "Keuangan", category: "FIN: VERIFIKASI & BAYAR", capabilities: { view: true, create: false, edit: true, delete: false, print: false } },

  // HRD
  { key: "recruitment", label: "Rekrutmen", group: "HRD", category: "HRD & PAYROLL", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "employees", label: "Data Karyawan", group: "HRD", category: "HRD & PAYROLL", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "attendance", label: "Absensi & Cuti", group: "HRD", category: "HRD & PAYROLL", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "payroll", label: "Payroll", group: "HRD", category: "HRD & PAYROLL", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },

  // ACCOUNTING
  { key: "general-journal", label: "Jurnal Umum", group: "Accounting", category: "ACCOUNTING", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "ledger", label: "Buku Besar", group: "Accounting", category: "ACCOUNTING", capabilities: { view: true, create: true, edit: true, delete: true, print: true } },
  { key: "taxation", label: "Perpajakan", group: "Accounting", category: "ACCOUNTING", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  // AUDIT
  { key: "audit-transactions", label: "Audit Transaksi", group: "Audit", category: "AUDIT", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "audit-stock", label: "Audit Stok", group: "Audit", category: "AUDIT", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
  { key: "audit-costs", label: "Audit Biaya", group: "Audit", category: "AUDIT", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },

  // SISTEM
  { key: "user-management", label: "User & Role", group: "Sistem", category: "SISTEM", capabilities: { view: true, create: true, edit: true, delete: true, print: false } },
] as const;

export const pelangganProgram = pgTable("pelanggan_program", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  brandCode: text("brand_code").notNull().default("FERIO"), // Added brandCode directly for easy filtering
  jenisProgram: text("jenis_program").$type<'paket' | 'cashback' | 'cutting' | 'point' | 'principal'>().notNull(),
  referensiId: integer("referensi_id").notNull(),
  tglMulai: timestamp("tgl_mulai").defaultNow().notNull(),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull().default('aktif'),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  unq: unique().on(t.pelangganId, t.brandCode, t.jenisProgram, t.referensiId, t.branchId),
  pelangganIdx: index("pelanggan_program_pelanggan_idx").on(t.pelangganId),
  branchIdx: index("pelanggan_program_branch_idx").on(t.branchId),
}));

// Original specific tables for reference/system
// === NEW INTEGRATED PROMO SYSTEM TABLES ===

export const promoPelanggan = pgTable("promo_pelanggan", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(), // FK to salesCustomers.id
  promoId: integer("promo_id").notNull(), // FK to promoMaster
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  tglMulai: timestamp("tgl_mulai").notNull(),
  tglSelesai: timestamp("tgl_selesai"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("promo_pelanggan_pelanggan_idx").on(t.pelangganId),
  promoIdx: index("promo_pelanggan_promo_idx").on(t.promoId),
  branchIdx: index("promo_pelanggan_branch_idx").on(t.branchId),
}));

export const paketPelanggan = pgTable("paket_pelanggan", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(), // FK to salesCustomers.id
  paketId: integer("paket_id").notNull(), // FK to paketMaster.id
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  tglMulai: timestamp("tgl_mulai").notNull(),
  tglSelesai: timestamp("tgl_selesai"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("paket_pelanggan_pelanggan_idx").on(t.pelangganId),
  paketIdx: index("paket_pelanggan_paket_idx").on(t.paketId),
  branchIdx: index("paket_pelanggan_branch_idx").on(t.branchId),
}));

export const cashbackMaster = pgTable("cashback_master", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  brandCode: text("brand_code"), // Added brand selection
  tipeCashback: text("tipe_cashback").$type<'persen' | 'tetap'>().notNull(),
  nilai: numeric("nilai").notNull(),
  tipeSyarat: text("tipe_syarat").$type<'tanpa_syarat' | 'bersyarat'>().notNull().default('tanpa_syarat'),
  minTransaksi: numeric("min_transaksi").notNull().default("0"), // Digunakan hanya jika bersyarat
  masaBerlakuMulai: timestamp("masa_berlaku_mulai"), // Digunakan jika bersyarat
  masaBerlakuSelesai: timestamp("masa_berlaku_selesai"), // Digunakan jika bersyarat
  maksCashback: numeric("maks_cashback"),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  tanggalNonaktif: timestamp("tanggal_nonaktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  branchIdx: index("cashback_master_branch_idx").on(t.branchId),
}));

export const cashbackReward = pgTable("cashback_reward", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  cashbackId: integer("cashback_id").notNull(),
  periode: text("periode").notNull(), // Format: YYYY-MM
  totalTransaksiPeriode: numeric("total_transaksi_periode").notNull().default("0"),
  nilaiCashback: numeric("nilai_cashback").notNull().default("0"),
  status: text("status").$type<'pending' | 'tercapai' | 'tidak_tercapai' | 'dicairkan'>().notNull().default("pending"),
  statusPeriode: text("status_periode").default("on_track"),
  persenTercapai: numeric("persen_tercapai").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("cashback_reward_pelanggan_idx").on(t.pelangganId),
  periodeIdx: index("cashback_reward_periode_idx").on(t.periode),
  branchIdx: index("cashback_reward_branch_idx").on(t.branchId),
  unq: unique().on(t.pelangganId, t.cashbackId, t.periode),
}));

export const cuttingMaster = pgTable("cutting_master", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  brandCode: text("brand_code"), // Added brand selection
  nilaiPerLabel: numeric("nilai_per_label").notNull(),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  tanggalNonaktif: timestamp("tanggal_nonaktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  branchIdx: index("cutting_master_branch_idx").on(t.branchId),
}));

export const cuttingProgress = pgTable("cutting_progress", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  cuttingId: integer("cutting_id").notNull(),
  totalLabel: integer("total_label").notNull().default(0),
  totalNilai: numeric("total_nilai").notNull().default("0"),
  statusCair: text("status_cair").$type<'belum' | 'sudah'>().notNull().default("belum"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("cutting_progress_pelanggan_idx").on(t.pelangganId),
  branchIdx: index("cutting_progress_branch_idx").on(t.branchId),
}));

export const pointMaster = pgTable("point_master", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  brandCode: text("brand_code"), // Added brand selection
  poinPerQty: numeric("poin_per_qty").notNull(),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  tanggalNonaktif: timestamp("tanggal_nonaktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  branchIdx: index("point_master_branch_idx").on(t.branchId),
}));

export const pointSaldo = pgTable("point_saldo", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  brandCode: text("brand_code").notNull().default("FERIO"),
  saldoPoin: numeric("saldo_poin").notNull().default("0"),
  totalDiperoleh: numeric("total_diperoleh").notNull().default("0"),
  totalDitukar: numeric("total_ditukar").notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  unq: unique().on(t.pelangganId, t.brandCode, t.branchId)
}));

export const hadiahKatalog = pgTable("hadiah_katalog", {
  id: serial("id").primaryKey(),
  namaHadiah: text("nama_hadiah").notNull(),
  poinDibutuhkan: numeric("poin_dibutuhkan").notNull(),
  stok: integer("stok").notNull().default(0),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  branchIdx: index("hadiah_katalog_branch_idx").on(t.branchId),
}));

export const paketMaster = pgTable("paket_master", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  brandCode: text("brand_code"), // Added brand selection
  periodeBulan: integer("periode_bulan"), // Make optional if specifying end date
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull().defaultNow(),
  basisType: text("basis_type").$type<'qty' | 'nilai'>().notNull(),
  acuanTanggal: text("acuan_tanggal").$type<'faktur' | 'input'>().notNull().default("faktur"),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull(),
  siklus: text("siklus").default("per_bulan"),
  tanggalNonaktif: timestamp("tanggal_nonaktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
});

export const paketTier = pgTable("paket_tier", {
  id: serial("id").primaryKey(),
  paketId: integer("paket_id").notNull(),
  urutanTier: integer("urutan_tier").notNull(),
  minValue: numeric("min_value").notNull(),
  maxValue: numeric("max_value"),
  rewardType: text("reward_type").$type<'cash' | 'disc' | 'barang' | 'tour' | 'percent'>().notNull(),
  rewardValue: numeric("reward_value"),
  rewardPercent: numeric("reward_percent"),
  rewardDesc: text("reward_desc"),
  branchId: integer("branch_id").references(() => branches.id),
}, (t) => ({
  paketIdx: index("paket_tier_paket_idx").on(t.paketId),
  branchIdx: index("paket_tier_branch_idx").on(t.branchId),
}));

export const paketProgress = pgTable("paket_progress", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  paketId: integer("paket_id").notNull(),
  totalQty: numeric("total_qty").notNull().default("0"),
  totalNilai: numeric("total_nilai").notNull().default("0"),
  currentTierId: integer("current_tier_id"),
  totalRewardCalculated: numeric("total_reward_calculated").notNull().default("0"),
  totalRewardClaimed: numeric("total_reward_claimed").notNull().default("0"),
  lastClaimDate: timestamp("last_claim_date"),
  periodeStart: timestamp("periode_start").notNull(),
  periodeEnd: timestamp("periode_end").notNull(),
  periode: text("periode"),
  statusPeriode: text("status_periode").default("on_track"),
  persenTercapai: numeric("persen_tercapai").default("0"),
  status: text("status").$type<'belum_mulai' | 'berjalan' | 'tercapai' | 'selesai'>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("paket_progress_pelanggan_idx").on(t.pelangganId),
  branchIdx: index("paket_progress_branch_idx").on(t.branchId),
}));

export const rewardClaim = pgTable("reward_claim", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  sumber: text("sumber").$type<'cashback' | 'cutting' | 'point' | 'paket' | 'cashback_reward'>().notNull(),
  refId: integer("ref_id").notNull(),
  rewardType: text("reward_type").$type<'cash' | 'disc' | 'barang' | 'tour' | 'poin' | 'percent'>().notNull(),
  rewardDesc: text("reward_desc"),
  jumlah: numeric("jumlah").notNull(),
  hadiahId: integer("hadiah_id"),
  tanggalKlaim: timestamp("tanggal_klaim").notNull(),
  approvedBy: text("approved_by"),
  claimedDate: timestamp("claimed_date"),
  status: text("status").$type<'pending' | 'approved' | 'selesai' | 'batal'>().notNull().default("pending"),
  catatan: text("catatan"),
  // Payment method details
  metodePencairan: text("metode_pencairan").$type<'cash' | 'transfer_bank' | 'potong_faktur'>().default("cash"),
  tanggalCair: timestamp("tanggal_cair"),
  keteranganCash: text("keterangan_cash"),
  namaBank: text("nama_bank"),
  nomorRekening: text("nomor_rekening"),
  namaPemilikRekening: text("nama_pemilik_rekening"),
  nomorFakturPotong: text("nomor_faktur_potong"),
  nilaiFakturPotong: numeric("nilai_faktur_potong"),
  sisaReward: numeric("sisa_reward").default("0"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("reward_claim_pelanggan_idx").on(t.pelangganId),
  branchIdx: index("reward_claim_branch_idx").on(t.branchId),
  dateIdx: index("reward_claim_date_idx").on(t.tanggalKlaim),
}));

// Table to store the actual transaction in the new promo module
export const transaksiPromo = pgTable("transaksi_promo_new", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  brandCode: text("brand_code").notNull().default("FERIO"),
  noFaktur: text("no_faktur").notNull().unique(),
  tglFaktur: timestamp("tgl_faktur").notNull(),
  qty: integer("qty").notNull(),
  nilaiFaktur: numeric("nilai_faktur").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("transaksi_promo_pelanggan_idx").on(t.pelangganId),
  branchIdx: index("transaksi_promo_branch_idx").on(t.branchId),
  brandIdx: index("transaksi_promo_brand_idx").on(t.brandCode),
}));

export const promoIntegratedTransactions = pgTable("promo_integrated_transactions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id),
  pelangganId: integer("pelanggan_id").notNull().references(() => salesCustomers.id),
  merekId: integer("merek_id").notNull().references(() => promoBrands.id),
  noFaktur: text("no_faktur").notNull(),
  tanggalFaktur: timestamp("tanggal_faktur").notNull(),
  qty: integer("qty").notNull().default(0),
  nilaiFaktur: numeric("nilai_faktur").notNull().default("0"),
  programAktif: text("program_aktif"),
  rewardData: json("reward_data"),
  rewardTercapai: boolean("reward_tercapai").notNull().default(false),
  rewardType: text("reward_type"),
  rewardNilai: numeric("reward_nilai").notNull().default("0"),
  statusPencairan: text("status_pencairan").notNull().default("belum_dicairkan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  branchIdx: index("idx_promo_integrated_branch").on(t.branchId),
  pelangganIdx: index("idx_promo_integrated_pelanggan").on(t.pelangganId),
  merekIdx: index("idx_promo_integrated_merek").on(t.merekId),
}));

// Summary Results for Cashback per Transaction
export const promoHasil = pgTable("promo_hasil", {
  id: serial("id").primaryKey(),
  transaksiId: integer("transaksi_id").notNull(),
  cashbackId: integer("cashback_id").notNull(),
  nilaiCashback: numeric("nilai_cashback").notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  transaksiIdx: index("promo_hasil_transaksi_idx").on(t.transaksiId),
  branchIdx: index("promo_hasil_branch_idx").on(t.branchId),
}));

// === RELATIONS FOR NEW TABLES ===

export const promoPelangganRelations = relations(promoPelanggan, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [promoPelanggan.pelangganId], references: [salesCustomers.id] }),
}));

export const paketPelangganRelations = relations(paketPelanggan, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [paketPelanggan.pelangganId], references: [salesCustomers.id] }),
  paket: one(paketMaster, { fields: [paketPelanggan.paketId], references: [paketMaster.id] }),
}));

export const pelangganProgramRelations = relations(pelangganProgram, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [pelangganProgram.pelangganId], references: [salesCustomers.id] }),
  branch: one(branches, { fields: [pelangganProgram.branchId], references: [branches.id] }),
}));

export const cuttingProgressRelations = relations(cuttingProgress, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [cuttingProgress.pelangganId], references: [salesCustomers.id] }),
  master: one(cuttingMaster, { fields: [cuttingProgress.cuttingId], references: [cuttingMaster.id] }),
}));

export const pointSaldoRelations = relations(pointSaldo, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [pointSaldo.pelangganId], references: [salesCustomers.id] }),
}));

export const paketMasterRelations = relations(paketMaster, ({ many }) => ({
  tiers: many(paketTier),
}));

export const paketTierRelations = relations(paketTier, ({ one }) => ({
  paket: one(paketMaster, { fields: [paketTier.paketId], references: [paketMaster.id] }),
}));

export const paketProgressRelations = relations(paketProgress, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [paketProgress.pelangganId], references: [salesCustomers.id] }),
  paket: one(paketMaster, { fields: [paketProgress.paketId], references: [paketMaster.id] }),
  currentTier: one(paketTier, { fields: [paketProgress.currentTierId], references: [paketTier.id] }),
}));

export const rewardClaimRelations = relations(rewardClaim, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [rewardClaim.pelangganId], references: [salesCustomers.id] }),
  hadiah: one(hadiahKatalog, { fields: [rewardClaim.hadiahId], references: [hadiahKatalog.id] }),
}));

export const transaksiPromoRelations = relations(transaksiPromo, ({ one, many }) => ({
  pelanggan: one(salesCustomers, { fields: [transaksiPromo.pelangganId], references: [salesCustomers.id] }),
  hasilCashback: many(promoHasil),
}));

export const promoIntegratedTransactionsRelations = relations(promoIntegratedTransactions, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [promoIntegratedTransactions.pelangganId], references: [salesCustomers.id] }),
  branch: one(branches, { fields: [promoIntegratedTransactions.branchId], references: [branches.id] }),
  merek: one(promoBrands, { fields: [promoIntegratedTransactions.merekId], references: [promoBrands.id] }),
}));

export const promoHasilRelations = relations(promoHasil, ({ one }) => ({
  transaksi: one(transaksiPromo, { fields: [promoHasil.transaksiId], references: [transaksiPromo.id] }),
  master: one(cashbackMaster, { fields: [promoHasil.cashbackId], references: [cashbackMaster.id] }),
}));

export const cashbackRewardRelations = relations(cashbackReward, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [cashbackReward.pelangganId], references: [salesCustomers.id] }),
  master: one(cashbackMaster, { fields: [cashbackReward.cashbackId], references: [cashbackMaster.id] }),
}));

// === INSERT SCHEMAS ===
export const insertPromoPelangganSchema = createInsertSchema(promoPelanggan).extend({
  tglMulai: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  tglSelesai: z.preprocess((val) => (typeof val === "string" && val ? new Date(val) : val), z.date().nullable().optional()),
  branchId: z.coerce.number().optional().nullable(),
});
export const insertPaketPelangganSchema = createInsertSchema(paketPelanggan).extend({
  tglMulai: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  tglSelesai: z.preprocess((val) => (typeof val === "string" && val ? new Date(val) : val), z.date().nullable().optional()),
  branchId: z.coerce.number().optional().nullable(),
});
export const insertCashbackMasterSchema = createInsertSchema(cashbackMaster).extend({
  nilai: z.coerce.string(),
  minTransaksi: z.coerce.string(),
  maksCashback: z.preprocess((val) => (val === null || val === undefined || val === "" ? null : String(val)), z.string().nullable().optional()),
  masaBerlakuMulai: z.preprocess((val) => (typeof val === "string" && val ? new Date(val) : val), z.date().nullable().optional()),
  masaBerlakuSelesai: z.preprocess((val) => (typeof val === "string" && val ? new Date(val) : val), z.date().nullable().optional()),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertCuttingMasterSchema = createInsertSchema(cuttingMaster).extend({
  nilaiPerLabel: z.coerce.string(),
  branchId: z.coerce.number().optional().nullable(),
});
export const insertPointMasterSchema = createInsertSchema(pointMaster).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export const insertHadiahKatalogSchema = createInsertSchema(hadiahKatalog).extend({
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPelangganProgramSchema = createInsertSchema(pelangganProgram).extend({
  tglMulai: z.preprocess((val) => (val === undefined ? undefined : typeof val === "string" ? new Date(val) : val), z.date().optional()),
  branchId: z.coerce.number().optional().nullable(),
});

export type PelangganProgram = typeof pelangganProgram.$inferSelect;
export type InsertPelangganProgram = typeof pelangganProgram.$inferInsert;
export const insertPaketMasterSchema = createInsertSchema(paketMaster).extend({
  startDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  endDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  status: z.enum(['aktif', 'nonaktif']),
  basisType: z.enum(['qty', 'nilai']),
  acuanTanggal: z.enum(['faktur', 'input']).optional(),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPaketTierSchema = createInsertSchema(paketTier).extend({
  rewardValue: z.coerce.string().optional().nullable(),
  rewardPercent: z.coerce.string().optional().nullable(),
});
export const insertRewardClaimSchema = createInsertSchema(rewardClaim).extend({
  branchId: z.coerce.number().optional().nullable(),
});
export const insertTransaksiPromoSchema = createInsertSchema(transaksiPromo).extend({
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPromoIntegratedTransactionSchema = createInsertSchema(promoIntegratedTransactions).extend({
  tanggalFaktur: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  branchId: z.coerce.number().optional().nullable(),
  merekId: z.coerce.number().min(1, "Merek harus dipilih"),
  rewardData: z.any().optional(),
});

// === NEW POINT HADIAH SYSTEM ===
export const pointHadiah = pgTable("point_hadiah", {
  id: serial("id").primaryKey(),
  namaProgram: text("nama_program").notNull(),
  brandCode: text("brand_code").notNull().default("SEMUA"),
  tanggalMulai: timestamp("tanggal_mulai").notNull(),
  tanggalSelesai: timestamp("tanggal_selesai").notNull(),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull().default("aktif"),
  tanggalNonaktif: timestamp("tanggal_nonaktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pointRule = pgTable("point_rule", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => pointHadiah.id, { onDelete: 'cascade' }).notNull(),
  tipe: text("tipe").$type<'nominal' | 'qty'>().notNull(), // nominal (Rp) or qty (Pcs)
  nilaiKonversi: numeric("nilai_konversi").notNull(), // e.g., 1.000.000 or 10
  poinDihasilkan: numeric("poin_dihasilkan").notNull().default("1"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  programIdx: index("point_rule_program_idx").on(t.programId),
}));

export const pointReward = pgTable("point_reward", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => pointHadiah.id, { onDelete: 'cascade' }).notNull(),
  namaHadiah: text("nama_hadiah").notNull(),
  pointDibutuhkan: integer("point_dibutuhkan").notNull(),
  stok: integer("stok").default(0),
  keterangan: text("keterangan"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  programIdx: index("point_reward_program_idx").on(t.programId),
}));

// === RELATIONS ===
export const pointHadiahRelations = relations(pointHadiah, ({ many }) => ({
  rules: many(pointRule),
  rewards: many(pointReward),
}));

export const pointRuleRelations = relations(pointRule, ({ one }) => ({
  program: one(pointHadiah, { fields: [pointRule.programId], references: [pointHadiah.id] }),
}));

export const pointRewardRelations = relations(pointReward, ({ one }) => ({
  program: one(pointHadiah, { fields: [pointReward.programId], references: [pointHadiah.id] }),
}));

// === INSERT SCHEMAS & TYPES ===
export const insertPointHadiahSchema = createInsertSchema(pointHadiah).extend({
  tanggalMulai: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  tanggalSelesai: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  branchId: z.coerce.number().min(1, "Cabang harus dipilih"),
  status: z.enum(['aktif', 'nonaktif']).optional(),
});

export const insertPointRuleSchema = createInsertSchema(pointRule).extend({
  programId: z.coerce.number(),
  nilaiKonversi: z.coerce.string(),
  poinDihasilkan: z.coerce.string(),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPointRewardSchema = createInsertSchema(pointReward).extend({
  programId: z.coerce.number(),
  pointDibutuhkan: z.coerce.number(),
  stok: z.coerce.number().optional(),
  branchId: z.coerce.number().optional().nullable(),
});

export type PointHadiah = typeof pointHadiah.$inferSelect;
export type PointRule = typeof pointRule.$inferSelect;
export type PointReward = typeof pointReward.$inferSelect;

export type TransaksiPromo = typeof transaksiPromo.$inferSelect;
export type InsertTransaksiPromo = typeof transaksiPromo.$inferInsert;

export type PromoIntegratedTransaction = typeof promoIntegratedTransactions.$inferSelect;
export type InsertPromoIntegratedTransaction = typeof promoIntegratedTransactions.$inferInsert;

// === PROGRAM PRINCIPAL SYSTEM ===
export const principalMaster = pgTable("principal_master", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  merek: text("merek"), // Merek-merek terkait (bisa dipisah koma atau JSON)
  picName: text("pic_name"),
  picPhone: text("pic_phone"), // Tetap simpan untuk compatibility
  kontak: text("kontak"),      // Kolom baru sesuai permintaan
  picEmail: text("pic_email"),
  alamat: text("alamat"),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull().default("aktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const principalProgram = pgTable("principal_program", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  principalId: integer("principal_id").references(() => principalMaster.id).notNull(),
  brandCode: text("brand_code"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull().defaultNow(),
  periodeBulan: integer("periode_bulan"), // Durasi per siklus
  basisType: text("basis_type").$type<'qty' | 'nilai'>().notNull(),
  acuanTanggal: text("acuan_tanggal").$type<'faktur' | 'input'>().notNull().default("faktur"),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull().default("aktif"),
  tanggalNonaktif: timestamp("tanggal_nonaktif"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const principalTier = pgTable("principal_tier", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => principalProgram.id, { onDelete: 'cascade' }).notNull(),
  urutanTier: integer("urutan_tier").notNull(),
  minValue: numeric("min_value").notNull(),
  maxValue: numeric("max_value"),
  
  // Reward Perusahaan
  rewardPerusahaanType: text("reward_perusahaan_type").$type<'uang' | 'barang' | 'percent'>().notNull(),
  rewardPerusahaanValue: numeric("reward_perusahaan_value"),
  rewardPerusahaanPercent: numeric("reward_perusahaan_percent"),
  rewardPerusahaanDesc: text("reward_perusahaan_desc"),
  
  // Reward Principal
  rewardPrincipalType: text("reward_principal_type").$type<'uang' | 'liburan' | 'barang' | 'percent'>().notNull(),
  rewardPrincipalValue: numeric("reward_principal_value"), // Estimasi nilai Rp untuk klaim
  rewardPrincipalPercent: numeric("reward_principal_percent"),
  rewardPrincipalDesc: text("reward_principal_desc"),
  rewardPrincipalDetail: text("reward_principal_detail"),
  
  branchId: integer("branch_id").references(() => branches.id),
}, (t) => ({
  programIdx: index("principal_tier_program_idx").on(t.programId),
  branchIdx: index("principal_tier_branch_idx").on(t.branchId),
}));

export const principalSubscription = pgTable("principal_subscription", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").notNull(),
  programId: integer("program_id").notNull(),
  totalQty: numeric("total_qty").notNull().default("0"),
  totalNilai: numeric("total_nilai").notNull().default("0"),
  currentTierId: integer("current_tier_id"),
  totalRewardCalculated: numeric("total_reward_calculated").notNull().default("0"),
  totalRewardClaimed: numeric("total_reward_claimed").notNull().default("0"),
  lastClaimDate: timestamp("last_claim_date"),
  periodeSiklus: text("periode_siklus"), // Format: YYYY-MM
  status: text("status").$type<'berjalan' | 'tercapai' | 'selesai'>().notNull().default("berjalan"),
  periodeStart: timestamp("periode_start").notNull(),
  periodeEnd: timestamp("periode_end").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
}, (t) => ({
  pelangganIdx: index("principal_subscription_pelanggan_idx").on(t.pelangganId),
  branchIdx: index("principal_subscription_branch_idx").on(t.branchId),
  periodeIdx: index("principal_subscription_periode_idx").on(t.periodeSiklus),
}));

export const principalClaim = pgTable("principal_claim", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => principalSubscription.id).notNull(),
  programId: integer("program_id").references(() => principalProgram.id).notNull(),
  tierId: integer("tier_id").references(() => principalTier.id).notNull(),
  pelangganId: integer("pelanggan_id").notNull(),
  principalId: integer("principal_id").references(() => principalMaster.id).notNull(),
  
  // Info Hadiah dari Tier saat tercapai
  rewardPrincipalType: text("reward_principal_type").notNull(),
  rewardPrincipalDesc: text("reward_principal_desc"),
  rewardPrincipalValue: numeric("reward_principal_value"),
  
  nilaiRewardTotal: numeric("nilai_reward_total"), // Total reward (Perusahaan + Principal)
  tanggunganPrincipal: numeric("tanggungan_principal"), // Porsi Principal
  tanggunganInternal: numeric("tanggungan_internal"), // Porsi Perusahaan/Internal
  nilaiKlaim: numeric("nilai_klaim"), // Nilai yang diklaimkan ke Principal
  
  status: text("status").$type<'belum_klaim' | 'sudah_klaim' | 'disetujui' | 'ditolak'>().notNull().default("belum_klaim"),
  catatanDitolak: text("catatan_ditolak"),
  catatanRevisi: text("catatan_revisi"),
  riwayatStatus: jsonb("riwayat_status").default('[]'),
  tanggalKlaim: timestamp("tanggal_klaim"),
  tanggalApproval: timestamp("tanggal_approval"),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  subIdx: index("principal_claim_sub_idx").on(t.subscriptionId),
  principalIdx: index("principal_claim_principal_idx").on(t.principalId),
  branchIdx: index("principal_claim_branch_idx").on(t.branchId),
}));

// === PRINCIPAL RELATIONS ===
export const principalMasterRelations = relations(principalMaster, ({ many }) => ({
  programs: many(principalProgram),
}));

export const principalProgramRelations = relations(principalProgram, ({ one, many }) => ({
  principal: one(principalMaster, { fields: [principalProgram.principalId], references: [principalMaster.id] }),
  tiers: many(principalTier),
}));

export const principalTierRelations = relations(principalTier, ({ one }) => ({
  program: one(principalProgram, { fields: [principalTier.programId], references: [principalProgram.id] }),
}));

export const principalSubscriptionRelations = relations(principalSubscription, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [principalSubscription.pelangganId], references: [salesCustomers.id] }),
  program: one(principalProgram, { fields: [principalSubscription.programId], references: [principalProgram.id] }),
  currentTier: one(principalTier, { fields: [principalSubscription.currentTierId], references: [principalTier.id] }),
}));

export const principalClaimRelations = relations(principalClaim, ({ one }) => ({
  subscription: one(principalSubscription, { fields: [principalClaim.subscriptionId], references: [principalSubscription.id] }),
  program: one(principalProgram, { fields: [principalClaim.programId], references: [principalProgram.id] }),
  tier: one(principalTier, { fields: [principalClaim.tierId], references: [principalTier.id] }),
  principal: one(principalMaster, { fields: [principalClaim.principalId], references: [principalMaster.id] }),
  pelanggan: one(salesCustomers, { fields: [principalClaim.pelangganId], references: [salesCustomers.id] }),
}));

// === PRINCIPAL INSERT SCHEMAS ===
export const insertPrincipalMasterSchema = createInsertSchema(principalMaster).extend({
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPrincipalProgramSchema = createInsertSchema(principalProgram).extend({
  principalId: z.coerce.number(),
  startDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  endDate: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPrincipalTierSchema = createInsertSchema(principalTier).extend({
  rewardPerusahaanValue: z.coerce.string().optional().nullable(),
  rewardPrincipalValue: z.coerce.string().optional().nullable(),
  rewardPerusahaanPercent: z.coerce.string().optional().nullable(),
  rewardPrincipalPercent: z.coerce.string().optional().nullable(),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPrincipalClaimSchema = createInsertSchema(principalClaim).extend({
  branchId: z.coerce.number().optional().nullable(),
  nilaiRewardTotal: z.coerce.string().optional().nullable(),
  tanggunganPrincipal: z.coerce.string().optional().nullable(),
  tanggunganInternal: z.coerce.string().optional().nullable(),
  nilaiKlaim: z.coerce.string().optional().nullable(),
  rewardPrincipalType: z.string().optional().nullable(),
  catatanRevisi: z.string().optional().nullable(),
});

export const insertPrincipalSubscriptionSchema = createInsertSchema(principalSubscription).extend({
  periodeStart: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  periodeEnd: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  branchId: z.coerce.number().optional().nullable(),
});

// === NEW INTEGRATED TABLES (PHASE 2) ===

export const pelangganProgramPrincipal = pgTable("pelanggan_program_principal", {
  id: serial("id").primaryKey(),
  pelangganId: integer("pelanggan_id").references(() => salesCustomers.id).notNull(),
  programPrincipalId: integer("program_principal_id").references(() => principalProgram.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  status: text("status").$type<'aktif' | 'nonaktif'>().notNull().default("aktif"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.pelangganId, t.programPrincipalId, t.branchId),
  branchIdx: index("pelanggan_program_principal_branch_idx").on(t.branchId),
  customerIdx: index("pelanggan_program_principal_customer_idx").on(t.pelangganId),
}));

export const pencairanRewards = pgTable("pencairan_rewards", {
  id: serial("id").primaryKey(),
  transaksiId: integer("transaksi_id").references(() => promoIntegratedTransactions.id).notNull(),
  pelangganId: integer("pelanggan_id").references(() => salesCustomers.id).notNull(), // Redundant but good for query perf
  rewardType: text("reward_type").$type<'cashback' | 'paket' | 'principal' | 'point'>().notNull(),
  nilaiReward: numeric("nilai_reward").notNull(),
  status: text("status").$type<'siap_dicairkan' | 'selesai' | 'hangus'>().notNull().default('siap_dicairkan'),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  txIdx: index("pencairan_rewards_tx_idx").on(t.transaksiId),
  branchIdx: index("pencairan_rewards_branch_idx").on(t.branchId),
  statusIdx: index("pencairan_rewards_status_idx").on(t.status),
}));

// === RELATIONS (PHASE 2) ===

export const pelangganProgramPrincipalRelations = relations(pelangganProgramPrincipal, ({ one }) => ({
  pelanggan: one(salesCustomers, { fields: [pelangganProgramPrincipal.pelangganId], references: [salesCustomers.id] }),
  program: one(principalProgram, { fields: [pelangganProgramPrincipal.programPrincipalId], references: [principalProgram.id] }),
}));

export const pencairanRewardsRelations = relations(pencairanRewards, ({ one }) => ({
  transaksi: one(promoIntegratedTransactions, { fields: [pencairanRewards.transaksiId], references: [promoIntegratedTransactions.id] }),
  pelanggan: one(salesCustomers, { fields: [pencairanRewards.pelangganId], references: [salesCustomers.id] }),
}));

// === INSERT SCHEMAS (PHASE 2) ===

export const insertPelangganProgramPrincipalSchema = createInsertSchema(pelangganProgramPrincipal).extend({
  pelangganId: z.coerce.number(),
  programPrincipalId: z.coerce.number(),
  branchId: z.coerce.number().optional().nullable(),
});

export const insertPencairanRewardSchema = createInsertSchema(pencairanRewards).extend({
  transaksiId: z.coerce.number(),
  pelangganId: z.coerce.number(),
  nilaiReward: z.coerce.string(),
  branchId: z.coerce.number().optional().nullable(),
});

export type PelangganProgramPrincipal = typeof pelangganProgramPrincipal.$inferSelect;
export type InsertPelangganProgramPrincipal = typeof pelangganProgramPrincipal.$inferInsert;
export type PencairanRewards = typeof pencairanRewards.$inferSelect;
export type InsertPencairanReward = typeof pencairanRewards.$inferInsert;

export type PrincipalMaster = typeof principalMaster.$inferSelect;
export type PrincipalProgram = typeof principalProgram.$inferSelect;
export type PrincipalTier = typeof principalTier.$inferSelect;
export type PrincipalSubscription = typeof principalSubscription.$inferSelect;
export type PrincipalClaim = typeof principalClaim.$inferSelect;

export type PaketMaster = typeof paketMaster.$inferSelect;
export type PaketTier = typeof paketTier.$inferSelect;
export type PaketProgress = typeof paketProgress.$inferSelect;


// === ENGINEERING & MATERIAL MANAGEMENT ===

export const materials = pgTable("materials", {
  id: text("id").primaryKey(), // uuid in db, mapped as text in drizzle for simplicity or use custom uuid
  code: text("code"),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  category: text("category"),
  specification: text("specification"),
  stock: numeric("stock").default("0").notNull(),
  minStock: numeric("min_stock").default("0").notNull(),
  unitPrice: numeric("unit_price").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status"),
  sitePlanImageUrl: text("site_plan_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const propertyUnits = pgTable("units", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  unitNumber: text("unit_number").notNull(),
  type: text("type"),
  price: numeric("price").default("0"),
  status: text("status").default("available"),
  isBlocking: boolean("is_blocking").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rabProjects = pgTable("rab_projects", {
  id: text("id").primaryKey(),
  namaProyek: text("nama_proyek").notNull(),
  lokasi: text("lokasi"),
  totalAnggaran: numeric("total_anggaran").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rabItems = pgTable("rab_items", {
  id: text("id").primaryKey(),
  rabProjectId: text("rab_project_id").notNull(),
  parentId: text("parent_id"),
  materialId: text("material_id"),
  level: integer("level").default(0),
  uraian: text("uraian").notNull(),
  volume: numeric("volume").default("0"),
  satuan: text("satuan"),
  hargaRab: numeric("harga_rab").default("0"),
  urutan: integer("urutan").default(0),
});

export const purchaseRequests = pgTable("purchase_requests", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  unitId: text("unit_id"),
  itemName: text("item_name"),
  status: text("status").default("SUBMITTED").notNull(),
  items: jsonb("items"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  poNumber: text("po_number"),
  supplierId: integer("supplier_id"),
  date: timestamp("date"),
  dueDate: timestamp("due_date").notNull().defaultNow(),
  status: text("status").default("PENDING").notNull(),
  items: jsonb("items"), // Added to support multiple items in one PO
  totalPrice: numeric("total_price").default("0"),
  includePpn: boolean("include_ppn").default(false).notNull(),
  ppnRate: numeric("ppn_rate").default("11").notNull(),
  ppnAmount: numeric("ppn_amount").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialSuppliers = pgTable("material_suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  contactPerson: text("contact_person"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMaterialStocks = pgTable("project_material_stocks", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull(),
  materialId: text("material_id").notNull(),
  stock: numeric("stock").default("0").notNull(),
}, (t) => ({
  unq: unique().on(t.projectId, t.materialId),
}));

export const materialStockLogs = pgTable("material_stock_logs", {
  id: serial("id").primaryKey(),
  materialId: text("material_id").notNull(),
  projectId: text("project_id").notNull(),
  unitId: text("unit_id"), // Added for per-unit tracking
  transactionType: text("transaction_type").notNull(), // 'GR', 'USAGE', 'ADJUSTMENT', 'RETURN'
  qtyChange: numeric("qty_change").notNull(),
  qtyBefore: numeric("qty_before").notNull(),
  qtyAfter: numeric("qty_after").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notes: text("notes"),
});

// === SCHEMAS ===
export const insertMaterialSupplierSchema = createInsertSchema(materialSuppliers).extend({
  name: z.string().min(1, "Nama supplier harus diisi"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
});
export const insertMaterialStockLogSchema = createInsertSchema(materialStockLogs);

// === TYPES ===
export type MaterialSupplier = typeof materialSuppliers.$inferSelect;
export type ProjectMaterialStock = typeof projectMaterialStocks.$inferSelect;
export type MaterialStockLog = typeof materialStockLogs.$inferSelect;
export type RabProject = typeof rabProjects.$inferSelect;
export type RabItem = typeof rabItems.$inferSelect;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PropertyUnit = typeof propertyUnits.$inferSelect;
