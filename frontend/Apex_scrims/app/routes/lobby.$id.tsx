// app/routes/lobby.$id.tsx
import { useParams, Link } from "react-router";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { api, getToken } from "../lib/api";
import "../app.css";

const ZONE_DIAMETER_PX = 130; // требуемый диаметр круга в px

type LobbyDetails = {
  id: number;
  name: string;
  code: string;
};

type SummaryRow = {
  team_id: number;
  team_name: string;
  kills_total: number;
  points_total: number;
};

type Game = {
  id: number;
  number: number;
  lobby_id: number;
  map?: { id: number; name: string; image_url: string } | null;
};

type GameResult = {
  id: number;
  team_id: number;
  team_name: string | null;
  place: number | null;
  kills: number | null;
  points: number | null;
};

type DropzoneTeam = {
  assignment_id: number;
  team_id: number;
  team_name: string;
};

type Dropzone = {
  id?: number;
  assignment_id?: number;
  name: string;
  x_percent: number;
  y_percent: number;
  radius: number;
  capacity: number;
  current_teams: number;
  teams: DropzoneTeam[];
  assigned_team?: { id: number; name: string } | null;
  team_id?: number | null;
  team_name?: string | null;
};

export default function LobbyPage() {
  const { id } = useParams();

  // ===== Детали лобби (чтобы показать code) =====
  const [lobby, setLobby] = useState<LobbyDetails | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<LobbyDetails>(`/lobbies/${id}/details`)
      .then(setLobby)
      .catch(() => setLobby(null));
  }, [id]);

  async function copyCode() {
    if (!lobby?.code) return;
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  // ===== Итог =====
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  useEffect(() => {
    if (!id) return;
    api<SummaryRow[]>(`/lobbies/${id}/results/summary`)
      .then(setSummary)
      .catch(() => {});
  }, [id]);

  // ===== Игры =====
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  useEffect(() => {
    if (!id) return;
    api<Game[]>(`/lobbies/${id}/games`)
      .then((gs) => {
        gs.sort((a, b) => a.number - b.number);
        setGames(gs);
        if (gs.length && selectedGameId == null) setSelectedGameId(gs[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ===== Результаты выбранной игры =====
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  useEffect(() => {
    if (!selectedGameId) return;
    api<GameResult[]>(`/games/${selectedGameId}/results`)
      .then(setGameResults)
      .catch(() => {});
  }, [selectedGameId]);

  // ===== Дропзоны выбранной игры =====
  const [dropzones, setDropzones] = useState<Dropzone[]>([]);
  useEffect(() => {
    if (!selectedGameId) return;
    // новый удобный эндпоинт: assignments с id
    api<any[]>(`/dropzones/for-game/${selectedGameId}`)
      .then((rows) => {
        const dz = rows.map((r) => ({
          id: r.id,
          assignment_id: r.assignment_id,
          name: r.name,
          x_percent: r.x_percent,
          y_percent: r.y_percent,
          radius: r.radius,
          capacity: r.capacity,
          current_teams: r.current_teams || 0,
          teams: r.teams || [],
          assigned_team: r.team_id
            ? { id: r.team_id, name: r.team_name || `#${r.team_id}` }
            : null,
          team_id: r.team_id,
          team_name: r.team_name,
        })) as Dropzone[];
        
        // Убираем дублирующиеся дропзоны по ID
        const uniqueDz = dz.filter((zone, index, self) => 
          index === self.findIndex(z => z.id === zone.id)
        );
        
        setDropzones(uniqueDz);
      })
      .catch(() => setDropzones([]));
  }, [selectedGameId]);

  // ===== Регистрация команды (SSR-safe) =====
  const [teamName, setTeamName] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [tMsg, setTMsg] = useState<string | null>(null);
  const [tErr, setTErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<"register" | "table" | "map">("table");
  const [showSummary, setShowSummary] = useState(false);
  
  // кто админ + режим разметки
  const [isAdmin, setIsAdmin] = useState(false);
  const [markMode, setMarkMode] = useState(false);
  
  // информация о команде пользователя
  const [userTeam, setUserTeam] = useState<{ id: number; name: string; players: string[] } | null>(null);

  // контейнер карты и его размеры (нужно, чтобы переводить проценты в пиксели при старых зонах)
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const [mapBoxSize, setMapBoxSize] = useState({ w: 0, h: 0 });

  const measure = () => {
    if (mapBoxRef.current) {
      const r = mapBoxRef.current.getBoundingClientRect();
      setMapBoxSize({ w: r.width, h: r.height });
    }
  };
  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    setHydrated(true);
    setAuthed(!!getToken());
  }, []);

  useEffect(() => {
    if (!getToken()) { 
      setIsAdmin(false); 
      setUserTeam(null);
      return; 
    }
    api<{ is_admin: boolean; username: string }>("/auth/account", { auth: true })
      .then((u) => {
        setIsAdmin(!!u.is_admin);
        // Получаем команду пользователя в этом лобби
        if (id) {
          api<any[]>(`/lobbies/${id}/teams`)
            .then((teams) => {
              console.log("Все команды в лобби:", teams);
              console.log("Ищем команду для пользователя:", u.username);
              
              // Ищем команду, где пользователь является игроком
              const foundTeam = teams.find(team => {
                console.log("Проверяем команду:", team.name, "игроки:", team.players);
                return team.players && team.players.includes(u.username);
              });
              
              if (foundTeam) {
                console.log("Найдена команда пользователя:", foundTeam);
                setUserTeam({ 
                  id: foundTeam.id, 
                  name: foundTeam.name, 
                  players: foundTeam.players || []
                });
              } else {
                console.log("Команда пользователя не найдена");
                setUserTeam(null);
              }
            })
            .catch((error) => {
              console.error("Ошибка при получении команд:", error);
              setUserTeam(null);
            });
        }
      })
      .catch(() => {
        setIsAdmin(false);
        setUserTeam(null);
      });
  }, [authed, id]);

  async function onRegisterTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setTErr(null);
    setTMsg(null);
    try {
      await api(`/lobbies/${id}/teams/register`, {
        auth: true,
        method: "POST",
        body: JSON.stringify({
          name: teamName,
          player1: p1,
          player2: p2,
          player3: p3,
        }),
      });
      setTMsg("Команда зарегистрирована");
      setTeamName(""); setP1(""); setP2(""); setP3("");
      api<SummaryRow[]>(`/lobbies/${id}/results/summary`).then(setSummary).catch(() => {});
    } catch (e: any) {
      setTErr(e.message || "Ошибка регистрации команды");
    } finally {
      setSubmitting(false);
    }
  }

  // ====== назначение/снятие зоны ======
  async function assign(templateId: number) {
    console.log("Попытка занять зону:", templateId);
    console.log("Команда пользователя:", userTeam);
    
    if (!userTeam) {
      alert("Вы не состоите в команде в этом лобби");
      return;
    }
    
    try {
      const requestData = { team_id: userTeam.id };
      console.log("Отправляем данные:", requestData);
      
      await api(`/games/${selectedGameId}/dropzones/assign-by-template/${templateId}`, {
        auth: true,
        method: "POST",
        body: JSON.stringify(requestData),
      });
      
      // обновим зоны
      api<any[]>(`/dropzones/for-game/${selectedGameId}`)
        .then((rows) => {
          const dz = rows.map((r) => ({
            id: r.id,
            assignment_id: r.assignment_id,
            name: r.name,
            x_percent: r.x_percent,
            y_percent: r.y_percent,
            radius: r.radius,
            capacity: r.capacity,
            current_teams: r.current_teams || 0,
            teams: r.teams || [],
            assigned_team: r.team_id
              ? { id: r.team_id, name: r.team_name || `#${r.team_id}` }
              : null,
            team_id: r.team_id,
            team_name: r.team_name,
          })) as Dropzone[];
          
          // Убираем дублирующиеся дропзоны по ID
          const uniqueDz = dz.filter((zone, index, self) => 
            index === self.findIndex(z => z.id === zone.id)
          );
          
          setDropzones(uniqueDz);
        })
        .catch(() => {});
    } catch (e) {
      alert("Не удалось занять зону: " + (e as any).message);
    }
  }

  async function unassign(assignmentId: number) {
    console.log("Попытка освободить зону:", assignmentId);
    console.log("Команда пользователя:", userTeam);
    console.log("Игра:", selectedGameId);
    
    if (!userTeam) {
      alert("Вы не состоите в команде в этом лобби");
      return;
    }
    
    try {
      console.log("Отправляем DELETE запрос на:", `/games/${selectedGameId}/dropzones/${assignmentId}/remove`);
      await api(`/games/${selectedGameId}/dropzones/${assignmentId}/remove`, {
        auth: true,
        method: "DELETE",
      });
      
      // обновим зоны
      console.log("Обновляем дропзоны после освобождения...");
      api<any[]>(`/dropzones/for-game/${selectedGameId}`)
        .then((rows) => {
          console.log("Получены обновленные дропзоны:", rows);
          const dz = rows.map((r) => ({
            id: r.id,
            assignment_id: r.assignment_id,
            name: r.name,
            x_percent: r.x_percent,
            y_percent: r.y_percent,
            radius: r.radius,
            capacity: r.capacity,
            current_teams: r.current_teams || 0,
            teams: r.teams || [],
            assigned_team: r.team_id
              ? { id: r.team_id, name: r.team_name || `#${r.team_id}` }
              : null,
            team_id: r.team_id,
            team_name: r.team_name,
          })) as Dropzone[];
          
          // Убираем дублирующиеся дропзоны по ID
          const uniqueDz = dz.filter((zone, index, self) => 
            index === self.findIndex(z => z.id === zone.id)
          );
          
          console.log("Обработанные дропзоны:", uniqueDz);
          setDropzones(uniqueDz);
        })
        .catch((error) => {
          console.error("Ошибка при обновлении дропзон:", error);
        });
    } catch (e) {
      alert("Не удалось освободить зону: " + (e as any).message);
    }
  }

  async function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!markMode || !isAdmin) return;
    if (!e.altKey) return; // добавляем зону только Alt+клик
  
    const g = games.find((x) => x.id === selectedGameId);
    if (!g?.map) return;
  
    const rect = mapBoxRef.current?.getBoundingClientRect();
    if (!rect) return;
  
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
  
    const name = prompt(`Имя зоны (${x.toFixed(1)}%, ${y.toFixed(1)}%)`);
    if (!name) return;
  
    try {
      await api(`/maps/${g.map.id}/dropzones`, {
        auth: true,
        method: "POST",
        body: JSON.stringify({
          name,
          x_percent: Math.round(x * 10) / 10,
          y_percent: Math.round(y * 10) / 10,
          radius: ZONE_DIAMETER_PX, // диаметр 170px
          capacity: 1
        }),
      });
  
      // обновляем список зон
      const rows = await api<any[]>(`/dropzones/for-game/${g.id}`);
      const dz = rows.map((r) => ({
        id: r.dropzone_id,
        assignment_id: r.assignment_id,
        name: r.name,
        x_percent: r.x_percent,
        y_percent: r.y_percent,
        radius: r.radius,
        capacity: r.capacity,
        assigned_team: r.team_id
          ? { id: r.team_id, name: r.team_name || `#${r.team_id}` }
          : null,
      })) as Dropzone[];
      setDropzones(dz);
    } catch (err: any) {
      alert("Не удалось создать зону: " + (err?.message || "unknown"));
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

      {/* Основной контент */}
      <main style={{ 
        padding: "40px 32px",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {/* Название лобби */}
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "700",
          color: "#ffffff",
          marginBottom: "40px",
          textAlign: "center"
        }}>
          {lobby ? lobby.name : "Name of lobby"}
        </h1>

        {/* Большая таблица с навигацией */}
        <div style={{
          border: "2px solid #0096c8",
          borderRadius: "12px",
          background: "rgba(0, 150, 200, 0.05)",
          padding: "0",
          marginBottom: "40px"
        }}>
          {/* Навигация сверху таблицы */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid rgba(0, 150, 200, 0.3)"
          }}>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
              <button
                onClick={() => setActiveTab("register")}
                style={{
                  background: activeTab === "register" ? "rgba(0, 150, 200, 0.1)" : "none",
                  border: "none",
                  color: activeTab === "register" ? "#0096c8" : "#ffffff",
                  fontSize: "18px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: "8px 16px",
                  borderRadius: "8px"
                }}
              >
                {userTeam ? "Ваша команда" : "Зарегистрировать команду"}
              </button>
              <button
                onClick={() => setActiveTab("table")}
                style={{
                  background: activeTab === "table" ? "rgba(0, 150, 200, 0.1)" : "none",
                  border: "none",
                  color: activeTab === "table" ? "#0096c8" : "#ffffff",
                  fontSize: "18px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: "8px 16px",
                  borderRadius: "8px"
                }}
              >
                Таблица
              </button>
              {!showSummary && (
                <button
                  onClick={() => setActiveTab("map")}
                  style={{
                    background: activeTab === "map" ? "rgba(0, 150, 200, 0.1)" : "none",
                    border: "none",
                    color: activeTab === "map" ? "#0096c8" : "#ffffff",
                    fontSize: "18px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    padding: "8px 16px",
                    borderRadius: "8px"
                  }}
                >
                  Дроп на карте
                </button>
              )}
              {activeTab === "map" && isAdmin && (
                <button
                  onClick={() => setMarkMode((v) => !v)}
                  style={{
                    marginLeft: 12,
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: markMode ? "#00d1ff" : "#ffffff",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                  title="Alt+клик по карте — добавление зоны (диаметр 170px)"
                >
                  {markMode ? "Разметка: ВКЛ" : "Разметка"}
                </button>
              )}
            </div>

            {/* Код лобби справа */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "#b0bec5", fontSize: "14px" }}>Код лобби:</span>
              <code style={{ 
                color: "#ffffff", 
                fontSize: "16px", 
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.1)",
                padding: "4px 8px",
                borderRadius: "4px"
              }}>
                {lobby?.code || "ABC123XV"}
              </code>
              <button 
                onClick={copyCode}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>

          {/* Контент таблицы */}
          <div style={{ padding: "32px" }}>
            {activeTab === "table" && (
              <div style={{ display: "flex", gap: "40px" }}>
                {/* Левая панель - игры и итог */}
                <div style={{ width: "300px", flexShrink: 0 }}>
                  {/* Кнопки игр */}
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {games.map((g) => (
                        <button
                          key={`game-${g.id}`}
                          onClick={() => {
                            setSelectedGameId(g.id);
                            setShowSummary(false);
                            setActiveTab("table");
                          }}
                          style={{
                            padding: "12px 16px",
                            background: selectedGameId === g.id 
                              ? "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)"
                              : "rgba(255, 255, 255, 0.1)",
                            border: selectedGameId === g.id ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "8px",
                            color: "#ffffff",
                            fontSize: "16px",
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s ease"
                          }}
                        >
                          Игра {g.number} {g.map ? `• ${g.map.name}` : ""}
                        </button>
                      ))}
                      
                      {/* Кнопка Итог */}
                      <button
                        onClick={() => {
                          setShowSummary(true);
                          setSelectedGameId(null);
                          setActiveTab("table");
                        }}
                        style={{
                          padding: "12px 16px",
                          background: showSummary 
                            ? "linear-gradient(135deg, #dc3545 0%, #c82333 100%)"
                            : "rgba(220, 53, 69, 0.2)",
                          border: showSummary ? "none" : "1px solid rgba(220, 53, 69, 0.5)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "16px",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s ease"
                        }}
                      >
                        Итог
                      </button>
                    </div>
                  </div>
                </div>

                {/* Правая панель - таблица результатов */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    background: "rgba(0, 26, 35, 0.3)",
                    borderRadius: "8px",
                    overflow: "hidden"
                  }}>
                    {showSummary ? (
                      <>
                        {/* Заголовок итоговой таблицы */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "50px 1fr 80px 80px 80px",
                          gap: "16px",
                          padding: "16px 24px",
                          background: "rgba(220, 53, 69, 0.2)",
                          borderBottom: "1px solid rgba(220, 53, 69, 0.3)"
                        }}>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}></div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Name of team</div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Место</div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Убийства</div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Очки</div>
                        </div>

                        {/* Строки итоговой таблицы */}
                        {summary.length > 0 ? summary
                          .sort((a, b) => b.points_total - a.points_total)
                          .map((r, idx) => (
                          <div
                            key={`sum-${r.team_id}-${idx}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "50px 1fr 80px 80px 80px",
                              gap: "16px",
                              padding: "16px 24px",
                              borderBottom: idx < summary.length - 1 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                              transition: "background 0.2s ease"
                            }}
                          >
                            <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: 600 }}>
                              {idx + 1}.
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "16px" }}>
                              {r.team_name}
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "16px" }}>
                              -
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "16px" }}>
                              {r.kills_total}
                            </div>
                            <div style={{ color: "#dc3545", fontSize: "16px", fontWeight: 600 }}>
                              {r.points_total}
                            </div>
                          </div>
                        )) : (
                          <div style={{ 
                            padding: "40px 24px", 
                            textAlign: "center", 
                            color: "#78909c" 
                          }}>
                            Пока нет итоговых результатов
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Заголовок таблицы игры */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "50px 1fr 80px 80px 80px",
                          gap: "16px",
                          padding: "16px 24px",
                          background: "rgba(0, 150, 200, 0.2)",
                          borderBottom: "1px solid rgba(0, 150, 200, 0.3)"
                        }}>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}></div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Name of team</div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Место</div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Убийства</div>
                          <div style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 600 }}>Очки</div>
                        </div>

                        {/* Строки таблицы игры */}
                        {gameResults.length > 0 ? gameResults
                          .sort((a, b) => (a.place || 999) - (b.place || 999))
                          .map((r, idx) => (
                          <div
                            key={`gr-${r.id ?? `${r.team_id}-${r.place}-${idx}`}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "50px 1fr 80px 80px 80px",
                              gap: "16px",
                              padding: "16px 24px",
                              borderBottom: idx < gameResults.length - 1 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                              transition: "background 0.2s ease"
                            }}
                          >
                            <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: 600 }}>
                              {idx + 1}.
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "16px" }}>
                              {r.team_name ?? `#${r.team_id}`}
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "16px" }}>
                              {r.place ?? "-"}
                            </div>
                            <div style={{ color: "#ffffff", fontSize: "16px" }}>
                              {r.kills ?? 0}
                            </div>
                            <div style={{ color: "#0096c8", fontSize: "16px", fontWeight: 600 }}>
                              {r.points ?? 0}
                            </div>
                          </div>
                        )) : (
                          <div style={{ 
                            padding: "40px 24px", 
                            textAlign: "center", 
                            color: "#78909c" 
                          }}>
                            {selectedGameId ? "Пока нет результатов выбранной игры" : "Выберите игру для просмотра результатов"}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "register" && (
              <div style={{ maxWidth: "500px", margin: "0 auto" }}>
                {!hydrated ? null : !authed ? (
                  <>
                    <h3 style={{ color: "#ffffff", marginBottom: "24px", textAlign: "center" }}>
                      Регистрация команды
                    </h3>
                    <p style={{ color: "#b0bec5", textAlign: "center" }}>
                      Чтобы зарегистрировать команду, <Link to="/login" style={{ color: "#0096c8" }}>войдите</Link>.
                    </p>
                  </>
                ) : userTeam ? (
                  <>
                    <h3 style={{ color: "#ffffff", marginBottom: "24px", textAlign: "center" }}>
                      Ваша команда
                    </h3>
                    <div style={{
                      background: "linear-gradient(135deg, rgba(0, 150, 200, 0.1) 0%, rgba(0, 123, 167, 0.05) 100%)",
                      border: "2px solid #0096c8",
                      borderRadius: "16px",
                      padding: "32px",
                      boxShadow: "0 8px 25px rgba(0, 150, 200, 0.2)"
                    }}>
                      <div style={{ textAlign: "center", marginBottom: "24px" }}>
                        <div style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                          fontSize: "24px",
                          fontWeight: "700",
                          color: "#ffffff",
                          boxShadow: "0 4px 15px rgba(0, 150, 200, 0.3)"
                        }}>
                          {userTeam.name.charAt(0).toUpperCase()}
                        </div>
                        <h4 style={{ 
                          color: "#ffffff", 
                          fontSize: "24px", 
                          fontWeight: "700",
                          margin: "0 0 8px 0"
                        }}>
                          {userTeam.name}
                        </h4>
                        <p style={{ 
                          color: "#b0bec5", 
                          fontSize: "14px",
                          margin: 0
                        }}>
                          ID команды: {userTeam.id}
                        </p>
                      </div>
                      
                      <div style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                        padding: "20px",
                        marginBottom: "20px"
                      }}>
                        <h5 style={{ 
                          color: "#0096c8", 
                          fontSize: "16px", 
                          fontWeight: "600",
                          margin: "0 0 12px 0"
                        }}>
                          Статус команды
                        </h5>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <div style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#4caf50"
                          }}></div>
                          <span style={{ color: "#ffffff", fontSize: "14px" }}>
                            Зарегистрирована и готова к игре
                          </span>
                        </div>
                      </div>

                      <div style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                        padding: "20px"
                      }}>
                        <h5 style={{ 
                          color: "#0096c8", 
                          fontSize: "16px", 
                          fontWeight: "600",
                          margin: "0 0 12px 0"
                        }}>
                          Участники команды
                        </h5>
                        <div style={{ 
                          color: "#b0bec5", 
                          fontSize: "14px",
                          lineHeight: "1.6"
                        }}>
                          {userTeam.players.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {userTeam.players.map((player, index) => (
                                <div key={index} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "8px 12px",
                                  background: "rgba(255, 255, 255, 0.05)",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}>
                                  <div style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    color: "#ffffff"
                                  }}>
                                    {player.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ color: "#ffffff", fontWeight: "500" }}>
                                    {player}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ 
                              color: "#78909c", 
                              fontStyle: "italic",
                              textAlign: "center",
                              padding: "20px"
                            }}>
                              Участники не найдены
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ color: "#ffffff", marginBottom: "24px", textAlign: "center" }}>
                      Регистрация команды
                    </h3>
                    <p style={{ 
                      color: "#b0bec5", 
                      textAlign: "center", 
                      marginBottom: "24px",
                      fontSize: "16px",
                      lineHeight: "1.5"
                    }}>
                      Укажите никнеймы всех участников точно. Капитан отвечает за правильность данных.
                    </p>
                    <form onSubmit={onRegisterTeam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <input 
                        placeholder="Название команды" 
                        value={teamName} 
                        onChange={(e) => setTeamName(e.target.value)} 
                        required 
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "16px"
                        }}
                      />
                      <input 
                        placeholder="Логин игрока 1" 
                        value={p1} 
                        onChange={(e) => setP1(e.target.value)} 
                        required 
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "16px"
                        }}
                      />
                      <input 
                        placeholder="Логин игрока 2" 
                        value={p2} 
                        onChange={(e) => setP2(e.target.value)} 
                        required 
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "16px"
                        }}
                      />
                      <input 
                        placeholder="Логин игрока 3" 
                        value={p3} 
                        onChange={(e) => setP3(e.target.value)} 
                        required 
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          fontSize: "16px"
                        }}
                      />
                      <button 
                        type="submit" 
                        disabled={submitting}
                        style={{
                          padding: "12px 24px",
                          background: submitting 
                            ? "rgba(0, 150, 200, 0.5)" 
                            : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "16px",
                          fontWeight: 600,
                          cursor: submitting ? "not-allowed" : "pointer",
                          marginTop: "8px"
                        }}
                      >
                        {submitting ? "Отправка…" : "Зарегистрировать"}
                      </button>
                      {tMsg && <div style={{ color: "#4caf50", textAlign: "center" }}>{tMsg}</div>}
                      {tErr && <div style={{ color: "#ff6b6b", textAlign: "center" }}>{tErr}</div>}
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === "map" && (
              <div>
                {/* Информация о команде пользователя */}
                {userTeam && (() => {
                  const hasMyTeamInAnyZone = dropzones.some(dz => 
                    dz.teams && dz.teams.find(t => t.team_id === userTeam.id)
                  );
                  const myZone = dropzones.find(dz => 
                    dz.teams && dz.teams.find(t => t.team_id === userTeam.id)
                  );
                  
                  return (
                    <div style={{
                      background: hasMyTeamInAnyZone 
                        ? "rgba(76, 175, 80, 0.1)" 
                        : "rgba(0, 150, 200, 0.1)",
                      border: hasMyTeamInAnyZone 
                        ? "1px solid rgba(76, 175, 80, 0.3)" 
                        : "1px solid rgba(0, 150, 200, 0.3)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      textAlign: "center"
                    }}>
                      <span style={{ 
                        color: hasMyTeamInAnyZone ? "#4caf50" : "#0096c8", 
                        fontWeight: 600 
                      }}>
                        Ваша команда: {userTeam.name} (ID: {userTeam.id})
                      </span>
                      <span style={{ color: "#b0bec5", marginLeft: "8px" }}>
                        {hasMyTeamInAnyZone 
                          ? `(Занята дропзона: ${myZone?.name || "Неизвестная"})`
                          : "(Вы можете занимать свободные дропзоны)"
                        }
                      </span>
                    </div>
                  );
                })()}
                
                {!userTeam && authed && (
                  <div style={{
                    background: "rgba(255, 152, 0, 0.1)",
                    border: "1px solid rgba(255, 152, 0, 0.3)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    textAlign: "center"
                  }}>
                    <span style={{ color: "#ff9800", fontWeight: 600 }}>
                      Вы не состоите в команде в этом лобби
                    </span>
                    <span style={{ color: "#b0bec5", marginLeft: "8px" }}>
                      (Зарегистрируйте команду, чтобы занимать дропзоны)
                    </span>
                  </div>
                )}
                
                {/* Информация о правилах дропзон */}
                {userTeam && (
                  <div style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    textAlign: "center"
                  }}>
                    <span style={{ 
                      color: "#b0bec5", 
                      fontSize: "14px",
                      fontWeight: "500"
                    }}>
                      💡 Одна команда может занять только одну дропзону в игре
                    </span>
                  </div>
                )}

                {/* Легенда цветов дропзон */}
                <div style={{
                  display: "flex",
                  gap: "20px",
                  justifyContent: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "2px solid rgba(255, 255, 255, 0.4)",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
                    }}></div>
                    <span style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 500 }}>Свободная зона</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "rgba(244, 67, 54, 0.7)",
                      border: "2px solid #f44336",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
                    }}></div>
                    <span style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 500 }}>Полностью занята</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "rgba(255, 193, 7, 0.7)",
                      border: "2px solid #ffc107",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
                    }}></div>
                    <span style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 500 }}>Частично занята</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "rgba(76, 175, 80, 0.7)",
                      border: "2px solid #4caf50",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
                    }}></div>
                    <span style={{ color: "#b0bec5", fontSize: "14px", fontWeight: 500 }}>Ваша зона</span>
                  </div>
                </div>
                
          {(() => {
            const g = games.find((x) => x.id === selectedGameId);
                  if (!g) return <p style={{ color: "#78909c", textAlign: "center" }}>Игра не выбрана.</p>;

            const hasImage = !!(g.map && g.map.image_url);

            return (
              <div
                ref={mapBoxRef}
                onClick={handleMapClick}
                style={{
                  position: "relative",
                        maxWidth: "100%",
                        border: "2px solid #0096c8",
                        borderRadius: 12,
                        overflow: "hidden"
                }}
              >
                {hasImage ? (
                  <img
                    src={g!.map!.image_url}
                    alt={g!.map!.name}
                    onLoad={measure}
                          style={{ display: "block", width: "100%", height: "auto" }}
                  />
                ) : (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                            background: "linear-gradient(135deg, #0b2a36, #0e3846)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                              left: 24,
                              top: 16,
                        color: "white",
                        opacity: 0.8,
                        fontWeight: 600,
                              fontSize: "18px"
                      }}
                    >
                      {g.map?.name ?? "Карта не указана"}
                    </div>
                  </div>
                )}

                      {/* Дропзоны */}
                {dropzones.map((z, idx) => {
                  const raw = z.radius ?? ZONE_DIAMETER_PX;
                  const diameterPx =
                    raw > 20
                      ? raw
                      : Math.max(Math.round((raw / 100) * (mapBoxSize.w || 0)), 4);
                  const key = `dz-${z.id}-${z.x_percent}-${z.y_percent}-${idx}`;
                  
                  // проверяем, есть ли наша команда в этом дропзоне
                  const myTeamInZone = userTeam && z.teams.find(t => t.team_id === userTeam.id);
                  const isMyTeam = !!myTeamInZone;
                  
                  // находим assignment_id для нашей команды
                  const myTeamAssignmentId = myTeamInZone?.assignment_id;
                  
                  // проверяем, заняла ли наша команда какую-либо дропзону в этой игре
                  const hasMyTeamInAnyZone = userTeam && dropzones.some(dz => 
                    dz.teams && dz.teams.find(t => t.team_id === userTeam.id)
                  );
                  
                  // можем занять, если есть место, наша команда еще не там И не заняла другую дропзону
                  const canAssign = userTeam && !isMyTeam && z.current_teams < z.capacity && !hasMyTeamInAnyZone;
                  const canUnassign = userTeam && isMyTeam;

                  return (
                    <div
                      key={key}
                      title={`${z.name}${z.teams.length > 0 ? " • " + z.teams.map(t => t.team_name).join(", ") : ""}`}
                      style={{
                        position: "absolute",
                        left: `${z.x_percent}%`,
                        top: `${z.y_percent}%`,
                        transform: "translate(-50%, -50%)",
                        width: `${diameterPx}px`,
                        height: `${diameterPx}px`,
                        borderRadius: "50%",
                        background: isMyTeam 
                          ? "rgba(76, 175, 80, 0.7)" 
                          : z.current_teams >= z.capacity 
                            ? "rgba(244, 67, 54, 0.7)" 
                            : z.teams.length > 0 
                              ? "rgba(255, 193, 7, 0.7)" 
                              : "rgba(255, 255, 255, 0.15)",
                        border: `2px solid ${isMyTeam ? "#4caf50" : z.current_teams >= z.capacity ? "#f44336" : z.teams.length > 0 ? "#ffc107" : "rgba(255, 255, 255, 0.4)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#ffffff",
                        textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        cursor: "pointer"
                      }}
                    >
                      <div>
                        <div>{z.name}</div>
                        {z.teams.length > 0 && (
                          <div style={{ 
                            fontSize: 11, 
                            marginTop: 3, 
                            opacity: 0.95,
                            fontWeight: 600,
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
                          }}>
                            {z.teams.map(t => t.team_name).join(", ")}
                          </div>
                        )}
                        {z.current_teams > 0 && (
                          <div style={{ 
                            fontSize: 10, 
                            marginTop: 2, 
                            opacity: 0.8,
                            fontWeight: 500,
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
                          }}>
                            {z.current_teams}/{z.capacity}
                          </div>
                        )}

                        {/* Кнопки действий для команд */}
                        {userTeam && (
                        <div style={{ marginTop: 4 }}>
                            {canAssign && z.id && (
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  assign(z.id!);
                                }}
                                style={{
                                  fontSize: 11,
                                  padding: "3px 8px",
                                  background: "rgba(0, 150, 200, 0.9)",
                                  border: "1px solid rgba(255, 255, 255, 0.3)",
                                  borderRadius: 6,
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
                                }}
                            >
                              Занять
                            </button>
                            )}
                            {canUnassign && myTeamAssignmentId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unassign(myTeamAssignmentId);
                                }}
                                style={{
                                  fontSize: 11,
                                  padding: "3px 8px",
                                  background: "rgba(244, 67, 54, 0.9)",
                                  border: "1px solid rgba(255, 255, 255, 0.3)",
                                  borderRadius: 6,
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
                                }}
                              >
                                Освободить
                              </button>
                            )}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}

                {!dropzones.length && (
                        <div
                    style={{
                      position: "absolute",
                      inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0, 0, 0, 0.5)",
                            color: "#ffffff",
                            fontSize: "18px"
                          }}
                        >
                          Зоны не добавлены для этой карты
                        </div>
                )}
              </div>
            );
          })()}
              </div>
            )}
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
