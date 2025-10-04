from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Lobby, Team, Player, User

team_bp = Blueprint('team', __name__)

# ✅ Register team
@team_bp.route('/lobbies/<int:lobby_id>/teams/register', methods=['POST'])
@jwt_required()
def register_team(lobby_id):
    """
    Register a new team in a lobby
    ---
    tags:
      - Teams
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: Lobby ID
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name: {type: string, example: "MyTeam"}
            player1: {type: string, example: "playerOne"}
            player2: {type: string, example: "playerTwo"}
            player3: {type: string, example: "playerThree"}
    responses:
      201:
        description: Team registered successfully
      400:
        description: Bad request
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Lobby not found
      409:
        description: Conflict (duplicate team or player already in team)
    """
    user_id = int(get_jwt_identity())
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    data = request.get_json() or {}
    name = data.get('name')
    players = [data.get('player1'), data.get('player2'), data.get('player3')]

    if not name or any(p is None for p in players):
        return jsonify({"error": "Team name and 3 player nicknames required"}), 400

    existing_team = Team.query.filter_by(name=name, lobby_id=lobby.id).first()
    if existing_team:
        return jsonify({"error": "Team with this name already registered in this lobby"}), 409

    for username in players:
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": f"User '{username}' is not registered"}), 400

    # Проверяем, не участвует ли игрок уже в команде в этом же лобби
    for username in players:
        # Находим все команды в этом лобби
        teams_in_lobby = Team.query.filter_by(lobby_id=lobby.id).all()
        team_ids_in_lobby = [team.id for team in teams_in_lobby]
        
        # Проверяем, есть ли игрок в какой-либо команде этого лобби
        if team_ids_in_lobby:
            existing_player_in_lobby = Player.query.filter(
                Player.username == username,
                Player.team_id.in_(team_ids_in_lobby)
            ).first()
            if existing_player_in_lobby:
                return jsonify({"error": f"Player '{username}' is already registered in a team in this lobby"}), 409

    new_team = Team(name=name, lobby_id=lobby.id)
    db.session.add(new_team)
    db.session.commit()

    for username in players:
        new_player = Player(username=username, team_id=new_team.id)
        db.session.add(new_player)

    db.session.commit()

    return jsonify({
        "message": "Team registered successfully",
        "team": {
            "id": new_team.id,
            "name": new_team.name,
            "lobby_id": new_team.lobby_id,
            "players": players
        }
    }), 201


# ✅ List all teams in lobby
@team_bp.route('/lobbies/<int:lobby_id>/teams', methods=['GET'])
def get_teams_for_lobby(lobby_id):
    """
    Get list of all teams in a lobby
    ---
    tags:
      - Teams
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: ID of the lobby
    responses:
      200:
        description: List of teams
    """
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    teams = Team.query.filter_by(lobby_id=lobby.id).all()

    result = []
    for team in teams:
        players = Player.query.filter_by(team_id=team.id).all()
        player_usernames = [player.username for player in players]
        result.append({
            "id": team.id,
            "name": team.name,
            "players": player_usernames
        })

    return jsonify(result), 200


# ✅ Delete team (admin)
@team_bp.route('/lobbies/<int:lobby_id>/teams/<int:team_id>', methods=['DELETE'])
@jwt_required()
def delete_team(lobby_id, team_id):
    """
    Delete a team from a lobby (Admin only)
    ---
    tags:
      - Teams
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
      - name: team_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Team deleted successfully
      403:
        description: Admin access required
      404:
        description: Lobby or Team not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    team = Team.query.get(team_id)
    if not team or team.lobby_id != lobby.id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    Player.query.filter_by(team_id=team.id).delete()
    db.session.delete(team)
    db.session.commit()

    return jsonify({"message": "Team deleted successfully"}), 200
