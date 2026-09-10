create table audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  event_time timestamptz not null default now(),
  request_id uuid
);

create index audit_events_owner_entity_idx on audit_events (owner_id, entity_type, entity_id);
create index audit_events_owner_time_idx on audit_events (owner_id, event_time desc);

alter table audit_events enable row level security;
-- Deliberately NOT forced: the audit trigger function (see
-- 20260910130512_audit_trigger.sql) is SECURITY DEFINER, owned by the
-- table owner, and relies on owner-bypass to insert rows. Only a SELECT
-- policy is defined below, so every client role (anon/authenticated) is
-- denied INSERT/UPDATE/DELETE by RLS default-deny — spec section 7:
-- "clients cannot forge, modify or delete audit entries."

create policy audit_events_select_own on audit_events
  for select using (owner_id = auth.uid());
