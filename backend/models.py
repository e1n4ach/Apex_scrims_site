from app import db

# ========================
# Пользователи
# ========================
class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    discord = db.Column(db.String(120))
    is_admin = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f"<User {self.username}>"

# ========================
# Лобби
# ========================
class Lobby(db.Model):
    __tablename__ = "lobby"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(8), unique=True, index=True, nullable=False) 

    teams = db.relationship(
        "Team", backref="lobby", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )
    games = db.relationship(
        "Game", backref="lobby", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self):
        return f"<Lobby {self.name}>"

# ========================
# Карты
# ========================
class Map(db.Model):
    __tablename__ = "map"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    image_url = db.Column(db.String(255), nullable=False)

    dropzones = db.relationship(
        "DropzoneTemplate", backref="map", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self):
        return f"<Map {self.name}>"

# ========================
# Игры
# ========================
class Game(db.Model):
    __tablename__ = "game"

    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey("lobby.id", ondelete="CASCADE"), nullable=False)
    number = db.Column(db.Integer, nullable=False)
    map_id = db.Column(db.Integer, db.ForeignKey("map.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("lobby_id", "number", name="uq_game_lobby_number"),  # NEW
    )

    results = db.relationship(
        "Result", backref="game", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )
    assignments = db.relationship(
        "DropzoneAssignment", backref="game", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )

    map = db.relationship("Map")

    def __repr__(self):
        return f"<Game {self.number} in Lobby {self.lobby_id}>"

# ========================
# Команды
# ========================
class Team(db.Model):
    __tablename__ = "team"

    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey("lobby.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("lobby_id", "name", name="uq_team_lobby_name"),
    )

    players = db.relationship(
        "Player", backref="team", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )
    results = db.relationship(
        "Result", backref="team", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )
    assignments = db.relationship(
        "DropzoneAssignment", backref="team", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self):
        return f"<Team {self.name}>"

# ========================
# Игроки
# ========================
class Player(db.Model):
    __tablename__ = "player"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="CASCADE"), nullable=False)
    username = db.Column(db.String(120), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("username", name="uq_player_username"),
    )

    def __repr__(self):
        return f"<Player {self.username}>"

# ========================
# Результаты
# ========================
class Result(db.Model):
    __tablename__ = "result"

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey("game.id", ondelete="CASCADE"), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="CASCADE"), nullable=False)
    place = db.Column(db.Integer)
    kills = db.Column(db.Integer)
    points = db.Column(db.Integer)

    __table_args__ = (
        db.UniqueConstraint("game_id", "team_id", name="uq_result_game_team"),
    )

    def __repr__(self):
        return f"<Result Game {self.game_id} Team {self.team_id}>"

# ========================
# Шаблон дропзоны (привязан к карте)
# ========================
class DropzoneTemplate(db.Model):
    __tablename__ = "dropzone_template"

    id = db.Column(db.Integer, primary_key=True)
    map_id = db.Column(db.Integer, db.ForeignKey("map.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    x_percent = db.Column(db.Float, nullable=False)
    y_percent = db.Column(db.Float, nullable=False)
    radius = db.Column(db.Float, nullable=False, default=5)
    capacity = db.Column(db.Integer, nullable=False, default=1)

    assignments = db.relationship(
        "DropzoneAssignment", backref="dropzone", lazy=True,
        cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self):
        return f"<DropzoneTemplate {self.name}>"

# ========================
# Назначение дропзоны команде в конкретной игре
# ========================
class DropzoneAssignment(db.Model):
    __tablename__ = "dropzone_assignment"

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey("game.id", ondelete="CASCADE"), nullable=False)
    # ВАЖНО: nullable=True — чтобы можно было "освободить" слот (set NULL)
    team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="CASCADE"), nullable=True)
    dropzone_id = db.Column(db.Integer, db.ForeignKey("dropzone_template.id", ondelete="CASCADE"), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (
        # одна команда — только в одной зоне в пределах одной игры
        db.UniqueConstraint("game_id", "team_id", name="uq_assignment_game_team"),
        # один шаблон зоны — один слот в пределах одной игры (capacity=1)
        db.UniqueConstraint("game_id", "dropzone_id", name="uq_assignment_game_dropzone"),
    )

    def __repr__(self):
        return f"<DropzoneAssignment Game {self.game_id} Team {self.team_id} Zone {self.dropzone_id}>"

# ========================
# Анонсы
# ========================
class Announcement(db.Model):
    __tablename__ = "announcement"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(120))
    prize = db.Column(db.String(120))

    def __repr__(self):
        return f"<Announcement {self.title}>"
