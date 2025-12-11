import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cekvipzavbegbtawplpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla3ZpcHphdmJlZ2J0YXdwbHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzA1NTYsImV4cCI6MjA4MTA0NjU1Nn0.Hwa8yXsGVk1ibSCLdJi14aFHZ44RQNButAhwaYBcRTQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = () => {
    return true;
};