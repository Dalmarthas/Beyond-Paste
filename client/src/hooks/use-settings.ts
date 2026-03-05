import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsInput } from "@shared/schema";
import { getSettings, updateSettings } from "@/lib/desktop";

const settingsQueryKey = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey });
    },
  });
}
