import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  "https://iytpwyjmcygszktwjpzx.supabase.co";

export const supabasePublishableKey =
  "sb_publishable_mJYD40Y451Ymv3VY6SmY8g_C45wi7C_";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
);