import React, { createContext, useContext, useState, useEffect } from "react";
import { User, ServerInfo } from "../types.ts";
import { api, getToken, setToken, removeToken } from "../services/api.ts";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  serverInfo: ServerInfo | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshServerInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

  const fetchServerInfo = async (retryCount = 2): Promise<void> => {
    try {
      const info = await api.getServerInfo();
      setServerInfo(info);
    } catch {
      if (retryCount > 0) {
        setTimeout(() => {
          fetchServerInfo(retryCount - 1);
        }, 1200);
      } else {
        // Fallback default info so UI never breaks if initial server ping is delayed
        setServerInfo((prev) => prev || {
          currentTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
          currentDate: new Date().toISOString().split("T")[0],
          currentDay: ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()],
          timestamp: new Date().toISOString(),
          settings: {
            id: 1,
            nama_pondok: "Pondok Pesantren Al Is'af",
            nama_madrasah: "Madrasah Diniyah Miftahul Huda",
            latitude_pondok: -7.02558,
            longitude_pondok: 113.86542,
            radius_absensi: 100,
            jam_masuk: "20:00",
            batas_terlambat: "20:05",
            jam_pulang: "21:30",
            hari_aktif: JSON.stringify(["Senin", "Selasa", "Rabu", "Kamis", "Sabtu", "Ahad"]),
            logo_url: "",
          },
        });
      }
    }
  };

  const fetchCurrentUser = async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      setUser(res.user);
    } catch {
      // Quietly reset expired or invalid session so the user lands on the clean login screen
      removeToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerInfo();
    fetchCurrentUser();

    // Poll server time every 30 seconds to keep synced
    const interval = setInterval(fetchServerInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await api.login(username, password);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    await fetchServerInfo();
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore logout network errors
    } finally {
      removeToken();
      setTokenState(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const refreshServerInfo = async () => {
    await fetchServerInfo();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        serverInfo,
        login,
        logout,
        refreshUser,
        refreshServerInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
