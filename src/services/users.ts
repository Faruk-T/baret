import { supabase } from './supabase';
import type { User } from '../types/database';

export type ProfileUpdateInput = {
  full_name: string;
  phone: string;
  company_name?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
};

export async function updateUserProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<User> {
  const basePatch = {
    full_name: input.full_name.trim() || null,
    phone: input.phone.trim() || null,
  };

  const fullPatch = {
    ...basePatch,
    ...(input.company_name !== undefined
      ? { company_name: input.company_name?.trim() || null }
      : {}),
    ...(input.tax_office !== undefined
      ? { tax_office: input.tax_office?.trim() || null }
      : {}),
    ...(input.tax_number !== undefined
      ? { tax_number: input.tax_number?.trim() || null }
      : {}),
  };

  const { data, error } = await supabase
    .from('users')
    .update(fullPatch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    // Fallback if V2 corporate columns haven't been migrated on remote DB yet
    const fallback = await supabase
      .from('users')
      .update(basePatch)
      .eq('id', userId)
      .select('*')
      .single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  return data;
}

/**
 * Self-service account deletion (Apple App Store Guideline 5.1.1(v)).
 * Calls SECURITY DEFINER RPC `delete_my_account` if available; otherwise anonymizes user profile and signs out.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    // Fallback if delete_my_account RPC isn't installed yet on remote DB
    await supabase
      .from('users')
      .update({
        full_name: 'Silinmiş Hesap',
        phone: null,
      })
      .eq('id', userId);
  }
  await supabase.auth.signOut();
}
