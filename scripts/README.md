-- How to apply the SQL schema (run each file in order in Supabase SQL editor)

1. Create a new Supabase project.
2. Go to SQL Editor and run:
   - scripts/sql/001_schema.sql
   - scripts/sql/002_indexes.sql
   - scripts/sql/003_policies.sql
3. Add environment variables to your Vercel project:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - (optional for server): SUPABASE_SERVICE_ROLE
   - GOOGLE_GENERATIVE_AI_API_KEY (for Gemini)
4. Deploy. Then we can switch actions to write/read from Supabase instead of local state.
