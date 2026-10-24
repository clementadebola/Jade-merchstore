-- Stage 2 schema. Run in Supabase SQL Editor or through Supabase migrations.
create extension if not exists pgcrypto;

create type public.order_status as enum (
  'pending_payment', 'paid', 'fulfillment_pending', 'submitted_to_printify',
  'in_production', 'shipped', 'delivered', 'cancelled', 'refunded', 'fulfillment_failed'
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  printify_product_id text not null unique,
  title text not null,
  description text not null default '',
  retail_price_cents integer,
  currency text not null default 'USD' check (currency = 'USD'),
  image_urls jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (retail_price_cents is null or retail_price_cents > 0)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  printify_variant_id bigint not null unique,
  title text not null,
  printify_cost_cents integer not null check (printify_cost_cents >= 0),
  is_enabled boolean not null default false,
  is_available boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  status public.order_status not null default 'pending_payment',
  customer_email text not null,
  customer_name text,
  shipping_address jsonb not null,
  currency text not null default 'USD' check (currency = 'USD'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents = subtotal_cents + shipping_cents + tax_cents),
  bachs_checkout_id text unique,
  bachs_charge_id text unique,
  printify_order_id text unique,
  fulfillment_attempts integer not null default 0,
  fulfillment_error text,
  paid_at timestamptz,
  submitted_to_printify_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  printify_product_id text not null,
  printify_variant_id bigint not null,
  product_title text not null,
  variant_title text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price_cents integer not null check (unit_price_cents > 0),
  printify_cost_cents integer not null check (printify_cost_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('bachs', 'printify')),
  provider_event_id text not null,
  event_type text not null,
  processed_at timestamptz,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Tables are accessed by server code using a service role key. Do not expose that key to clients.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.webhook_events enable row level security;
alter table public.shipments enable row level security;

-- No public write policies. Add a narrow read-only catalogue policy only if querying from a browser.
