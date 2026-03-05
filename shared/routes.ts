import { z } from 'zod';
import { insertFolderSchema, insertEntrySchema, folders, entries } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
};

export const api = {
  folders: {
    list: {
      method: 'GET' as const,
      path: '/api/folders' as const,
      responses: {
        200: z.array(z.custom<typeof folders.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/folders' as const,
      input: insertFolderSchema,
      responses: {
        201: z.custom<typeof folders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/folders/:id' as const,
      input: insertFolderSchema.partial(),
      responses: {
        200: z.custom<typeof folders.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/folders/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  entries: {
    list: {
      method: 'GET' as const,
      path: '/api/entries' as const,
      input: z.object({ folderId: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof entries.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/entries' as const,
      input: insertEntrySchema,
      responses: {
        201: z.custom<typeof entries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/entries/:id' as const,
      input: insertEntrySchema.partial(),
      responses: {
        200: z.custom<typeof entries.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/entries/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
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
