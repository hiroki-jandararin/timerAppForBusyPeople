import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { AuthService, AuthUser } from './authTypes';

export class SupabaseAuthService implements AuthService {
  async getCurrentUser() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return toAuthUser(data.session?.user ?? null);
  }

  onAuthStateChange(handler: (user: AuthUser | null) => void) {
    const supabase = getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handler(toAuthUser(session?.user ?? null));
    });

    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async signUp(email: string, password: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  }

  async signOut() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
  };
}
