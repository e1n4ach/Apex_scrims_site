import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate, Link } from "react-router";
import "../app.css";

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
                color: "#0096c8",
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

      {/* Основной контент - форма присоединения */}
      <main style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        minHeight: "calc(100vh - 280px)",
        padding: "40px 32px"
      }}>
        <div style={{
          width: "350px",
          maxWidth: "100%"
        }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "#ffffff",
            marginBottom: "40px",
            textAlign: "left"
          }}>
            Присоединиться к лобби:
          </h1>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <label style={{
                display: "block",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                Введите код лобби:
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABC123"
                required
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  outline: "none",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  opacity: loading ? 0.7 : 1
                }}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#ffffff",
                background: loading 
                  ? "linear-gradient(135deg, #666666 0%, #555555 100%)"
                  : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                marginTop: "16px",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Поиск лобби..." : "Присоединиться"}
            </button>

            {err && (
              <div style={{ 
                color: "#ff6b6b", 
                fontSize: "14px",
                textAlign: "center",
                marginTop: "8px",
                padding: "12px",
                background: "rgba(255, 107, 107, 0.1)",
                borderRadius: "6px",
                border: "1px solid rgba(255, 107, 107, 0.3)"
              }}>
                {err}
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Футер */}
      <footer 
        style={{
          textAlign: "center",
          padding: "40px 32px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)"
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
