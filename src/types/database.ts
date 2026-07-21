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
  created_at: string;
  updated_at: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Store, 'id'>>;
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
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      delivery_option: DeliveryOption;
    };
  };
};
