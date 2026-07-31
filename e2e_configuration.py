-- SKC Facturas Web 2.2.0
-- Ejecute este archivo en Supabase SQL Editor.
-- La aplicación usa únicamente usuarios autenticados y una anon/public key.

create extension if not exists pgcrypto;

create table if not exists public.skc_events (
  id text primary key,
  entity_type text not null check (entity_type in ('users','catalogs','transactions','reminders','messages','ledger','audit')),
  entity_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists skc_events_updated_at_idx on public.skc_events(updated_at);
create index if not exists skc_events_type_idx on public.skc_events(entity_type, updated_at);
create unique index if not exists skc_events_type_entity_idx on public.skc_events(entity_type, entity_id);

create or replace function public.skc_keep_newest_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.updated_at > new.updated_at then
    return old;
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists skc_keep_newest_event_trigger on public.skc_events;
create trigger skc_keep_newest_event_trigger
before update on public.skc_events
for each row execute function public.skc_keep_newest_event();

alter table public.skc_events enable row level security;
revoke all on public.skc_events from anon;
grant select, insert, update, delete on public.skc_events to authenticated;

drop policy if exists "skc authenticated read" on public.skc_events;
create policy "skc authenticated read" on public.skc_events for select to authenticated using (true);
drop policy if exists "skc authenticated insert" on public.skc_events;
create policy "skc authenticated insert" on public.skc_events for insert to authenticated with check (true);
drop policy if exists "skc authenticated update" on public.skc_events;
create policy "skc authenticated update" on public.skc_events for update to authenticated using (true) with check (true);
drop policy if exists "skc authenticated delete" on public.skc_events;
create policy "skc authenticated delete" on public.skc_events for delete to authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'skc-evidence',
  'skc-evidence',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario autenticado puede trabajar con las evidencias de SKC.
-- Para una separación estricta por organización, añada tenant_id y políticas específicas.
drop policy if exists "skc evidence read" on storage.objects;
create policy "skc evidence read" on storage.objects for select to authenticated using (bucket_id='skc-evidence');
drop policy if exists "skc evidence insert" on storage.objects;
create policy "skc evidence insert" on storage.objects for insert to authenticated with check (bucket_id='skc-evidence');
drop policy if exists "skc evidence update" on storage.objects;
create policy "skc evidence update" on storage.objects for update to authenticated using (bucket_id='skc-evidence') with check (bucket_id='skc-evidence');
drop policy if exists "skc evidence delete" on storage.objects;
create policy "skc evidence delete" on storage.objects for delete to authenticated using (bucket_id='skc-evidence');
