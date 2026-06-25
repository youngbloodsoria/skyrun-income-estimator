import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot always write cookies. Route handlers can.
        }
      }
    }
  });
}

function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

function normalizeKey(value: string | undefined) {
  return value?.replace(/\s+/g, "").replace(/^['"]|['"]$/g, "");
}
