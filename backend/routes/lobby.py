# routes/lobby.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Lobby, User
import random, string

lobby_bp = Blueprint('lobby', __name__)

def _gen_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(random.choice(alphabet) for _ in range(length))

# ✅ Create lobby (admin)
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
            name: {type: string}
    responses:
      201:
        description: Lobby created successfully
        schema:
          type: object
          properties:
            message: {type: string}
            lobby:
              type: object
              properties:
                id: {type: integer}
                name: {type: string}
                code: {type: string}
      400:
        description: Lobby name is required
      403:
        description: Admin access required
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}
    name = data.get('name')

    if not name:
        return jsonify({"error": "Lobby name is required"}), 400

    code = _gen_code()
    while Lobby.query.filter_by(code=code).first():
        code = _gen_code()

    new_lobby = Lobby(name=name, code=code)
    db.session.add(new_lobby)
    db.session.commit()

    return jsonify({
        "message": "Lobby created",
        "lobby": {
            "id": new_lobby.id,
            "name": new_lobby.name,
            "code": new_lobby.code
        }
    }), 201


# ✅ List all lobbies (без кода)
@lobby_bp.route('/', methods=['GET'])
def get_all_lobbies():
    """
    Get a list of all lobbies (without code)
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
              id: {type: integer}
              name: {type: string}
    """
    lobbies = Lobby.query.all()
    result = []
    for lobby in lobbies:
        result.append({
            "id": lobby.id,
            "name": lobby.name,
            "code": lobby.code
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
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    db.session.delete(lobby)
    db.session.commit()

    return jsonify({"message": "Lobby deleted successfully"}), 200


# ✅ Get lobby by CODE (для Join). Теперь задокументировано в Swagger.
@lobby_bp.route('/by-code/<string:code>', methods=['GET'])
def get_lobby_by_code(code):
    """
    Get lobby by code
    ---
    tags:
      - Lobby
    parameters:
      - name: code
        in: path
        type: string
        required: true
        description: Lobby code (e.g. ABC123)
    responses:
      200:
        description: Lobby found
        schema:
          type: object
          properties:
            id: {type: integer}
            name: {type: string}
            code: {type: string}
      404:
        description: Lobby not found
    """
    code = (code or "").strip().upper()
    lobby = Lobby.query.filter_by(code=code).first()
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404
    return jsonify({"id": lobby.id, "name": lobby.name, "code": lobby.code}), 200


# ✅ Удобная ручка: детали лобби по ID (включая code) — чтобы показывать код на странице лобби.
@lobby_bp.route('/<int:lobby_id>/details', methods=['GET'])
def get_lobby_details(lobby_id):
    """
    Get lobby details by id (id, name, code)
    ---
    tags:
      - Lobby
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Lobby details
        schema:
          type: object
          properties:
            id: {type: integer}
            name: {type: string}
            code: {type: string}
      404:
        description: Lobby not found
    """
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404
    return jsonify({"id": lobby.id, "name": lobby.name, "code": lobby.code}), 200
