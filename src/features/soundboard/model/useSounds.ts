import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { soundsApi, type UploadSoundPayload } from "@/features/soundboard/api/soundsApi";
import type { SoundCategory, SoundListResponse } from "@/entities/sound/types";

export const SOUNDS_QUERY_KEY = ["sounds"] as const;

export function useSounds(category?: SoundCategory) {
  return useQuery<SoundListResponse>({
    queryKey: category ? [...SOUNDS_QUERY_KEY, category] : SOUNDS_QUERY_KEY,
    queryFn: () => soundsApi.listSounds(category),
    staleTime: 60 * 1000,
  });
}

export function useUploadSound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UploadSoundPayload) => soundsApi.uploadSound(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOUNDS_QUERY_KEY });
    },
  });
}

export function useDeleteSound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (soundId: string) => soundsApi.deleteSound(soundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOUNDS_QUERY_KEY });
    },
  });
}
