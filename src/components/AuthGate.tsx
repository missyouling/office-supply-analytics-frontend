import { useState, useEffect } from 'react';

// 基础密码认证：服务端校验（env.PASS，默认 2153），sessionStorage 记忆登录态
const AUTH_KEY = 'oms_auth_ok';

function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const [checking, setChecking] = useState(false);

  // 检查服务端是否启用认证（若未启用则直接放行）
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/config');
        const d = await r.json();
        if (d.enabled === false) {
          sessionStorage.setItem(AUTH_KEY, '1');
          setAuthed(true);
        }
      } catch { /* 网络异常时按启用处理 */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">加载中…</div>;
  if (authed) return <>{children}</>;

  const submit = async () => {
    if (!pw.trim()) return;
    setChecking(true); setErr(false);
    try {
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        sessionStorage.setItem(AUTH_KEY, '1');
        setAuthed(true);
      } else {
        setErr(true);
        setPw('');
      }
    } catch {
      setErr(true);
      setPw('');
    }
    finally { setChecking(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-2 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">🍚</div>
        </div>
        <h1 className="mb-1 text-center text-lg font-semibold text-slate-800">综合管理平台</h1>
        <p className="mb-6 text-center text-sm text-slate-500">请输入访问密码</p>
        <input
          type="password"
          autoFocus
          value={pw}
          placeholder="访问密码"
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        {err && <p className="mt-2 text-center text-sm text-red-500">密码错误，请重试</p>}
        <button
          onClick={submit}
          disabled={checking}
          className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {checking ? '校验中…' : '进入系统'}
        </button>
      </div>
    </div>
  );
}

export default AuthGate;
