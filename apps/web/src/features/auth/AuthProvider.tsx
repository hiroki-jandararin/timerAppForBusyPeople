import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

function isSameUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.id === b.id && a.email === b.email;
}

export function AuthProvider({ authService, children }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    let isActive = true;

    // トークン自動更新など内容が変わらないイベントで新しいオブジェクトが渡されても
    // userの参照を保ち、依存先(repositoryのuseMemo等)の不要な再計算を防ぐ
    const applyUser = (nextUser: AuthUser | null) => {
      if (isSameUser(userRef.current, nextUser)) return;
      userRef.current = nextUser;
      setUser(nextUser);
    };

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!isActive) return;
        applyUser(currentUser);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      applyUser(nextUser);
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
