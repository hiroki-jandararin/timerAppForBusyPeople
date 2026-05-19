import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthService, AuthUser } from '@timeapp/core';

type AuthContextValue = {
  isLoading: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  authService: AuthService;
  children: ReactNode;
};

export function AuthProvider({ authService, children }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isActive = true;

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!isActive) return;
        setUser(currentUser);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [authService]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      user,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
    }),
    [authService, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
