// @ts-nocheck
import { Express } from "express";
import passport from "passport";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth, requirePermission, hashPassword } from "../auth";
import { insertRoleSchema } from "@shared/schema";

export function registerAuthRoutes(app: Express, broadcast: (type: string) => void) {
  // === AUTH ROUTES ===
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login gagal" });
      
      req.logIn(user, async (err) => {
        if (err) return next(err);
        res.json({ 
          id: user.id, username: user.username, displayName: user.displayName, 
          branchId: user.branchId, accessibleBranchIds: user.accessibleBranchIds, 
          authorizedDashboards: user.authorizedDashboards, role: user.role
        });
        if (user && user.id) {
          await storage.recordAuditLog(user.id, "LOGIN", "auth", `User ${user.username} logged in`, user.branchId);
        }
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    const userId = (req.user as any)?.id;
    const username = (req.user as any)?.username;
    const branchId = (req.user as any)?.branchId;
    req.logout(async (err) => {
      if (err) return next(err);
      res.json({ message: "Berhasil logout" });
      if (userId) {
        await storage.recordAuditLog(userId, "LOGOUT", "auth", `User ${username} logged out`, branchId);
      }
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  // === USER MANAGEMENT ===
  app.get("/api/users", requireAuth, async (req, res) => {
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
    const allUsers = await storage.getUsers(branchId);
    const usersWithBranches = await Promise.all(allUsers.map(async (u) => {
      const accessibleBranchIds = await storage.getUserBranches(u.id);
      return { 
        id: u.id, username: u.username, displayName: u.displayName, 
        branchId: u.branchId, accessibleBranchIds, role: u.role, roleId: u.roleId,
        authorizedDashboards: u.authorizedDashboards
      };
    }));
    res.json(usersWithBranches);
  });

  app.post("/api/users", requireAuth, requirePermission("manajemen_pengguna", "input"), async (req, res) => {
    try {
      const schema = z.object({
        username: z.string().min(3),
        displayName: z.string().min(2),
        password: z.string().min(6),
        branchId: z.coerce.number().optional().nullable(),
        accessibleBranchIds: z.array(z.number()).optional(),
        authorizedDashboards: z.array(z.string()).optional(),
        role: z.string().optional().nullable(),
      });
      const data = schema.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) return res.status(400).json({ message: "Username sudah digunakan" });
      
      const hashed = await hashPassword(data.password);
      const user = await storage.createUser({ 
        ...data, password: hashed, 
        authorizedDashboards: data.authorizedDashboards || ["gudang"],
        roleId: (req.body as any).roleId || null
      });
      if (data.accessibleBranchIds) await storage.setUserBranches(user.id, data.accessibleBranchIds);
      
      await storage.recordAuditLog((req.user as any).id, "CREATE", "users", `Membuat user: ${user.username}`, (req.user as any).branchId);
      broadcast("/api/users");
      res.status(201).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/users/:id", requireAuth, requirePermission("manajemen_pengguna", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const schema = z.object({
        displayName: z.string().min(2).optional(),
        username: z.string().min(3).optional(),
        password: z.string().min(6).optional(),
        branchId: z.coerce.number().optional().nullable(),
        accessibleBranchIds: z.array(z.number()).optional(),
        authorizedDashboards: z.array(z.string()).optional(),
      });
      const data = schema.parse(req.body);
      const updates: any = { ...data };
      if (data.password) updates.password = await hashPassword(data.password);
      if ((req.body as any).roleId !== undefined) updates.roleId = (req.body as any).roleId;
      if ((req.body as any).role !== undefined) updates.role = (req.body as any).role;

      const user = await storage.updateUser(id, updates);
      if (data.accessibleBranchIds) await storage.setUserBranches(id, data.accessibleBranchIds);
      
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "users", `Memperbarui user: ${user.username}`, (req.user as any).branchId);
      broadcast("/api/users");
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/users/:id", requireAuth, requirePermission("manajemen_pengguna", "delete"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    if (id === (req.user as any).id) return res.status(400).json({ message: "Tidak dapat menghapus akun sendiri" });
    
    const targetUser = await storage.getUserById(id);
    await storage.deleteUser(id);
    if (targetUser) {
      await storage.recordAuditLog((req.user as any).id, "DELETE", "users", `Menghapus user: ${targetUser.username}`, (req.user as any).branchId);
    }
    broadcast("/api/users");
    res.status(204).send();
  });

  // === ROLE MANAGEMENT ===
  app.get("/api/roles", requireAuth, async (req, res) => {
    const roles = await storage.getRoles(req.query.branchId ? parseInt(String(req.query.branchId)) : undefined);
    res.json(roles);
  });

  app.post("/api/roles", requireAuth, requirePermission("manajemen_role", "input"), async (req, res) => {
    try {
      const data = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(data);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "roles", `Membuat role: ${role.name}`, (req.user as any).branchId);
      broadcast("/api/roles");
      res.status(201).json(role);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/roles/:id", requireAuth, requirePermission("manajemen_role", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const data = insertRoleSchema.partial().parse(req.body);
      const role = await storage.updateRole(id, data);
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "roles", `Memperbarui role: ${role.name}`, (req.user as any).branchId);
      broadcast("/api/roles");
      res.json(role);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/roles/:id", requireAuth, requirePermission("manajemen_role", "delete"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const role = await storage.getRole(id);
    if (role) {
      await storage.recordAuditLog((req.user as any).id, "DELETE", "roles", `Menghapus role: ${role.name}`, (req.user as any).branchId);
    }
    await storage.deleteRole(id);
    broadcast("/api/roles");
    res.sendStatus(204);
  });

  // === USER PERMISSIONS ===
  app.get("/api/users/:id/permissions", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      
      const perms = await storage.getUserPermissions(id);
      res.json(perms);
    } catch (err: any) {
      res.status(500).json({ message: "Gagal mengambil hak akses: " + err.message });
    }
  });

  app.put("/api/users/:id/permissions", requireAuth, requirePermission("manajemen_pengguna", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      
      const schema = z.object({
        permissions: z.array(z.object({
          menuKey: z.string(),
          canView: z.boolean(),
          canInput: z.boolean(),
          canEdit: z.boolean(),
          canDelete: z.boolean(),
          canExport: z.boolean().optional(),
          canPrint: z.boolean().optional(),
        })).optional(),
        authorizedDashboards: z.array(z.string()).optional(),
      });
      
      const { permissions, authorizedDashboards } = schema.parse(req.body);
      
      if (permissions) {
        await storage.setUserPermissions(id, permissions);
      }
      
      if (authorizedDashboards) {
        await storage.updateUser(id, { authorizedDashboards });
      }
      
      broadcast("/api/users");
      res.json({ message: "Hak akses berhasil disimpan" });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Gagal menyimpan hak akses: " + err.message });
    }
  });
}
