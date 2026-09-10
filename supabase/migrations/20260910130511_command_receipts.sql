-- Idempotency store for Stage 6's atomic batch commands. The write path
-- (a SECURITY DEFINER RPC function) is built in Stage 6; this stage only
-- creates the table, its constraints, and owner-scoped read access.
create table command_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  -- Spec section 7: "A repeated requestId with identical payload returns
  -- the original committed result" — scoped per owner, not globally.
  constraint command_receipts_owner_request_key unique (owner_id, request_id)
);

alter table command_receipts enable row level security;
-- Deliberately NOT forced, same reasoning as audit_events: only Stage 6's
-- SECURITY DEFINER command function (owned by the table owner) writes
-- here. No INSERT/UPDATE/DELETE policy exists for client roles.

create policy command_receipts_select_own on command_receipts
  for select using (owner_id = auth.uid());
