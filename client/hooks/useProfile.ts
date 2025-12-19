import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_STORAGE_KEY = "@photo_portal_profile";

export interface UserProfile {
  username: string;
  companyName: string;
  photoUri: string | null;
}

const defaultProfile: UserProfile = {
  username: "Agency Client",
  companyName: "Your Company Name",
  photoUri: null,
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const newProfile = { ...profile, ...updates };
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      return true;
    } catch (error) {
      console.error("Failed to update profile:", error);
      return false;
    }
  }, [profile]);

  const updateUsername = useCallback((username: string) => {
    return updateProfile({ username });
  }, [updateProfile]);

  const updateCompanyName = useCallback((companyName: string) => {
    return updateProfile({ companyName });
  }, [updateProfile]);

  const updatePhoto = useCallback((photoUri: string | null) => {
    return updateProfile({ photoUri });
  }, [updateProfile]);

  return {
    profile,
    isLoading,
    updateProfile,
    updateUsername,
    updateCompanyName,
    updatePhoto,
  };
}
