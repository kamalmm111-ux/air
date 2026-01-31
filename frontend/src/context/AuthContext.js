import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("aircabio_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Auth init error:", error);
          localStorage.removeItem("aircabio_token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem("aircabio_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const fleetLogin = async (email, password) => {
    const response = await axios.post(`${API}/auth/fleet/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem("aircabio_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, phone) => {
    const response = await axios.post(`${API}/auth/register`, {
      name, email, password, phone
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem("aircabio_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("aircabio_token");
    setToken(null);
    setUser(null);
  };

  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isFleetAdmin = user?.role === "fleet_admin";
  const isAdmin = isSuperAdmin || isFleetAdmin;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, fleetLogin, register, logout, 
      isSuperAdmin, isFleetAdmin, isAdmin, isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};
