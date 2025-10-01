import { useState, useEffect } from "react";
import { api, setToken, getToken, clearToken } from "../lib/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  // если токен уже есть — подтянем профиль
  useEffect(() => {
    const t = getToken();
    if (!t) return;
    api("/auth/account", { auth: true })
      .then(setMe)
      .catch(() => clearToken());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setToken(res.access_token);
      const meResp = await api("/auth/account", { auth: true });
      setMe(meResp);
      setPassword("");
    } catch (e: any) {
      setErr(e.message || "Ошибка входа");
    }
  }

  function onLogout() {
    clearToken();
    setMe(null);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Вход</h1>

      {!me ? (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <input
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            placeholder="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Войти</button>
          {err && <div style={{ color: "crimson" }}>{err}</div>}
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Нет пользователя? Создай через Swagger: <code>/api/auth/register</code>
          </p>
        </form>
      ) : (
        <div style={{ marginTop: 24 }}>
          <h2>Аккаунт</h2>
          <p><b>id:</b> {me.id}</p>
          <p><b>username:</b> {me.username}</p>
          <p><b>email:</b> {me.email}</p>
          <p><b>discord:</b> {me.discord || "-"}</p>
          <p><b>is_admin:</b> {String(me.is_admin)}</p>
          <button onClick={onLogout}>Выйти</button>
        </div>
      )}
    </main>
  );
}
