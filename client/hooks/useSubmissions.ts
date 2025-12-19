import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Submission {
  id: string;
  photoUri: string;
  overlayId: string | null;
  caption: string;
  status: "pending" | "posted";
  createdAt: string;
}

const STORAGE_KEY = "@photo_portal_submissions";

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSubmissions = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Submission[];
        setSubmissions(parsed.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (error) {
      console.error("Failed to load submissions:", error);
    }
  }, []);

  const refreshSubmissions = useCallback(async () => {
    setIsLoading(true);
    await loadSubmissions();
    setIsLoading(false);
  }, [loadSubmissions]);

  const addSubmission = useCallback(async (
    photoUri: string,
    overlayId: string | null,
    caption: string
  ): Promise<Submission> => {
    const newSubmission: Submission = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      photoUri,
      overlayId,
      caption,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [newSubmission, ...existing];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSubmissions(updated);
      return newSubmission;
    } catch (error) {
      console.error("Failed to save submission:", error);
      throw error;
    }
  }, []);

  const clearSubmissions = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSubmissions([]);
    } catch (error) {
      console.error("Failed to clear submissions:", error);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return {
    submissions,
    isLoading,
    refreshSubmissions,
    addSubmission,
    clearSubmissions,
  };
}
