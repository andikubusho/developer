# LogiDash - Shipping Management System

## Overview

LogiDash ("Dashboard Pengiriman") is a web-based logistics/shipping management system built for Indonesian businesses. It allows users to track shipments through a multi-stage workflow: input → warehouse verification → ready to ship → delivered. The system manages expeditions (courier companies), customers, and users with role-based permissions.

Key features:
- Shipment lifecycle tracking with 4 statuses: `MENUNGGU_VERIFIKASI`, `SIAP_KIRIM`, `DALAM_PENGIRIMAN`, `TERKIRIM`
- Master data management for expeditions and customers
- User management with per-menu permissions (input/edit/delete)
- Dashboard analytics filtered by month/year
- Authentication with session-based login

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The project uses a monorepo layout with three top-level directories:
- `client/` — React frontend (Vite)
- `server/` — Express backend (Node.js)
- `shared/` — Shared TypeScript types, schema, and route definitions used by both sides

This shared layer is key: `shared/schema.ts` defines the database tables and Zod validators, while `shared/routes.ts` defines the API contract. Both the client and server import from `@shared/*`, preventing type drift.

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: `wouter` (lightweight alternative to React Router)
- **State/Data fetching**: TanStack Query (React Query v5) — all server state is managed here, with custom hooks per resource (`use-shipments.ts`, `use-customers.ts`, `use-expeditions.ts`)
- **UI Components**: shadcn/ui (built on Radix UI primitives) with Tailwind CSS
- **Forms**: React Hook Form + `@hookform/resolvers` with Zod schemas
- **Charts**: Recharts (via the shadcn chart wrapper)
- **Date handling**: `date-fns` + `react-day-picker`
- **Auth state**: Managed via a `useAuth` hook that calls `/api/auth/me` and caches the result in React Query

**Route protection**: All routes except `/login` are wrapped in a `ProtectedRoute` component that checks the auth state and redirects unauthenticated users.

### Backend Architecture
- **Framework**: Express 5 (with TypeScript via `tsx`)
- **Authentication**: Passport.js with local strategy; sessions stored in PostgreSQL via `connect-pg-simple`; passwords hashed using Node's `crypto.scrypt`
- **Database access**: Drizzle ORM with `drizzle-orm/node-postgres` (`pg` driver)
- **Storage abstraction**: A `storage.ts` file exports a `storage` object implementing an `IStorage` interface, decoupling route handlers from direct DB calls
- **Session**: 7-day cookie, secure in production, trusted proxy enabled

**Build**: In production, the server is compiled with esbuild (single `.cjs` bundle) and the client is built with Vite. In development, Vite runs as middleware inside Express (via `server/vite.ts`).

### Database Schema
PostgreSQL database with these tables:
- `users` — id, username (unique), password (hashed), display_name
- `user_permissions` — per-user, per-menu-key flags: can_input, can_edit, can_delete
- `expeditions` — id, name, active flag
- `customers` — id, name, address, phone
- `shipments` — full shipment record linking customer + expedition, with status, dates (input, verification, shipping), box counts, invoice number, destination, notes
- `session` — managed automatically by `connect-pg-simple`

Schema is defined in `shared/schema.ts` using Drizzle's `pgTable`. Zod schemas are generated from table definitions via `drizzle-zod`.

### Permissions System
- User with `id = 1` is treated as a super admin with full access to everything
- All other users have per-menu permissions stored in `user_permissions`
- The `usePermissions` hook on the client fetches and checks these permissions for UI-level gating
- `requireAuth` middleware on the server ensures protected API routes require a valid session

### API Design
REST API under `/api/`. The route contract is defined in `shared/routes.ts` as a typed object (`api.expeditions.list`, `api.shipments.create`, etc.) including method, path, input schema, and response schemas. Client hooks use this object directly to build fetch calls and validate responses.

## External Dependencies

### Database
- **PostgreSQL** — primary data store; connection string via `DATABASE_URL` environment variable
- **Drizzle ORM** — schema definition, query building, migrations (`drizzle-kit push`)
- **connect-pg-simple** — stores Express sessions in the `session` table

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required at startup)
- `SESSION_SECRET` — secret for signing session cookies (falls back to insecure default if not set)

### Frontend Libraries
- `@radix-ui/*` — accessible UI primitives (full suite)
- `shadcn/ui` — component layer on top of Radix (new-york style, neutral base color)
- `@tanstack/react-query` — server state management
- `wouter` — client-side routing
- `react-hook-form` + `@hookform/resolvers` — form handling with Zod validation
- `recharts` — charting for dashboard analytics
- `react-day-picker` — date picker UI
- `date-fns` — date formatting/manipulation
- `lucide-react` — icon set
- `tailwind-merge` + `clsx` — class utility helpers
- `embla-carousel-react` — carousel component
- `vaul` — drawer component
- `cmdk` — command palette component
- `input-otp` — OTP input component

### Backend Libraries
- `passport` + `passport-local` — authentication strategy
- `express-session` — session middleware
- `drizzle-orm` / `drizzle-kit` — ORM and migration tooling
- `zod` + `zod-validation-error` — input validation
- `nanoid` — unique ID generation
- `tsx` — TypeScript execution for development

### Build / Dev Tools
- Vite — frontend bundler
- esbuild — server bundler for production
- `@replit/vite-plugin-runtime-error-modal` — error overlay in dev
- `@replit/vite-plugin-cartographer` / `@replit/vite-plugin-dev-banner` — Replit-specific dev plugins (only active when `REPL_ID` is set)
- TypeScript, PostCSS, Autoprefixer, Tailwind CSS