export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthStateChangeHandler = (user: AuthUser | null) => void;

export type AuthService = {
  getCurrentUser: () => Promise<AuthUser | null>;
  onAuthStateChange: (handler: AuthStateChangeHandler) => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
