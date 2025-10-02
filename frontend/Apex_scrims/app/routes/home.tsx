// app/routes/home.tsx
import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router";
import { ApexLogo } from "../components/ApexLogo";
import "../app.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Apex Scrims — Главная" },
    { name: "description", content: "Лучший сайт для проведения скримов Apex Legends" },
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
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          height: "120px",
          background: "rgba(0, 26, 35, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div 
          style={{
            width: "1000px",
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px"
          }}
        >
          {/* Левая навигация */}
          <nav style={{ display: "flex", gap: 60, alignItems: "center" }}>
            <Link 
              to="/" 
              style={{ 
                textDecoration: "none", 
                color: "#ffffff",
                fontSize: "20px",
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
                fontSize: "20px", 
                fontWeight: 500,
                transition: "color 0.2s ease"
              }}
            >
              Лобби
            </Link>
          <Link 
            to="/profile" 
            style={{ 
              textDecoration: "none", 
              color: "#ffffff",
              fontSize: "20px", 
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
                fontSize: "20px", 
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
                width: "110px",
                height: "110px",
                objectFit: "contain",
                filter: 'drop-shadow(0 0 15px rgba(0, 150, 200, 0.3))'
              }}
            />
          </div>
        </div>
      </header>

      {/* Hero блок по макету */}
      <section 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 32px",
          minHeight: "600px"
        }}
      >
        <div 
          style={{
            width: "1000px",
            maxWidth: "100%",
            display: "flex",
            alignItems: "center",
            gap: "80px"
          }}
        >
          {/* Левый логотип */}
          <div style={{ flex: "0 0 auto" }}>
            <img 
              src="/Logo white-rgb.png" 
              alt="Apex Scrims Logo"
              style={{
                width: "540px",
                height: "540px",
                objectFit: "contain",
                filter: 'drop-shadow(0 0 30px rgba(0, 150, 200, 0.4))'
              }}
            />
          </div>

          {/* Правый текстовый блок */}
          <div style={{ flex: "1", minWidth: 0 }}>
            <h1 
              style={{
                fontSize: "4.5rem",
                fontWeight: "900",
                margin: "0 0 32px 0",
                color: "#ffffff",
                letterSpacing: "-0.02em",
                lineHeight: "1.1"
              }}
            >
              Scrims
            </h1>
            
            <p 
              style={{
                fontSize: "1.5rem",
                color: "#ffffff",
                fontWeight: "600",
                marginBottom: "32px",
                lineHeight: "1.4"
              }}
            >
              Лучший сайт для проведения скримов Apex Legends
            </p>
            
            <div 
              style={{
                fontSize: "1.1rem",
                color: "#b0bec5",
                lineHeight: "1.6",
                marginBottom: "24px"
              }}
            >
              <p style={{ margin: "0 0 20px 0" }}>
                Scrims — частные пользовательские игры Apex, предназначенные для того, чтобы помочь игрокам практиковаться и совершенствовать свои навыки перед предстоящими турнирами.
              </p>
              <p style={{ margin: 0 }}>
                Присоединяйтесь к другим игрокам, чтобы потренироваться в соревнованиях, улучшить свои навыки и повеселиться с друзьями!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Секция анонсов скримов */}
      <section 
        style={{
          padding: "80px 32px",
          maxWidth: "1200px",
          margin: "0 auto"
        }}
      >
        <h2 
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: "16px",
            color: "#ffffff"
          }}
        >
          Анонсы скримов:
        </h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div 
              style={{
                display: "inline-block",
                width: "40px",
                height: "40px",
                border: "4px solid rgba(0, 150, 200, 0.3)",
                borderTop: "4px solid #0096c8",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}
            />
            <p style={{ color: "#78909c", marginTop: "16px" }}>Загружаем скримы...</p>
          </div>
        ) : err ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#f44336", fontSize: "18px" }}>{err}</p>
          </div>
        ) : !lobbies.length ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "#78909c", fontSize: "18px" }}>Пока нет активных скримов.</p>
            <p style={{ color: "#546e7a", marginTop: "8px" }}>Скоро здесь появятся новые турниры!</p>
          </div>
        ) : (
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "24px",
              marginTop: "48px"
            }}
          >
            {/* Пример карточек скримов по макету */}
            <div 
              style={{
                background: "linear-gradient(135deg, rgba(0, 150, 200, 0.1) 0%, rgba(0, 123, 167, 0.05) 100%)",
                border: "2px solid #0096c8",
                borderRadius: "12px",
                padding: "32px",
                textAlign: "center",
                transition: "all 0.3s ease"
              }}
            >
              <h3 
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#ffffff",
                  marginBottom: "16px"
                }}
              >
                Sanyok Cup 2025
              </h3>
              <p style={{ color: "#b0bec5", marginBottom: "8px" }}>
                Время проведения: 22:00 по МСК
              </p>
              <p style={{ color: "#0096c8", fontWeight: "600", marginBottom: "24px" }}>
                Призовой: 1000$
              </p>
              <Link 
                to="/register"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
              >
                Участвовать
              </Link>
            </div>

            <div 
              style={{
                background: "linear-gradient(135deg, rgba(0, 150, 200, 0.1) 0%, rgba(0, 123, 167, 0.05) 100%)",
                border: "2px solid #0096c8",
                borderRadius: "12px",
                padding: "32px",
                textAlign: "center",
                transition: "all 0.3s ease"
              }}
            >
              <h3 
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#ffffff",
                  marginBottom: "16px"
                }}
              >
                Sanyok Cup 2025
              </h3>
              <p style={{ color: "#b0bec5", marginBottom: "8px" }}>
                Время проведения: 22:00 по МСК
              </p>
              <p style={{ color: "#0096c8", fontWeight: "600", marginBottom: "24px" }}>
                Призовой: 1000$
              </p>
              <Link 
                to="/register"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
              >
                Участвовать
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Футер */}
      <footer 
        style={{
          textAlign: "center",
          padding: "40px 32px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          marginTop: "80px"
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <p style={{ color: "#0096c8", fontWeight: "600", marginBottom: "8px" }}>
            Join us
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <a href="#" style={{ color: "#78909c" }}>discord</a>
            <a href="#" style={{ color: "#78909c" }}>e-mail</a>
          </div>
        </div>
        <p style={{ color: "#546e7a", fontSize: "14px" }}>
          prod by xxx
        </p>
      </footer>
    </div>
  );
}
