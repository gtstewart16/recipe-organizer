alter table if exists recipe_groups
  add column if not exists is_favorite boolean not null default false;

update recipe_groups
set is_favorite = false
where is_favorite is null;
