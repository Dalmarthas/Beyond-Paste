import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFolderInput, UpdateFolderInput } from "@shared/schema";
import { createFolder, deleteFolder, listFolders, updateFolder } from "@/lib/desktop";

const foldersQueryKey = ["folders"] as const;
const snippetsQueryKey = ["snippets"] as const;
const pickerQueryKey = ["picker"] as const;

export function useFolders() {
  return useQuery({
    queryKey: foldersQueryKey,
    queryFn: listFolders,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFolderInput) => createFolder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foldersQueryKey });
      void queryClient.invalidateQueries({ queryKey: pickerQueryKey });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateFolderInput) => updateFolder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foldersQueryKey });
      void queryClient.invalidateQueries({ queryKey: pickerQueryKey });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteFolder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foldersQueryKey });
      void queryClient.invalidateQueries({ queryKey: snippetsQueryKey });
      void queryClient.invalidateQueries({ queryKey: pickerQueryKey });
    },
  });
}
