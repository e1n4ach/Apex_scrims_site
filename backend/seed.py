# seed.py
from werkzeug.security import generate_password_hash
from app import app, db
from models import User, Lobby, Map, Game, Team, Player, Result

# на случай, если в модели есть колонка code у Lobby (в миграциях у тебя она есть)
def lobby_has_code():
    return hasattr(Lobby, "code")

def get_or_create_user(username, email=None, password="test123", discord=None, is_admin=False):
    u = User.query.filter_by(username=username).first()
    if u:
        # при необходимости «повысим» до админа
        if is_admin and not u.is_admin:
            u.is_admin = True
            db.session.commit()
        return u
    u = User(
        username=username,
        email=email or f"{username}@example.com",
        password_hash=generate_password_hash(password),
        discord=discord,
        is_admin=is_admin,
    )
    db.session.add(u)
    db.session.commit()
    return u

def get_or_create_map(name, image_url):
    m = Map.query.filter_by(name=name).first()
    if m:
        return m
    m = Map(name=name, image_url=image_url)
    db.session.add(m)
    db.session.commit()
    return m

def get_or_create_lobby(name, code=None):
    if lobby_has_code() and code:
        l = Lobby.query.filter_by(code=code).first()
        if l:
            return l
        l = Lobby(name=name)
        setattr(l, "code", code)  # безопасно, только если колонка есть
        db.session.add(l)
        db.session.commit()
        return l
    # без кода
    l = Lobby.query.filter_by(name=name).first()
    if l:
        return l
    l = Lobby(name=name)
    db.session.add(l)
    db.session.commit()
    return l

def get_or_create_team(lobby_id, name, players_usernames):
    from sqlalchemy import and_
    t = Team.query.filter(and_(Team.lobby_id == lobby_id, Team.name == name)).first()
    if t:
        # проверим что игроки заведены (добавим недостающих)
        existing_players = {p.username for p in Player.query.filter_by(team_id=t.id).all()}
        for uname in players_usernames:
            if uname not in existing_players:
                db.session.add(Player(username=uname, team_id=t.id))
        db.session.commit()
        return t

    t = Team(lobby_id=lobby_id, name=name)
    db.session.add(t)
    db.session.commit()

    # Валидация как в API: игрок должен быть зарегистрирован как User
    for uname in players_usernames:
        u = User.query.filter_by(username=uname).first()
        if not u:
            raise RuntimeError(f"User '{uname}' не найден – сначала создайте пользователя.")

    for uname in players_usernames:
        # уникальность по username уже enforced, поэтому проверим
        if not Player.query.filter_by(username=uname).first():
            db.session.add(Player(username=uname, team_id=t.id))
    db.session.commit()
    return t

def get_or_create_game(lobby_id, number, map_obj):
    g = Game.query.filter_by(lobby_id=lobby_id, number=number).first()
    if g:
        # при необходимости обновим карту
        if g.map_id != map_obj.id:
            g.map_id = map_obj.id
            db.session.commit()
        return g
    g = Game(lobby_id=lobby_id, number=number, map_id=map_obj.id)
    db.session.add(g)
    db.session.commit()
    return g

def set_result(game_id, team_id, place=None, kills=0, points=0):
    r = Result.query.filter_by(game_id=game_id, team_id=team_id).first()
    if r:
        r.place = place
        r.kills = kills
        r.points = points
        db.session.commit()
        return r
    r = Result(game_id=game_id, team_id=team_id, place=place, kills=kills, points=points)
    db.session.add(r)
    db.session.commit()
    return r

with app.app_context():
    print("===> Seeding data...")

    # 1) Админ (если уже есть — просто убедимся, что is_admin=True)
    admin = get_or_create_user("admin", "admin@example.com", "admin123", is_admin=True)
    print(f"Admin: {admin.username}")

    # 2) Обычные пользователи (для команд)
    users = [
        get_or_create_user("alpha1", "alpha1@example.com"),
        get_or_create_user("alpha2", "alpha2@example.com"),
        get_or_create_user("alpha3", "alpha3@example.com"),
        get_or_create_user("bravo1", "bravo1@example.com"),
        get_or_create_user("bravo2", "bravo2@example.com"),
        get_or_create_user("bravo3", "bravo3@example.com"),
        get_or_create_user("charlie1", "charlie1@example.com"),
        get_or_create_user("charlie2", "charlie2@example.com"),
        get_or_create_user("charlie3", "charlie3@example.com"),
    ]
    print(f"Users created/ensured: {len(users)}")

    # 3) Карты
    we = get_or_create_map("World's Edge", "https://example.com/worlds-edge.jpg")
    sp = get_or_create_map("Storm Point", "https://example.com/storm-point.jpg")
    print("Maps ready:", we.name, sp.name)

    # 4) Лобби (с кодом, если колонка есть)
    lobby_code = "ABC123"
    lobby = get_or_create_lobby("Test Lobby", code=lobby_code)
    code_print = getattr(lobby, "code", None)
    print(f"Lobby: {lobby.name} (id={lobby.id}, code={code_print})")

    # 5) Команды (в этом лобби)
    team_alpha = get_or_create_team(lobby.id, "Team Alpha", ["alpha1", "alpha2", "alpha3"])
    team_bravo = get_or_create_team(lobby.id, "Team Bravo", ["bravo1", "bravo2", "bravo3"])
    team_charl = get_or_create_team(lobby.id, "Team Charlie", ["charlie1", "charlie2", "charlie3"])
    print("Teams:", team_alpha.name, team_bravo.name, team_charl.name)

    # 6) Игры
    g1 = get_or_create_game(lobby.id, 1, we)
    g2 = get_or_create_game(lobby.id, 2, sp)
    g3 = get_or_create_game(lobby.id, 3, we)
    print(f"Games: {g1.id}, {g2.id}, {g3.id}")

    # 7) Результаты для примера
    set_result(g1.id, team_alpha.id, place=1, kills=12, points=25)
    set_result(g1.id, team_bravo.id, place=2, kills=8, points=18)
    set_result(g1.id, team_charl.id, place=3, kills=6, points=15)

    set_result(g2.id, team_alpha.id, place=3, kills=5, points=10)
    set_result(g2.id, team_bravo.id, place=1, kills=11, points=24)
    set_result(g2.id, team_charl.id, place=2, kills=7, points=17)

    set_result(g3.id, team_alpha.id, place=2, kills=9, points=20)
    set_result(g3.id, team_bravo.id, place=3, kills=5, points=12)
    set_result(g3.id, team_charl.id, place=1, kills=13, points=26)

    print("===> Done.")
