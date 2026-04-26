import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, User } from '../services/api';

export type UserRole = 'seller' | 'seller_manager' | 'manager_admin';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  linkStore: (data: any) => Promise<void>;
  selectStore: (sellerId: string) => Promise<void>;
  logout: () => void;
  setAuthenticatedUser: (user: User, token: string) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  username?: string;
  role: 'seller' | 'seller_manager' | 'customer';
  storeName?: string;
  subdomain?: string;
  shopType?: 'product' | 'service' | 'payment';
  managerId?: string;
  sellerId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const checkAuth = async () => {
      const token = localStorage.getItem('iyonicorp_token');
      
      if (token) {
        try {
          const currentUser = await authAPI.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            localStorage.removeItem('iyonicorp_token');
          }
        } catch (error) {
          localStorage.removeItem('iyonicorp_token');
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const loggedInUser = await authAPI.login(email, password);
      setUser(loggedInUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const newUser = await authAPI.register(data);
      setUser(newUser);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const linkStore = async (data: any): Promise<void> => {
    setIsLoading(true);
    try {
      const loggedInUser = await authAPI.linkStore(data);
      setUser(loggedInUser);
    } catch (error) {
      console.error('Link store error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const selectStore = async (sellerId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { token } = await authAPI.selectStore(sellerId);
      // Re-fetch current user to get updated state
      const currentUser = await authAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Select store error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('iyonicorp_token');
  };

  const setAuthenticatedUser = (user: User, token: string) => {
    localStorage.setItem('iyonicorp_token', token);
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, linkStore, selectStore, logout, setAuthenticatedUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
