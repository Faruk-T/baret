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

/** Use `type` (not `interface`) so rows satisfy postgrest `Record<string, unknown>`. */
export type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Store = {
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
};

export type LicenseKey = {
  id: string;
  code: string;
  duration_days: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  store_id: string | null;
};

export type Product = {
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
};

export type Order = {
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
};

export type Review = {
  id: string;
  buyer_id: string;
  store_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformSettings = {
  id: number;
  commission_rate: number;
  intro_commission_rate: number;
  intro_order_limit: number;
  high_rating_discount: number;
  updated_at: string;
  updated_by: string | null;
};

export type OrderCommission = {
  id: string;
  order_id: string;
  store_id: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  seller_net_amount: number;
  created_at: string;
};

export type PlatformReport = {
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
};

/** Supabase `Database` shape for typed client queries (postgrest-js GenericTable). */
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'stores_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'products_store_id_fkey';
            columns: ['store_id'];
            isOneToOne: false;
            referencedRelation: 'stores';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'orders_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_store_id_fkey';
            columns: ['store_id'];
            isOneToOne: false;
            referencedRelation: 'stores';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'reviews_store_id_fkey';
            columns: ['store_id'];
            isOneToOne: false;
            referencedRelation: 'stores';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: 'order_commissions_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
