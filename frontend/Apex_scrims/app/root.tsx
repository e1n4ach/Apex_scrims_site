// app/root.tsx
import {
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useNavigate,
} from "react-router";
import { useEffect, useState } from "react";
import { api, getToken, clearToken } from "./lib/api";

// HTML-обвязка (оставляем как было)
export function Layout() {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Apex Scrims Frontend</title>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Корневой рендер приложения: общий хедер + контент страниц
export default function Root() {
  const [hydrated, setHydrated] = useState(false);
  const [me, setMe] = useState<any | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    setHydrated(true);
    const t = getToken();
    if (!t) return;

    // подтягиваем профиль, если токен есть
    api("/auth/account", { auth: true })
      .then(setMe)
      .catch(() => {
        clearToken();
        setMe(null);
      });
  }, []);

  function onLogout() {
    clearToken();
    setMe(null);
    nav("/");
  }

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 10,
        }}
      >
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: 700, textDecoration: "none" }}>
            Apex Scrims
          </Link>
          <Link to="/" style={{ textDecoration: "none" }}>
            Главная
          </Link>
          <Link to="/join" style={{ textDecoration: "none" }}>
            Присоединиться
          </Link>
        </nav>

        {/* Правый блок: либо Войти/Регистрация, либо имя + Выход */}
        {!hydrated ? null : me ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>
              Привет, <b>{me.username}</b>
              {me.is_admin ? " · admin" : ""}
            </span>
            <Link to="/login">Аккаунт</Link>
            <button onClick={onLogout}>Выйти</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link to="/login">Войти</Link>
            <Link to="/register">Регистрация</Link>
          </div>
        )}
      </header>

      {/* сюда рендерятся страницы */}
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </>
  );
}
