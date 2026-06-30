import { createClient } from '@supabase/supabase-js';

// Use placeholder credentials during build time to prevent compilation crashes
const supabaseUrl = process.env.SUPABASE_URL || 'https://gcslfkujlfnznedatrsn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key-for-compilation';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment. Using compilation placeholders.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
