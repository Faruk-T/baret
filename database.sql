-- 1. ADIM: TAM TEMİZLİK (Eski Kalıntıları Siliyoruz)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.delivery_option CASCADE;

-- 2. ADIM: TİPLERİ OLUŞTUR
CREATE TYPE public.user_role AS ENUM ('admin', 'buyer', 'seller');
CREATE TYPE public.order_status AS ENUM ( 'pending', 'preparing', 'shipped', 'delivered', 'cancelled' );
CREATE TYPE public.delivery_option AS ENUM ( 'kargo', 'gel_al', 'aracla_teslim' );
