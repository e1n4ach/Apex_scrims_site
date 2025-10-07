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
          width: "450px",
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
              🎮
            </div>
            <h1 style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "12px",
              textShadow: "0 2px 10px rgba(0, 150, 200, 0.3)"
            }}>
              Присоединиться к лобби
            </h1>
            <p style={{
              color: "#b0bec5",
              fontSize: "16px",
              margin: 0,
              lineHeight: "1.5"
            }}>
              Введите код лобби, чтобы присоединиться к игре
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
                  marginBottom: "12px"
                }}>
                  Код лобби
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ABC123"
                  required
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    fontSize: "18px",
                    fontWeight: "600",
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "12px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    outline: "none",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    textAlign: "center",
                    opacity: loading ? 0.7 : 1,
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
                <div style={{
                  color: "#78909c",
                  fontSize: "14px",
                  marginTop: "8px",
                  textAlign: "center"
                }}>
                  Введите код, который дал вам организатор
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                style={{
                  padding: "16px 32px",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#ffffff",
                  background: loading 
                    ? "linear-gradient(135deg, #666666 0%, #555555 100%)"
                    : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  border: "none",
                  borderRadius: "12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  marginTop: "16px",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: loading 
                    ? "0 4px 15px rgba(0, 0, 0, 0.2)"
                    : "0 6px 20px rgba(0, 150, 200, 0.4)",
                  transform: loading ? "none" : "translateY(-2px)"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 150, 200, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 150, 200, 0.4)";
                  }
                }}
              >
                {loading ? "Поиск лобби..." : "🎯 Присоединиться"}
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
              Нет кода лобби? Попросите организатора создать лобби и поделиться кодом.
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
