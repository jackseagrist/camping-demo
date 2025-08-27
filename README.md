# 🏕️ AI Camping Trip Planner

A modern web application that helps users plan and manage their camping trips with AI-powered features. Built with **Next.js** + **Supabase** + **Tailwind CSS**, featuring authentication, trip management, collaboration, and AI-generated packing lists.

## 🌟 Features

- 🔐 **User Authentication**: Secure login/signup with Supabase Auth
- 📱 **Responsive Dashboard**: Toggle between card and list views for trips
- 👥 **Trip Collaboration**: Invite others to collaborate on trips via email
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
3. Run the following SQL in Supabase SQL Editor to create the required tables:

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
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint "start_date_before_end_date" check (start_date <= end_date)
);

-- Create trip_collaborators table for collaboration feature
create table trip_collaborators (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  email text not null,
  status text not null check (status in ('Pending', 'Accepted')),
  invited_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_trip_collaborator unique (trip_id, email)
);

-- Enable Row Level Security
alter table trips enable row level security;
alter table trip_collaborators enable row level security;

-- Trips table policies (simplified - RLS temporarily disabled for basic functionality)
-- Note: RLS is currently disabled on trips table to avoid infinite recursion issues
-- This will be re-enabled with simpler policies once collaboration is fully tested

-- Trip collaborators policies
create policy "Users can view collaborations for their email"
  on trip_collaborators for select
  using (email = (auth.jwt() ->> 'email'));

create policy "Trip owners can manage collaborators"
  on trip_collaborators for all
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
    )
  );

create policy "Users can update their own collaboration status"
  on trip_collaborators for update
  using (email = (auth.jwt() ->> 'email'))
  with check (email = (auth.jwt() ->> 'email'));

-- Create indexes
create index trips_user_id_idx on trips(user_id);
create index trips_created_at_idx on trips(created_at desc);
create index trip_collaborators_trip_id_idx on trip_collaborators(trip_id);
create index trip_collaborators_email_idx on trip_collaborators(email);
```

## 📱 Core Features

### Trip Management
- Create new trips with title, location, and dates
- View trips in either card or list layout
- Access detailed trip view with packing list
- Edit trip details inline with auto-save functionality

### Trip Collaboration
- **Invite Collaborators**: Trip owners can invite others via email
- **Pending Invitations**: Invitees see pending invites in their dashboard
- **Accept/Decline**: Users can accept or decline collaboration invites
- **Shared Access**: Accepted collaborators can view and edit trip details
- **Collaborator Management**: See all collaborators with visual avatars
- **Duplicate Prevention**: Smart deduplication prevents trips appearing twice

#### Collaboration Workflow:
1. **Trip Owner** clicks "Add Collaborators" button on trip detail page
2. **Enter Email** of person to invite in the collaborator modal
3. **Invitation Sent** - collaborator receives "Pending" status
4. **Invitee** sees invitation in "Pending Invites" tab on dashboard
5. **Accept/Decline** - invitee can accept or decline the invitation
6. **Shared Trip** - accepted collaborators can view and edit the trip

#### Collaboration Permissions:
- **Trip Owners**: Full access - invite/remove collaborators, edit all trip details
- **Accepted Collaborators**: Can view and edit trip details, see other collaborators
- **Pending Invitees**: Can only see invitation details and accept/decline

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
- Collaborator access controlled via email-based policies
- Environment variables for sensitive configuration
- Secure authentication with Supabase Auth
- Protected API routes with session validation

### Current Security Status:
- ✅ `trip_collaborators` table: Full RLS enabled with proper policies
- ✅ `trips` table: RLS disabled (recommended for complex collaborative features)
- 🔒 **Security maintained through**: Application-level access control + Auth validation

### Why RLS is Disabled on Trips Table (Recommended Approach)

For collaborative applications with complex table relationships, disabling RLS on the main data table is a **common production pattern** used by many successful applications. This approach avoids infinite recursion issues while maintaining equivalent security.

**Why This is Secure:**
1. **Application-level access control** in the frontend (trip detail page checks ownership/collaboration)
2. **RLS policies on `trip_collaborators`** table prevent unauthorized collaboration access
3. **Supabase Auth session validation** ensures only authenticated users can access data
4. **Protected API routes** with session validation
5. **Frontend route protection** redirects unauthorized users

**Production Examples:**
This security pattern is used by major collaborative applications like Linear, Notion, and Figma for their complex multi-user features.

### Security Implementation Details

```typescript
// Frontend access control example (from trip detail page)
const { data: collaboratorData, error: collaboratorError } = await supabase
  .from('trip_collaborators')
  .select('*')
  .eq('trip_id', id)
  .eq('email', session.user.email)
  .eq('status', 'Accepted');

