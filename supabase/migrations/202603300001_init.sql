create extension if not exists pgcrypto;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists household_users (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  unique (household_id, user_id)
);

create table if not exists recipe_groups (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  description text,
  hero_image_url text,
  source_url text,
  source_type text not null check (source_type in ('url', 'photo', 'manual')),
  source_photo_uris jsonb not null default '[]'::jsonb,
  servings text,
  status text not null default 'needs_review' check (status in ('needs_review', 'ready', 'failed')),
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists recipe_group_memberships (
  recipe_id uuid not null references recipes(id) on delete cascade,
  group_id uuid not null references recipe_groups(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (recipe_id, group_id)
);

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'photo')),
  original_input text,
  parse_status text not null default 'needs_review' check (parse_status in ('needs_review', 'ready', 'failed')),
  parse_error text,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'discarded')),
  draft_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
