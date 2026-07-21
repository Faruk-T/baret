/**
 * ENUM constants matching `database.sql` for UI labels and form options.
 */
import type { DeliveryOption, OrderStatus, UserRole } from '../types/database';

export const USER_ROLES: readonly UserRole[] = ['admin', 'buyer', 'seller'] as const;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const DELIVERY_OPTIONS: readonly DeliveryOption[] = [
  'kargo',
  'gel_al',
  'aracla_teslim',
] as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Yönetici',
  buyer: 'Alıcı',
  seller: 'Satıcı',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Beklemede',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
};

export const DELIVERY_OPTION_LABELS: Record<DeliveryOption, string> = {
  kargo: 'Kargo ile Gönderim',
  gel_al: 'Mağazadan Teslim Al',
  aracla_teslim: 'Araçla Teslim',
};
