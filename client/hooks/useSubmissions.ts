import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { File } from "expo-file-system";

export interface Submission {
  id: string;
  photoUrl: string;
  overlayId: string | null;
  caption: string | null;
  status: "pending" | "posted";
  clientId: string | null;
  mediaType: "photo" | "video";
  createdAt: string;
}

export function useSubmissions() {
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading, refetch } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    staleTime: 1000 * 60 * 5,
  });

  const addSubmissionMutation = useMutation({
    mutationFn: async ({
      mediaUri,
      overlayId,
      caption,
      mediaType,
      clientName,
      companyName,
    }: {
      mediaUri: string;
      overlayId: string | null;
      caption: string;
      mediaType: "photo" | "video";
      clientName?: string;
      companyName?: string;
    }) => {
      const baseUrl = getApiUrl();
      const formData = new FormData();

      const file = new File(mediaUri);
      formData.append("media", file as unknown as Blob);
      formData.append("mediaType", mediaType);

      if (overlayId) {
        formData.append("overlayId", overlayId);
      }
      if (caption) {
        formData.append("caption", caption);
      }
      if (clientName) {
        formData.append("clientName", clientName);
      }
      if (companyName) {
        formData.append("companyName", companyName);
      }

      const response = await fetch(new URL("/api/submissions", baseUrl).href, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to submit: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    },
  });

  const addSubmission = async (
    mediaUri: string,
    overlayId: string | null,
    caption: string,
    mediaType: "photo" | "video" = "photo",
    clientName?: string,
    companyName?: string
  ): Promise<Submission> => {
    return addSubmissionMutation.mutateAsync({ mediaUri, overlayId, caption, mediaType, clientName, companyName });
  };

  return {
    submissions,
    isLoading,
    refreshSubmissions: refetch,
    addSubmission,
    isSubmitting: addSubmissionMutation.isPending,
  };
}

export function getSubmissionPhotoUrl(photoUrl: string): string {
  const baseUrl = getApiUrl();
  return new URL(photoUrl, baseUrl).href;
}
