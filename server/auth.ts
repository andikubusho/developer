import { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, "password"> {
      accessibleBranchIds: number[];
      authorizedDashboards: string[];
    }
  }
}

import { pool } from "./db";

export function setupAuth(app: import("express").Express) {
  const PostgresStore = connectPg(session);

  const isProduction = process.env.NODE_ENV === "production";

  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PostgresStore({
        pool,
        tableName: "session",
        createTableIfMissing: false,
      }),
      secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Username atau password salah" });
        const valid = await comparePassword(password, user.password);
        if (!valid) return done(null, false, { message: "Username atau password salah" });
        
        // Record login audit log
        await storage.recordAuditLog(user.id, "LOGIN", "auth", `User ${user.username} logged in`);

        const { password: _password, ...userWithoutPassword } = user;
        const accessibleBranchIds = await storage.getUserBranches(user.id);
        return done(null, { 
          ...userWithoutPassword,
          accessibleBranchIds
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) return done(null, false);
      const { password, ...userWithoutPassword } = user;
      const accessibleBranchIds = await storage.getUserBranches(user.id);
      done(null, { 
        ...userWithoutPassword,
        accessibleBranchIds
      });
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

export function requirePermission(menuKey: string | string[], action: 'view' | 'input' | 'edit' | 'delete' | 'export' | 'print') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const user = req.user as any;
    const userId = user.id;
    // Bypass for superadmin (ID 1) or 'admin' role
    if (userId === 1 || user.role === 'admin') return next();
    
    try {
      const perms = await storage.getUserPermissions(userId);
      const keys = Array.isArray(menuKey) ? menuKey : [menuKey];
      
      const hasAccess = perms.some(p => {
        if (!keys.includes(p.menuKey)) return false;
        
        switch(action) {
          case 'view': return p.canView;
          case 'input': return p.canInput;
          case 'edit': return p.canEdit;
          case 'delete': return p.canDelete;
          case 'export': return p.canExport;
          case 'print': return p.canPrint;
          default: return false;
        }
      });
      
      if (!hasAccess) {
        return res.status(403).json({ message: `Forbidden: Anda tidak memiliki aksi '${action}' untuk resource '${Array.isArray(menuKey) ? menuKey.join('/') : menuKey}'` });
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
}
