import { useQuery } from "@tanstack/react-query";
import { listRunningApps } from "@/lib/desktop";

export function useRunningApps() {
  return useQuery({
    queryKey: ["running-apps"],
    queryFn: listRunningApps,
    staleTime: 0,
  });
}
