import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

export interface Overlay {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useOverlays() {
  return useQuery<Overlay[]>({
    queryKey: ["/api/overlays"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function getOverlayImageUrl(imageUrl: string): string {
  const baseUrl = getApiUrl();
  return new URL(imageUrl, baseUrl).href;
}
