import { useState, useEffect } from 'react';

// 基础密码认证：服务端校验（env.PASS，默认 2153），sessionStorage 记忆登录态
const AUTH_KEY = 'oms_auth_ok';

function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const [checking, setChecking] = useState(false);
  // 背景随机图 URL 只计算一次（避免每次输入字符重渲染刷新图片）
  const [bgUrl] = useState(() => `https://random.mozuiapp.com/?day=random&t=${Date.now()}`);

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
    <div
      className="relative flex min-h-screen items-center justify-center"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 半透明遮罩，保证卡片可读 */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative w-full max-w-sm rounded-xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        {/* 右上角 GitHub 仓库链接 */}
        <a
          href="https://github.com/missyouling/office-supply-analytics"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub 仓库"
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
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
