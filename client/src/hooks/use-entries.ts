import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSnippetInput, UpdateSnippetInput } from "@shared/schema";
import { createSnippet, deleteSnippet, listSnippets, updateSnippet } from "@/lib/desktop";

const snippetsQueryKey = ["snippets"] as const;
const pickerQueryKey = ["picker"] as const;

export function useEntries(folderId?: number) {
  return useQuery({
    queryKey: [...snippetsQueryKey, folderId] as const,
    queryFn: () => listSnippets(folderId),
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSnippetInput) => createSnippet(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snippetsQueryKey });
      void queryClient.invalidateQueries({ queryKey: pickerQueryKey });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSnippetInput) => updateSnippet(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snippetsQueryKey });
      void queryClient.invalidateQueries({ queryKey: pickerQueryKey });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteSnippet(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: snippetsQueryKey });
      void queryClient.invalidateQueries({ queryKey: pickerQueryKey });
    },
  });
}
