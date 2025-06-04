# 🏕️ BaseLodge - Camping Trip Planner Frontend

BaseLodge is a comprehensive camping trip planning application built with Next.js and Tailwind CSS. The app helps outdoor enthusiasts discover campgrounds, plan trips, and manage their camping adventures with AI-powered recommendations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- Supabase account
- Mapbox account (for mapping features)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-access-token
```

3. Set up the database schema:
   - Import the schema from `lib/schema.sql` into your Supabase project
   - Ensure Row Level Security (RLS) is enabled

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## ✨ Features

### 🗺️ Interactive Map & Exploration
- **Campground Discovery**: Browse thousands of campgrounds with interactive map visualization
- **Demand & Cost Filtering**: Filter locations by popularity and cost assessment
- **Detailed Facility Information**: View comprehensive details about each campground
- **Custom Markers**: Visual indicators for demand levels and cost tiers

### 🤖 AI-Powered Trip Planning
- **Smart Recommendations**: AI suggests campgrounds based on your preferences
- **Natural Language Input**: Describe your ideal trip in plain English
- **Personalized Suggestions**: Recommendations based on experience level and preferences
- **One-Click Trip Creation**: Convert recommendations directly into planned trips

### 📊 Trip Management Dashboard
- **Trip Overview**: View all your planned trips in card or list format
- **Trip Details**: Comprehensive trip information with notes and maps
- **Packing Lists**: AI-generated and customizable packing lists
- **Trip Notes**: Add and manage trip-specific notes and memories

### 🔐 Secure Authentication
- **Supabase Auth**: Email/password authentication with session management
- **Protected Routes**: Secure access to user-specific content
- **Row Level Security**: Database-level security for user data

## 📱 Application Structure

### Main Pages
- `/` - Landing page with feature overview
- `/login` - Authentication page
- `/dashboard` - Trip management dashboard
- `/explore` - Interactive campground discovery with map
- `/plan` - AI-powered trip planning interface
- `/trips/[id]` - Individual trip details and management
- `/settings` - User preferences and account settings

### Key Components
- `SidebarLayout.js` - Main application layout with navigation
- `TripCard.tsx` - Trip display card component
- `TripList.tsx` - List view for trips
- `NewTripModal.tsx` - Modal for creating new trips
- `TripDetailsEdit.tsx` - Trip editing interface
- `TripNotes.tsx` - Notes management for trips
- `MapComponentTrip.tsx` - Trip-specific map integration

## 🗄️ Database Schema

The application uses Supabase with the following structure:

```sql
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
```

### Security Features
- Row Level Security (RLS) enabled
- User-specific data policies
- Secure API endpoints
- Authentication middleware

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.3.1** - React framework with SSR/SSG
- **React 19** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Mapbox GL JS** - Interactive mapping
- **AOS** - Scroll animations

### Backend & Services
- **Supabase** - Database, authentication, and real-time features
- **OpenAI API** - AI-powered trip recommendations
- **Next.js API Routes** - Backend API endpoints

### Development Tools
- **TypeScript** - Type safety and better development experience
- **ESLint** - Code linting and quality
- **PostCSS & Autoprefixer** - CSS processing

## 🔗 API Integration

### External APIs
- **Recreation.gov (RIDB)** - Campground data and information
- **OpenAI** - Trip recommendation engine
- **Mapbox** - Mapping and geocoding services

### Internal API Routes
- `/api/proxy-recommend` - Proxy for AI recommendation service

## 🎨 Design System

The application uses a cohesive design system with:
- **Primary Colors**: Emerald/Green theme for outdoor aesthetic
- **Typography**: Inter font family throughout
- **Components**: Consistent styling with Tailwind utility classes
- **Responsive Design**: Mobile-first approach with breakpoint optimization

## 🚀 Deployment

### Production Deployment on Vercel

1. **Setup Environment Variables**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
   ```

2. **Deploy Steps**:
   - Connect your repository to Vercel
   - Configure environment variables in Vercel dashboard
   - Deploy automatically on push to main branch

### Database Setup
1. Create a new Supabase project
2. Run the SQL schema from `lib/schema.sql`
3. Configure authentication providers
4. Set up RLS policies

## 📚 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Structure
```
frontend/
├── components/          # Reusable UI components
├── lib/                # Utilities and configurations
├── pages/              # Next.js pages and API routes
├── public/             # Static assets
└── styles/             # Global styles
```

### Environment Configuration
The application supports multiple environments with different configurations for development, staging, and production.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}

For additional deployment instructions, see `DEPLOYMENT.md`.

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
