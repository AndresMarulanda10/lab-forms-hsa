import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export async function createClient() {
  const cookieStore = await cookies();

  // No Database generic: our hand-crafted type doesn't satisfy Supabase's
  // internal GenericTable constraint, causing all mutation methods to type
  // their parameters as `never`. Routes use their own typed interfaces instead.
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component — se puede ignorar si
          // el middleware está refrescando la sesión.
        }
      },
    },
  });
}
