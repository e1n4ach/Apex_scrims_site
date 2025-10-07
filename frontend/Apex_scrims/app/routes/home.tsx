// app/routes/home.tsx
import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { Link } from "react-router";
import { ApexLogo } from "../components/ApexLogo";
import "../app.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Apex Scrims — Главная" },
    { name: "description", content: "Лучший сайт для проведения скримов Apex Legends" },
  ];
}

type Announcement = { id: number; title: string; time: string; prize: string };

export default function Home() {
  const [hello, setHello] = useState<string>("…");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    
    api<{ message: string }>("/hello")
      .then((d) => setHello(d.message))
      .catch(() => setHello(""));

    setLoading(true);
    setErr(null);
    api<Announcement[]>("/announcements")
      .then(setAnnouncements)
      .catch((e: any) => setErr(e.message || "Не удалось загрузить анонсы"))
      .finally(() => setLoading(false));

    // Проверяем, является ли пользователь админом
    if (getToken()) {
      api<{ is_admin: boolean; username: string }>("/auth/account", { auth: true })
        .then((user) => {
          setIsAdmin(!!user.is_admin);
        })
        .catch(() => {
          setIsAdmin(false);
        });
    }
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
            {hydrated && isAdmin && (
              <Link 
                to="/admin" 
                style={{ 
                  textDecoration: "none", 
                  color: "#ffc107",
                  fontSize: "20px", 
                  fontWeight: 600,
                  transition: "color 0.2s ease"
                }}
              >
                Админка
              </Link>
            )}
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
          minHeight: "600px",
          position: "relative",
          overflow: "hidden"
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
          <div style={{ flex: "0 0 auto" }} className="animate-fade-in-left">
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
          <div style={{ flex: "1", minWidth: 0 }} className="animate-fade-in-right">
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
                lineHeight: "1.4",
                textShadow: "0 2px 10px rgba(0, 150, 200, 0.2)"
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
          className="animate-fade-in-up"
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: "16px",
            color: "#ffffff",
            textShadow: "0 2px 10px rgba(0, 150, 200, 0.3)"
          }}
        >
          Анонсы турниров:
        </h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }} className="animate-fade-in-up">
            <div 
              style={{
                display: "inline-block",
                width: "40px",
                height: "40px",
                border: "4px solid rgba(0, 150, 200, 0.3)",
                borderTop: "4px solid #0096c8",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                boxShadow: "0 0 20px rgba(0, 150, 200, 0.3)"
              }}
            />
            <p style={{ color: "#78909c", marginTop: "16px" }}>Загружаем лобби...</p>
          </div>
        ) : err ? (
          <div style={{ textAlign: "center", padding: "60px 0" }} className="animate-fade-in-up">
            <p style={{ color: "#f44336", fontSize: "18px" }}>{err}</p>
          </div>
        ) : !announcements.length ? (
          <div style={{ textAlign: "center", padding: "60px 0" }} className="animate-fade-in-up">
            <p style={{ color: "#78909c", fontSize: "18px" }}>Пока нет анонсов турниров.</p>
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
            {/* Карточки анонсов турниров */}
            {announcements.map((announcement, index) => (
              <div 
                key={announcement.id}
                className="announcement-card animate-fade-in-up"
                style={{
                  background: "linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(200, 35, 51, 0.05) 100%)",
                  border: "2px solid #dc3545",
                  borderRadius: "12px",
                  padding: "32px",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                  animationDelay: `${index * 0.2}s`,
                  boxShadow: "0 8px 25px rgba(220, 53, 69, 0.2)"
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
                  {announcement.title}
                </h3>
                <p style={{ color: "#b0bec5", marginBottom: "8px" }}>
                  🕒 {announcement.time}
                </p>
                <p style={{ color: "#ffc107", marginBottom: "16px", fontWeight: "600" }}>
                  💰 {announcement.prize}
                </p>
                <a 
                  href="https://discord.gg/8tcBeUn36U"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(220, 53, 69, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(220, 53, 69, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(220, 53, 69, 0.3)";
                  }}
                >
                  Участвовать
                </a>
              </div>
            ))}
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
          <p style={{ color: "#0096c8", fontWeight: "600", marginBottom: "8px", fontSize: "18px" }}>
            Присоединяйся к нам
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <a href="https://discord.gg/8tcBeUn36U" target="_blank" rel="noopener noreferrer" style={{ color: "#78909c" }}>discord</a>
            <a href="https://t.me/apexcup" target="_blank" rel="noopener noreferrer" style={{ color: "#78909c" }}>telegram</a>
            <span style={{ color: "#78909c" }}>Сотрудничество: apexcup@rambler.ru</span>
          </div>
        </div>
        <a 
          href="https://github.com/e1n4ach" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ 
            color: "#546e7a", 
            fontSize: "14px",
            textDecoration: "none"
          }}
        >
          prod by e1n4ach
        </a>
      </footer>
    </div>
  );
}
