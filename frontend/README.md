# 🏕️ Camping Trip Planner Frontend

This is the frontend portion of the Camping Trip Planner application, built with Next.js and Tailwind CSS.

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📱 Available Pages

- `/` - Landing page
- `/login` - Authentication page
- `/dashboard` - Trip management dashboard
- `/trips/[id]` - Individual trip view
- `/plan` - Trip planning and packing list generation
- `/explore` - Campground exploration (future feature)

## 🎨 Components

Key components in the `/components` directory:
- `TripCard.tsx` - Card view for trips
- `TripList.tsx` - List view for trips
- `NewTripModal.tsx` - Create new trips
- `SidebarLayout.js` - Main application layout

## 🔒 Authentication

Authentication is handled through Supabase Auth, supporting:
- Email/password login
- Google OAuth
- Protected routes
- Session management

## 📦 Data Structure

The application uses Supabase as the backend, with the following table structure:

```sql
create table trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  location text not null,
  start_date date,
  end_date date,
  packing_list jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## 🚀 Deployment

Deploy the application using Vercel:

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

Create a `.env` file in the backend directory and add your RIDB API key:

```env
RIDB_API_KEY=your-api-key-here
```

# BaseLodge Frontend

Last deployed: ${new Date().toISOString()}

## Environment Setup

This application requires the following environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SITE_URL

## Development

```bash
npm install
npm run dev
