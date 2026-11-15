import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Dùng trong trang (server component), API route và server action
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Gọi từ server component thì không ghi cookie được; middleware đã lo việc làm mới phiên.
          }
        },
      },
    }
  );
}
