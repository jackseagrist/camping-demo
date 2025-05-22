# 🏕️ AI Camping Trip Planner

A modern web application that helps users plan and manage their camping trips with AI-powered features. Built with **Next.js** + **Supabase** + **Tailwind CSS**, featuring authentication, trip management, and AI-generated packing lists.

## 🌟 Features

- 🔐 **User Authentication**: Secure login/signup with Supabase Auth
- 📱 **Responsive Dashboard**: Toggle between card and list views for trips
- 🎒 **Smart Packing Lists**: AI-generated packing lists based on trip details
- 📍 **Trip Management**: Create, view, and manage camping trips
- 🔒 **Row Level Security**: Secure data access with Supabase RLS policies
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS

## 📁 Project Structure

```
camping-demo/
├── frontend/           # Next.js frontend
│   ├── components/     # Reusable UI components
│   ├── lib/           # Types and utilities
│   ├── pages/         # Next.js pages and API routes
│   └── styles/        # Global styles
│
└── backend/           # FastAPI backend (for future expansion)
    └── main.py        # API endpoints
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- Supabase account
- Git

### Frontend Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd camping-demo/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server:
```bash
npm run dev
```

### Supabase Setup

1. Create a new Supabase project
2. Copy your project URL and anon key from Project Settings > API
3. Run the following SQL in Supabase SQL Editor to create the trips table:

```sql
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
  constraint "start_date_before_end_date" check (start_date <= end_date)
);

-- Enable Row Level Security
alter table trips enable row level security;

-- Create policies
create policy "Users can view their own trips"
  on trips for select
  using (auth.uid() = user_id);

create policy "Users can create their own trips"
  on trips for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trips"
  on trips for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trips"
  on trips for delete
  using (auth.uid() = user_id);

-- Create indexes
create index trips_user_id_idx on trips(user_id);
create index trips_created_at_idx on trips(created_at desc);
```

## 📱 Core Features

### Trip Management
- Create new trips with title, location, and dates
- View trips in either card or list layout
- Access detailed trip view with packing list

### Packing Lists
- AI-generated packing lists based on:
  - Trip type (Car Camping, Backpacking, RV)
  - Group size
  - Duration
  - Location
  - Season/Month
  - Experience level
  - Sustainability preferences

### Authentication
- Email/password login
- Google OAuth integration
- Protected routes and API endpoints
- Secure session management

## 🔒 Security

- Row Level Security (RLS) ensures users can only access their own data
- Environment variables for sensitive configuration
- Secure authentication with Supabase Auth
- Protected API routes with session validation

## 🎨 UI Components

- `TripCard`: Card view for individual trips
- `TripList`: List view for trips
- `NewTripModal`: Modal for creating new trips
- `SidebarLayout`: Consistent layout with navigation
- Responsive design for all screen sizes

## 🚀 Deployment

The application can be deployed to Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.