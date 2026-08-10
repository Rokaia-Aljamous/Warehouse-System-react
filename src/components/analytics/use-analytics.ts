import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export function useAnalyticsQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  enabled = true,
): UseQueryResult<T, Error> {
  return useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function isForbiddenError(error: unknown): boolean {
  return (
    (error as { response?: { status?: number } })?.response?.status === 403
  );
}

export function httpErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return typeof data?.message === "string" && data.message.length > 0
    ? data.message
    : fallback;
}
