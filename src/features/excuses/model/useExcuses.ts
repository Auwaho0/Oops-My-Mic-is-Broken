import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { excusesApi } from "@/features/excuses/api/excusesApi";
import type { Excuse, ExcuseCategory, ExcuseListResponse } from "@/entities/excuse/types";

export const EXCUSES_QUERY_KEYS = {
  all: ["excuses"] as const,
  lists: () => [...EXCUSES_QUERY_KEYS.all, "list"] as const,
  list: (category?: ExcuseCategory) =>
    [...EXCUSES_QUERY_KEYS.lists(), category ?? "all"] as const,
  random: (category?: ExcuseCategory) =>
    [...EXCUSES_QUERY_KEYS.all, "random", category ?? "all"] as const,
};

export function useExcusesList(category?: ExcuseCategory, page = 1, pageSize = 50) {
  return useQuery<ExcuseListResponse>({
    queryKey: [...EXCUSES_QUERY_KEYS.list(category), page, pageSize],
    queryFn: () => excusesApi.listExcuses(category, page, pageSize),
    staleTime: 60 * 1000,
  });
}

export function useCreateExcuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => excusesApi.createExcuse(text),
    // Optimistic update (§5 & §7)
    onMutate: async (newText: string) => {
      const queryKey = [...EXCUSES_QUERY_KEYS.list("custom"), 1, 50];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<ExcuseListResponse>(queryKey);

      if (previousData) {
        const optimisticExcuse: Excuse = {
          id: `temp-${Date.now()}`,
          text: newText,
          category: "custom",
          is_system: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData<ExcuseListResponse>(queryKey, {
          ...previousData,
          items: [optimisticExcuse, ...previousData.items],
          total: previousData.total + 1,
        });
      }

      return { previousData, queryKey };
    },
    onError: (_err, _newText, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      queryClient.invalidateQueries({ queryKey: EXCUSES_QUERY_KEYS.lists() });
    },
  });
}

export function useDeleteExcuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => excusesApi.deleteExcuse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCUSES_QUERY_KEYS.lists() });
    },
  });
}
