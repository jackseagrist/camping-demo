-- Create trips table
create table trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  location text not null,
  start_date date,
  end_date date,
  packing_list jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Add RLS policies
  constraint "start_date_before_end_date" check (start_date <= end_date)
);

-- Enable Row Level Security
alter table trips enable row level security;

-- Create policy to allow users to select their own trips
create policy "Users can view their own trips"
  on trips for select
  using (auth.uid() = user_id);

-- Create policy to allow users to insert their own trips
create policy "Users can create their own trips"
  on trips for insert
  with check (auth.uid() = user_id);

-- Create policy to allow users to update their own trips
create policy "Users can update their own trips"
  on trips for update
  using (auth.uid() = user_id);

-- Create policy to allow users to delete their own trips
create policy "Users can delete their own trips"
  on trips for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index trips_user_id_idx on trips(user_id);
create index trips_created_at_idx on trips(created_at desc); 