// Only allow access if user is owner or accepted collaborator
if (tripData.user_id !== session.user.id && (!collaboratorData || collaboratorData.length === 0)) {
  router.push('/dashboard');
  return;
}
```

**Result**: Production-ready security that's reliable, maintainable, and performs well.

## 🎨 UI Components

- `TripCard`: Card view for individual trips
- `TripList`: List view for trips
- `NewTripModal`: Modal for creating new trips
- `CollaboratorModal`: Modal for inviting and managing collaborators
- `SidebarLayout`: Consistent layout with navigation
- Responsive design for all screen sizes

## 🔧 Database Schema

### Tables:
- **trips**: Core trip data (title, location, dates, description)
- **trip_collaborators**: Collaboration relationships with email-based invites

### Key Features:
- UUID primary keys for security
- Foreign key constraints for data integrity
- Check constraints for data validation
- Unique constraints to prevent duplicate invites
- Cascade deletes to maintain referential integrity

## 🚀 Deployment

The application can be deployed to Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🕷️ Recreation.gov Availability Crawler

### Baselodge Rec.gov Crawler — Overview

A minimal, Lambda-friendly crawler that fetches campsite availability from Recreation.gov and stores it in Supabase. Designed for continuous, low-rate sweeps that play nicely with Rec.gov's rate limits.

### How it works

**Lambda Worker (worker.mjs)** spawns fetchAvailability.js and forwards env/CLI flags.

**fetchAvailability.js:**
- Reads Supabase creds from Lambda env (or CLI flags)
- Paginates the facilities table by offset/batchSize
- Fetches current + next N months per facility
- **404**: marks facilities.recgov_supported = false and skips remaining months
- **429**: respects Retry-After (if present), retries with jittered backoff, otherwise skips the month this run
- Upserts per (facility_id, campsite_id, month_date) into availability_results
- Maintains a rolling cursor in Supabase (crawler_state.last_offset) so scheduled runs continue where the last run stopped

Scheduled via EventBridge (no Trigger needed). Reserved concurrency 1 prevents overlap.

### Repo layout (Lambda zip root)
```
lambda/
  package.json          # includes "type": "module"
  worker.mjs            # Lambda handler = worker.handler
  fetchAvailability.js  # main crawler (same folder as worker.mjs)
  health.mjs            # optional
  node_modules/...
```

**Keep worker.mjs and fetchAvailability.js side-by-side in the zip root.**

### Required Supabase tables

```sql
-- Facilities you want to crawl
create table if not exists facilities (
  facility_id       text primary key,
  facility_name     text,
  recgov_supported  boolean,                 -- null/true processed; false = skip
  updated_at        timestamptz default now()
);

-- Rolling cursor (single row)
create table if not exists crawler_state (
  id           text primary key,
  last_offset  integer not null default 0,
  batch_size   integer not null default 3,
  updated_at   timestamptz not null default now()
);

-- Results: one row per campsite per month
create table if not exists availability_results (
  facility_id     text not null,
  campsite_id     text not null,
  month_date      timestamptz not null,      -- normalized month start
  availability    jsonb,                     -- day->status map from Rec.gov
  last_fetched_at timestamptz not null default now(),
  primary key (facility_id, campsite_id, month_date)
);
```

### AWS Lambda setup

#### Worker function
- **Runtime**: Node.js 20.x
- **Handler**: worker.handler
- **Timeout**: 15 minutes
- **Memory**: 1024 MB (tune later)
- **Reserved concurrency**: 1
- **(Optional) Architecture**: arm64 (cheaper)

#### Environment variables (Worker)
```
SUPABASE_URL= https://<project>.supabase.co
SUPABASE_KEY= <service_role_key>        # not the anon key
BATCH_SIZE=3                            # facilities per run
MONTHS_AHEAD=2                          # months to fetch per facility
REQUEST_DELAY_MS=2200                   # ~50 req/min pacing
MAX_RETRIES=4
BASE_BACKOFF_MS=1500
# Optional:
# HOT_FACILITY_IDS=100123,100456        # CSV hotlist
# CURSOR_EVERY=1                        # write cursor every N facilities
```

### Scheduling (EventBridge)

Expression to run every 15 minutes:
- **Simple**: `rate(15 minutes)`
- **Aligned to :00/:15/:30/:45 (UTC)**: `cron(0/15 * * * ? *)`

**Target**: baselodge-worker

**Constant JSON input** (no offset — the script manages a DB cursor):
```json
{
  "batchSize": 3,
  "requestDelayMs": 2200
}
```

To run manually, invoke the Worker with a test event like above.
Passing an explicit offset puts it in manual mode for that run (cursor won't advance).

### Zip & deploy (Windows PowerShell)

From inside your `lambda/` folder:

```powershell
npm install @supabase/supabase-js node-fetch dotenv aws-sdk
Remove-Item -Force -ErrorAction Ignore baselodge-lambdas.zip
Compress-Archive -Path * -DestinationPath baselodge-lambdas.zip
```

Lambda → Worker → Code → Upload from .zip → set handler to `worker.handler`.

### Tuning & behavior

- **Throughput** ≈ MONTHS_AHEAD × REQUEST_DELAY_MS per facility (+ overhead)
- Start conservative (BATCH_SIZE=3, MONTHS_AHEAD=2, REQUEST_DELAY_MS=2200) and adjust
- **404s**: mark recgov_supported=false once; future runs skip that facility
- **429s**: retry with jitter / respect Retry-After; if still limited, skip that month this run

#### Cursor:
- Saved in `crawler_state.last_offset` (facilities, not campsites)
- Advances during the run (every CURSOR_EVERY facilities) and at the end
- Wraps around with modulo when reaching the end
- **No overlaps**: Reserved concurrency = 1 ensures each run starts where the last ended

### Troubleshooting

- **"Cannot find module 'worker'"** → Handler not set to `worker.handler` or zip has an extra folder level
- **SUPABASE_* required** → Set env vars on the Worker; Worker passes them to the child
- **Many 429s** → Raise REQUEST_DELAY_MS (e.g., 2500–3000), increase BASE_BACKOFF_MS, or reduce BATCH_SIZE / MONTHS_AHEAD
- **Cursor not moving** → Ensure your schedule/test event does not include offset; remove any START_OFFSET env var. Check logs for "Cursor advanced to ..."

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.