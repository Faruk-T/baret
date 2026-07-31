import { supabase } from './supabase';
import type { User } from '../types/database';

export type ProfileUpdateInput = {
  full_name: string;
  phone: string;
};

export async function updateUserProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: input.full_name.trim() || null,
      phone: input.phone.trim() || null,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
