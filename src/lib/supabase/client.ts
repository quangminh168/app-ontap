import { createBrowserClient } from '@supabase/ssr';

// Dùng trong các component chạy trên trình duyệt (form đăng nhập, đăng ký)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
