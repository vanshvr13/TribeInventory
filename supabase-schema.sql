create table folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references folders(id) on delete cascade
);

create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric not null,
  unit text not null,
  min_level numeric,
  price numeric not null,
  photos jsonb not null default '[]',
  folder_id uuid references folders(id) on delete cascade
);

alter table folders enable row level security;
alter table items enable row level security;

create policy "public read folders" on folders for select using (true);
create policy "public write folders" on folders for insert with check (true);
create policy "public update folders" on folders for update using (true);
create policy "public delete folders" on folders for delete using (true);

create policy "public read items" on items for select using (true);
create policy "public write items" on items for insert with check (true);
create policy "public update items" on items for update using (true);
create policy "public delete items" on items for delete using (true);

-- Migration: brand + expiry fields (AI photo-identify feature)
alter table items add column brand text;
alter table items add column expiry date;
