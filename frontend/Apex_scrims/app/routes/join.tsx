import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router";

export default function Join() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const c = code.trim().toUpperCase();
      const lobby = await api<{ id:number; name:string; code:string }>(`/lobbies/by-code/${c}`);
      nav(`/lobby/${lobby.id}`);
    } catch (e: any) {
      setErr(e.message || "Лобби не найдено");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Присоединиться к лобби</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginTop: 16 }}>
        <input
          placeholder="Код лобби (например, ABC123)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>{loading ? "Поиск..." : "Присоединиться"}</button>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
    </main>
  );
}
