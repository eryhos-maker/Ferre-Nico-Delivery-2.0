
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kgwsgckgdbhxbxlezwnz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KhTdOBGQnyRonrhiY64wQA_-KDJF-j-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
