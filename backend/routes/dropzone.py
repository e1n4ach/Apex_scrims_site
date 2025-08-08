from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Game, DropZone, Team, Player, User

dropzone_bp = Blueprint('dropzone', __name__)

# ✅ Создать новую дроп-зону для игры
@dropzone_bp.route('/games/<int:game_id>/dropzones', methods=['POST'])
@jwt_required()
def create_drop_zone(game_id):
    """
    Create a new drop zone in a game
    ---
    tags:
      - Drop Zones
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
        description: ID of the game
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
            x_percent:
              type: number
            y_percent:
              type: number
    responses:
      201:
        description: Drop zone created
      400:
        description: Bad request
      403:
        description: Admin access required
      404:
        description: Game not found
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    data = request.get_json()
    name = data.get('name')
    x_percent = data.get('x_percent')
    y_percent = data.get('y_percent')

    if not name or x_percent is None or y_percent is None:
        return jsonify({"error": "Missing required fields"}), 400

    new_zone = DropZone(
        game_id=game.id,
        name=name,
        x_percent=x_percent,
        y_percent=y_percent
    )
    db.session.add(new_zone)
    db.session.commit()

    return jsonify({
        "message": "Drop zone created",
        "drop_zone": {
            "id": new_zone.id,
            "name": new_zone.name,
            "x_percent": new_zone.x_percent,
            "y_percent": new_zone.y_percent,
            "game_id": new_zone.game_id
        }
    }), 201

# ✅ Получить все дроп-зоны для игры
@dropzone_bp.route('/games/<int:game_id>/dropzones', methods=['GET'])
def get_drop_zones_for_game(game_id):
    """
    Get all drop zones for a game
    ---
    tags:
      - Drop Zones
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
        description: ID of the game
    responses:
      200:
        description: List of drop zones
      404:
        description: Game not found
    """
    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    zones = DropZone.query.filter_by(game_id=game.id).all()
    result = [{
        "id": z.id,
        "name": z.name,
        "x_percent": z.x_percent,
        "y_percent": z.y_percent,
        "teams": [t.id for t in z.teams]
    } for z in zones]

    return jsonify(result), 200

# ✅ Админ или игрок своей команды: назначить на дроп-зону
@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:dropzone_id>/assign', methods=['POST'])
@jwt_required()
def assign_team_to_dropzone(game_id, dropzone_id):
    """
    Assign a team to a drop zone
    ---
    tags:
      - Drop Zones
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: dropzone_id
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
    responses:
      200:
        description: Team assigned
    """
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    dropzone = DropZone.query.get(dropzone_id)
    if not dropzone or dropzone.game_id != game.id:
        return jsonify({"error": "Drop zone not found"}), 404

    data = request.get_json()
    team_id = data.get('team_id')
    if not team_id:
        return jsonify({"error": "Missing team_id"}), 400

    team = Team.query.get(team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    if not user.is_admin:
        player = Player.query.filter_by(username=user.username, team_id=team.id).first()
        if not player:
            return jsonify({"error": "You cannot assign for this team"}), 403

    if len(dropzone.teams) >= 2:
        return jsonify({"error": "Drop zone full"}), 409

    assigned_elsewhere = DropZone.query.join(DropZone.teams).filter(
        DropZone.game_id == game.id, Team.id == team.id
    ).first()
    if assigned_elsewhere:
        return jsonify({"error": "Team already assigned elsewhere"}), 409

    dropzone.teams.append(team)
    db.session.commit()

    return jsonify({"message": "Team assigned", "drop_zone_id": dropzone.id}), 200

# ✅ Игрок может назначить свою команду
@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:dropzone_id>/assign_my_team', methods=['POST'])
@jwt_required()
def assign_my_team_to_dropzone(game_id, dropzone_id):
    """
    Assign your own team to a drop zone
    ---
    tags:
      - Drop Zones
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: dropzone_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Your team assigned
    """
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    dropzone = DropZone.query.get(dropzone_id)
    if not dropzone or dropzone.game_id != game.id:
        return jsonify({"error": "Drop zone not found"}), 404

    player = Player.query.filter_by(username=user.username).first()
    if not player:
        return jsonify({"error": "You are not in any team"}), 403

    team = Team.query.get(player.team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Your team is not in this lobby"}), 403

    if len(dropzone.teams) >= 2:
        return jsonify({"error": "Drop zone full"}), 409

    existing = DropZone.query.join(DropZone.teams).filter(
        DropZone.game_id == game.id, Team.id == team.id
    ).first()
    if existing:
        return jsonify({"error": "Your team already assigned elsewhere"}), 409

    dropzone.teams.append(team)
    db.session.commit()

    return jsonify({"message": "Your team assigned", "drop_zone_id": dropzone.id}), 200

# ✅ Игрок может сменить свою дроп-зону
@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:dropzone_id>/change_my_team', methods=['POST'])
@jwt_required()
def change_my_team_dropzone(game_id, dropzone_id):
    """
    Change your team's assigned drop zone
    ---
    tags:
      - Drop Zones
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: dropzone_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Drop zone updated
    """
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    target = DropZone.query.get(dropzone_id)
    if not target or target.game_id != game.id:
        return jsonify({"error": "Drop zone not found"}), 404

    player = Player.query.filter_by(username=user.username).first()
    if not player:
        return jsonify({"error": "You are not in any team"}), 403

    team = Team.query.get(player.team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Your team is not in this lobby"}), 403

    if len(target.teams) >= 2 and team not in target.teams:
        return jsonify({"error": "Drop zone full"}), 409

    # Remove from all zones in this game
    for dz in DropZone.query.filter_by(game_id=game.id):
        if team in dz.teams:
            dz.teams.remove(team)

    if team not in target.teams:
        target.teams.append(team)

    db.session.commit()

    return jsonify({"message": "Drop zone updated", "drop_zone_id": target.id}), 200

# ✅ Игрок может освободить свою дроп-зону
@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:dropzone_id>/remove_my_team', methods=['DELETE'])
@jwt_required()
def remove_my_team_from_dropzone(game_id, dropzone_id):
    """
    Remove your team from a specific drop zone
    ---
    tags:
      - Drop Zones
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: dropzone_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Team removed
    """
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    dropzone = DropZone.query.get(dropzone_id)
    if not dropzone or dropzone.game_id != game.id:
        return jsonify({"error": "Drop zone not found"}), 404

    player = Player.query.filter_by(username=user.username).first()
    if not player:
        return jsonify({"error": "You are not in any team"}), 403

    team = Team.query.get(player.team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Your team is not in this lobby"}), 403

    if team in dropzone.teams:
        dropzone.teams.remove(team)
        db.session.commit()

    return jsonify({
        "message": "Your team was removed",
        "drop_zone_id": dropzone.id,
        "team_removed": team.id
    }), 200

# ✅ Удалить дроп-зону (админ)
@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:dropzone_id>', methods=['DELETE'])
@jwt_required()
def delete_drop_zone(game_id, dropzone_id):
    """
    Delete a drop zone (Admin only)
    ---
    tags:
      - Drop Zones
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: dropzone_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Drop zone deleted
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    dropzone = DropZone.query.get(dropzone_id)
    if not dropzone or dropzone.game_id != game.id:
        return jsonify({"error": "Drop zone not found"}), 404

    dropzone.teams.clear()
    db.session.delete(dropzone)
    db.session.commit()

    return jsonify({"message": "Drop zone deleted"}), 200
