# Facility Description Summarizer

This script uses OpenAI to create one-sentence summaries of facility descriptions and stores them in the `summary` column of the `facilities` table.

## Prerequisites

1. Node.js installed
2. Access to Supabase database
3. OpenAI API key

## Setup

### Automated Setup

For automated setup, run one of the following scripts depending on your system:

**Windows (PowerShell):**
```
.\setup_env.ps1
```

**Unix/Linux/macOS (Bash):**
```
chmod +x setup_env.sh
./setup_env.sh
```

### Manual Setup

1. Create a `.env` file with the following content:
   ```
   # Supabase credentials
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   
   # OpenAI API key
   OPENAI_API_KEY=your_openai_api_key
   ```

2. Edit the `.env` file with your actual credentials:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service role key (needs write access)
   - `OPENAI_API_KEY`: Your OpenAI API key

3. Install dependencies:
   ```
   npm install
   ```

4. Run the SQL script to add the summary column to your database:
   Execute `add_facility_summary_column.sql` on your Supabase database.

## Usage

Run the script with:

```
npm run summarize
```

Or directly with:

```
node summarize_facility_descriptions.js
```

## How it works

1. The script queries the facilities table for records that have descriptions but no summaries yet
2. For each facility, it sends the description to OpenAI's API requesting a one-sentence summary
3. It updates the facility record with the generated summary
4. Progress is logged to the console

## Troubleshooting

- If you encounter rate limiting issues, the script has a built-in delay between API calls
- Check your OpenAI API key and billing status if you receive API errors
- Ensure your Supabase credentials have proper permissions to update the facilities table
- If you see module errors, make sure you've installed all dependencies with `npm install` 