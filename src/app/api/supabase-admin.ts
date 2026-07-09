import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcslfkujlfnznedatrsn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjc2xma3VqbGZuem5lZGF0cnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5MTA4OSwiZXhwIjoyMDkyMDY3MDg5fQ.RLVurx-xFrtJJ87k9OuovJ4nH9sWWi1kfjSyt5GWpO4';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
