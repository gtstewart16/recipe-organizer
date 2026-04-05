alter table if exists recipes
  add column if not exists prep_time text,
  add column if not exists cook_time text;
