alter table if exists import_jobs
  rename column original_input to source_url;

alter table if exists import_jobs
  rename column parse_status to status;

alter table if exists import_jobs
  rename column parse_error to error_message;

alter table if exists import_jobs
  rename column draft_payload to draft;

alter table if exists import_jobs
  add column if not exists source_photo_uris text[] not null default '{}'::text[],
  add column if not exists title text,
  add column if not exists recipe_id uuid references recipes(id) on delete set null;

update import_jobs
set
  status = case status
    when 'needs_review' then 'in_review'
    when 'ready' then 'saved'
    else status
  end,
  title = coalesce(title, nullif(draft->>'title', ''), 'Imported Recipe')
where title is null;

alter table if exists import_jobs
  alter column status set default 'in_review',
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column title set not null,
  drop constraint if exists import_jobs_parse_status_check,
  add constraint import_jobs_status_check check (status in ('failed', 'in_review', 'saved'));

create index if not exists import_jobs_household_id_idx on import_jobs (household_id);
create index if not exists import_jobs_updated_at_desc_idx on import_jobs (updated_at desc);
