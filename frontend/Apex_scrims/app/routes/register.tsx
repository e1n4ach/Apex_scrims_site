import { useState } from "react";
import { api, setToken } from "../lib/api";
import { Link, useNavigate } from "react-router";
import "../app.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [discord, setDiscord] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
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
      navigate("/profile");
    } catch (e: any) {
      setErr(e.message || "Ошибка регистрации");
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
                color: "#0096c8",
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

      {/* Основной контент - форма регистрации */}
      <main style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        minHeight: "calc(100vh - 280px)",
        padding: "40px 32px"
      }}>
        <div style={{
          width: "400px",
          maxWidth: "100%"
        }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "#ffffff",
            marginBottom: "40px",
            textAlign: "left"
          }}>
            Регистрация
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
                Логин:
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                Пароль:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                Почта:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                Discord <span style={{ color: "#78909c", fontSize: "14px" }}>(необязательно)</span>:
              </label>
              <input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="username#1234"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  outline: "none"
                }}
              />
            </div>

            <button 
              type="submit"
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#ffffff",
                background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginTop: "16px"
              }}
            >
              Зарегистрироваться
            </button>

            {err && (
              <div style={{ 
                color: "#ff6b6b", 
                fontSize: "14px",
                textAlign: "center",
                marginTop: "8px"
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
