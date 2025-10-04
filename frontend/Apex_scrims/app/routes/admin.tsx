// app/routes/admin.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, getToken } from "../lib/api";
import "../app.css";

type User = {
  id: number;
  username: string;
  is_admin: boolean;
  email: string;
  discord?: string;
};

type Team = {
  id: number;
  name: string;
  players: string[];
};

type Game = {
  id: number;
  number: number;
  map_name: string;
};

type Lobby = {
  id: number;
  name: string;
  code: string;
  teams_count: number;
  games_count: number;
  teams: Team[];
  games: Game[];
};

type Map = {
  id: number;
  name: string;
  image_filename: string;
  dropzones_count: number;
};

export default function AdminPage() {
  const [hydrated, setHydrated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "lobbies" | "maps">("users");
  
  // Состояния для создания лобби
  const [showCreateLobby, setShowCreateLobby] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState("");
  const [creatingLobby, setCreatingLobby] = useState(false);
  
  // Состояния для создания игр
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [selectedLobbyForGame, setSelectedLobbyForGame] = useState<number | null>(null);
  const [newGameNumber, setNewGameNumber] = useState(1);
  const [selectedMapForGame, setSelectedMapForGame] = useState<number | null>(null);
  const [creatingGame, setCreatingGame] = useState(false);
  
  // Состояния для добавления результатов
  const [showAddResults, setShowAddResults] = useState(false);
  const [selectedGameForResults, setSelectedGameForResults] = useState<number | null>(null);
  const [gameResults, setGameResults] = useState<{[teamId: number]: {place: number, kills: number, points: number}}>({});
  const [addingResults, setAddingResults] = useState(false);
  const [existingResults, setExistingResults] = useState<{[teamId: number]: {place: number, kills: number, points: number}}>({});
  
  // Данные
  const [users, setUsers] = useState<User[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  
  // Состояния загрузки
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (!getToken()) {
      setError("Необходима авторизация");
      return;
    }
    
    // Проверяем, является ли пользователь админом
    api<{ is_admin: boolean; username: string }>("/auth/account", { auth: true })
      .then((user) => {
        if (!user.is_admin) {
          setError("Доступ запрещен. Требуются права администратора.");
          return;
        }
        setIsAdmin(true);
        loadData();
      })
      .catch(() => {
        setError("Ошибка при проверке прав доступа");
      });
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === "users") {
        const usersData = await api<User[]>("/admin/users", { auth: true });
        setUsers(usersData);
      } else if (activeTab === "lobbies") {
        const lobbiesData = await api<Lobby[]>("/admin/lobbies", { auth: true });
        setLobbies(lobbiesData);
      } else if (activeTab === "maps") {
        const mapsData = await api<Map[]>("/admin/maps", { auth: true });
        setMaps(mapsData);
      }
    } catch (e: any) {
      setError(e.message || "Ошибка при загрузке данных");
    } finally {
      setLoading(false);
    }
  };

  const loadMaps = async () => {
    try {
      const mapsData = await api<Map[]>("/admin/maps", { auth: true });
      setMaps(mapsData);
    } catch (e: any) {
      console.error("Ошибка при загрузке карт:", e);
    }
  };

  const loadExistingResults = async (gameId: number) => {
    try {
      const results = await api<any[]>(`/games/${gameId}/results`);
      const existing: {[teamId: number]: {place: number, kills: number, points: number}} = {};
      results.forEach(result => {
        existing[result.team_id] = {
          place: result.place || 0,
          kills: result.kills || 0,
          points: result.points || 0
        };
      });
      setExistingResults(existing);
      setGameResults(existing); // Заполняем форму существующими данными
    } catch (e: any) {
      console.error("Ошибка при загрузке результатов:", e);
      setExistingResults({});
      setGameResults({});
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
      // Всегда загружаем карты, так как они нужны для создания игр
      loadMaps();
    }
  }, [activeTab, isAdmin]);

  const createLobby = async () => {
    if (!newLobbyName.trim()) return;
    
    setCreatingLobby(true);
    try {
      await api("/admin/lobbies", {
        auth: true,
        method: "POST",
        body: JSON.stringify({ name: newLobbyName.trim() }),
      });
      
      setNewLobbyName("");
      setShowCreateLobby(false);
      loadData(); // Обновляем данные
    } catch (e: any) {
      setError(e.message || "Ошибка при создании лобби");
    } finally {
      setCreatingLobby(false);
    }
  };

  const createGame = async () => {
    if (!selectedLobbyForGame || !selectedMapForGame) return;
    
    setCreatingGame(true);
    try {
      await api(`/admin/lobbies/${selectedLobbyForGame}/games`, {
        auth: true,
        method: "POST",
        body: JSON.stringify({ 
          number: newGameNumber,
          map_id: selectedMapForGame 
        }),
      });
      
      setNewGameNumber(1);
      setSelectedLobbyForGame(null);
      setSelectedMapForGame(null);
      setShowCreateGame(false);
      loadData(); // Обновляем данные
    } catch (e: any) {
      setError(e.message || "Ошибка при создании игры");
    } finally {
      setCreatingGame(false);
    }
  };

  const addResults = async () => {
    if (!selectedGameForResults) return;
    
    setAddingResults(true);
    try {
      // Отправляем результаты для каждой команды
      for (const [teamId, result] of Object.entries(gameResults)) {
        if (result.place && result.kills !== undefined && result.points !== undefined) {
          const teamIdNum = parseInt(teamId);
          const hasExisting = existingResults[teamIdNum];
          
          if (hasExisting) {
            // Обновляем существующий результат
            await api(`/admin/games/${selectedGameForResults}/results/${teamIdNum}`, {
              auth: true,
              method: "PATCH",
              body: JSON.stringify({
                place: result.place,
                kills: result.kills,
                points: result.points
              }),
            });
          } else {
            // Создаем новый результат
            await api(`/admin/games/${selectedGameForResults}/results`, {
              auth: true,
              method: "POST",
              body: JSON.stringify({
                team_id: teamIdNum,
                place: result.place,
                kills: result.kills,
                points: result.points
              }),
            });
          }
        }
      }
      
      setGameResults({});
      setExistingResults({});
      setSelectedGameForResults(null);
      setShowAddResults(false);
      loadData(); // Обновляем данные
    } catch (e: any) {
      setError(e.message || "Ошибка при сохранении результатов");
    } finally {
      setAddingResults(false);
    }
  };

  const updateResult = (teamId: number, field: 'place' | 'kills' | 'points', value: number) => {
    setGameResults(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value
      }
    }));
  };

  const deleteLobby = async (lobbyId: number) => {
    try {
      await api(`/admin/lobbies/${lobbyId}/delete`, {
        auth: true,
        method: "DELETE",
      });
      loadData(); // Обновляем данные
    } catch (e: any) {
      setError(e.message || "Ошибка при удалении лобби");
    }
  };

  const deleteGame = async (gameId: number) => {
    try {
      await api(`/admin/games/${gameId}`, {
        auth: true,
        method: "DELETE",
      });
      loadData(); // Обновляем данные
    } catch (e: any) {
      setError(e.message || "Ошибка при удалении игры");
    }
  };

  if (!hydrated) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e1a" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh",
          color: "#ff6b6b",
          fontSize: "18px"
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a" }}>
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
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "700",
          color: "#ffffff",
          marginBottom: "40px",
          textAlign: "center"
        }}>
          Панель администратора
        </h1>

        {/* Навигация по разделам */}
        <div style={{
          display: "flex",
          gap: "20px",
          marginBottom: "32px",
          justifyContent: "center"
        }}>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "12px 24px",
              background: activeTab === "users" 
                ? "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)"
                : "rgba(255, 255, 255, 0.1)",
              border: activeTab === "users" ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab("lobbies")}
            style={{
              padding: "12px 24px",
              background: activeTab === "lobbies" 
                ? "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)"
                : "rgba(255, 255, 255, 0.1)",
              border: activeTab === "lobbies" ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Лобби
          </button>
          <button
            onClick={() => setActiveTab("maps")}
            style={{
              padding: "12px 24px",
              background: activeTab === "maps" 
                ? "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)"
                : "rgba(255, 255, 255, 0.1)",
              border: activeTab === "maps" ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Карты
          </button>
        </div>

        {/* Контент разделов */}
        <div style={{
          background: "rgba(0, 26, 35, 0.3)",
          borderRadius: "12px",
          padding: "32px",
          border: "1px solid rgba(0, 150, 200, 0.2)"
        }}>
          {loading && (
            <div style={{ 
              textAlign: "center", 
              color: "#0096c8", 
              fontSize: "18px",
              marginBottom: "20px"
            }}>
              Загрузка...
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <h2 style={{ color: "#ffffff", marginBottom: "24px" }}>Пользователи</h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "16px"
              }}>
                {users.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      padding: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{ color: "#ffffff", fontWeight: 600, marginBottom: "8px" }}>
                      {user.username}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                      ID: {user.id}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                      Email: {user.email}
                    </div>
                    {user.discord && (
                      <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                        Discord: {user.discord}
                      </div>
                    )}
                    <div style={{ color: "#b0bec5", fontSize: "14px" }}>
                      Админ: {user.is_admin ? "Да" : "Нет"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "lobbies" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ color: "#ffffff", margin: 0 }}>Лобби</h2>
                <button
                  onClick={() => setShowCreateLobby(true)}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  Создать лобби
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "16px"
              }}>
                {lobbies.map((lobby) => (
                  <div
                    key={lobby.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      padding: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{ color: "#ffffff", fontWeight: 600, marginBottom: "8px" }}>
                      {lobby.name}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                      Код: {lobby.code}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                      Команд: {lobby.teams_count}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "8px" }}>
                      Игр: {lobby.games_count}
                    </div>
                    
                    {/* Отображение команд */}
                    {lobby.teams.length > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ color: "#0096c8", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                          Команды:
                        </div>
                        {lobby.teams.map((team) => (
                          <div key={team.id} style={{ 
                            marginBottom: "8px", 
                            padding: "6px 8px", 
                            background: "rgba(0, 150, 200, 0.1)",
                            borderRadius: "4px",
                            border: "1px solid rgba(0, 150, 200, 0.2)"
                          }}>
                            <div style={{ color: "#ffffff", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                              {team.name}
                            </div>
                            <div style={{ color: "#b0bec5", fontSize: "11px" }}>
                              {team.players.join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Отображение игр */}
                    {lobby.games.length > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ color: "#0096c8", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                          Игры:
                        </div>
                        {lobby.games.map((game) => (
                          <div key={game.id} style={{ 
                            marginBottom: "6px", 
                            padding: "6px 8px", 
                            background: "rgba(255, 193, 7, 0.1)",
                            borderRadius: "4px",
                            border: "1px solid rgba(255, 193, 7, 0.2)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>
                            <div>
                              <div style={{ color: "#ffffff", fontSize: "12px", fontWeight: 600 }}>
                                Игра {game.number} • {game.map_name}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={async () => {
                                  setSelectedGameForResults(game.id);
                                  await loadExistingResults(game.id);
                                  setShowAddResults(true);
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "rgba(255, 193, 7, 0.2)",
                                  border: "1px solid rgba(255, 193, 7, 0.5)",
                                  borderRadius: "3px",
                                  color: "#ffc107",
                                  fontSize: "10px",
                                  fontWeight: 500,
                                  cursor: "pointer"
                                }}
                              >
                                Результаты
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Удалить игру ${game.number}?`)) {
                                    deleteGame(game.id);
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "rgba(244, 67, 54, 0.2)",
                                  border: "1px solid rgba(244, 67, 54, 0.5)",
                                  borderRadius: "3px",
                                  color: "#f44336",
                                  fontSize: "10px",
                                  fontWeight: 500,
                                  cursor: "pointer"
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={async () => {
                          setSelectedLobbyForGame(lobby.id);
                          await loadMaps(); // Загружаем карты перед открытием модального окна
                          setShowCreateGame(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(0, 150, 200, 0.2)",
                          border: "1px solid rgba(0, 150, 200, 0.5)",
                          borderRadius: "4px",
                          color: "#0096c8",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        Добавить игру
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить лобби "${lobby.name}"? Это действие нельзя отменить.`)) {
                            deleteLobby(lobby.id);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(244, 67, 54, 0.2)",
                          border: "1px solid rgba(244, 67, 54, 0.5)",
                          borderRadius: "4px",
                          color: "#f44336",
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        Удалить лобби
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "maps" && (
            <div>
              <h2 style={{ color: "#ffffff", marginBottom: "24px" }}>Карты</h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "16px"
              }}>
                {maps.map((map) => (
                  <div
                    key={map.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      padding: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{ color: "#ffffff", fontWeight: 600, marginBottom: "8px" }}>
                      {map.name}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                      ID: {map.id}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "4px" }}>
                      Файл: {map.image_filename}
                    </div>
                    <div style={{ color: "#b0bec5", fontSize: "14px" }}>
                      Дропзон: {map.dropzones_count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Модальное окно создания лобби */}
      {showCreateLobby && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "rgba(0, 26, 35, 0.95)",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid rgba(0, 150, 200, 0.3)",
            minWidth: "400px"
          }}>
            <h3 style={{ color: "#ffffff", marginBottom: "20px" }}>Создать лобби</h3>
            <input
              type="text"
              placeholder="Название лобби"
              value={newLobbyName}
              onChange={(e) => setNewLobbyName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "16px",
                marginBottom: "20px"
              }}
            />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowCreateLobby(false);
                  setNewLobbyName("");
                }}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6px",
                  color: "#ffffff",
                  cursor: "pointer"
                }}
              >
                Отмена
              </button>
              <button
                onClick={createLobby}
                disabled={creatingLobby || !newLobbyName.trim()}
                style={{
                  padding: "10px 20px",
                  background: creatingLobby 
                    ? "rgba(0, 150, 200, 0.5)" 
                    : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#ffffff",
                  cursor: creatingLobby ? "not-allowed" : "pointer"
                }}
              >
                {creatingLobby ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания игры */}
      {showCreateGame && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "rgba(0, 26, 35, 0.95)",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid rgba(0, 150, 200, 0.3)",
            minWidth: "400px"
          }}>
            <h3 style={{ color: "#ffffff", marginBottom: "20px" }}>Создать игру</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                Номер игры
              </label>
              <input
                type="number"
                min="1"
                value={newGameNumber}
                onChange={(e) => setNewGameNumber(parseInt(e.target.value) || 1)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontSize: "16px"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#b0bec5", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                Карта
              </label>
              <select
                value={selectedMapForGame || ""}
                onChange={(e) => setSelectedMapForGame(parseInt(e.target.value) || null)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontSize: "16px"
                }}
              >
                <option value="">Выберите карту</option>
                {maps.map((map) => (
                  <option key={map.id} value={map.id} style={{ background: "#0a0e1a", color: "#ffffff" }}>
                    {map.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowCreateGame(false);
                  setSelectedLobbyForGame(null);
                  setSelectedMapForGame(null);
                  setNewGameNumber(1);
                }}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6px",
                  color: "#ffffff",
                  cursor: "pointer"
                }}
              >
                Отмена
              </button>
              <button
                onClick={createGame}
                disabled={creatingGame || !selectedMapForGame}
                style={{
                  padding: "10px 20px",
                  background: creatingGame 
                    ? "rgba(0, 150, 200, 0.5)" 
                    : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#ffffff",
                  cursor: creatingGame ? "not-allowed" : "pointer"
                }}
              >
                {creatingGame ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления результатов */}
      {showAddResults && selectedGameForResults && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "rgba(0, 26, 35, 0.95)",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid rgba(0, 150, 200, 0.3)",
            minWidth: "600px",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h3 style={{ color: "#ffffff", marginBottom: "20px" }}>
              {Object.keys(existingResults).length > 0 ? "Редактировать результаты игры" : "Добавить результаты игры"}
            </h3>
            
            {/* Список команд для ввода результатов */}
            {lobbies.find(l => l.games.some(g => g.id === selectedGameForResults))?.teams.map((team) => (
              <div key={team.id} style={{
                marginBottom: "16px",
                padding: "16px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}>
                <div style={{ color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
                  {team.name} ({team.players.join(", ")})
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ color: "#b0bec5", fontSize: "12px", marginBottom: "4px", display: "block" }}>
                      Место
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={gameResults[team.id]?.place || ""}
                      onChange={(e) => updateResult(team.id, 'place', parseInt(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ color: "#b0bec5", fontSize: "12px", marginBottom: "4px", display: "block" }}>
                      Убийства
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={gameResults[team.id]?.kills || ""}
                      onChange={(e) => updateResult(team.id, 'kills', parseInt(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ color: "#b0bec5", fontSize: "12px", marginBottom: "4px", display: "block" }}>
                      Очки
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={gameResults[team.id]?.points || ""}
                      onChange={(e) => updateResult(team.id, 'points', parseInt(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                onClick={() => {
                  setShowAddResults(false);
                  setSelectedGameForResults(null);
                  setGameResults({});
                  setExistingResults({});
                }}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6px",
                  color: "#ffffff",
                  cursor: "pointer"
                }}
              >
                Отмена
              </button>
              <button
                onClick={addResults}
                disabled={addingResults}
                style={{
                  padding: "10px 20px",
                  background: addingResults 
                    ? "rgba(0, 150, 200, 0.5)" 
                    : "linear-gradient(135deg, #0096c8 0%, #007ba7 100%)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#ffffff",
                  cursor: addingResults ? "not-allowed" : "pointer"
                }}
              >
                {addingResults ? "Сохранение..." : (Object.keys(existingResults).length > 0 ? "Обновить результаты" : "Сохранить результаты")}
              </button>
            </div>
          </div>
        </div>
      )}

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
