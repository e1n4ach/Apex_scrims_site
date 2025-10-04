from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import User, Lobby, Team, Game, Map, DropzoneTemplate, Player

admin_bp = Blueprint('admin', __name__)

def require_admin():
    """Проверка прав администратора"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return None
    return user

@admin_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    """
    Получить список всех пользователей (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    responses:
      200:
        description: Список пользователей
      403:
        description: Доступ запрещен
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.all()
    return jsonify([{
        "id": user.id,
        "username": user.username,
        "is_admin": user.is_admin,
        "email": user.email,
        "discord": user.discord
    } for user in users]), 200

@admin_bp.route('/admin/lobbies', methods=['GET'])
@jwt_required()
def get_lobbies():
    """
    Получить список всех лобби с дополнительной информацией (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    responses:
      200:
        description: Список лобби
      403:
        description: Доступ запрещен
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    lobbies = Lobby.query.all()
    result = []
    for lobby in lobbies:
        teams = Team.query.filter_by(lobby_id=lobby.id).all()
        games_count = Game.query.filter_by(lobby_id=lobby.id).count()
        
        # Получаем информацию о командах и их игроках
        teams_info = []
        for team in teams:
            players = Player.query.filter_by(team_id=team.id).all()
            teams_info.append({
                "id": team.id,
                "name": team.name,
                "players": [player.username for player in players]
            })
        
        # Получаем информацию об играх
        games = Game.query.filter_by(lobby_id=lobby.id).all()
        games_info = []
        for game in games:
            map_obj = Map.query.get(game.map_id) if game.map_id else None
            games_info.append({
                "id": game.id,
                "number": game.number,
                "map_name": map_obj.name if map_obj else "Неизвестная карта"
            })
        
        result.append({
            "id": lobby.id,
            "name": lobby.name,
            "code": lobby.code,
            "teams_count": len(teams),
            "games_count": games_count,
            "teams": teams_info,
            "games": games_info
        })
    
    return jsonify(result), 200

@admin_bp.route('/admin/maps', methods=['GET'])
@jwt_required()
def get_maps():
    """
    Получить список всех карт с дополнительной информацией (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    responses:
      200:
        description: Список карт
      403:
        description: Доступ запрещен
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    maps = Map.query.all()
    result = []
    for map_obj in maps:
        dropzones_count = DropzoneTemplate.query.filter_by(map_id=map_obj.id).count()
        
        result.append({
            "id": map_obj.id,
            "name": map_obj.name,
            "image_filename": map_obj.image_filename,
            "dropzones_count": dropzones_count
        })
    
    return jsonify(result), 200

@admin_bp.route('/admin/lobbies', methods=['POST'])
@jwt_required()
def create_lobby():
    """
    Создать новое лобби (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              description: Название лобби
    responses:
      201:
        description: Лобби создано
      400:
        description: Неверные данные
      403:
        description: Доступ запрещен
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}
    name = data.get('name')
    
    if not name or not name.strip():
        return jsonify({"error": "Name is required"}), 400

    # Генерируем уникальный код лобби
    import random
    import string
    
    def generate_code():
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    # Убеждаемся, что код уникален
    code = generate_code()
    while Lobby.query.filter_by(code=code).first():
        code = generate_code()
    
    lobby = Lobby(name=name.strip(), code=code)
    db.session.add(lobby)
    db.session.commit()
    
    return jsonify({
        "message": "Lobby created successfully",
        "lobby": {
            "id": lobby.id,
            "name": lobby.name,
            "code": lobby.code
        }
    }), 201

@admin_bp.route('/admin/lobbies/<int:lobby_id>/games', methods=['POST'])
@jwt_required()
def create_game_for_lobby(lobby_id):
    """
    Создать игру в лобби (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            number:
              type: integer
              description: Номер игры в лобби
            map_id:
              type: integer
              description: ID карты для игры
    responses:
      201:
        description: Игра создана
      400:
        description: Неверные данные
      403:
        description: Доступ запрещен
      404:
        description: Лобби или карта не найдены
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    data = request.get_json() or {}
    number = data.get('number')
    map_id = data.get('map_id')
    
    if not number or not map_id:
        return jsonify({"error": "number and map_id are required"}), 400

    map_obj = Map.query.get(map_id)
    if not map_obj:
        return jsonify({"error": "Map not found"}), 404

    # Проверяем, что номер игры уникален в лобби
    existing_game = Game.query.filter_by(lobby_id=lobby_id, number=number).first()
    if existing_game:
        return jsonify({"error": f"Game with number {number} already exists in this lobby"}), 400

    game = Game(lobby_id=lobby_id, number=number, map_id=map_id)
    db.session.add(game)
    db.session.commit()
    
    return jsonify({
        "message": "Game created successfully",
        "game": {
            "id": game.id,
            "number": game.number,
            "lobby_id": game.lobby_id,
            "map_id": game.map_id
        }
    }), 201

@admin_bp.route('/admin/games/<int:game_id>/results/<int:team_id>', methods=['PATCH'])
@jwt_required()
def update_game_result(game_id, team_id):
    """
    Обновить результат игры для команды (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: team_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            place:
              type: integer
              description: Место команды
            kills:
              type: integer
              description: Количество убийств
            points:
              type: integer
              description: Количество очков
    responses:
      200:
        description: Результат обновлен
      400:
        description: Неверные данные
      403:
        description: Доступ запрещен
      404:
        description: Игра, команда или результат не найдены
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    team = Team.query.get(team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    # Находим существующий результат
    from models import Result
    result = Result.query.filter_by(game_id=game_id, team_id=team_id).first()
    if not result:
        return jsonify({"error": "Result not found"}), 404

    data = request.get_json() or {}
    if "place" in data:
        result.place = data["place"]
    if "kills" in data:
        result.kills = data["kills"]
    if "points" in data:
        result.points = data["points"]

    db.session.commit()
    
    return jsonify({
        "message": "Result updated successfully",
        "result": {
            "id": result.id,
            "game_id": result.game_id,
            "team_id": result.team_id,
            "place": result.place,
            "kills": result.kills,
            "points": result.points
        }
    }), 200

@admin_bp.route('/admin/games/<int:game_id>', methods=['DELETE'])
@jwt_required()
def delete_game(game_id):
    """
    Удалить игру (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Игра удалена
      403:
        description: Доступ запрещен
      404:
        description: Игра не найдена
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    db.session.delete(game)
    db.session.commit()

    return jsonify({"message": f"Game {game.number} deleted"}), 200

@admin_bp.route('/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@jwt_required()
def toggle_user_admin(user_id):
    """
    Переключить статус администратора пользователя (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Статус изменен
      403:
        description: Доступ запрещен
      404:
        description: Пользователь не найден
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Нельзя снять права админа у самого себя
    if user.id == admin.id:
        return jsonify({"error": "Cannot change your own admin status"}), 400

    user.is_admin = not user.is_admin
    db.session.commit()

    return jsonify({
        "message": f"User {user.username} admin status changed to {user.is_admin}",
        "is_admin": user.is_admin
    }), 200

@admin_bp.route('/admin/lobbies/<int:lobby_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_lobby(lobby_id):
    """
    Удалить лобби (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Лобби удалено
      403:
        description: Доступ запрещен
      404:
        description: Лобби не найдено
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    db.session.delete(lobby)
    db.session.commit()

    return jsonify({"message": f"Lobby {lobby.name} deleted"}), 200

@admin_bp.route('/admin/maps/<int:map_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_map(map_id):
    """
    Удалить карту (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: map_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Карта удалена
      403:
        description: Доступ запрещен
      404:
        description: Карта не найдена
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    map_obj = Map.query.get(map_id)
    if not map_obj:
        return jsonify({"error": "Map not found"}), 404

    db.session.delete(map_obj)
    db.session.commit()

    return jsonify({"message": f"Map {map_obj.name} deleted"}), 200

@admin_bp.route('/admin/games/<int:game_id>/results', methods=['POST'])
@jwt_required()
def add_game_result(game_id):
    """
    Добавить результат игры для команды (только для админов)
    ---
    tags:
      - Admin
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            team_id:
              type: integer
              description: ID команды
            place:
              type: integer
              description: Место команды
            kills:
              type: integer
              description: Количество убийств
            points:
              type: integer
              description: Количество очков
    responses:
      201:
        description: Результат добавлен
      400:
        description: Неверные данные
      403:
        description: Доступ запрещен
      404:
        description: Игра или команда не найдены
    """
    admin = require_admin()
    if not admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    data = request.get_json() or {}
    team_id = data.get('team_id')
    place = data.get('place')
    kills = data.get('kills')
    points = data.get('points')
    
    if not team_id or place is None or kills is None or points is None:
        return jsonify({"error": "team_id, place, kills, and points are required"}), 400

    team = Team.query.get(team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    # Проверяем, не существует ли уже результат для этой команды в этой игре
    from models import Result
    existing_result = Result.query.filter_by(game_id=game_id, team_id=team_id).first()
    if existing_result:
        return jsonify({"error": "Result for this team already exists in this game"}), 400

    result = Result(
        game_id=game_id,
        team_id=team_id,
        place=place,
        kills=kills,
        points=points
    )
    db.session.add(result)
    db.session.commit()
    
    return jsonify({
        "message": "Result added successfully",
        "result": {
            "id": result.id,
            "game_id": result.game_id,
            "team_id": result.team_id,
            "place": result.place,
            "kills": result.kills,
            "points": result.points
        }
    }), 201
