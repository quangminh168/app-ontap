// src/lib/auth-claims.ts
// Xác định người dùng hiện tại mà KHÔNG phải gọi sang máy chủ Supabase mỗi lần (nếu dự án dùng khóa ký bất đối xứng).
// getClaims() kiểm tra chữ ký token tại chỗ; nếu dự án dùng khóa cũ nó tự gọi Supabase như getUser().
// Không dùng được getClaims (thư viện cũ, lỗi tạm thời) thì quay về getUser().

export interface AuthUser {
  id: string;
  email?: string;
}

export async function getAuthUser(supabase: any): Promise<AuthUser | null> {
  const auth = supabase?.auth;
  if (auth && typeof auth.getClaims === 'function') {
    try {
      const { data, error } = await auth.getClaims();
      const c = data?.claims;
      if (!error && c && typeof c.sub === 'string' && c.sub) {
        return { id: c.sub, email: typeof c.email === 'string' ? c.email : undefined };
      }
    } catch {
      // rơi xuống getUser bên dưới
    }
  }
  const {
    data: { user },
  } = await auth.getUser();
  return user ? { id: user.id, email: user.email ?? undefined } : null;
}