import { useState, useEffect } from "react";
import { api, getToken, clearToken } from "../lib/api";
import { Link, useNavigate } from "react-router";
import "../app.css";

type User = {
  id: number;
  username: string;
  email: string;
  discord: string | null;
  is_admin: boolean;
};

type UserStats = {
  teams: Array<{
    id: number;
    name: string;
    lobby_id: number;
    lobby_name: string;
  }>;
  total_games: number;
  best_placement: number | null;
};

export default function Profile() {
  const [me, setMe] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const navigate = useNavigate();

  // Режимы отображения
  const [activeTab, setActiveTab] = useState<"profile" | "edit" | "password" | "stats">("profile");

  // Состояния для редактирования
  const [editForm, setEditForm] = useState({
    email: "",
    discord: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      navigate("/login");
      return;
    }
    
    Promise.all([
      api<User>("/auth/account", { auth: true }),
      api<UserStats>("/auth/account/stats", { auth: true }).catch(() => null)
    ])
      .then(([userData, statsData]) => {
        setMe(userData);
        setStats(statsData);
        setEditForm({
          email: userData.email,
          discord: userData.discord || ""
        });
      })
      .catch(() => {
        clearToken();
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function onLogout() {
    clearToken();
    setMe(null);
    navigate("/");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api<{ user: User; message: string }>("/auth/account", {
        auth: true,
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      
      setMe(response.user);
      setMessage(response.message);
      setActiveTab("profile");
    } catch (e: any) {
      setError(e.message || "Ошибка обновления профиля");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("Пароли не совпадают");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api<{ message: string }>("/auth/account/password", {
        auth: true,
        method: "PATCH",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });
      
      setMessage(response.message);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
      setActiveTab("profile");
    } catch (e: any) {
      setError(e.message || "Ошибка смены пароля");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const statsData = await api<UserStats>("/auth/account/stats", { auth: true });
      setStats(statsData);
    } catch (e) {
      console.error("Ошибка загрузки статистики:", e);
    } finally {
      setStatsLoading(false);
    }
  }

  if (loading) {
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
                  color: "#0096c8",
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

        <main style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          minHeight: "calc(100vh - 280px)",
          padding: "40px 32px"
        }}>
          <div style={{
            color: "#ffffff",
            fontSize: "18px",
            textAlign: "center"
          }}>
            Загрузка...
          </div>
        </main>
      </div>
    );
  }

  if (!me) return null;

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
                color: "#0096c8",
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

      {/* Основной контент профиля */}
      <main style={{ 
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px 32px"
      }}>
        {/* Заголовок */}
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "700",
          color: "#ffffff",
          marginBottom: "40px",
          textAlign: "center"
        }}>
          Профиль
        </h1>

        {/* Навигация по табам */}
        <div style={{
          display: "flex",
          gap: "32px",
          justifyContent: "center",
          marginBottom: "40px",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setActiveTab("profile")}
            style={{
              background: "none",
              color: activeTab === "profile" ? "#0096c8" : "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: "8px 16px",
              borderRadius: "8px",
              border: activeTab === "profile" ? "2px solid #0096c8" : "2px solid transparent"
            }}
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            style={{
              background: "none",
              color: activeTab === "edit" ? "#0096c8" : "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: "8px 16px",
              borderRadius: "8px",
              border: activeTab === "edit" ? "2px solid #0096c8" : "2px solid transparent"
            }}
          >
            Редактировать
          </button>
          <button
            onClick={() => setActiveTab("password")}
            style={{
              background: "none",
              color: activeTab === "password" ? "#0096c8" : "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: "8px 16px",
              borderRadius: "8px",
              border: activeTab === "password" ? "2px solid #0096c8" : "2px solid transparent"
            }}
          >
            Смена пароля
          </button>
          <button
            onClick={() => {
              setActiveTab("stats");
              if (!stats) loadStats();
            }}
            style={{
              background: "none",
              color: activeTab === "stats" ? "#0096c8" : "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.2s ease",
              padding: "8px 16px",
              borderRadius: "8px",
              border: activeTab === "stats" ? "2px solid #0096c8" : "2px solid transparent"
            }}
          >
            Статистика
          </button>
        </div>

        {/* Сообщения об успехе/ошибке */}
        {message && (
          <div style={{
            background: "rgba(76, 175, 80, 0.1)",
            border: "1px solid #4caf50",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
            textAlign: "center",
            color: "#4caf50",
            fontWeight: 500
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(244, 67, 54, 0.1)",
            border: "1px solid #f44336",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
            textAlign: "center",
            color: "#f44336",
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* Контент табов */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0, 150, 200, 0.1) 0%, rgba(0, 123, 167, 0.05) 100%)",
          border: "2px solid #0096c8",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 8px 25px rgba(0, 150, 200, 0.2)"
        }}>
          {activeTab === "profile" && (
            <div>
              {/* Аватар и основная информация */}
              <div style={{ 
                textAlign: "center", 
                marginBottom: "40px" 
              }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: me.is_admin 
                    ? "linear-gradient(135deg, #dc3545 0%, #c82333 100%)"
                    : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "48px",
                  fontWeight: "700",
                  color: "#ffffff",
                  boxShadow: "0 8px 25px rgba(0, 150, 200, 0.3)",
                  position: "relative"
                }}>
                  {me.username.charAt(0).toUpperCase()}
                  {me.is_admin && (
                    <div style={{
                      position: "absolute",
                      bottom: "5px",
                      right: "5px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "#ffc107",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#000000"
                    }}>
                      A
                    </div>
                  )}
                </div>
                <h2 style={{ 
                  color: "#ffffff", 
                  fontSize: "32px", 
                  fontWeight: "700",
                  margin: "0 0 8px 0",
                  textShadow: "0 2px 10px rgba(0, 150, 200, 0.3)"
                }}>
                  {me.username}
                </h2>
                {me.is_admin && (
                  <div style={{
                    background: "rgba(220, 53, 69, 0.2)",
                    border: "1px solid #dc3545",
                    borderRadius: "20px",
                    padding: "4px 12px",
                    display: "inline-block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#dc3545",
                    marginBottom: "16px"
                  }}>
                    Администратор
                  </div>
                )}
              </div>
              
              {/* Информация профиля */}
              <div style={{ display: "grid", gap: "20px", maxWidth: "500px", margin: "0 auto" }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "16px",
                  padding: "16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgba(0, 150, 200, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px"
                  }}>
                    📧
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>
                      Email
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "500" }}>
                      {me.email}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "16px",
                  padding: "16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgba(0, 150, 200, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px"
                  }}>
                    💬
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>
                      Discord
                    </div>
                    <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "500" }}>
                      {me.discord || "Не указан"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <div style={{ maxWidth: "500px", margin: "0 auto" }}>
              <h3 style={{ 
                color: "#ffffff", 
                fontSize: "24px", 
                fontWeight: "600",
                marginBottom: "32px",
                textAlign: "center"
              }}>
                Редактирование профиля
              </h3>
              
              <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ 
                    color: "#b0bec5", 
                    fontSize: "14px", 
                    fontWeight: "500",
                    marginBottom: "8px",
                    display: "block"
                  }}>
                    Email
                  </label>
                  <input 
                    type="email"
                    value={editForm.email} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                    required 
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#0096c8"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"}
                  />
                </div>

                <div>
                  <label style={{ 
                    color: "#b0bec5", 
                    fontSize: "14px", 
                    fontWeight: "500",
                    marginBottom: "8px",
                    display: "block"
                  }}>
                    Discord
                  </label>
                  <input 
                    type="text"
                    placeholder="username#1234"
                    value={editForm.discord} 
                    onChange={(e) => setEditForm({...editForm, discord: e.target.value})} 
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#0096c8"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{
                    padding: "14px 24px",
                    background: submitting 
                      ? "rgba(0, 150, 200, 0.5)" 
                      : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: submitting ? "not-allowed" : "pointer",
                    marginTop: "8px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {submitting ? "Сохранение..." : "Сохранить изменения"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "password" && (
            <div style={{ maxWidth: "500px", margin: "0 auto" }}>
              <h3 style={{ 
                color: "#ffffff", 
                fontSize: "24px", 
                fontWeight: "600",
                marginBottom: "32px",
                textAlign: "center"
              }}>
                Смена пароля
              </h3>
              
              <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ 
                    color: "#b0bec5", 
                    fontSize: "14px", 
                    fontWeight: "500",
                    marginBottom: "8px",
                    display: "block"
                  }}>
                    Текущий пароль
                  </label>
                  <input 
                    type="password"
                    value={passwordForm.current_password} 
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})} 
                    required 
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#0096c8"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"}
                  />
                </div>

                <div>
                  <label style={{ 
                    color: "#b0bec5", 
                    fontSize: "14px", 
                    fontWeight: "500",
                    marginBottom: "8px",
                    display: "block"
                  }}>
                    Новый пароль
                  </label>
                  <input 
                    type="password"
                    value={passwordForm.new_password} 
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                    required 
                    minLength={6}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#0096c8"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"}
                  />
                </div>

                <div>
                  <label style={{ 
                    color: "#b0bec5", 
                    fontSize: "14px", 
                    fontWeight: "500",
                    marginBottom: "8px",
                    display: "block"
                  }}>
                    Подтвердите пароль
                  </label>
                  <input 
                    type="password"
                    value={passwordForm.confirm_password} 
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})} 
                    required 
                    minLength={6}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#0096c8"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{
                    padding: "14px 24px",
                    background: submitting 
                      ? "rgba(220, 53, 69, 0.5)" 
                      : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: submitting ? "not-allowed" : "pointer",
                    marginTop: "8px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {submitting ? "Смена пароля..." : "Изменить пароль"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "stats" && (
            <div>
              <h3 style={{ 
                color: "#ffffff", 
                fontSize: "24px", 
                fontWeight: "600",
                marginBottom: "32px",
                textAlign: "center"
              }}>
                Статистика игрока
              </h3>
              
              {statsLoading ? (
                <div style={{ textAlign: "center", color: "#b0bec5" }}>
                  Загрузка статистики...
                </div>
              ) : stats ? (
                <div style={{ display: "grid", gap: "24px" }}>
                  {/* Основная статистика */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    marginBottom: "32px"
                  }}>
                    <div style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "20px",
                      textAlign: "center"
                    }}>
                      <div style={{ color: "#0096c8", fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                        {stats.total_games}
                      </div>
                      <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: "500" }}>
                        Всего игр
                      </div>
                    </div>
                    
                    <div style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "20px",
                      textAlign: "center"
                    }}>
                      <div style={{ color: "#dc3545", fontSize: "32px", fontWeight: "700", marginBottom: "8px" }}>
                        {stats.best_placement || "-"}
                      </div>
                      <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: "500" }}>
                        Лучшее место
                      </div>
                    </div>
                  </div>

                  {/* Лобби */}
                  {stats.teams.length > 0 && (
                    <div>
                      <h4 style={{ 
                        color: "#ffffff", 
                        fontSize: "20px", 
                        fontWeight: "600",
                        marginBottom: "16px"
                      }}>
                        Лобби где вы участвовали
                      </h4>
                      <div style={{ display: "grid", gap: "12px" }}>
                        {stats.teams.map((team) => (
                          <div
                            key={team.id}
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                              padding: "16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600" }}>
                                {team.lobby_name}
                              </div>
                              <div style={{ color: "#b0bec5", fontSize: "14px" }}>
                                Команда: {team.name}
                              </div>
                            </div>
                            <Link
                              to={`/lobby/${team.lobby_id}`}
                              style={{
                                background: "rgba(0, 150, 200, 0.2)",
                                border: "1px solid #0096c8",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                color: "#0096c8",
                                fontSize: "14px",
                                fontWeight: "500",
                                textDecoration: "none",
                                transition: "all 0.2s ease"
                              }}
                            >
                              Открыть лобби
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#b0bec5" }}>
                  Не удалось загрузить статистику
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопка выхода */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button 
            onClick={onLogout}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: "600",
              color: "#ffffff",
              background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Выйти из аккаунта
          </button>
        </div>
      </main>

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
            <a href="https://discord.gg/8tcBeUn36U" target="_blank" rel="noopener noreferrer" style={{ color: "#78909c" }}>discord</a>
            <span style={{ color: "#78909c" }}>Сотрудничество: apexcup@rambler.ru</span>
          </div>
        </div>
        <p style={{ color: "#546e7a", fontSize: "14px" }}>
          prod by xxx
        </p>
      </footer>
    </div>
  );
}