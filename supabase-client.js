import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const config = window.SUPABASE_CONFIG
if (!config || !config.url || !config.anonKey) {
  throw new Error('Missing SUPABASE_CONFIG in config.js')
}

export const supabase = createClient(config.url, config.anonKey)
