from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Lobby, User

lobby_bp = Blueprint('lobby', __name__)

# ✅ Создать лобби (только админ)
@lobby_bp.route('/create', methods=['POST'])
@jwt_required()
def create_lobby():
    """
    Create a new lobby (Admin only)
    ---
    tags:
      - Lobby
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      201:
        description: Lobby created successfully
        schema:
          type: object
          properties:
            message:
              type: string
            lobby:
              type: object
              properties:
                id:
                  type: integer
                name:
                  type: string
      400:
        description: Lobby name is required
      403:
        description: Admin access required
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify({"error": "Lobby name is required"}), 400

    new_lobby = Lobby(name=name)
    db.session.add(new_lobby)
    db.session.commit()

    return jsonify({
        "message": "Lobby created",
        "lobby": {
            "id": new_lobby.id,
            "name": new_lobby.name
        }
    }), 201


# ✅ Получить список всех лобби
@lobby_bp.route('/', methods=['GET'])
def get_all_lobbies():
    """
    Get a list of all lobbies
    ---
    tags:
      - Lobby
    responses:
      200:
        description: A list of all lobbies
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              name:
                type: string
    """
    lobbies = Lobby.query.all()
    result = []
    for lobby in lobbies:
        result.append({
            "id": lobby.id,
            "name": lobby.name
        })

    return jsonify(result), 200

@lobby_bp.route('/<int:lobby_id>', methods=['DELETE'])
@jwt_required()
def delete_lobby(lobby_id):
    """
    Delete a lobby (Admin only)
    ---
    tags:
      - Lobby
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: ID of the lobby to delete
    responses:
      200:
        description: Lobby deleted successfully
      403:
        description: Admin access required
      404:
        description: Lobby not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    # Опционально — можно тут еще удалить игры, команды и все каскадно
    # Но если у тебя стоит cascade в моделях — это делается самими моделями
    db.session.delete(lobby)
    db.session.commit()

    return jsonify({"message": "Lobby deleted successfully"}), 200
