// app/routes/lobby.$id.tsx
import { useParams, Link } from "react-router";
import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import "../app.css";

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

type Dropzone = {
  id?: number;
  assignment_id?: number;
  name: string;
  x_percent: number;
  y_percent: number;
  radius: number;
  capacity: number;
  assigned_team?: { id: number; name: string } | null;
  team_id?: number | null; // если придёт старым форматом
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
  
  useEffect(() => {
    setHydrated(true);
    setAuthed(!!getToken());
  }, []);

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
  async function assign(assignmentId: number) {
    try {
      const me = await api<{ id: number; username: string }>(`/auth/account`, { auth: true });
      // в бэке разрешение проверяется, здесь просто отправляем team_id своей команды,
      // но чтобы знать id команды — обычно берут из профиля; упростим: спросим пользователя.
      const teamIdStr = prompt("ID вашей команды (в этом лобби)");
      if (!teamIdStr) return;
      const team_id = Number(teamIdStr);
      await api(`/games/${selectedGameId}/dropzones/${assignmentId}/assign`, {
        auth: true,
        method: "POST",
        body: JSON.stringify({ team_id }),
      });
      // обновим зоны
      api<any[]>(`/dropzones/for-game/${selectedGameId}`)
        .then((rows) => {
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
        })
        .catch(() => {});
    } catch (e) {
      alert("Не удалось занять зону: " + (e as any).message);
    }
  }

  async function unassign(assignmentId: number) {
    try {
      await api(`/games/${selectedGameId}/dropzones/${assignmentId}/remove`, {
        auth: true,
        method: "DELETE",
      });
      api<any[]>(`/dropzones/for-game/${selectedGameId}`)
        .then((rows) => {
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
        })
        .catch(() => {});
    } catch (e) {
      alert("Не удалось снять зону: " + (e as any).message);
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
                  background: "none",
                  border: "none",
                  color: activeTab === "register" ? "#0096c8" : "#ffffff",
                  fontSize: "18px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "color 0.2s ease"
                }}
              >
                Зарегистрировать команду
              </button>
              <button
                onClick={() => setActiveTab("table")}
                style={{
                  background: "none",
                  border: "none",
                  color: activeTab === "table" ? "#0096c8" : "#ffffff",
                  fontSize: "18px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "color 0.2s ease"
                }}
              >
                Таблица
              </button>
              <button
                onClick={() => setActiveTab("map")}
                style={{
                  background: "none",
                  border: "none",
                  color: activeTab === "map" ? "#0096c8" : "#ffffff",
                  fontSize: "18px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "color 0.2s ease"
                }}
              >
                Дроп на карте
              </button>
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
                <h3 style={{ color: "#ffffff", marginBottom: "24px", textAlign: "center" }}>
                  Регистрация команды
                </h3>
                {!hydrated ? null : !authed ? (
                  <p style={{ color: "#b0bec5", textAlign: "center" }}>
                    Чтобы зарегистрировать команду, <Link to="/login" style={{ color: "#0096c8" }}>войдите</Link>.
                  </p>
                ) : (
                  <>
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
          {(() => {
            const g = games.find((x) => x.id === selectedGameId);
                  if (!g) return <p style={{ color: "#78909c", textAlign: "center" }}>Игра не выбрана.</p>;

            const hasImage = !!(g.map && g.map.image_url);

            return (
              <div
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
                  const size = Math.max(z.radius, 4);
                  const key = z.assignment_id ?? z.id ?? `dz-${z.name}-${z.x_percent}-${z.y_percent}-${idx}`;

                  return (
                    <div
                      key={key}
                      title={`${z.name}${z.assigned_team ? " • " + z.assigned_team.name : ""}`}
                      style={{
                        position: "absolute",
                        left: `${z.x_percent}%`,
                        top: `${z.y_percent}%`,
                        transform: "translate(-50%, -50%)",
                        width: `${size}%`,
                        height: `${size}%`,
                              borderRadius: "50%",
                              background: "rgba(0, 150, 200, 0.8)",
                              border: "2px solid #ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                              padding: 4,
                        fontSize: 12,
                        fontWeight: 600,
                              color: "#ffffff",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                              cursor: "pointer"
                      }}
                    >
                      <div>
                        <div>{z.name}</div>
                              {z.assigned_team && (
                                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.9 }}>
                                {z.assigned_team.name}
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
