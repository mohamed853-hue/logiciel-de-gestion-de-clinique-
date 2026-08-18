import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Vérifier si un utilisateur est déjà connecté
    const storedUser = localStorage.getItem('alshifa_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Récupérer l'utilisateur depuis Supabase — le rôle est lu depuis la BDD
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error('Identifiants invalides. Vérifiez votre email et mot de passe.');
      }

      // Créer l'objet User avec le rôle stocké en BDD
      const userData: User = {
        id: data.id,
        email: data.email,
        firstName: data.name?.split(' ')[0] || '',
        lastName: data.name?.split(' ').slice(1).join(' ') || '',
        role: data.role as UserRole,
        createdAt: data.created_at || new Date().toISOString(),
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('alshifa_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('alshifa_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
