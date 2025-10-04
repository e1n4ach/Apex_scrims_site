from flask import Blueprint, request, jsonify
from app import db
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            email:
              type: string
            password:
              type: string
            discord:
              type: string
    responses:
      201:
        description: User registered successfully
      400:
        description: Missing required fields or user exists
    """
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    discord = data.get('discord')

    if not username or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        return jsonify({"error": "User with that username or email already exists"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        username=username,
        email=email,
        password_hash=hashed_password,
        discord=discord
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login a user
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Access token and user info
      400:
        description: Missing username or password
      401:
        description: Invalid credentials
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid username or password"}), 401

    # ✅ identity как int (не строка)
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "username": user.username,
        "email": user.email,
        "discord": user.discord,
        "is_admin": user.is_admin
    }), 200


@auth_bp.route('/account', methods=['GET'])
@jwt_required()
def account():
    """
    Get current user's account info
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: User details
        schema:
          type: object
          properties:
            id:
              type: integer
            username:
              type: string
            email:
              type: string
            discord:
              type: string
            is_admin:
              type: boolean
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "discord": user.discord,
        "is_admin": user.is_admin
    }), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """
    Get all users (Admin only)
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of users
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              username:
                type: string
              email:
                type: string
              discord:
                type: string
              is_admin:
                type: boolean
      403:
        description: Admin access required
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "discord": u.discord,
            "is_admin": u.is_admin
        })
    return jsonify(result), 200


@auth_bp.route('/account', methods=['PATCH'])
@jwt_required()
def update_account():
    """
    Update current user's account info
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
            discord:
              type: string
    responses:
      200:
        description: Account updated successfully
        schema:
          type: object
          properties:
            message:
              type: string
            user:
              type: object
              properties:
                id:
                  type: integer
                username:
                  type: string
                email:
                  type: string
                discord:
                  type: string
                is_admin:
                  type: boolean
      400:
        description: Invalid data or email already exists
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    
    # Обновляем email если предоставлен
    if "email" in data:
        new_email = data["email"]
        if new_email and new_email != user.email:
            # Проверяем, не занят ли email другим пользователем
            existing_user = User.query.filter(User.email == new_email, User.id != user.id).first()
            if existing_user:
                return jsonify({"error": "Email already exists"}), 400
            user.email = new_email
    
    # Обновляем discord если предоставлен
    if "discord" in data:
        user.discord = data["discord"]

    db.session.commit()

    return jsonify({
        "message": "Account updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "discord": user.discord,
            "is_admin": user.is_admin
        }
    }), 200


@auth_bp.route('/account/password', methods=['PATCH'])
@jwt_required()
def change_password():
    """
    Change user password
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            current_password:
              type: string
            new_password:
              type: string
    responses:
      200:
        description: Password changed successfully
        schema:
          type: object
          properties:
            message:
              type: string
      400:
        description: Missing fields or invalid current password
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({"error": "current_password and new_password are required"}), 400

    # Проверяем текущий пароль
    if not check_password_hash(user.password_hash, current_password):
        return jsonify({"error": "Invalid current password"}), 400

    # Обновляем пароль
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Password changed successfully"}), 200


@auth_bp.route('/account/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """
    Get user statistics (teams, games, results)
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: User statistics
        schema:
          type: object
          properties:
            teams:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  lobby_id:
                    type: integer
                  lobby_name:
                    type: string
            total_games:
              type: integer
            total_kills:
              type: integer
            total_points:
              type: integer
            best_placement:
              type: integer
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Импортируем модели здесь, чтобы избежать циклических импортов
    from models import Team, Player, Lobby, Game, Result

    # Находим все команды, в которых участвует пользователь
    user_players = Player.query.filter_by(username=user.username).all()
    team_ids = [p.team_id for p in user_players]
    
    teams = []
    total_kills = 0
    total_points = 0
    placements = []
    total_games = 0

    for team_id in team_ids:
        team = Team.query.get(team_id)
        if team:
            lobby = Lobby.query.get(team.lobby_id)
            
            teams.append({
                "id": team.id,
                "name": team.name,
                "lobby_id": team.lobby_id,
                "lobby_name": lobby.name if lobby else "Unknown Lobby"
            })

            # Получаем результаты команды во всех играх этого лобби
            if lobby:
                games = Game.query.filter_by(lobby_id=lobby.id).all()
                game_ids = [g.id for g in games]
                
                if game_ids:
                    results = Result.query.filter(
                        Result.team_id == team.id,
                        Result.game_id.in_(game_ids)
                    ).all()
                    
                    for result in results:
                        total_games += 1
                        total_kills += result.kills or 0
                        total_points += result.points or 0
                        if result.place:
                            placements.append(result.place)

    best_placement = min(placements) if placements else None

    return jsonify({
        "teams": teams,
        "total_games": total_games,
        "total_kills": total_kills,
        "total_points": total_points,
        "best_placement": best_placement
    }), 200


@auth_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """
    Delete your own account
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: Account deleted successfully
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "Your account has been deleted."}), 200
