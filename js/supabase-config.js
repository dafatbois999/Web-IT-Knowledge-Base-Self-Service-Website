import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- [สำคัญ] เอาค่าจาก Supabase > Project Settings > API มาวางทับตรงนี้ ---
const supabaseUrl = 'https://aowagmvulsuftikdfjwo.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvd2FnbXZ1bHN1ZnRpa2RmandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MjMxMzIsImV4cCI6MjA4NjA5OTEzMn0.2UzL1njNHqtewKLayk2LqxiSrVFNPworSD0AIeZGEW0' 
// -----------------------------------------------------------------------

export const supabase = createClient(supabaseUrl, supabaseKey)