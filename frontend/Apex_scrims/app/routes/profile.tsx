import { useState, useEffect } from "react";
import { api, getToken, clearToken } from "../lib/api";
import { Link, useNavigate } from "react-router";
import "../app.css";

export default function Profile() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const t = getToken();
    if (!t) {
      navigate("/login");
      return;
    }
    
    api("/auth/account", { auth: true })
      .then(setMe)
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
          <div>Загрузка...</div>
        </main>
      </div>
    );
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
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        minHeight: "calc(100vh - 280px)",
        padding: "40px 32px"
      }}>
        <div style={{ 
          width: "400px",
          maxWidth: "100%",
          textAlign: "center"
        }}>
          <h2 style={{ 
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "#ffffff", 
            marginBottom: "32px" 
          }}>
            Профиль
          </h2>
          
          <div style={{ 
            background: "rgba(255, 255, 255, 0.1)",
            padding: "32px",
            borderRadius: "12px",
            marginBottom: "32px",
            textAlign: "left"
          }}>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#b0bec5", fontSize: "14px" }}>ID:</span>
              <p style={{ color: "#ffffff", margin: "4px 0 0 0", fontSize: "16px" }}>{me.id}</p>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#b0bec5", fontSize: "14px" }}>Логин:</span>
              <p style={{ color: "#ffffff", margin: "4px 0 0 0", fontSize: "16px", fontWeight: "600" }}>{me.username}</p>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#b0bec5", fontSize: "14px" }}>Email:</span>
              <p style={{ color: "#ffffff", margin: "4px 0 0 0", fontSize: "16px" }}>{me.email}</p>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#b0bec5", fontSize: "14px" }}>Discord:</span>
              <p style={{ color: "#ffffff", margin: "4px 0 0 0", fontSize: "16px" }}>{me.discord || "Не указан"}</p>
            </div>
            
            <div>
              <span style={{ color: "#b0bec5", fontSize: "14px" }}>Статус:</span>
              <p style={{ 
                color: me.is_admin ? "#ffa726" : "#ffffff", 
                margin: "4px 0 0 0", 
                fontSize: "16px",
                fontWeight: me.is_admin ? "600" : "normal"
              }}>
                {me.is_admin ? "Администратор" : "Пользователь"}
              </p>
            </div>
          </div>
          
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
