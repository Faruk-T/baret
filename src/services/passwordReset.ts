import * as Linking from 'expo-linking';

import { supabase } from './supabase';
import { isAuthCallbackUrl, parseAuthCallbackParams } from '../utils/authUrl';

/** Deep link path used in recovery emails (`baret://reset-password`). */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL('reset-password');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * If the URL carries a recovery / auth session, establish it in supabase-js.
 * Returns true when a session was created or recovery was signaled.
 */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  if (!isAuthCallbackUrl(url)) return false;

  const params = parseAuthCallbackParams(url);

  if (params.error_description || params.error) {
    throw new Error(params.error_description || params.error);
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return true;
  }

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return true;
  }

  return params.type === 'recovery';
}
