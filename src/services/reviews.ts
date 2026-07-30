import type { Review } from '../types/database';
import { supabase } from './supabase';

export type ReviewWithBuyer = Review;

export async function getReviewForOrder(
  orderId: string,
  buyerId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('order_id', orderId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listReviewsForOrders(
  orderIds: string[],
  buyerId: string
): Promise<Record<string, Review>> {
  if (orderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('buyer_id', buyerId)
    .in('order_id', orderIds);

  if (error) throw error;

  const map: Record<string, Review> = {};
  for (const row of data ?? []) {
    if (row.order_id) map[row.order_id] = row;
  }
  return map;
}

export async function createReview(input: {
  buyerId: string;
  storeId: string;
  orderId: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) {
    throw new Error('Puan 1 ile 5 arasında olmalı.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      buyer_id: input.buyerId,
      store_id: input.storeId,
      order_id: input.orderId,
      rating,
      comment: input.comment?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listStoreReviews(storeId: string): Promise<ReviewWithBuyer[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function getStoreRatingSummary(
  storeId: string
): Promise<{ average: number; count: number }> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('store_id', storeId);

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return { average: 0, count: 0 };
  const sum = rows.reduce((acc, row) => acc + row.rating, 0);
  return {
    average: Math.round((sum / rows.length) * 10) / 10,
    count: rows.length,
  };
}
