/**
 * TypeScript types mirroring `database.sql` ENUM types and tables.
 * Keep these in sync when the schema changes.
 */

export type UserRole = 'admin' | 'buyer' | 'seller';

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type DeliveryOption = 'kargo' | 'gel_al' | 'aracla_teslim';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string | null;
  logo_url: string | null;
  is_approved: boolean;
  is_active: boolean;
  license_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseKey {
  id: string;
  code: string;
  duration_days: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  store_id: string | null;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  stock: number;
  delivery_options: DeliveryOption[];
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: OrderStatus;
  delivery_option: DeliveryOption;
  delivery_address: string | null;
  notes: string | null;
  pickup_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  buyer_id: string;
  store_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: number;
  commission_rate: number;
  intro_commission_rate: number;
  intro_order_limit: number;
  high_rating_discount: number;
  updated_at: string;
  updated_by: string | null;
}

export interface OrderCommission {
  id: string;
  order_id: string;
  store_id: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  seller_net_amount: number;
  created_at: string;
}

export interface PlatformReport {
  id: string;
  reporter_id: string;
  store_id: string;
  order_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewed' | 'closed';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

/** Supabase `Database` shape for typed client queries */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id'>>;
      };
      stores: {
        Row: Store;
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          address: string;
          city: string;
          district?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone: string;
          email?: string | null;
          logo_url?: string | null;
          is_approved?: boolean;
          is_active?: boolean;
          license_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Store, 'id'>>;
      };
      license_keys: {
        Row: LicenseKey;
        Insert: {
          id?: string;
          code: string;
          duration_days: number;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          redeemed_by?: string | null;
          redeemed_at?: string | null;
          store_id?: string | null;
        };
        Update: Partial<Omit<LicenseKey, 'id'>>;
      };
      products: {
        Row: Product;
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          price: number;
          stock?: number;
          delivery_options?: DeliveryOption[];
          expiry_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Product, 'id'>>;
      };
      orders: {
        Row: Order;
        Insert: {
          id?: string;
          buyer_id: string;
          store_id: string;
          product_id: string;
          quantity?: number;
          unit_price: number;
          total_amount: number;
          status?: OrderStatus;
          delivery_option: DeliveryOption;
          delivery_address?: string | null;
          notes?: string | null;
          pickup_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Order, 'id'>>;
      };
      reviews: {
        Row: Review;
        Insert: {
          id?: string;
          buyer_id: string;
          store_id: string;
          order_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Review, 'id'>>;
      };
      platform_settings: {
        Row: PlatformSettings;
        Insert: {
          id?: number;
          commission_rate?: number;
          intro_commission_rate?: number;
          intro_order_limit?: number;
          high_rating_discount?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Omit<PlatformSettings, 'id'>>;
      };
      order_commissions: {
        Row: OrderCommission;
        Insert: {
          id?: string;
          order_id: string;
          store_id: string;
          order_amount: number;
          commission_rate: number;
          commission_amount: number;
          seller_net_amount: number;
          created_at?: string;
        };
        Update: Partial<Omit<OrderCommission, 'id'>>;
      };
      platform_reports: {
        Row: PlatformReport;
        Insert: {
          id?: string;
          reporter_id: string;
          store_id: string;
          order_id?: string | null;
          reason: string;
          details?: string | null;
          status?: PlatformReport['status'];
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PlatformReport, 'id'>>;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      delivery_option: DeliveryOption;
    };
    Functions: {
      redeem_license_key: {
        Args: { p_code: string };
        Returns: Store;
      };
      get_order_store_contact: {
        Args: { p_order_id: string };
        Returns: {
          store_id: string;
          store_name: string;
          phone: string;
          email: string | null;
          address: string;
          city: string;
          district: string | null;
          latitude: number | null;
          longitude: number | null;
        }[];
      };
      confirm_order_pickup: {
        Args: { p_code: string };
        Returns: Order;
      };
    };
  };
};
