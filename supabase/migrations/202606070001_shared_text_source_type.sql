alter table if exists recipes
  drop constraint if exists recipes_source_type_check;

alter table if exists recipes
  add constraint recipes_source_type_check check (source_type in ('url', 'photo', 'manual', 'shared_text'));
