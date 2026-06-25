import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient(url, key);
}

function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

function normalizeKey(value: string | undefined) {
  return value?.replace(/\s+/g, "").replace(/^['"]|['"]$/g, "");
}
