create table academic_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_dates_ordered check (start_date <= end_date),
  -- Composite-FK target for child tables (classes, terms): lets a child's
  -- (owner_id, academic_year_id) FK physically enforce that the parent
  -- belongs to the same owner, not just RLS.
  constraint academic_years_owner_id_id_key unique (owner_id, id)
);

alter table academic_years enable row level security;
alter table academic_years force row level security;

create policy academic_years_select_own on academic_years
  for select using (owner_id = auth.uid());
create policy academic_years_insert_own on academic_years
  for insert with check (owner_id = auth.uid());
create policy academic_years_update_own on academic_years
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table terms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  academic_year_id uuid not null,
  label text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terms_dates_ordered check (start_date <= end_date),
  constraint terms_academic_year_fkey
    foreign key (owner_id, academic_year_id)
    references academic_years (owner_id, id)
    on delete cascade
);

create index terms_academic_year_idx on terms (owner_id, academic_year_id);

alter table terms enable row level security;
alter table terms force row level security;

create policy terms_select_own on terms
  for select using (owner_id = auth.uid());
create policy terms_insert_own on terms
  for insert with check (owner_id = auth.uid());
create policy terms_update_own on terms
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- A plain CHECK constraint cannot look up the parent academic_years row,
-- so term-within-academic-year containment is enforced with a trigger
-- (spec section 6: "term containment in academic year").
create function terms_check_within_academic_year()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  year_start date;
  year_end date;
begin
  select start_date, end_date
    into year_start, year_end
    from public.academic_years
    where id = new.academic_year_id
      and owner_id = new.owner_id;

  if year_start is null then
    raise exception 'academic_year_id % not found for owner', new.academic_year_id;
  end if;

  if new.start_date < year_start or new.end_date > year_end then
    raise exception
      'term dates [%, %] fall outside academic year dates [%, %]',
      new.start_date, new.end_date, year_start, year_end;
  end if;

  return new;
end;
$$;

create trigger terms_within_academic_year
  before insert or update on terms
  for each row
  execute function terms_check_within_academic_year();
