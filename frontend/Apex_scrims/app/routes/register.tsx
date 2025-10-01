import { useState } from "react";
import { api, setToken } from "../lib/api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [discord, setDiscord] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      // Регистрация
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password, discord }),
      });
      // Автовход
      const { access_token } = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setToken(access_token);
      setMsg("Регистрация и вход выполнены.");
      setPassword("");
    } catch (e: any) {
      setErr(e.message || "Ошибка регистрации");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Регистрация</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginTop: 16 }}>
        <input placeholder="Логин" value={username} onChange={e=>setUsername(e.target.value)} required />
        <input placeholder="Почта" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <input placeholder="Discord (необязательно)" value={discord} onChange={e=>setDiscord(e.target.value)} />
        <button type="submit">Зарегистрироваться</button>
        {msg && <div style={{ color: "green" }}>{msg}</div>}
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
    </main>
  );
}
