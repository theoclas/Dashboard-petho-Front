import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../api';

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'ADMIN' | 'OPERADOR' | 'LECTOR';
  companyId: number;
}

export interface Company {
  id: number;
  nombre: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  companies: Company[];
  login: (token: string, user: User, companies: Company[]) => void;
  switchCompany: (companyId: number) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('petho_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('petho_token'));
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('petho_companies');
    return saved ? JSON.parse(saved) : [];
  });

  const login = (newToken: string, newUser: User, availableCompanies: Company[]) => {
    localStorage.setItem('petho_token', newToken);
    localStorage.setItem('petho_user', JSON.stringify(newUser));
    localStorage.setItem('petho_companies', JSON.stringify(availableCompanies));
    setToken(newToken);
    setUser(newUser);
    setCompanies(availableCompanies);
  };

  const switchCompany = async (companyId: number) => {
    const { data } = await api.post('/auth/switch-company', { companyId });
    localStorage.setItem('petho_token', data.access_token);
    localStorage.setItem('petho_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('petho_token');
    localStorage.removeItem('petho_user');
    localStorage.removeItem('petho_companies');
    setToken(null);
    setUser(null);
    setCompanies([]);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, companies, login, switchCompany, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
