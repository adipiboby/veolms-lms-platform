import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);
    setUser(res.data.user);
    return res.data;
  };

  const login = async (formData) => {
    const res = await api.post("/auth/login", formData);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        authLoading,
        register,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
