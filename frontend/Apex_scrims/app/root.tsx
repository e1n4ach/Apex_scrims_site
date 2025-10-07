// app/root.tsx
import {
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useNavigate,
  Links,
  Meta,
} from "react-router";
import { useEffect, useState } from "react";
import { api, getToken, clearToken } from "./lib/api";

import "./app.css";
// HTML-обвязка (оставляем как было)
export function Layout() {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="yandex-verification" content="6ca1f2dc7d876733" />
        <meta name="google-site-verification" content="xZFZxdakwzmhLgUHREtNuJonFRyABavMpD9MVetMZ44" />
        <title>Аpexcup</title>
        <link rel="icon" type="image/png" href="/Logo white-rgb.png" />
        <link rel="apple-touch-icon" href="/Logo white-rgb.png" />
        <link rel="shortcut icon" href="/Logo white-rgb.png" />
        <Meta />   
        <Links />
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
          padding: "16px 32px",
          background: "rgba(0, 26, 35, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Левая навигация */}
        <nav style={{ display: "flex", gap: 48, alignItems: "center" }}>
          <Link 
            to="/" 
            style={{ 
              textDecoration: "none", 
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              transition: "color 0.2s ease"
            }}
          >
            Главная
          </Link>
          <Link 
            to="/join" 
            style={{ 
              textDecoration: "none", 
              color: "#ffffff",
              fontSize: "18px", 
              fontWeight: 500,
              transition: "color 0.2s ease"
            }}
          >
            Лобби
          </Link>
          <Link 
            to="/login" 
            style={{ 
              textDecoration: "none", 
              color: "#ffffff",
              fontSize: "18px", 
              fontWeight: 500,
              transition: "color 0.2s ease"
            }}
          >
            Аккаунт
          </Link>
          <Link 
            to="/register" 
            style={{ 
              textDecoration: "none", 
              color: "#ffffff",
              fontSize: "18px", 
              fontWeight: 500,
              transition: "color 0.2s ease"
            }}
          >
            Регистрация
          </Link>
        </nav>

        {/* Правый логотип */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img 
            src="/Logo white-rgb.png" 
            alt="Apex Scrims Logo"
            style={{
              width: "170px",
              height: "170px",
              objectFit: "contain",
              filter: 'drop-shadow(0 0 20px rgba(0, 150, 200, 0.3))'
            }}
          />
        </div>
      </header>

      {/* сюда рендерятся страницы */}
      <main>
        <Outlet />
      </main>
    </>
  );
}
