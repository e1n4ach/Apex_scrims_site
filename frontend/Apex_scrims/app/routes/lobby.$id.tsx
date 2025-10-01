// app/routes/lobby.$id.tsx
import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";

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
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>
        {lobby ? `Лобби «${lobby.name}»` : `Лобби #${id}`}
      </h1>
      {lobby && (
        <div style={{ marginBottom: 16, fontSize: 14 }}>
          Код: <code style={{ fontWeight: 600 }}>{lobby.code}</code>{" "}
          <button onClick={copyCode} style={{ marginLeft: 8 }}>
            {copied ? "Скопировано!" : "Скопировать"}
          </button>
        </div>
      )}

      {/* Итог */}
      <h2 style={{ marginTop: 16 }}>Итог</h2>
      {summary.length ? (
        <table style={{ marginTop: 8, borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6 }}>Команда</th>
              <th style={{ textAlign: "right", padding: 6 }}>Очки</th>
              <th style={{ textAlign: "right", padding: 6 }}>Киллы</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((r, idx) => (
              <tr key={`sum-${r.team_id}-${idx}`}>
                <td style={{ padding: 6, borderTop: "1px solid #ddd" }}>{r.team_name}</td>
                <td style={{ padding: 6, textAlign: "right", borderTop: "1px solid #ddd" }}>{r.points_total}</td>
                <td style={{ padding: 6, textAlign: "right", borderTop: "1px solid #ddd" }}>{r.kills_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Пока нет результатов.</p>
      )}

      {/* Игры */}
      <h2 style={{ marginTop: 24 }}>Игры</h2>
      {!games.length && <p>Игры ещё не созданы.</p>}
      {!!games.length && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {games.map((g) => (
              <button
                key={`game-${g.id}`}
                onClick={() => setSelectedGameId(g.id)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #bbb",
                  background: selectedGameId === g.id ? "#eee" : "white",
                  cursor: "pointer",
                }}
              >
                Игра {g.number} {g.map ? `• ${g.map.name}` : ""}
              </button>
            ))}
          </div>

          {/* Таблица результатов выбранной игры */}
          <div style={{ marginTop: 12 }}>
            {gameResults.length ? (
              <table style={{ marginTop: 8, borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 6 }}>Команда</th>
                    <th style={{ textAlign: "right", padding: 6 }}>Место</th>
                    <th style={{ textAlign: "right", padding: 6 }}>Киллы</th>
                    <th style={{ textAlign: "right", padding: 6 }}>Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {gameResults.map((r, idx) => (
                    <tr key={`gr-${r.id ?? `${r.team_id}-${r.place}-${idx}`}`}>
                      <td style={{ padding: 6, borderTop: "1px solid #ddd" }}>{r.team_name ?? `#${r.team_id}`}</td>
                      <td style={{ padding: 6, textAlign: "right", borderTop: "1px solid #ddd" }}>{r.place ?? "-"}</td>
                      <td style={{ padding: 6, textAlign: "right", borderTop: "1px solid #ddd" }}>{r.kills ?? 0}</td>
                      <td style={{ padding: 6, textAlign: "right", borderTop: "1px solid #ddd" }}>{r.points ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Пока нет результатов выбранной игры.</p>
            )}
          </div>

          {/* Дроп на карте */}
          <h2 style={{ marginTop: 24 }}>Дроп на карте</h2>
          {(() => {
            const g = games.find((x) => x.id === selectedGameId);
            if (!g) return <p>Игра не выбрана.</p>;

            const hasImage = !!(g.map && g.map.image_url);

            return (
              <div
                style={{
                  position: "relative",
                  maxWidth: 900,
                  border: "1px solid #c8d",
                  borderRadius: 8,
                  marginTop: 8,
                }}
              >
                {hasImage ? (
                  <img
                    src={g!.map!.image_url}
                    alt={g!.map!.name}
                    style={{ display: "block", width: "100%", height: "auto", borderRadius: 8 }}
                  />
                ) : (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      background: "linear-gradient(135deg,#0b2a36,#0e3846)",
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: 8,
                        color: "white",
                        opacity: 0.8,
                        fontWeight: 600,
                      }}
                    >
                      {g.map?.name ?? "Карта не указана"}
                    </div>
                  </div>
                )}

                {/* зоны */}
                {dropzones.map((z, idx) => {
                  const size = Math.max(z.radius, 4);
                  const key = z.assignment_id ?? z.id ?? `dz-${z.name}-${z.x_percent}-${z.y_percent}-${idx}`;
                  const mine = false; // подсветку «моей» зоны можно добавить позже при наличии team_id пользователя

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
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(0,0,0,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: 2,
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                        backdropFilter: "blur(2px)",
                      }}
                    >
                      <div>
                        <div>{z.name}</div>

                        {/* Кнопки действий */}
                        <div style={{ marginTop: 4 }}>
                          {!z.assigned_team ? (
                            <button
                              onClick={() => z.assignment_id && assign(z.assignment_id)}
                              style={{ fontSize: 12 }}
                            >
                              Занять
                            </button>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                              <div style={{ fontSize: 11, opacity: 0.9 }}>
                                {z.assigned_team.name}
                              </div>
                              <button
                                onClick={() => z.assignment_id && unassign(z.assignment_id)}
                                style={{ fontSize: 12 }}
                              >
                                Снять
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!dropzones.length && (
                  <p
                    style={{
                      position: "absolute",
                      inset: 0,
                      margin: "auto",
                      width: "max-content",
                      height: "max-content",
                      background: "rgba(255,255,255,0.85)",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    Зоны не добавлены для этой карты.
                  </p>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* Регистрация команды — рендерим только после гидратации */}
      <h2 style={{ marginTop: 32 }}>Регистрация команды</h2>
      {!hydrated ? null : !authed ? (
        <p>
          Чтобы зарегистрировать команду, <a href="/login">войдите</a>.
        </p>
      ) : (
        <form onSubmit={onRegisterTeam} style={{ display: "grid", gap: 8, maxWidth: 520, marginTop: 8 }}>
          <input placeholder="Название команды" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          <input placeholder="Логин игрока 1" value={p1} onChange={(e) => setP1(e.target.value)} required />
          <input placeholder="Логин игрока 2" value={p2} onChange={(e) => setP2(e.target.value)} required />
          <input placeholder="Логин игрока 3" value={p3} onChange={(e) => setP3(e.target.value)} required />
          <button type="submit" disabled={submitting}>{submitting ? "Отправка…" : "Зарегистрировать"}</button>
          {tMsg && <div style={{ color: "green" }}>{tMsg}</div>}
          {tErr && <div style={{ color: "crimson" }}>{tErr}</div>}
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Игроки должны быть зарегистрированы как пользователи.
          </p>
        </form>
      )}
    </main>
  );
}
