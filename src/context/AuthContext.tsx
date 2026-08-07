import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import {
  createSessionFromUrl,
  requestPasswordReset as sendPasswordResetEmail,
  updatePassword as setNewPassword,
} from '../services/passwordReset';
import { supabase } from '../services/supabase';
import { updateUserProfile, type ProfileUpdateInput } from '../services/users';
import type { User, UserRole } from '../types/database';

type SignUpMetadata = {
  full_name?: string;
  phone?: string;
  role: Extract<UserRole, 'buyer' | 'seller'>;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  /** True after opening a password-recovery deep link / PASSWORD_RECOVERY event. */
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearPasswordRecovery: () => void;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const syncProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setUser(null);
      return;
    }

    const profile = await fetchUserProfile(nextSession.user.id);
    setUser(profile);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      try {
        await syncProfile(data.session);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setSession(nextSession);
      try {
        await syncProfile(nextSession);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  useEffect(() => {
    let alive = true;

    const handleUrl = async (url: string | null) => {
      if (!url || !alive) return;
      try {
        const handled = await createSessionFromUrl(url);
        if (handled && alive) {
          setIsPasswordRecovery(true);
        }
      } catch {
        // Invalid / expired link — stay on auth; user can request again.
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, metadata: SignUpMetadata) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name ?? '',
            phone: metadata.phone ?? '',
            role: metadata.role,
          },
        },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    setIsPasswordRecovery(false);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    await setNewPassword(newPassword);
    setIsPasswordRecovery(false);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await syncProfile(data.session);
  }, [syncProfile]);

  const updateProfile = useCallback(
    async (input: ProfileUpdateInput) => {
      if (!session?.user?.id) {
        throw new Error('Oturum bulunamadı.');
      }
      const updated = await updateUserProfile(session.user.id, input);
      setUser(updated);
    },
    [session?.user?.id]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role: user?.role ?? null,
      isLoading,
      isPasswordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
      updateProfile,
      refreshProfile,
    }),
    [
      user,
      session,
      isLoading,
      isPasswordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
      updateProfile,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
