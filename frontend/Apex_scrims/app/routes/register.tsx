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
          width: "500px",
          maxWidth: "100%"
        }}>
          {/* Заголовок с иконкой */}
          <div style={{
            textAlign: "center",
            marginBottom: "48px"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: "32px",
              boxShadow: "0 8px 25px rgba(0, 150, 200, 0.3)"
            }}>
              ✨
            </div>
            <h1 style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "12px",
              textShadow: "0 2px 10px rgba(0, 150, 200, 0.3)"
            }}>
              Регистрация
            </h1>
            <p style={{
              color: "#b0bec5",
              fontSize: "16px",
              margin: 0,
              lineHeight: "1.5"
            }}>
              Создайте аккаунт, чтобы участвовать в турнирах
            </p>
          </div>

          {/* Форма в красивой карточке */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0, 150, 200, 0.1) 0%, rgba(0, 123, 167, 0.05) 100%)",
            border: "2px solid #0096c8",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 8px 25px rgba(0, 150, 200, 0.2)",
            backdropFilter: "blur(10px)"
          }}>
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <label style={{
                  display: "block",
                  color: "#0096c8",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "8px"
                }}>
                  Логин
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Введите ваш логин"
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    fontSize: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    outline: "none",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0096c8";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "#0096c8",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "8px"
                }}>
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    fontSize: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    outline: "none",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0096c8";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "#0096c8",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "8px"
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    fontSize: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    outline: "none",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0096c8";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "#0096c8",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "8px"
                }}>
                  Discord <span style={{ color: "#78909c", fontSize: "14px", fontWeight: "400" }}>(необязательно)</span>
                </label>
                <input
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="username#1234"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    fontSize: "16px",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    outline: "none",
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0096c8";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                />
              </div>

              <button 
                type="submit"
                style={{
                  padding: "16px 32px",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  marginTop: "16px",
                  boxShadow: "0 6px 20px rgba(0, 150, 200, 0.4)",
                  transform: "translateY(-2px)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 150, 200, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 150, 200, 0.4)";
                }}
              >
                🚀 Зарегистрироваться
              </button>

              {err && (
                <div style={{ 
                  color: "#ff6b6b", 
                  fontSize: "14px",
                  textAlign: "center",
                  marginTop: "16px",
                  padding: "16px",
                  background: "rgba(244, 67, 54, 0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(244, 67, 54, 0.3)",
                  fontWeight: "500"
                }}>
                  ⚠️ {err}
                </div>
              )}
            </form>
          </div>

          {/* Дополнительная информация */}
          <div style={{
            marginTop: "32px",
            textAlign: "center"
          }}>
            <p style={{
              color: "#78909c",
              fontSize: "14px",
              margin: 0,
              lineHeight: "1.6"
            }}>
              Уже есть аккаунт? <Link 
                to="/login" 
                style={{ 
                  color: "#0096c8", 
                  textDecoration: "none",
                  fontWeight: "600"
                }}
              >
                Войти
              </Link>
            </p>
          </div>
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
