import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateEntryRequest, UpdateEntryRequest, Entry } from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    return data as T; 
  }
  return result.data;
}

export function useEntries(folderId?: number) {
  return useQuery({
    queryKey: [api.entries.list.path, folderId],
    queryFn: async () => {
      const url = new URL(api.entries.list.path, window.location.origin);
      if (folderId !== undefined) {
        url.searchParams.set("folderId", folderId.toString());
      }
      const res = await fetch(url.pathname + url.search, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      return parseWithLogging(api.entries.list.responses[200], data, "entries.list");
    },
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEntryRequest) => {
      const res = await fetch(api.entries.create.path, {
        method: api.entries.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create entry");
      }
      return parseWithLogging(api.entries.create.responses[201], await res.json(), "entries.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.entries.list.path] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateEntryRequest) => {
      const url = buildUrl(api.entries.update.path, { id });
      const res = await fetch(url, {
        method: api.entries.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update entry");
      }
      return parseWithLogging(api.entries.update.responses[200], await res.json(), "entries.update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.entries.list.path] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.entries.delete.path, { id });
      const res = await fetch(url, {
        method: api.entries.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.entries.list.path] });
    },
  });
}
