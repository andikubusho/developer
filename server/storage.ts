// @ts-nocheck
import { db } from "./db";
import {
  expeditions,
  customers,
  shipments,
  users,
  userPermissions,
  type Expedition,
  type InsertExpedition,
  type UpdateExpeditionRequest,
  type Customer,
  type InsertCustomer,
  type UpdateCustomerRequest,
  salesCustomers,
  type SalesCustomer,
  type InsertSalesCustomer,
  type UpdateSalesCustomerRequest,
  type Shipment,
  type ShipmentWithRelations,
  type InsertShipment,
  type UpdateShipmentRequest,
  type User,
  type InsertUser,
  type UserPermission,
  type InsertUserPermission,
  type Branch,
  type InsertBranch,
  auditLogs,
  type AuditLog,
  type AuditLogWithUser,
  type InsertAuditLog,
  promos,
  type Promo,
  type InsertPromo,
  items,
  orders,
  orderItems,
  type Item,
  type ItemWithStock,
  type InsertItem,
  type Order,
  type OrderWithItems,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  itemStocks,
  type ItemStock,
  type InsertItemStock,
  type SafeUser,
  taxes,
  type Tax,
  type InsertTax,
  type UpdateTaxRequest,
  promoBrands,
  promoMasters,
  promoInputs,
  type PromoBrand,
  type InsertPromoBrand,
  type PromoMaster,
  type InsertPromoMaster,
  type PromoInput,
  type InsertPromoInput,
  paymentConfirmations,
  type PaymentConfirmation,
  type InsertPaymentConfirmation,
  pointLogs,
  type PointLog,
  type InsertPointLog,
  labelQuotas,
  labelClaims,
  type LabelQuota,
  type InsertLabelQuota,
  type LabelClaim,
  type InsertLabelClaim,
  roles,
  type Role,
  type InsertRole,
  appSettings,
  type AppSetting,
  type InsertAppSetting,
  pelangganProgram,
  type PelangganProgram,
  InsertPelangganProgram,
  paketMaster,
  paketTier,
  paketProgress,
  cashbackMaster,
  cuttingMaster,
  cuttingProgress,
  rewardClaim,
  pointMaster,
  pointSaldo,
  rewardClaimRelations,
  paketPelanggan,
  transaksiPromo,
  promoHasil,
  type InsertTransaksiPromo,
  branches,
  userBranches,
  pelangganProgramPrincipal,
  principalProgram
} from "@shared/schema";
import { eq, and, sql, desc, asc, or, isNull, inArray, gte, lte, ilike } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(branchId?: number): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Roles
  getRoles(branchId?: number): Promise<(Role & { userCount: number })[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(data: InsertRole): Promise<Role>;
  updateRole(id: number, data: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  // Branches
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(data: InsertBranch): Promise<Branch>;
  updateBranch(id: number, data: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: number): Promise<void>;

  // Expeditions
  getExpeditions(branchId?: number): Promise<Expedition[]>;
  getExpedition(id: number): Promise<Expedition | undefined>;
  createExpedition(data: InsertExpedition): Promise<Expedition>;
  updateExpedition(id: number, data: UpdateExpeditionRequest): Promise<Expedition>;
  deleteExpedition(id: number): Promise<void>;

  // Customers (Unified)
  getCustomers(branchId?: number): Promise<SalesCustomer[]>;
  getCustomer(id: number): Promise<SalesCustomer | undefined>;
  createCustomer(data: InsertCustomer): Promise<SalesCustomer>;
  createCustomers(data: InsertCustomer[]): Promise<SalesCustomer[]>;
  updateCustomer(id: number, data: UpdateCustomerRequest): Promise<SalesCustomer>;
  deleteCustomer(id: number): Promise<void>;

  // Sales Customers (Points/Promo-related)
  getSalesCustomers(branchId?: number): Promise<SalesCustomer[]>;
  getSalesCustomer(id: number): Promise<SalesCustomer | undefined>;
  createSalesCustomer(data: InsertSalesCustomer): Promise<SalesCustomer>;
  updateSalesCustomer(id: number, data: UpdateSalesCustomerRequest): Promise<SalesCustomer>;
  deleteSalesCustomer(id: number): Promise<void>;
  getSalesCustomerByCode(code: string, branchId?: number): Promise<SalesCustomer | undefined>;

  // Points & Labels
  getPointLogs(filters?: { customerCode?: string; branchId?: number; startDate?: Date; endDate?: Date }): Promise<PointLog[]>;
  createPointLog(data: InsertPointLog): Promise<PointLog>;
  updateCustomerPoints(customerCode: string, amount: number, type: "earn" | "redeem", branchId: number): Promise<void>;
  deletePointLog(id: number): Promise<void>;

  getLabelLogs(customerCode: string, branchId?: number): Promise<{ quotas: LabelQuota[], claims: LabelClaim[] }>;
  getLabelQuotas(customerCode: string, branchId?: number): Promise<LabelQuota[]>;
  createLabelQuota(data: InsertLabelQuota): Promise<LabelQuota>;
  deleteLabelQuota(id: number): Promise<void>;
  getLabelClaims(filters?: { customerCode?: string; branchId?: number; startDate?: Date; endDate?: Date }): Promise<LabelClaim[]>;
  createLabelClaim(data: InsertLabelClaim): Promise<LabelClaim>;

  // App Settings
  getAppSettings(): Promise<AppSetting[]>;
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  updateAppSetting(key: string, value: string): Promise<AppSetting>;
  deleteLabelClaim(id: number): Promise<void>;
  getLabelSummary(customerCode: string, branchId?: number): Promise<{ totalLabel: number, totalClaim: number, remaining: number }>;
  addLabelQuota(customerCode: string, amount: number, branchId: number): Promise<void>;
  addLabelClaim(customerCode: string, amount: number, branchId: number): Promise<void>;

  // Shipments
  getShipments(params?: { branchId?: number; limit?: number; offset?: number; search?: string; status?: string; startDate?: Date; endDate?: Date; customerId?: number }): Promise<{ shipments: ShipmentWithRelations[], total: number, totalReturned: number, totalProcessed: number }>;
  getShipment(id: number): Promise<ShipmentWithRelations | undefined>;
  createShipment(data: InsertShipment): Promise<ShipmentWithRelations>;
  updateShipment(id: number, data: UpdateShipmentRequest): Promise<ShipmentWithRelations>;
  deleteShipment(id: number): Promise<void>;

  // User Permissions
  getUserPermissions(userId: number): Promise<UserPermission[]>;
  setUserPermissions(userId: number, perms: Omit<InsertUserPermission, "userId">[]): Promise<void>;

  // User Branches
  getUserBranches(userId: number): Promise<number[]>;
  setUserBranches(userId: number, branchIds: number[]): Promise<void>;

  // Audit Logs
  getAuditLogs(branchId?: number): Promise<AuditLogWithUser[]>;
  getAuditLogsPaginated(options: { 
    branchId?: number, 
    page: number, 
    limit: number, 
    search?: string, 
    action?: string, 
    startDate?: string, 
    endDate?: string 
  }): Promise<{ data: AuditLogWithUser[], total: number, pages: number }>;
  recordAuditLog(userId: number, action: string, resource: string, details?: string, branchId?: number): Promise<void>;

  // Promos
  getPromos(branchId?: number): Promise<Promo[]>;
  getActivePromos(branchId?: number): Promise<Promo[]>;
  createPromo(data: InsertPromo): Promise<Promo>;
  updatePromo(id: number, data: Partial<InsertPromo>): Promise<Promo>;
  deletePromo(id: number): Promise<void>;

  // Items
  getItems(branchId?: number, search?: string, stockStatus?: string): Promise<ItemWithStock[]>;
  getItemsPaginated(params: {
    branchId?: number,
    offset: number,
    limit: number,
    search?: string,
    stockStatus?: string
  }): Promise<{ items: ItemWithStock[], total: number }>;
  getItemByCode(code: string): Promise<Item | undefined>;
  createItem(data: InsertItem): Promise<Item>;
  createItems(data: InsertItem[]): Promise<Item[]>;
  updateItem(id: number, data: Partial<InsertItem>): Promise<Item>;
  updateItemStock(itemCode: string, branchId: number, stock: number): Promise<void>;
  updateItemsStock(data: { code: string, stock: number, branchId: number }[]): Promise<void>;
  deleteItem(id: number): Promise<void>;
  deleteItemsByBranch(branchId: number): Promise<void>;

  // Taxes
  getTaxes(branchId?: number): Promise<Tax[]>;
  getActiveTax(branchId?: number): Promise<Tax | undefined>;
  createTax(data: InsertTax): Promise<Tax>;
  updateTax(id: number, data: UpdateTaxRequest): Promise<Tax>;
  deleteTax(id: number): Promise<void>;

  // Orders
  getOrders(filters?: { startDate?: Date; endDate?: Date; shopName?: string; itemCode?: string; region?: string; salesmanId?: number; branchId?: number; limit?: number; offset?: number }): Promise<{ orders: OrderWithItems[], total: number }>;
  getOrderById(id: number): Promise<OrderWithItems | undefined>;
  createOrder(data: InsertOrder, items: Omit<InsertOrderItem, "orderId">[]): Promise<OrderWithItems>;
  updateOrderStatus(id: number, status: string, processedBy?: number): Promise<OrderWithItems>;
  updateOrder(id: number, data: Partial<InsertOrder>, itemsData?: Omit<InsertOrderItem, "orderId">[]): Promise<OrderWithItems>;
  deleteOrder(id: number): Promise<void>;

  // Dashboard Stats
  getAdminStats(branchId?: number): Promise<{ totalUsers: number; totalBranches: number; totalAuditLogs: number; totalTaxes: number }>;
  getSalesStats(branchId?: number, salesmanId?: number, startDate?: Date, endDate?: Date): Promise<{
    totalRevenueMonth: number;
    activeCustomersCount: number;
    pendingOrdersCount: number;
    averageOrderValue: number;
    weeklySales: { date: string; total: number }[];
    topCustomers: { name: string; total: number }[];
    topProducts: { name: string; qty: number }[];
    recentOrders: OrderWithItems[];
  }>;
  getDashboardStats(branchId?: number, salesmanId?: number): Promise<{
    todayOrders: number;
    totalAmount: number;
    pendingShipments: number;
    readyShipments: number;
    customersCount: number;
    topSalesmen: { name: string; value: number }[];
    recentOrders: OrderWithItems[];
  }>;
  getDashboardSummary(branchId?: number, salesmanId?: number, startDate?: Date, endDate?: Date): Promise<{
    shipments: any;
    recentActivities: any[];
  }>;
  getPromoInputs(filters?: { branchId?: number; startDate?: Date; endDate?: Date; customerCode?: string }): Promise<(PromoInput & { promo?: PromoMaster, brand?: PromoBrand, customer?: SalesCustomer })[]>;
  createPromoInput(promoInput: InsertPromoInput): Promise<PromoInput>;
  updatePromoInput(id: number, promoInput: Partial<InsertPromoInput>): Promise<PromoInput>;
  deletePromoInput(id: number): Promise<void>;
  liquidatePromoInputs(customerCode: string, paymentData: any, branchId: number): Promise<void>;
  syncCustomerPromoBalance(customerCode: string, branchId: number): Promise<number>;
  getBranchPromoStats(branchId: number): Promise<{ 
    totalPoints: number, 
    totalLabels: number,
    cashback: number,
    labels: number,
    points: number
  }>;

  // Promo Toko
  getPromoBrands(branchId?: number): Promise<PromoBrand[]>;
  createPromoBrand(promoBrand: InsertPromoBrand): Promise<PromoBrand>;
  deletePromoBrand(id: number): Promise<void>;

  getPromoMasters(branchId?: number): Promise<PromoMaster[]>;
  createPromoMaster(promoMaster: InsertPromoMaster): Promise<PromoMaster>;
  deletePromoMaster(id: number): Promise<void>;

  // Payment Confirmations
  getPaymentConfirmations(branchId?: number): Promise<PaymentConfirmation[]>;
  createPaymentConfirmation(data: InsertPaymentConfirmation): Promise<PaymentConfirmation>;
  updatePaymentConfirmation(id: number, data: Partial<InsertPaymentConfirmation>): Promise<PaymentConfirmation>;

  // Pelanggan Program
  getPelangganPrograms(pelangganId: number, branchId?: number, brandCode?: string): Promise<PelangganProgram[]>;
  createPelangganProgram(data: InsertPelangganProgram): Promise<PelangganProgram>;
  deletePelangganProgram(id: number): Promise<void>;

  // Missing for modular routes
  getUsersByRole(role: string): Promise<User[]>;
  syncPromoBalances(branchId: number): Promise<void>;
  getLastStockUpdate(branchId?: number): Promise<Date | null>;
}

export class DatabaseStorage implements IStorage {
  // Roles
  async getRoles(branchId?: number): Promise<(Role & { userCount: number })[]> {
    const rolesQuery = db
      .select({
        id: roles.id,
        name: roles.name,
        branchId: roles.branchId,
        permissions: roles.permissions,
        authorizedDashboards: roles.authorizedDashboards,
        createdAt: roles.createdAt,
        userCount: sql<number>`count(${users.id})`.mapWith(Number),
      })
      .from(roles)
      .leftJoin(users, eq(users.roleId, roles.id));

    if (branchId) {
      rolesQuery.where(or(eq(roles.branchId, branchId), isNull(roles.branchId)));
    }

    return await rolesQuery.groupBy(roles.id).orderBy(desc(roles.createdAt));
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(data: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(data as any).returning();
    return role;
  }

  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
    const [role] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Users
  async getUsers(branchId?: number): Promise<User[]> {
    const where = branchId ? or(eq(users.branchId, branchId), isNull(users.branchId)) : undefined;
    return await db.query.users.findMany({
      where,
      with: {
        roleTemplate: true,
      }
    }) as any;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        roleTemplate: true,
      }
    }) as any;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.username, username),
      with: {
        roleTemplate: true,
      }
    }) as any;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(data as any).returning();
    return result;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    if (Object.keys(data).length === 0) {
      const user = await this.getUserById(id);
      if (!user) throw new Error("User not found");
      return user;
    }
    const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.query.users.findMany({
      where: eq(users.role, role),
      with: { roleTemplate: true }
    }) as any;
  }

  // Branches
  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches).orderBy(branches.name);
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [result] = await db.select().from(branches).where(eq(branches.id, id));
    return result;
  }

  async createBranch(data: InsertBranch): Promise<Branch> {
    const [result] = await db.insert(branches).values(data as any).returning();
    return result;
  }

  async updateBranch(id: number, data: Partial<InsertBranch>): Promise<Branch> {
    if (Object.keys(data).length === 0) {
      const branch = await this.getBranch(id);
      if (!branch) throw new Error("Branch not found");
      return branch;
    }
    const [result] = await db.update(branches).set(data).where(eq(branches.id, id)).returning();
    return result;
  }

  async deleteBranch(id: number): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  }

  // Expeditions
  async getExpeditions(branchId?: number): Promise<Expedition[]> {
    if (branchId) {
      return await db.select().from(expeditions).where(eq(expeditions.branchId, branchId));
    }
    return await db.select().from(expeditions);
  }

  async getExpedition(id: number): Promise<Expedition | undefined> {
    const [result] = await db.select().from(expeditions).where(eq(expeditions.id, id));
    return result;
  }

  async createExpedition(data: InsertExpedition): Promise<Expedition> {
    const [result] = await db.insert(expeditions).values(data as any).returning();
    return result;
  }

  async updateExpedition(id: number, data: UpdateExpeditionRequest): Promise<Expedition> {
    if (Object.keys(data).length === 0) {
      const exp = await this.getExpedition(id);
      if (!exp) throw new Error("Expedition not found");
      return exp;
    }
    const [result] = await db.update(expeditions).set(data).where(eq(expeditions.id, id)).returning();
    return result;
  }

  async deleteExpedition(id: number): Promise<void> {
    await db.delete(expeditions).where(eq(expeditions.id, id));
  }

  // Customers
  // Customers (Unified)
  async getCustomers(branchId?: number): Promise<SalesCustomer[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(salesCustomers.branchId, branchId));
    return await db.select().from(salesCustomers).where(conditions.length ? and(...conditions) : undefined);
  }

  async getCustomer(id: number): Promise<SalesCustomer | undefined> {
    const [result] = await db.select().from(salesCustomers).where(eq(salesCustomers.id, id));
    return result;
  }

  async createCustomer(data: InsertCustomer): Promise<SalesCustomer> {
    return this.createSalesCustomer(data);
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<SalesCustomer> {
    if (Object.keys(data).length === 0) {
      const cust = await this.getCustomer(id);
      if (!cust) throw new Error("Customer not found");
      return cust;
    }
    const [result] = await db.update(salesCustomers).set(data).where(eq(salesCustomers.id, id)).returning();
    return result;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(salesCustomers).where(eq(salesCustomers.id, id));
  }

  // Sales Customers
  async getSalesCustomers(branchId?: number, limit?: number): Promise<SalesCustomer[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(salesCustomers.branchId, branchId));
    return await db.select().from(salesCustomers).where(conditions.length ? and(...conditions) : undefined).limit(limit || 500);
  }

  async getSalesCustomer(id: number): Promise<SalesCustomer | undefined> {
    const [result] = await db.select().from(salesCustomers).where(eq(salesCustomers.id, id));
    return result;
  }

  async createSalesCustomer(data: InsertSalesCustomer): Promise<SalesCustomer> {
    const existing = await this.getSalesCustomerByCode(data.code);
    if (existing) {
      throw new Error("Kode pelanggan sudah terdaftar");
    }
    const [result] = await db.insert(salesCustomers).values(data as any).returning();
    return result;
  }

  async createCustomers(data: InsertCustomer[]): Promise<SalesCustomer[]> {
    if (data.length === 0) return [];
    // Filter out potential internal duplicates in the batch first
    const uniqueBatch = [];
    const seen = new Set();
    for (const d of data) {
      if (!seen.has(d.code)) {
        seen.add(d.code);
        uniqueBatch.push(d);
      }
    }
    
    return await db.insert(salesCustomers)
      .values(uniqueBatch.map(d => ({
        ...d,
        code: (d as any).code || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }) as any))
      .onConflictDoNothing()
      .returning();
  }

  async updateSalesCustomer(id: number, data: UpdateSalesCustomerRequest): Promise<SalesCustomer> {
    if (Object.keys(data).length === 0) {
      const cust = await this.getSalesCustomer(id);
      if (!cust) throw new Error("Sales Customer not found");
      return cust;
    }
    const [result] = await db.update(salesCustomers).set(data).where(eq(salesCustomers.id, id)).returning();
    return result;
  }

  async deleteSalesCustomer(id: number): Promise<void> {
    await db.delete(salesCustomers).where(eq(salesCustomers.id, id));
  }

  async getSalesCustomerByCode(code: string, branchId?: number): Promise<SalesCustomer | undefined> {
    const conditions = [eq(salesCustomers.code, code)];
    if (branchId) conditions.push(eq(salesCustomers.branchId, branchId));
    const [result] = await db.select().from(salesCustomers).where(and(...conditions)).limit(1);
    return result;
  }

  // Points & Labels Implementation
  async getPointLogs(filters?: { customerCode?: string; branchId?: number; startDate?: Date; endDate?: Date; limit?: number }): Promise<PointLog[]> {
    const conditions = [];
    if (filters?.customerCode) conditions.push(eq(pointLogs.customerCode, filters.customerCode));
    if (filters?.branchId) conditions.push(eq(pointLogs.branchId, filters.branchId));
    
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        conditions.push(and(gte(pointLogs.createdAt, filters.startDate), lte(pointLogs.createdAt, filters.endDate)));
      } else if (filters.startDate) {
        conditions.push(gte(pointLogs.createdAt, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(pointLogs.createdAt, filters.endDate));
      }
    }
    
    return await db.select().from(pointLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(pointLogs.createdAt)).limit(filters?.limit || 500);
  }

  async createPointLog(data: InsertPointLog): Promise<PointLog> {
    const [result] = await db.insert(pointLogs).values(data as any).returning();
    if (data.customerCode && data.branchId) {
      await db.update(salesCustomers)
        .set({ totalPoint: sql`${salesCustomers.totalPoint} + ${data.point}` })
        .where(and(eq(salesCustomers.code, data.customerCode), eq(salesCustomers.branchId, data.branchId!)));
    }
    return result;
  }

  async updateCustomerPoints(customerCode: string, amount: number, type: "earn" | "redeem", branchId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [customer] = await tx.select().from(salesCustomers).where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId))).limit(1);
      if (!customer) throw new Error("Customer not found for points update in this branch");
      const newTotal = customer.totalPoint + amount;
      if (newTotal < 0 && type === "redeem") throw new Error("Insufficient points for redemption");
      await tx.update(salesCustomers).set({ totalPoint: newTotal }).where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId)));
      await tx.insert(pointLogs).values({ customerCode, point: amount, type, branchId });
    });
  }

  async deletePointLog(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [log] = await tx.select().from(pointLogs).where(eq(pointLogs.id, id)).limit(1);
      if (!log) throw new Error("Point log not found");
      
      const [customer] = await tx.select().from(salesCustomers).where(and(eq(salesCustomers.code, log.customerCode), eq(salesCustomers.branchId, log.branchId!))).limit(1);
      if (customer) {
        const pointDiff = log.type === "earn" ? -log.point : Math.abs(log.point);
        await tx.update(salesCustomers).set({ totalPoint: customer.totalPoint + pointDiff }).where(and(eq(salesCustomers.code, log.customerCode), eq(salesCustomers.branchId, log.branchId!)));
      }
      await tx.delete(pointLogs).where(eq(pointLogs.id, id));
    });
  }

  async getLabelLogs(customerCode: string, branchId?: number): Promise<{ quotas: LabelQuota[], claims: LabelClaim[] }> {
    const qCond = [eq(labelQuotas.customerCode, customerCode)];
    if (branchId) qCond.push(eq(labelQuotas.branchId, branchId));
    const cCond = [eq(labelClaims.customerCode, customerCode)];
    if (branchId) cCond.push(eq(labelClaims.branchId, branchId));

    const quotas = await db.select().from(labelQuotas).where(and(...qCond)).orderBy(desc(labelQuotas.createdAt));
    const claims = await db.select().from(labelClaims).where(and(...cCond)).orderBy(desc(labelClaims.createdAt));
    return { quotas, claims };
  }

  async getLabelQuotas(customerCode: string, branchId?: number): Promise<LabelQuota[]> {
    const conditions = [eq(labelQuotas.customerCode, customerCode)];
    if (branchId) conditions.push(eq(labelQuotas.branchId, branchId));
    return await db.select().from(labelQuotas).where(and(...conditions)).orderBy(desc(labelQuotas.createdAt));
  }

  async createLabelQuota(data: InsertLabelQuota): Promise<LabelQuota> {
    const [result] = await db.insert(labelQuotas).values(data as any).returning();
    if (data.customerCode && data.branchId) {
      await db.update(salesCustomers)
        .set({ totalLabel: sql`${salesCustomers.totalLabel} + ${data.amount}` })
        .where(and(eq(salesCustomers.code, data.customerCode), eq(salesCustomers.branchId, data.branchId!)));
    }
    return result;
  }

  async deleteLabelQuota(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [quota] = await tx.select().from(labelQuotas).where(eq(labelQuotas.id, id)).limit(1);
      if (!quota) throw new Error("Label quota not found");

      const [customer] = await tx.select().from(salesCustomers).where(and(eq(salesCustomers.code, quota.customerCode), eq(salesCustomers.branchId, quota.branchId!))).limit(1);
      if (customer) {
        await tx.update(salesCustomers).set({ totalLabel: (customer.totalLabel || 0) - quota.amount }).where(and(eq(salesCustomers.code, quota.customerCode), eq(salesCustomers.branchId, quota.branchId!)));
      }
      await tx.delete(labelQuotas).where(eq(labelQuotas.id, id));
    });
  }

  async getLabelClaims(filters?: { customerCode?: string; branchId?: number; startDate?: Date; endDate?: Date }): Promise<LabelClaim[]> {
    const conditions = [];
    if (filters?.customerCode) conditions.push(eq(labelClaims.customerCode, filters.customerCode));
    if (filters?.branchId) conditions.push(eq(labelClaims.branchId, filters.branchId));
    
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        conditions.push(and(gte(labelClaims.date, filters.startDate), lte(labelClaims.date, filters.endDate)));
      } else if (filters.startDate) {
        conditions.push(gte(labelClaims.date, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(labelClaims.date, filters.endDate));
      }
    }
    
    return await db.select().from(labelClaims).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(labelClaims.createdAt));
  }

  async createLabelClaim(data: InsertLabelClaim): Promise<LabelClaim> {
    const [result] = await db.insert(labelClaims).values(data as any).returning();
    if (data.customerCode && data.branchId) {
      await db.update(salesCustomers)
        .set({ totalClaim: sql`${salesCustomers.totalClaim} + ${data.amount}` })
        .where(and(eq(salesCustomers.code, data.customerCode), eq(salesCustomers.branchId, data.branchId!)));
    }
    return result;
  }

  async deleteLabelClaim(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [claim] = await tx.select().from(labelClaims).where(eq(labelClaims.id, id)).limit(1);
      if (!claim) throw new Error("Label claim not found");
 
      const [customer] = await tx.select().from(salesCustomers).where(and(eq(salesCustomers.code, claim.customerCode), eq(salesCustomers.branchId, claim.branchId!))).limit(1);
      if (customer) {
        await tx.update(salesCustomers).set({ totalClaim: (customer.totalClaim || 0) - claim.amount }).where(and(eq(salesCustomers.code, claim.customerCode), eq(salesCustomers.branchId, claim.branchId!)));
      }
      await tx.delete(labelClaims).where(eq(labelClaims.id, id));
    });
  }

  async getLabelSummary(customerCode: string, branchId?: number): Promise<{ totalLabel: number, totalClaim: number, remaining: number }> {
    const qCond = [eq(labelQuotas.customerCode, customerCode)];
    if (branchId) qCond.push(eq(labelQuotas.branchId, branchId));
    const cCond = [eq(labelClaims.customerCode, customerCode)];
    if (branchId) cCond.push(eq(labelClaims.branchId, branchId));

    const qRes = await db.select({ total: sql<number>`sum(${labelQuotas.amount})` }).from(labelQuotas).where(and(...qCond));
    const cRes = await db.select({ total: sql<number>`sum(${labelClaims.amount})` }).from(labelClaims).where(and(...cCond));
    const totalLabel = Number(qRes[0]?.total || 0);
    const totalClaim = Number(cRes[0]?.total || 0);
    return { totalLabel, totalClaim, remaining: totalLabel - totalClaim };
  }

  async addLabelQuota(customerCode: string, amount: number, branchId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(labelQuotas).values({ customerCode, amount, branchId });
      const [customer] = await tx.select().from(salesCustomers).where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId))).limit(1);
      if (customer) await tx.update(salesCustomers).set({ totalLabel: (customer.totalLabel || 0) + amount }).where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId)));
    });
  }

  async addLabelClaim(customerCode: string, amount: number, branchId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [customer] = await tx.select().from(salesCustomers).where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId))).limit(1);
      if (!customer) throw new Error("Customer not found in this branch");
      const remaining = (customer.totalLabel || 0) - (customer.totalClaim || 0);
      if (amount > remaining) throw new Error("Klaim melebihi kuota label");
      await tx.insert(labelClaims).values({ customerCode, amount, branchId });
      await tx.update(salesCustomers).set({ totalClaim: (customer.totalClaim || 0) + amount }).where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId)));
    });
  }

  // Shipments
  async getShipments(params?: { branchId?: number; limit?: number; offset?: number; search?: string; status?: string; startDate?: Date; endDate?: Date; customerId?: number, merekId?: number }): Promise<{ shipments: ShipmentWithRelations[], total: number, totalReturned: number, totalProcessed: number }> {
    console.log("[STORAGE] getShipments params:", params);
    const conditions = [];
    if (params?.branchId) conditions.push(eq(shipments.branchId, params.branchId));
    if (params?.customerId) conditions.push(eq(shipments.customerId, params.customerId));
    if (params?.merekId) conditions.push(eq(shipments.merekId, params.merekId));
    if (params?.status) {
      if (params.status.includes(",")) {
        conditions.push(inArray(shipments.status, params.status.split(",")));
      } else {
        conditions.push(eq(shipments.status, params.status));
      }
    }
    
    if (params?.startDate || params?.endDate) {
      if (params.startDate && params.endDate) {
        conditions.push(and(gte(shipments.inputDate, params.startDate), lte(shipments.inputDate, params.endDate)));
      } else if (params.startDate) {
        conditions.push(gte(shipments.inputDate, params.startDate));
      } else if (params.endDate) {
        conditions.push(lte(shipments.inputDate, params.endDate));
      }
    }
    
    if (params?.search) {
      conditions.push(
        or(
          sql`${shipments.invoiceNumber} ILIKE ${'%' + params.search + '%'}`,
          sql`EXISTS (SELECT 1 FROM sales_customers sc WHERE sc.id = ${shipments.customerId} AND sc.name ILIKE ${'%' + params.search + '%'})`
        )
      );
    }
    
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [results, countItems, countResultsReturned, countResultsProcessed] = await Promise.all([
      db.query.shipments.findMany({
        where,
        with: {
          customer: true,
          expedition: true,
          branch: true,
          brand: true,
        },
        orderBy: (shipments, { asc, desc }) => [
          asc(sql`CASE 
            WHEN ${shipments.invoiceProcessed} = true AND ${shipments.invoiceReturned} = false THEN 1
            WHEN ${shipments.invoiceReturned} = true THEN 2
            ELSE 3
          END`),
          desc(shipments.inputDate)
        ],
        limit: params?.limit || 500,
        offset: params?.offset || 0,
      }),
      db.select({ count: sql<number>`count(*)` }).from(shipments).where(where),
      db.select({ count: sql<number>`count(*)` }).from(shipments).where(
        and(
          where || sql`1=1`,
          eq(shipments.invoiceReturned, true)
        )
      ),
      db.select({ count: sql<number>`count(*)` }).from(shipments).where(
        and(
          where || sql`1=1`,
          eq(shipments.invoiceProcessed, true),
          eq(shipments.invoiceReturned, false)
        )
      )
    ]);

    const total = Number(countItems[0]?.count || 0);
    const totalReturned = Number(countResultsReturned[0]?.count || 0);
    // User requested "Belum Kembali" to be Total - Sudah Kembali
    const totalProcessed = total - totalReturned;

    console.log(`[STORAGE] getShipments stats: total=${total}, returned=${totalReturned}, processed=${totalProcessed}`);

    return { 
      shipments: results as ShipmentWithRelations[], 
      total,
      totalReturned,
      totalProcessed
    };
  }

  async getShipment(id: number): Promise<ShipmentWithRelations | undefined> {
    return await db.query.shipments.findFirst({
      where: eq(shipments.id, id),
      with: {
        customer: true,
        expedition: true,
        branch: true,
        brand: true,
      }
    });
  }

  async createShipment(data: InsertShipment): Promise<ShipmentWithRelations> {
    const [result] = await db.insert(shipments).values(data as any).returning();
    return await this.getShipment(result.id) as ShipmentWithRelations;
  }

  async updateShipment(id: number, data: UpdateShipmentRequest): Promise<ShipmentWithRelations> {
    if (Object.keys(data).length === 0) {
      const ship = await this.getShipment(id);
      if (!ship) throw new Error("Shipment not found");
      return ship;
    }
    await db.update(shipments).set(data).where(eq(shipments.id, id));
    return await this.getShipment(id) as ShipmentWithRelations;
  }

  async deleteShipment(id: number): Promise<void> {
    await db.delete(shipments).where(eq(shipments.id, id));
  }

  // User Permissions
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    const { log } = await import("./logger");
    log(`Fetching user for permissions ID: ${userId}`, "storage");
    try {
      // Use standard select instead of findFirst with relational 'with'
      const res = await db
        .select({
          roleTemplate: roles,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, userId));

      const userWithRole = res[0];

      if (userWithRole?.roleTemplate?.permissions) {
        log(`Using roleTemplate permissions for user ${userId}`, "storage");
        const permsRecord = userWithRole.roleTemplate.permissions as any;
        const mappedPerms: UserPermission[] = Object.keys(permsRecord).map((key, index) => ({
          id: -(index + 1),
          userId,
          branchId: null,
          menuKey: key,
          canView: !!permsRecord[key].view,
          canInput: !!permsRecord[key].input,
          canEdit: !!permsRecord[key].edit,
          canDelete: !!permsRecord[key].delete,
          canExport: permsRecord[key].export !== false,
          canPrint: permsRecord[key].print !== false,
        }));
        log(`Returning ${mappedPerms.length} mapped permissions for user ${userId}`, "storage");
        return mappedPerms;
      }

      log(`Fetching userPermissions from table for user ${userId}`, "storage");
      const perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
      log(`Returning ${perms.length} table permissions for user ${userId}`, "storage");
      return perms;
    } catch (err: any) {
      log(`Error in getUserPermissions for user ${userId}: ${err.message}`, "storage");
      throw err;
    }
  }

  async setUserPermissions(userId: number, perms: Omit<InsertUserPermission, "userId">[]): Promise<void> {
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (perms.length > 0) {
      await db.insert(userPermissions).values(perms.map(p => ({ ...p, userId })));
    }
  }

  // User Branches
  async getUserBranches(userId: number): Promise<number[]> {
    const results = await db.select({ branchId: userBranches.branchId }).from(userBranches).where(eq(userBranches.userId, userId));
    return results.map(r => r.branchId);
  }

  async setUserBranches(userId: number, branchIds: number[]): Promise<void> {
    await db.delete(userBranches).where(eq(userBranches.userId, userId));
    if (branchIds.length > 0) {
      await db.insert(userBranches).values(branchIds.map(branchId => ({ userId, branchId })));
    }
  }

  // Audit Logs
  async getAuditLogs(branchId?: number): Promise<AuditLogWithUser[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(auditLogs.branchId, branchId));
    
    return await db.query.auditLogs.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: {
        user: true,
      },
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
      limit: 500, // Reasonable limit
    });
  }

  async getAuditLogsPaginated({ 
    branchId, page, limit, search, action, startDate, endDate 
  }: { 
    branchId?: number, page: number, limit: number, search?: string, action?: string, startDate?: string, endDate?: string 
  }): Promise<{ data: AuditLogWithUser[], total: number, pages: number }> {
    const conditions = [];
    if (branchId) conditions.push(eq(auditLogs.branchId, branchId));
    
    if (action && action !== 'ALL') {
      conditions.push(eq(auditLogs.action, action));
    }

    if (search) {
      const searchTerms = [
        ilike(auditLogs.details, `%${search}%`),
        ilike(auditLogs.action, `%${search}%`)
      ];
      
      // Need a subquery or join condition for user displayName/username 
      // For simplicity in query abstraction with drizzle relational, we query user IDs first OR join
      const matchedUsers = await db.select({ id: users.id })
        .from(users)
        .where(
          or(
            ilike(users.displayName, `%${search}%`),
            ilike(users.username, `%${search}%`)
          )
        );
        
      if (matchedUsers.length > 0) {
        searchTerms.push(inArray(auditLogs.userId, matchedUsers.map(u => u.id)));
      }
      
      conditions.push(or(...searchTerms));
    }

    if (startDate) {
       const start = new Date(startDate);
       start.setHours(0, 0, 0, 0);
       conditions.push(gte(auditLogs.timestamp, start));
    }

    if (endDate) {
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       conditions.push(lte(auditLogs.timestamp, end));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalRows] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const data = await db.query.auditLogs.findMany({
      where: whereClause,
      with: {
        user: true,
      },
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
      limit: limit,
      offset: (page - 1) * limit,
    });

    return {
      data,
      total: Number(totalRows.count),
      pages: Math.ceil(Number(totalRows.count) / limit)
    };
  }

  async recordAuditLog(userId: number, action: string, resource: string, details?: string, branchId?: number): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId,
        action,
        resource,
        details: details || null,
        branchId: branchId || null,
      });
    } catch (error) {
      console.error("Failed to record audit log:", error);
    }
  }

  // Promos
  async getPromos(branchId?: number): Promise<Promo[]> {
    if (branchId) {
      return await db.select().from(promos).where(eq(promos.branchId, branchId)).orderBy(promos.createdAt);
    }
    return await db.select().from(promos).orderBy(promos.createdAt);
  }

  async getActivePromos(branchId?: number): Promise<Promo[]> {
    const now = new Date();
    const all = await this.getPromos(branchId);
    return all.filter(p => p.active && p.startDate <= now && (p.endDate >= now || !p.endDate));
  }

  async createPromo(data: InsertPromo): Promise<Promo> {
    const [result] = await db.insert(promos).values(data as any).returning();
    return result;
  }

  async updatePromo(id: number, data: Partial<InsertPromo>): Promise<Promo> {
    const [result] = await db.update(promos).set(data).where(eq(promos.id, id)).returning();
    return result;
  }

  async deletePromo(id: number): Promise<void> {
    await db.delete(promos).where(eq(promos.id, id));
  }

  // Items
  async getItems(branchId?: number, search?: string, stockStatus?: string): Promise<ItemWithStock[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(items.branchId, branchId));
    if (search) {
      const keywords = search.trim().split(/\s+/).filter(k => k.length > 0);
      if (keywords.length > 0) {
        const searchConditions = keywords.map(k => 
          or(
            sql`${items.name} ILIKE ${'%' + k + '%'}`,
            sql`${items.code} ILIKE ${'%' + k + '%'}`
          )
        );
        conditions.push(and(...searchConditions));
      }
    }

    if (stockStatus === "ready") {
      conditions.push(sql`COALESCE(${itemStocks.stock}, 0) > 0`);
    } else if (stockStatus === "empty") {
      conditions.push(sql`COALESCE(${itemStocks.stock}, 0) <= 0`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select({
        id: items.id,
        code: items.code,
        name: items.name,
        brandCode: items.brandCode,
        wholesalePrice: items.wholesalePrice,
        semiWholesalePrice: items.semiWholesalePrice,
        retailPrice: items.retailPrice,
        branchId: items.branchId,
        createdAt: items.createdAt,
        stock: sql<number>`COALESCE(${itemStocks.stock}, 0)`.as('stock')
      })
      .from(items)
      .leftJoin(itemStocks, and(eq(items.code, itemStocks.code), eq(items.branchId, itemStocks.branchId)))
      .where(whereClause)
      .orderBy(items.code);
  }

  async getItemsPaginated(params: { 
    branchId?: number, 
    offset: number, 
    limit: number, 
    search?: string,
    stockStatus?: string
  }): Promise<{ items: ItemWithStock[], total: number }> {
    const { branchId, offset, limit, search, stockStatus } = params;
    
    const conditions = [];
    if (branchId) conditions.push(eq(items.branchId, branchId));
    if (search) {
      const keywords = search.trim().split(/\s+/).filter(k => k.length > 0);
      if (keywords.length > 0) {
        const searchConditions = keywords.map(k => 
          or(
            sql`${items.name} ILIKE ${'%' + k + '%'}`,
            sql`${items.code} ILIKE ${'%' + k + '%'}`
          )
        );
        conditions.push(and(...searchConditions));
      }
    }

    if (stockStatus === "ready") {
      conditions.push(sql`COALESCE(${itemStocks.stock}, 0) > 0`);
    } else if (stockStatus === "empty") {
      conditions.push(sql`COALESCE(${itemStocks.stock}, 0) <= 0`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .leftJoin(itemStocks, and(eq(items.code, itemStocks.code), eq(items.branchId, itemStocks.branchId)));
    
    if (whereClause) countQuery.where(whereClause);
    const [countResult] = await countQuery;
    
    const total = Number(countResult?.count || 0);
    
    const results = await db
      .select({
        id: items.id,
        code: items.code,
        name: items.name,
        brandCode: items.brandCode,
        wholesalePrice: items.wholesalePrice,
        semiWholesalePrice: items.semiWholesalePrice,
        retailPrice: items.retailPrice,
        branchId: items.branchId,
        createdAt: items.createdAt,
        stock: sql<number>`COALESCE(${itemStocks.stock}, 0)`.as('stock')
      })
      .from(items)
      .leftJoin(itemStocks, and(eq(items.code, itemStocks.code), eq(items.branchId, itemStocks.branchId)))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(items.code);

    return { items: results, total };
  }

  async getItemByCode(code: string): Promise<Item | undefined> {
    const [result] = await db.select().from(items).where(eq(items.code, code)).limit(1);
    return result;
  }

  async createItem(data: InsertItem): Promise<Item> {
    const [result] = await db.insert(items).values(data as any).returning();
    return result;
  }

  async createItems(data: InsertItem[]): Promise<Item[]> {
    if (data.length === 0) return [];
    
    const CHUNK_SIZE = 100;
    const allResults: Item[] = [];
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const results = await db.insert(items).values(chunk).onConflictDoUpdate({
        target: [items.code, items.branchId],
        set: {
          name: sql`excluded.name`,
          brandCode: sql`excluded.brand_code`,
          wholesalePrice: sql`excluded.wholesale_price`,
          semiWholesalePrice: sql`excluded.semi_wholesale_price`,
          retailPrice: sql`excluded.retail_price`,
        }
      }).returning();
      allResults.push(...results);
    }
    
    return allResults;
  }

  async updateItem(id: number, data: Partial<InsertItem>): Promise<Item> {
    const [result] = await db.update(items).set(data).where(eq(items.id, id)).returning();
    return result;
  }

  async updateItemStock(itemCode: string, branchId: number, stock: number): Promise<void> {
    await db.insert(itemStocks)
      .values({ code: itemCode, branchId, stock })
      .onConflictDoUpdate({
        target: [itemStocks.code, itemStocks.branchId],
        set: { stock }
      });
  }

  async updateItemsStock(data: { code: string, stock: number, branchId: number }[]): Promise<void> {
    if (data.length === 0) return;
    
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await db.insert(itemStocks)
        .values(chunk.map(c => ({
          code: c.code,
          stock: c.stock,
          branchId: c.branchId
        })))
        .onConflictDoUpdate({
          target: [itemStocks.code, itemStocks.branchId],
          set: {
            stock: sql`excluded.stock`
          }
        });
    }
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async deleteItemsByBranch(branchId: number): Promise<void> {
    await db.delete(items).where(eq(items.branchId, branchId));
  }


  // Taxes
  async getTaxes(branchId?: number): Promise<Tax[]> {
    if (branchId) {
      return await db.select().from(taxes).where(eq(taxes.branchId, branchId));
    }
    return await db.select().from(taxes);
  }

  async getLastStockUpdate(branchId?: number): Promise<Date | null> {
    const conditions = [
      or(
        eq(auditLogs.action, "UPDATE_STOCK_BULK"),
        and(eq(auditLogs.action, "UPDATE"), eq(auditLogs.resource, "items")),
        and(eq(auditLogs.action, "CREATE"), eq(auditLogs.resource, "items"))
      )
    ];

    if (branchId) {
      conditions.push(eq(auditLogs.branchId, branchId));
    }

    const [lastLog] = await db.select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(1);

    return lastLog?.timestamp || null;
  }

  async getActiveTax(branchId?: number): Promise<Tax | undefined> {
    const conditions = [eq(taxes.isActive, true)];
    if (branchId) {
      conditions.push(eq(taxes.branchId, branchId));
    } else {
      conditions.push(sql`branch_id IS NULL`);
    }
    const [result] = await db.select().from(taxes).where(and(...conditions)).limit(1);
    return result;
  }

  async createTax(data: InsertTax): Promise<Tax> {
    const branchId = data.branchId;
    if ((data as any).isActive) {
      const condition = branchId ? eq(taxes.branchId, branchId) : sql`branch_id IS NULL`;
      await db.update(taxes).set({ isActive: false }).where(condition);
      
      if (branchId) {
        await db.update(branches).set({ usePpn: true }).where(eq(branches.id, branchId));
      }
    } else if (branchId) {
      const otherActive = await db.select().from(taxes).where(and(eq(taxes.branchId, branchId), eq(taxes.isActive, true)));
      if (otherActive.length === 0) {
        await db.update(branches).set({ usePpn: false }).where(eq(branches.id, branchId));
      }
    }
    
    const [result] = await db.insert(taxes).values(data as any).returning();
    return result;
  }

  async updateTax(id: number, data: UpdateTaxRequest): Promise<Tax> {
    const existing = await db.select().from(taxes).where(eq(taxes.id, id)).limit(1);
    if (existing.length === 0) throw new Error("Tax not found");
    const currentTax = existing[0];
    const branchId = data.branchId !== undefined ? data.branchId : currentTax.branchId;

    if ((data as any).isActive === true) {
      const condition = branchId ? eq(taxes.branchId, branchId) : sql`branch_id IS NULL`;
      await db.update(taxes).set({ isActive: false }).where(condition);
      
      if (branchId) {
        await db.update(branches).set({ usePpn: true }).where(eq(branches.id, branchId));
      }
    } else if ((data as any).isActive === false && branchId) {
      const otherActive = await db.select().from(taxes).where(
        and(
          eq(taxes.branchId, branchId), 
          eq(taxes.isActive, true),
          sql`id != ${id}`
        )
      );
      if (otherActive.length === 0) {
        await db.update(branches).set({ usePpn: false }).where(eq(branches.id, branchId));
      }
    }

    const [result] = await db.update(taxes).set(data).where(eq(taxes.id, id)).returning();
    return result;
  }

  async deleteTax(id: number): Promise<void> {
    await db.delete(taxes).where(eq(taxes.id, id));
  }

  // Orders
  async getOrders(filters?: { startDate?: Date; endDate?: Date; shopName?: string; itemCode?: string; region?: string; salesmanId?: number; branchId?: number; limit?: number; offset?: number }): Promise<{ orders: OrderWithItems[], total: number }> {
    const conditions = [];
    if (filters?.salesmanId) conditions.push(eq(orders.salesmanId, filters.salesmanId));
    if (filters?.branchId) conditions.push(eq(orders.branchId, filters.branchId));
    if (filters?.shopName) conditions.push(sql`${orders.shopName} ILIKE ${'%' + filters.shopName + '%'}`);
    if (filters?.region) conditions.push(sql`${orders.region} ILIKE ${'%' + filters.region + '%'}`);
    
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        conditions.push(and(gte(orders.date, filters.startDate), lte(orders.date, filters.endDate)));
      } else if (filters.startDate) {
        conditions.push(gte(orders.date, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(orders.date, filters.endDate));
      }
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResults] = await Promise.all([
      db.query.orders.findMany({
        where: whereClause,
        with: {
          salesman: true,
          items: true,
          processor: true,
        },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        limit: filters?.limit || 500,
        offset: filters?.offset || 0,
      }),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause)
    ]);

    return { 
      orders: results as any, 
      total: Number(countResults[0]?.count || 0) 
    };
  }

  async getOrderById(id: number): Promise<OrderWithItems | undefined> {
    return await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        salesman: true,
        items: true,
        processor: true,
      }
    }) as any;
  }

  async createOrder(data: InsertOrder, itemsData: Omit<InsertOrderItem, "orderId">[]): Promise<OrderWithItems> {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values(data as any).returning();
      if (itemsData.length > 0) {
        // @ts-ignore
        await tx.insert(orderItems).values(itemsData.map(item => ({ ...item, orderId: order.id, branchId: order.branchId })));
      }

      return order;
    });

    return await this.getOrderById(result.id) as OrderWithItems;
  }

  async updateOrderStatus(id: number, status: string, processedBy?: number): Promise<OrderWithItems> {
    await db.update(orders).set({ status, processedBy: processedBy || null }).where(eq(orders.id, id));
    return await this.getOrderById(id) as OrderWithItems;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>, itemsData?: Omit<InsertOrderItem, "orderId">[]): Promise<OrderWithItems> {
    await db.transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.update(orders).set(data).where(eq(orders.id, id));
      }
      
      if (itemsData) {
        await tx.delete(orderItems).where(eq(orderItems.orderId, id));
        if (itemsData.length > 0) {
          // @ts-ignore
          await tx.insert(orderItems).values(itemsData.map(item => ({ ...item, orderId: id })));
        }
      }
    });

    return await this.getOrderById(id) as OrderWithItems;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  // Dashboard Stats
  async getAdminStats(branchId?: number): Promise<{ totalUsers: number; totalBranches: number; totalAuditLogs: number; totalTaxes: number }> {
    const conditions = [];
    if (branchId) conditions.push(eq(users.branchId, branchId));
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(conditions.length ? and(...conditions) : undefined);
    
    const [branchesCount] = await db.select({ count: sql<number>`count(*)` }).from(branches);
    
    const auditConditions = [];
    if (branchId) auditConditions.push(eq(auditLogs.branchId, branchId));
    const [auditCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(auditConditions.length ? and(...auditConditions) : undefined);
    
    const taxConditions = [];
    if (branchId) taxConditions.push(eq(taxes.branchId, branchId));
    const [taxesCount] = await db.select({ count: sql<number>`count(*)` }).from(taxes).where(taxConditions.length ? and(...taxConditions) : undefined);

    return {
      totalUsers: Number(usersCount.count),
      totalBranches: Number(branchesCount.count),
      totalAuditLogs: Number(auditCount.count),
      totalTaxes: Number(taxesCount.count),
    };
  }

  async getSalesStats(branchId?: number, salesmanId?: number, startDate?: Date, endDate?: Date): Promise<{
    totalRevenueMonth: number;
    activeCustomersCount: number;
    pendingOrdersCount: number;
    averageOrderValue: number;
    weeklySales: { date: string; total: number }[];
    topCustomers: { name: string; total: number }[];
    topProducts: { name: string; qty: number }[];
    recentOrders: OrderWithItems[];
  }> {
    const now = new Date();
    const activeStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const activeEndDate = endDate || new Date();
    
    const startOf7DaysAgo = new Date(activeEndDate);
    startOf7DaysAgo.setDate(activeEndDate.getDate() - 6);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    const conditions = [];
    if (branchId) conditions.push(eq(orders.branchId, branchId));
    if (salesmanId) conditions.push(eq(orders.salesmanId, salesmanId));
    
    // Explicit period bounding
    conditions.push(gte(orders.date, activeStartDate));
    // Since dates might specify start of day exactly, pad activeEndDate to the end of its respective day.
    const eodDate = new Date(activeEndDate);
    eodDate.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.date, eodDate));
    
    const branchCondition = and(...conditions.slice(0, 2).filter(Boolean)); // Extract branch and sales
    const monthCondition = and(...conditions);

    // Revenue & Avg Order Value
    const [monthStats] = await db.select({
      count: sql<number>`count(*)`,
      total: sql<number>`sum(${orders.finalTotal})`
    }).from(orders).where(monthCondition);
    
    const count = Number(monthStats?.count || 0);
    const totalRevenueMonth = Number(monthStats?.total || 0);
    const averageOrderValue = count > 0 ? totalRevenueMonth / count : 0;

    // Pending orders
    const [pendingStats] = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(monthCondition, inArray(orders.status, ["PENDING", "DRAFT"])));

    // Weekly Sales
    const weeklyData = await db.select({
      dateStr: sql<string>`to_char(${orders.date}, 'YYYY-MM-DD')`,
      total: sql<number>`sum(${orders.finalTotal})`
    })
    .from(orders)
    .where(and(gte(orders.date, startOf7DaysAgo), branchCondition))
    .groupBy(sql`to_char(${orders.date}, 'YYYY-MM-DD')`);

    const weeklySalesMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOf7DaysAgo);
        d.setDate(d.getDate() + i);
        weeklySalesMap.set(d.toISOString().split("T")[0], 0);
    }
    weeklyData.forEach(r => {
      const key = String(r.dateStr); 
      if (weeklySalesMap.has(key)) weeklySalesMap.set(key, Number(r.total || 0));
    });
    const weeklySales = Array.from(weeklySalesMap.entries()).map(([date, total]) => ({ date, total }));

    // Top Customers
    const topCustomers = await db.select({
      name: orders.shopName,
      total: sql<number>`sum(${orders.finalTotal})`
    })
    .from(orders)
    .where(monthCondition)
    .groupBy(orders.shopName)
    .orderBy(desc(sql`sum(${orders.finalTotal})`))
    .limit(5);

    // Top Products
    const topProducts = await db.select({
      name: orderItems.itemName,
      qty: sql<number>`sum(${orderItems.qty})`
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(monthCondition)
    .groupBy(orderItems.itemName)
    .orderBy(desc(sql`sum(${orderItems.qty})`))
    .limit(5);

    // Active Customers Count
    const [customersRes] = await db.select({ count: sql<number>`count(*)` })
      .from(salesCustomers)
      .where(branchId ? eq(salesCustomers.branchId, branchId) : undefined);

    // Recent Orders
    const recentOrders = await db.query.orders.findMany({
      where: branchCondition,
      with: { salesman: true, items: true, processor: true },
      orderBy: [desc(orders.createdAt)],
      limit: 5
    });

    return {
      totalRevenueMonth,
      activeCustomersCount: Number(customersRes?.count || 0),
      pendingOrdersCount: Number(pendingStats?.count || 0),
      averageOrderValue,
      weeklySales,
      topCustomers: topCustomers.map(c => ({ name: c.name, total: Number(c.total || 0) })),
      topProducts: topProducts.map(p => ({ name: p.name, qty: Number(p.qty || 0) })),
      recentOrders: recentOrders as any,
    };
  }

  async getDashboardStats(branchId?: number, salesmanId?: number): Promise<{
    todayOrders: number;
    totalAmount: number;
    pendingShipments: number;
    readyShipments: number;
    customersCount: number;
    topSalesmen: { name: string; value: number }[];
    recentOrders: OrderWithItems[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conditions = [];
    if (branchId) conditions.push(eq(orders.branchId, branchId));
    if (salesmanId) conditions.push(eq(orders.salesmanId, salesmanId));
    
    const branchCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Today's orders & revenue
    const [todayStats] = await db.select({
      count: sql<number>`count(*)`,
      amount: sql<number>`sum(${orders.finalTotal})`
    })
    .from(orders)
    .where(and(gte(orders.date, today), branchCondition));

    // Shipments stats
    const shipmentBranchCond = branchId ? eq(shipments.branchId, branchId) : undefined;
    const shipmentStats = await db.select({
      status: shipments.status,
      count: sql<number>`count(*)`
    })
    .from(shipments)
    .where(shipmentBranchCond)
    .groupBy(shipments.status);

    const pendingShipments = Number(shipmentStats.find(s => s.status === "MENUNGGU_VERIFIKASI")?.count || 0);
    const readyShipments = Number(shipmentStats.find(s => s.status === "SIAP_KIRIM")?.count || 0);

    // Customers count
    const [customersCountResult] = await db.select({ count: sql<number>`count(*)` })
      .from(salesCustomers)
      .where(branchId ? eq(salesCustomers.branchId, branchId) : undefined);

    // Top Salesmen
    const topSalesmenRes = await db.select({
      name: users.displayName,
      value: sql<number>`sum(${orders.finalTotal})`
    })
    .from(orders)
    .leftJoin(users, eq(orders.salesmanId, users.id))
    .where(branchCondition)
    .groupBy(users.displayName)
    .orderBy(desc(sql`sum(${orders.finalTotal})`))
    .limit(5);

    // Recent Orders
    const recentOrders = await db.query.orders.findMany({
      where: branchCondition,
      with: { salesman: true, items: true, processor: true },
      orderBy: [desc(orders.createdAt)],
      limit: 5
    });

    return {
      todayOrders: Number(todayStats?.count || 0),
      totalAmount: Number(todayStats?.amount || 0),
      pendingShipments,
      readyShipments,
      customersCount: Number(customersCountResult?.count || 0),
      topSalesmen: topSalesmenRes.map(s => ({ name: s.name || 'Unknown', value: Number(s.value || 0) })),
      recentOrders: recentOrders as any
    };
  }

  async getDashboardSummary(branchId?: number, salesmanId?: number, startDate?: Date, endDate?: Date): Promise<{
    shipments: any;
    recentActivities: any[];
  }> {
    const eodDate = endDate ? new Date(endDate) : undefined;
    if (eodDate) eodDate.setHours(23, 59, 59, 999);

    // 1. Shipments Stats Aggregation
    const baseShipmentConditions = [];
    if (branchId) baseShipmentConditions.push(eq(shipments.branchId, branchId));
    if (startDate) baseShipmentConditions.push(gte(shipments.inputDate, startDate));
    if (eodDate) baseShipmentConditions.push(lte(shipments.inputDate, eodDate));

    const shipmentStatsRaw = await db.select({
      status: shipments.status,
      count: sql<number>`count(*)`
    })
    .from(shipments)
    .where(and(...baseShipmentConditions))
    .groupBy(shipments.status);

    const invoiceReturnedRaw = await db.select({
      count: sql<number>`count(*)`
    })
    .from(shipments)
    .where(and(
      eq(shipments.invoiceReturned, true),
      ...baseShipmentConditions
    ));

    const shipmentMap = shipmentStatsRaw.reduce((acc, row) => {
      acc[row.status || 'UNKNOWN'] = Number(row.count) || 0;
      return acc;
    }, {} as Record<string, number>);

    const shipmentsSum = {
      total: Object.values(shipmentMap).reduce((a: number, b: number) => a + b, 0),
      menunggu: shipmentMap['MENUNGGU_VERIFIKASI'] || 0,
      sedangPacking: shipmentMap['SEDANG_PACKING'] || 0,
      siapKirim: shipmentMap['SIAP_KIRIM'] || 0,
      prosesKirim: shipmentMap['DALAM_PENGIRIMAN'] || 0,
      terkirim: shipmentMap['TERKIRIM'] || 0,
      fakturKembali: Number(invoiceReturnedRaw[0]?.count || 0)
    };

    // 2. Recent Activities Aggregation
    const [recentAudit, recentShipments, recentOrders] = await Promise.all([
      db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        timestamp: auditLogs.timestamp,
        userName: users.displayName
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(branchId ? eq(auditLogs.branchId, branchId) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(5),

      db.query.shipments.findMany({
        where: branchId ? eq(shipments.branchId, branchId) : undefined,
        with: { customer: true },
        orderBy: desc(shipments.inputDate),
        limit: 10
      }),

      db.query.orders.findMany({
        where: and(
          branchId ? eq(orders.branchId, branchId) : undefined,
          salesmanId ? eq(orders.salesmanId, salesmanId) : undefined
        ),
        with: { salesman: true },
        orderBy: desc(orders.createdAt),
        limit: 10
      })
    ]);

    const auditActivities = recentAudit.map((log: any) => ({
      id: "audit-" + log.id,
      title: log.action,
      desc: log.details,
      time: log.timestamp?.toISOString() || new Date().toISOString(),
      iconType: 'history',
      user: log.userName || 'System',
      type: 'admin'
    }));

    const shipmentActivities = recentShipments.map((s: any) => ({
      id: "shipment-" + s.id,
      title: "Shipment " + s.invoiceNumber,
      desc: "Pengiriman ke " + (s.customer?.name || 'Unknown') + " di " + (s.destination || '-'),
      time: new Date(s.inputDate).toISOString(),
      iconType: 'truck',
      user: s.packerName || 'System',
      type: 'gudang'
    }));

    const orderActivities = recentOrders.map((o: any) => ({
      id: "order-" + o.id,
      title: "Order #" + o.id,
      desc: "Pesanan toko " + o.shopName + " senilai " + o.finalTotal,
      time: new Date(o.createdAt).toISOString(),
      iconType: 'shoppingbag',
      user: o.salesman?.displayName || 'Sales',
      type: 'sales'
    }));

    // Combine and sort
    const combined = [...auditActivities, ...shipmentActivities, ...orderActivities]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 15);

    return {
      shipments: shipmentsSum,
      recentActivities: combined
    };
  }


  // Promo Toko Implementation
  async getPromoBrands(branchId?: number): Promise<PromoBrand[]> {
    const conditions = [];
    if (branchId) conditions.push(or(eq(promoBrands.branchId, branchId), isNull(promoBrands.branchId)));
    return await db.select().from(promoBrands).where(conditions.length ? and(...conditions) : undefined);
  }

  async createPromoBrand(promoBrand: InsertPromoBrand): Promise<PromoBrand> {
    const [result] = await db.insert(promoBrands).values(promoBrand as any).returning();
    return result;
  }

  async deletePromoBrand(id: number): Promise<void> {
    await db.delete(promoBrands).where(eq(promoBrands.id, id));
  }

  async getPromoMasters(branchId?: number): Promise<PromoMaster[]> {
    const conditions = [];
    if (branchId) conditions.push(or(eq(promoMasters.branchId, branchId), isNull(promoMasters.branchId)));
    return await db.select().from(promoMasters).where(conditions.length ? and(...conditions) : undefined);
  }

  async createPromoMaster(promoMaster: InsertPromoMaster): Promise<PromoMaster> {
    const [result] = await db.insert(promoMasters).values(promoMaster as any).returning();
    return result;
  }

  async deletePromoMaster(id: number): Promise<void> {
    await db.delete(promoMasters).where(eq(promoMasters.id, id));
  }

  async getPromoInputs(filters?: { branchId?: number; startDate?: Date; endDate?: Date; customerCode?: string }): Promise<(PromoInput & { promo?: PromoMaster, brand?: PromoBrand, customer?: SalesCustomer })[]> {
    const conditions = [];
    if (filters?.branchId) conditions.push(eq(promoInputs.branchId, filters.branchId));
    if (filters?.customerCode) conditions.push(eq(promoInputs.customerCode, filters.customerCode));
    
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        conditions.push(and(gte(promoInputs.date, filters.startDate), lte(promoInputs.date, filters.endDate)));
      } else if (filters.startDate) {
        conditions.push(gte(promoInputs.date, filters.startDate));
      } else if (filters.endDate) {
        conditions.push(lte(promoInputs.date, filters.endDate));
      }
    }
    
    const results = await db.select({
      input: promoInputs,
      promo: promoMasters,
      brand: promoBrands,
      customer: salesCustomers,
    })
    .from(promoInputs)
    .leftJoin(promoMasters, eq(promoInputs.promoId, promoMasters.id))
    .leftJoin(promoBrands, eq(promoMasters.brandId, promoBrands.id))
    .leftJoin(salesCustomers, and(
      eq(promoInputs.customerCode, salesCustomers.code),
      eq(promoInputs.branchId, salesCustomers.branchId)
    ))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(promoInputs.date));

    return results.map(r => ({
      ...r.input,
      promo: r.promo || undefined,
      brand: r.brand || undefined,
      customer: r.customer || undefined,
    }));
  }

  async createPromoInput(promoInput: InsertPromoInput): Promise<PromoInput> {
    return await db.transaction(async (tx) => {
      const [result] = await tx.insert(promoInputs).values(promoInput as any).returning();
      
      if (result.customerCode && result.status === "PENDING") {
        await tx.update(salesCustomers)
          .set({ totalPromo: sql`${salesCustomers.totalPromo} + ${result.calculatedValue}` })
          .where(and(eq(salesCustomers.code, result.customerCode), eq(salesCustomers.branchId, result.branchId!)));
      }
      
      return result;
    });
  }

  async updatePromoInput(id: number, promoInput: Partial<InsertPromoInput>): Promise<PromoInput> {
    return await db.transaction(async (tx) => {
      const [old] = await tx.select().from(promoInputs).where(eq(promoInputs.id, id)).limit(1);
      if (!old) throw new Error("Input not found");
      
      const [result] = await tx.update(promoInputs).set(promoInput).where(eq(promoInputs.id, id)).returning();
      
      if (result.customerCode && old.status === "PENDING" && result.status === "SELESAI") {
        await tx.update(salesCustomers)
          .set({ totalPromo: sql`${salesCustomers.totalPromo} - ${old.calculatedValue}` })
          .where(and(eq(salesCustomers.code, result.customerCode), eq(salesCustomers.branchId, result.branchId!)));
      } else if (result.customerCode && old.status === "PENDING" && result.status === "PENDING" && old.calculatedValue !== result.calculatedValue) {
        const diff = result.calculatedValue - old.calculatedValue;
        await tx.update(salesCustomers)
          .set({ totalPromo: sql`${salesCustomers.totalPromo} + ${diff}` })
          .where(and(eq(salesCustomers.code, result.customerCode), eq(salesCustomers.branchId, result.branchId!)));
      }
      
      return result;
    });
  }

  async deletePromoInput(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [old] = await tx.select().from(promoInputs).where(eq(promoInputs.id, id)).limit(1);
      if (!old) return;
      
      await tx.delete(promoInputs).where(eq(promoInputs.id, id));
      
      if (old.customerCode && old.status === "PENDING") {
        await tx.update(salesCustomers)
          .set({ totalPromo: sql`${salesCustomers.totalPromo} - ${old.calculatedValue}` })
          .where(and(eq(salesCustomers.code, old.customerCode), eq(salesCustomers.branchId, old.branchId!)));
      }
    });
  }

  async liquidatePromoInputs(customerCode: string, paymentData: any, branchId: number): Promise<void> {
    const { 
      paymentMethod, 
      paidAmount, 
      completionInvoiceNumber,
      recipientName,
      bankName,
      bankAccountNumber,
      bankAccountName,
      completionNotes,
      completionDate 
    } = paymentData;

    await db.transaction(async (tx) => {
      // Get total amount being liquidated
      const pendings = await tx.select().from(promoInputs).where(and(
        eq(promoInputs.customerCode, customerCode), 
        eq(promoInputs.branchId, branchId),
        eq(promoInputs.status, "PENDING")
      ));
      
      if (pendings.length === 0) return;
      
      const totalLiquidated = pendings.reduce((sum, p) => sum + Number(p.calculatedValue), 0);

      await tx.update(promoInputs)
        .set({
          status: "SELESAI",
          completionDate: completionDate ? new Date(completionDate) : new Date(),
          paymentMethod,
          paidAmount: paidAmount || totalLiquidated, // Default to calculated value if not provided
          completionInvoiceNumber,
          recipientName,
          bankName,
          bankAccountNumber,
          bankAccountName,
          completionNotes,
        })
        .where(and(
          eq(promoInputs.customerCode, customerCode), 
          eq(promoInputs.branchId, branchId),
          eq(promoInputs.status, "PENDING")
        ));

      await tx.update(salesCustomers)
        .set({ totalPromo: sql`${salesCustomers.totalPromo} - ${totalLiquidated}` })
        .where(and(eq(salesCustomers.code, customerCode), eq(salesCustomers.branchId, branchId)));
    });
  }

  async syncCustomerPromoBalance(customerCode: string, branchId: number): Promise<number> {
    return await db.transaction(async (tx) => {
      // Sum all pending inputs for this specific customer & branch
      const res = await tx.select({ 
        total: sql<number>`sum(${promoInputs.calculatedValue})` 
      })
      .from(promoInputs)
      .where(and(
        eq(promoInputs.customerCode, customerCode),
        eq(promoInputs.branchId, branchId),
        eq(promoInputs.status, "PENDING")
      ));

      const newTotal = Number(res[0]?.total || 0);

      // Update the customer record with the fresh sum
      await tx.update(salesCustomers)
        .set({ totalPromo: newTotal })
        .where(and(
          eq(salesCustomers.code, customerCode),
          eq(salesCustomers.branchId, branchId)
        ));

      return newTotal;
    });
  }

  async syncPromoBalances(branchId: number): Promise<void> {
    const custs = await db.select().from(salesCustomers).where(eq(salesCustomers.branchId, branchId));
    for (const c of custs) {
      await this.syncCustomerPromoBalance(c.code, branchId);
    }
  }

  // Payment Confirmations
  async getPaymentConfirmations(branchId?: number): Promise<PaymentConfirmation[]> {
    if (branchId) {
      return await db.select().from(paymentConfirmations).where(eq(paymentConfirmations.branchId, branchId)).orderBy(desc(paymentConfirmations.createdAt));
    }
    return await db.select().from(paymentConfirmations).orderBy(desc(paymentConfirmations.createdAt));
  }

  async createPaymentConfirmation(data: InsertPaymentConfirmation): Promise<PaymentConfirmation> {
    const [result] = await db.insert(paymentConfirmations).values(data as any).returning();
    return result;
  }

  async updatePaymentConfirmation(id: number, data: Partial<InsertPaymentConfirmation>): Promise<PaymentConfirmation> {
    const [result] = await db.update(paymentConfirmations).set(data).where(eq(paymentConfirmations.id, id)).returning();
    return result;
  }

  async getBranchPromoStats(branchId: number): Promise<{ 
    totalPoints: number, 
    totalLabels: number,
    cashback: number,
    labels: number,
    points: number
  }> {
    // totalPoints will now represent Total Surat Order
    const [orderCountRes] = await db.select({ 
      count: sql<number>`cast(count(*) as int)` 
    })
    .from(orders)
    .where(eq(orders.branchId, branchId));
      
    // totalLabels will now represent Total Pengiriman Selesai
    const [shipmentCountRes] = await db.select({ 
      count: sql<number>`cast(count(*) as int)` 
    })
    .from(shipments)
    .where(and(
      eq(shipments.branchId, branchId),
      eq(shipments.status, 'TERKIRIM')
    ));

    // cashback: total calculatedValue from promoInputs
    const [cashbackRes] = await db.select({
      total: sql<number>`cast(sum(${promoInputs.calculatedValue}) as int)`
    })
    .from(promoInputs)
    .where(eq(promoInputs.branchId, branchId));

    // points: total point from pointLogs (earn)
    const [pointsRes] = await db.select({
      total: sql<number>`cast(sum(${pointLogs.point}) as int)`
    })
    .from(pointLogs)
    .where(and(eq(pointLogs.branchId, branchId), eq(pointLogs.type, 'earn')));

    // labels: total quantity from labelClaims
    const [labelsRes] = await db.select({
      total: sql<number>`cast(sum(${labelClaims.amount}) as int)`
    })
    .from(labelClaims)
    .where(eq(labelClaims.branchId, branchId));

    return {
      totalPoints: Number(orderCountRes?.count || 0),
      totalLabels: Number(shipmentCountRes?.count || 0),
      cashback: Number(cashbackRes?.total || 0),
      points: Number(pointsRes?.total || 0),
      labels: Number(labelsRes?.total || 0)
    };
  }

  // App Settings
  async getAppSettings(): Promise<AppSetting[]> {
    return await db.select().from(appSettings);
  }

  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting;
  }

  async updateAppSetting(key: string, value: string): Promise<AppSetting> {
    const [setting] = await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: [appSettings.key],
        set: { value },
      })
      .returning();
    return setting;
  }

  // Pelanggan Program
  async getPelangganPrograms(pelangganId: number, branchId?: number, brandCode?: string): Promise<any[]> {
    console.log(`[Storage] Fetching programs for customer ${pelangganId}, branch hint: ${branchId}, brand: ${brandCode || 'ALL'}`);
    const conditions: any[] = [eq(pelangganProgram.pelangganId, pelangganId)];
    
    if (branchId) {
      conditions.push(or(eq(pelangganProgram.branchId, branchId), isNull(pelangganProgram.branchId)));
    }
    
    if (brandCode && brandCode !== 'SEMUA') {
      // Robust brand matching: specific brand, 'SEMUA' (All), or no brand specified
      conditions.push(or(
        eq(sql`LOWER(${pelangganProgram.brandCode})`, brandCode.toLowerCase()),
        eq(sql`LOWER(${pelangganProgram.brandCode})`, 'semua'),
        isNull(pelangganProgram.brandCode)
      ));
    }
    
    const participationsQuery = db.select().from(pelangganProgram).$dynamic();
    const participations = conditions.length > 0 
      ? await participationsQuery.where(and(...conditions)) 
      : await participationsQuery;
    
    // Fetch names for each program
    const enriched = await Promise.all(participations.map(async (p) => {
      let programName = "N/A";
      if (p.jenisProgram === 'paket') {
        const m = await db.select().from(paketMaster).where(eq(paketMaster.id, p.referensiId)).limit(1);
        if (m.length > 0) programName = m[0].nama;
      } else if (p.jenisProgram === 'cashback') {
        const m = await db.select().from(cashbackMaster).where(eq(cashbackMaster.id, p.referensiId)).limit(1);
        if (m.length > 0) programName = m[0].nama;
      } else if (p.jenisProgram === 'cutting') {
        const m = await db.select().from(cuttingMaster).where(eq(cuttingMaster.id, p.referensiId)).limit(1);
        if (m.length > 0) programName = m[0].nama;
      } else if (p.jenisProgram === 'point') {
        const m = await db.select().from(pointMaster).where(eq(pointMaster.id, p.referensiId)).limit(1);
        if (m.length > 0) programName = m[0].nama;
      }
      
      return { 
        ...p, 
        programName: programName === "N/A" ? `${p.jenisProgram.toUpperCase()}` : programName, 
        brandCode: p.brandCode 
      };
    }));
    
    // Add active Principal Programs for preview combinations
    const principalConditions: any[] = [
      eq(pelangganProgramPrincipal.pelangganId, pelangganId),
      eq(pelangganProgramPrincipal.status, 'aktif'),
      eq(principalProgram.status, 'aktif')
    ];

    if (brandCode && brandCode !== 'SEMUA') {
      principalConditions.push(or(
        eq(sql`LOWER(${principalProgram.brandCode})`, brandCode.toLowerCase()),
        eq(sql`LOWER(${principalProgram.brandCode})`, 'semua')
      ));
    }
    
    // We optionally filter branchId if it exists on pelangganProgramPrincipal. Wait, in schema branchId is on principalProgram. We can safely skip branch filter for principal if it's already bound to customer unless strictly required. Let's just fetch it.
    const principalPrograms = await db.select({
      id: pelangganProgramPrincipal.id,
      pelangganId: pelangganProgramPrincipal.pelangganId,
      branchId: sql`null`,
      jenisProgram: sql`'principal'`,
      programName: principalProgram.nama,
      referensiId: principalProgram.id,
      brandCode: principalProgram.brandCode,
      status: pelangganProgramPrincipal.status,
      tglMulai: pelangganProgramPrincipal.createdAt
    })
    .from(pelangganProgramPrincipal)
    .innerJoin(principalProgram, eq(pelangganProgramPrincipal.programPrincipalId, principalProgram.id))
    .where(and(...principalConditions));

    enriched.push(...(principalPrograms as any[]));

    return enriched;
  }

  async createPelangganProgram(data: InsertPelangganProgram): Promise<PelangganProgram> {
    const [result] = await db.insert(pelangganProgram).values(data as any).returning();
    return result;
  }

  async updatePelangganProgram(id: number, data: Partial<InsertPelangganProgram>): Promise<PelangganProgram> {
    const [result] = await db.update(pelangganProgram).set(data).where(eq(pelangganProgram.id, id)).returning();
    return result;
  }

  async deletePelangganProgram(id: number): Promise<void> {
    const [pp] = await db.select().from(pelangganProgram).where(eq(pelangganProgram.id, id)).limit(1);
    if (!pp) return;

    // 1. Check for Integrated Transactions (transaksi_promo_new)
    const [txExist] = await db.select().from(transaksiPromo).where(and(
      eq(transaksiPromo.pelangganId, pp.pelangganId),
      eq(transaksiPromo.brandCode, pp.brandCode),
      pp.branchId ? eq(transaksiPromo.branchId, pp.branchId) : isNull(transaksiPromo.branchId)
    )).limit(1);

    if (txExist) {
      throw new Error("Gagal menghapus: Pelanggan sudah memiliki transaksi pada merek ini. Silakan ubah status menjadi Nonaktif saja.");
    }

    // 2. Check for Reward Claims
    const [claimExist] = await db.select().from(rewardClaim).where(and(
      eq(rewardClaim.pelangganId, pp.pelangganId),
      eq(rewardClaim.refId, pp.referensiId),
      eq(rewardClaim.sumber, pp.jenisProgram as any)
    )).limit(1);

    if (claimExist) {
      throw new Error(`Gagal menghapus: Ditemukan data klaim hadiah terkait program ${pp.jenisProgram} ini.`);
    }

    // 3. Check for Specific Program Progress
    if (pp.jenisProgram === 'paket') {
      const [progress] = await db.select().from(paketProgress).where(and(
        eq(paketProgress.pelangganId, pp.pelangganId),
        eq(paketProgress.paketId, pp.referensiId)
      )).limit(1);
      if (progress && Number(progress.totalQty) > 0) {
        throw new Error("Gagal menghapus: Pelanggan sudah memiliki progres akumulasi pada Paket ini.");
      }
    } else if (pp.jenisProgram === 'cutting') {
      const [progress] = await db.select().from(cuttingProgress).where(and(
        eq(cuttingProgress.pelangganId, pp.pelangganId),
        eq(cuttingProgress.cuttingId, pp.referensiId)
      )).limit(1);
      if (progress && Number(progress.totalLabel) > 0) {
        throw new Error("Gagal menghapus: Pelanggan sudah memiliki progres label pada program Cutting ini.");
      }
    } else if (pp.jenisProgram === 'point') {
       // Get customer code to check point logs
       const [customer] = await db.select().from(salesCustomers).where(eq(salesCustomers.id, pp.pelangganId)).limit(1);
       if (customer) {
         const [logs] = await db.select().from(pointLogs).where(and(
           eq(pointLogs.customerCode, customer.code),
           eq(pointLogs.brandCode, pp.brandCode)
         )).limit(1);
         if (logs) {
           throw new Error("Gagal menghapus: Pelanggan sudah memiliki histori perolehan/penukaran poin pada merek ini.");
         }
       }
    }

    console.log(`[Storage] Deleting program enrollment ${id} for customer ${pp.pelangganId}`);
    await db.delete(pelangganProgram).where(eq(pelangganProgram.id, id));
  }

  // Integrated Promo Transactions
  async getTransaksiPromo(filters?: { branchId?: number, pelangganId?: number }): Promise<any[]> {
    const conditions = [];
    if (filters?.branchId) conditions.push(eq(transaksiPromo.branchId, filters.branchId));
    if (filters?.pelangganId) conditions.push(eq(transaksiPromo.pelangganId, filters.pelangganId));
    
    const transactions = await db.select()
      .from(transaksiPromo)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transaksiPromo.createdAt));
      
    // Join with customer names
    const enriched = await Promise.all(transactions.map(async (t) => {
      const cust = await db.select().from(salesCustomers).where(eq(salesCustomers.id, t.pelangganId)).limit(1);
      return { ...t, pelangganName: cust[0]?.name || "Unknown" };
    }));
    
    return enriched;
  }

  async deleteTransaksiPromo(id: number): Promise<void> {
    // In a real system, we should also revert points, cashback, etc.
    // However, for simplicity now, we just delete the transaction and results.
    await db.delete(promoHasil).where(eq(promoHasil.transaksiId, id));
    await db.delete(transaksiPromo).where(eq(transaksiPromo.id, id));
  }

  async updateTransaksiPromo(id: number, data: Partial<InsertTransaksiPromo>): Promise<any> {
    const [updated] = await db.update(transaksiPromo).set(data).where(eq(transaksiPromo.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
