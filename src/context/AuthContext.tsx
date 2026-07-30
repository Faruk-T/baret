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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<void>;
  signOut: () => Promise<void>;
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
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [user, session, isLoading, signIn, signUp, signOut, updateProfile, refreshProfile]
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
