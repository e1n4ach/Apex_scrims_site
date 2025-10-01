// app/routes/home.tsx
import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Apex Scrims — Главная" },
    { name: "description", content: "Скримы Apex: лобби, вход и присоединение" },
  ];
}

type Lobby = { id: number; name: string };

export default function Home() {
  const [hello, setHello] = useState<string>("…");
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ message: string }>("/hello")
      .then((d) => setHello(d.message))
      .catch(() => setHello(""));

    setLoading(true);
    setErr(null);
    api<Lobby[]>("/lobbies/")
      .then(setLobbies)
      .catch((e: any) => setErr(e.message || "Не удалось загрузить лобби"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Apex Scrims</h1>
      {!!hello && <p style={{ opacity: 0.75, marginBottom: 16 }}>{hello}</p>}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <Link to="/join">Присоединиться по коду</Link>
        <Link to="/login">Войти</Link>
        <Link to="/register">Регистрация</Link>
      </div>

      <h2 style={{ margin: "16px 0 8px" }}>Доступные лобби</h2>
      {loading ? (
        <p>Загрузка…</p>
      ) : err ? (
        <p style={{ color: "crimson" }}>{err}</p>
      ) : !lobbies.length ? (
        <p>Пока нет лобби.</p>
      ) : (
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          {lobbies.map((l) => (
            <li
              key={l.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {l.id}</div>
                </div>
                <Link to={`/lobby/${l.id}`}>Открыть</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
