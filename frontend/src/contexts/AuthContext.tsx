import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../lib/types';
import { STORAGE_KEYS, getStorageData, setStorageData } from '../lib/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  completeOnboarding: () => void;
}

interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone_number?: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const userData = getStorageData<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    const onboardingComplete = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';

    if (token && userData) {
      setUser(userData);
      setIsOnboarded(onboardingComplete);
    }
  }, []);

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if username or email already exists
    const existingUsers = getStorageData<User[]>('goji_all_users', []);

    if (existingUsers.some(u => u.username === data.username)) {
      return { success: false, error: 'Username already exists' };
    }

    if (existingUsers.some(u => u.email === data.email)) {
      return { success: false, error: 'Email already exists' };
    }

    // Create new user
    const newUser: User = {
      id: String(existingUsers.length + 1),
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to storage
    existingUsers.push(newUser);
    setStorageData('goji_all_users', existingUsers);

    return { success: true };
  };

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const users = getStorageData<User[]>('goji_all_users', []);
    const foundUser = users.find(
      u => u.username === username || u.email === username
    );

    if (!foundUser) {
      return { success: false, error: 'Invalid credentials' };
    }

    // In real app, would verify password hash
    // For demo, accept any password

    // Generate mock JWT token
    const token = `mock_jwt_${foundUser.id}_${Date.now()}`;

    // Save to storage
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    setStorageData(STORAGE_KEYS.CURRENT_USER, foundUser);

    const onboardingComplete = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';

    setUser(foundUser);
    setIsOnboarded(onboardingComplete);

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setUser(null);
  };

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    setIsOnboarded(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isOnboarded,
        login,
        signup,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
