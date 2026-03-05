import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateFolderRequest, UpdateFolderRequest, Folder } from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    return data as T; // Fallback to raw data to prevent hard crash if types loosely match
  }
  return result.data;
}

export function useFolders() {
  return useQuery({
    queryKey: [api.folders.list.path],
    queryFn: async () => {
      const res = await fetch(api.folders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folders");
      const data = await res.json();
      return parseWithLogging(api.folders.list.responses[200], data, "folders.list");
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFolderRequest) => {
      const res = await fetch(api.folders.create.path, {
        method: api.folders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create folder");
      }
      return parseWithLogging(api.folders.create.responses[201], await res.json(), "folders.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.folders.list.path] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateFolderRequest) => {
      const url = buildUrl(api.folders.update.path, { id });
      const res = await fetch(url, {
        method: api.folders.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update folder");
      }
      return parseWithLogging(api.folders.update.responses[200], await res.json(), "folders.update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.folders.list.path] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.folders.delete.path, { id });
      const res = await fetch(url, {
        method: api.folders.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to delete folder");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.folders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.entries.list.path] });
    },
  });
}
