'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setInfo('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') || '').trim();
    const password = String(f.get('password') || '');
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(f.get('name') || '').trim(), role: String(f.get('role') || 'student') },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setInfo('Đã gửi email xác nhận. Hãy mở email, bấm liên kết xác nhận rồi đăng nhập.');
        }
      }
    } catch (err: any) {
      const m = String(err?.message || '');
      if (/Invalid login credentials/i.test(m)) setError('Email hoặc mật khẩu chưa đúng.');
      else if (/already registered/i.test(m)) setError('Email này đã được đăng ký. Hãy đăng nhập.');
      else if (/Password should be/i.test(m)) setError('Mật khẩu cần có ít nhất 6 ký tự.');
      else if (/Email not confirmed/i.test(m)) setError('Bạn chưa xác nhận email. Hãy mở email và bấm liên kết xác nhận.');
      else setError('Có lỗi xảy ra: ' + m);
    } finally {
      setBusy(false);
    }
  }

  const isReg = mode === 'register';
  return (
    <form className="card stack" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      <h2>{isReg ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
      {isReg && (
        <div className="field">
          <label className="lab" htmlFor="name">Họ tên</label>
          <input id="name" name="name" type="text" required autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label className="lab" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label className="lab" htmlFor="password">Mật khẩu</label>
        <input id="password" name="password" type="password" required minLength={6} autoComplete={isReg ? 'new-password' : 'current-password'} />
      </div>
      {isReg && (
        <div className="field">
          <span className="lab">Bạn là</span>
          <div className="seg" role="radiogroup" aria-label="Vai trò">
            <label><input type="radio" name="role" value="student" defaultChecked /><span>Học sinh, sinh viên</span></label>
            <label><input type="radio" name="role" value="teacher" /><span>Giáo viên</span></label>
          </div>
        </div>
      )}
      {error && <div className="msg err" role="alert">{error}</div>}
      {info && <div className="msg info" role="status">{info}</div>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Đang xử lý…' : isReg ? 'Đăng ký' : 'Đăng nhập'}
      </button>
      <p className="small muted">
        {isReg ? (
          <>Đã có tài khoản? <Link href="/login">Đăng nhập</Link></>
        ) : (
          <>Chưa có tài khoản? <Link href="/register">Đăng ký</Link></>
        )}
      </p>
    </form>
  );
}
