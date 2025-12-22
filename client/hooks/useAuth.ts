import { useState, useEffect, useCallback, createContext, useContext } from "react";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

const TOKEN_KEY = "auth_token";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  dealership: string;
  phone: string | null;
}

export interface Overlay {
  id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  overlays: Overlay[];
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  biometricEnabled: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  checkBiometricAvailable: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function useAuthProvider(): AuthContextType {
  const [state, setState] = useState<AuthState>({
    user: null,
    overlays: [],
    token: null,
    isLoading: true,
    isAuthenticated: false,
    biometricEnabled: false,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const [token, biometricEnabled] = await Promise.all([
        secureGet(TOKEN_KEY),
        secureGet(BIOMETRIC_ENABLED_KEY),
      ]);

      if (token) {
        const userData = await fetchUserData(token);
        if (userData) {
          setState({
            user: userData.user,
            overlays: userData.overlays,
            token,
            isLoading: false,
            isAuthenticated: true,
            biometricEnabled: biometricEnabled === "true",
          });
          return;
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        biometricEnabled: biometricEnabled === "true",
      }));
    } catch (error) {
      console.error("Auth initialization error:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const fetchUserData = async (token: string): Promise<{ user: AuthUser; overlays: Overlay[] } | null> => {
    try {
      const apiUrl = new URL("/api/auth/me", getApiUrl());
      const response = await fetch(apiUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await secureDelete(TOKEN_KEY);
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch user error:", error);
      return null;
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiUrl = new URL("/api/auth/login", getApiUrl());
      const response = await fetch(apiUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      await secureSet(TOKEN_KEY, data.token);

      const userData = await fetchUserData(data.token);
      if (userData) {
        setState(prev => ({
          ...prev,
          user: userData.user,
          overlays: userData.overlays,
          token: data.token,
          isAuthenticated: true,
        }));
      }

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Connection error. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    await secureDelete(TOKEN_KEY);
    setState({
      user: null,
      overlays: [],
      token: null,
      isLoading: false,
      isAuthenticated: false,
      biometricEnabled: state.biometricEnabled,
    });
  }, [state.biometricEnabled]);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    const userData = await fetchUserData(state.token);
    if (userData) {
      setState(prev => ({
        ...prev,
        user: userData.user,
        overlays: userData.overlays,
      }));
    }
  }, [state.token]);

  const checkBiometricAvailable = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric login",
        fallbackLabel: "Use passcode",
      });

      if (result.success) {
        await secureSet(BIOMETRIC_ENABLED_KEY, "true");
        setState(prev => ({ ...prev, biometricEnabled: true }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    await secureDelete(BIOMETRIC_ENABLED_KEY);
    setState(prev => ({ ...prev, biometricEnabled: false }));
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Login to Pic Portal",
        fallbackLabel: "Use password",
      });
      return result.success;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    refreshUser,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    checkBiometricAvailable,
  };
}

export const AuthProvider = AuthContext.Provider;

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
