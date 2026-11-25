import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import { getAuthUser } from '@/lib/auth-claims';

export default async function Nav() {
  const supabase = createClient();
  const user = await getAuthUser(supabase);

  let name = '';
  let role = '';
  if (user) {
    const { data: p } = await supabase.from('profiles').select('full_name,role').eq('id', user.id).single();
    name = p?.full_name || user.email || '';
    role = p?.role || 'student';
  }

  return (
    <header className="nav">
      <div className="nav-in">
        <Link href="/" className="brand" aria-label="Edulab AI">
          <Image src="/logo.png" alt="Edulab AI" width={140} height={35} priority />
        </Link>
        {user ? (
          <>
            <nav className="nav-links" aria-label="Điều hướng chính">
              <Link href="/">Kho tài liệu</Link>
              <Link href="/my-docs">Tài liệu của tôi</Link>
              <Link href="/history">Lịch sử</Link>
              <Link href="/review">Ôn lại</Link>
              <Link href="/classes">Lớp học</Link>
            </nav>
            <div className="nav-user">
              <span className="small muted">
                {name} · {role === 'admin' ? 'Quản trị' : role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
              </span>
              <form action={signOut}>
                <button className="btn ghost sm" type="submit">Đăng xuất</button>
              </form>
            </div>
          </>
        ) : (
          <div className="nav-user" style={{ marginLeft: 'auto' }}>
            <Link href="/login" className="btn ghost sm">Đăng nhập</Link>
            <Link href="/register" className="btn sm">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}