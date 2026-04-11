import dotenv from 'dotenv';
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey
);

export default supabase;