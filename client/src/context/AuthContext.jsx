import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);

      const res = await api.get("/auth/me");

      const loggedInUser = res.data.user || null;
      setUser(loggedInUser);

      return loggedInUser;
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error("Auth check failed:", error);
      }

      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);

    const sessionUser = await checkAuth();

    if (!sessionUser) {
      throw new Error("Registration completed, but session was not created.");
    }

    return {
      ...res.data,
      user: sessionUser,
    };
  };

  const login = async (formData) => {
    const res = await api.post("/auth/login", formData);

    const sessionUser = await checkAuth();

    if (!sessionUser) {
      throw new Error("Login completed, but session was not created.");
    }

    return {
      ...res.data,
      user: sessionUser,
    };
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post("/auth/google", {
      credential,
    });

    const sessionUser = await checkAuth();

    if (!sessionUser) {
      throw new Error(
        "Google login completed, but browser did not save the login cookie.",
      );
    }

    return {
      ...res.data,
      user: sessionUser,
    };
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      authLoading,
      isAuthenticated: Boolean(user),
      checkAuth,
      register,
      login,
      loginWithGoogle,
      logout,
    }),
    [user, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
