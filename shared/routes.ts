import { z } from 'zod';
import { insertExpeditionSchema, insertCustomerSchema, insertShipmentSchema, updateShipmentSchema, expeditions, customers, shipments, ShipmentWithRelations, insertBranchSchema, branches, roles, insertRoleSchema, type Customer } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  expeditions: {
    list: {
      method: 'GET' as const,
      path: '/api/expeditions' as const,
      responses: {
        200: z.array(z.custom<typeof expeditions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expeditions' as const,
      input: insertExpeditionSchema,
      responses: {
        201: z.custom<typeof expeditions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/expeditions/:id' as const,
      input: insertExpeditionSchema.partial(),
      responses: {
        200: z.custom<typeof expeditions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expeditions/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers' as const,
      responses: {
        200: z.array(z.custom<Customer>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers' as const,
      input: insertCustomerSchema,
      responses: {
        201: z.custom<Customer>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/customers/:id' as const,
      input: insertCustomerSchema.partial(),
      responses: {
        200: z.custom<Customer>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  shipments: {
    list: {
      method: 'GET' as const,
      path: '/api/shipments' as const,
      responses: {
        200: z.array(z.custom<ShipmentWithRelations>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/shipments/:id' as const,
      responses: {
        200: z.custom<ShipmentWithRelations>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/shipments' as const,
      input: insertShipmentSchema,
      responses: {
        201: z.custom<typeof shipments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/shipments/:id' as const,
      input: updateShipmentSchema,
      responses: {
        200: z.custom<typeof shipments.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/shipments/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    cancelPacking: {
      method: 'PUT' as const,
      path: '/api/shipments/:id/cancel-packing' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    cancelSiapKirim: {
      method: 'PUT' as const,
      path: '/api/shipments/:id/cancel-siap-kirim' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  branches: {
    list: {
      method: 'GET' as const,
      path: '/api/branches' as const,
      responses: {
        200: z.array(z.custom<typeof branches.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/branches' as const,
      input: insertBranchSchema,
      responses: {
        201: z.custom<typeof branches.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/branches/:id' as const,
      input: insertBranchSchema.partial(),
      responses: {
        200: z.custom<typeof branches.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/branches/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  roles: {
    list: {
      method: 'GET' as const,
      path: '/api/roles' as const,
      responses: {
        200: z.array(z.custom<typeof roles.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/roles' as const,
      input: insertRoleSchema,
      responses: {
        201: z.custom<typeof roles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/roles/:id' as const,
      input: insertRoleSchema.partial(),
      responses: {
        200: z.custom<typeof roles.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/roles/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
