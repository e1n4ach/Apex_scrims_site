from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Lobby, Game, User

game_bp = Blueprint('game', __name__)

@game_bp.route('/lobbies/<int:lobby_id>/games', methods=['POST'])
@jwt_required()
def create_game(lobby_id):
    """
    Create a new game in a lobby
    ---
    tags:
      - Games
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: ID of the lobby
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            number:
              type: integer
              example: 1
            name:
              type: string
              example: "World's Edge"
    responses:
      201:
        description: Game created successfully
      400:
        description: Bad request
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

    data = request.get_json()
    number = data.get('number')
    name = data.get('name')

    if number is None:
        return jsonify({"error": "Game number is required"}), 400

    new_game = Game(
        lobby_id=lobby.id,
        number=number,
        name=name
    )
    db.session.add(new_game)
    db.session.commit()

    return jsonify({
        "message": "Game created",
        "game": {
            "id": new_game.id,
            "number": new_game.number,
            "name": new_game.name,
            "lobby_id": new_game.lobby_id
        }
    }), 201

@game_bp.route('/lobbies/<int:lobby_id>/games', methods=['GET'])
def get_games_for_lobby(lobby_id):
    """
    Get list of games for a lobby
    ---
    tags:
      - Games
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: ID of the lobby
    responses:
      200:
        description: List of games in the lobby
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              number:
                type: integer
              name:
                type: string
              lobby_id:
                type: integer
      404:
        description: Lobby not found
    """
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    games = Game.query.filter_by(lobby_id=lobby.id).all()

    result = []
    for game in games:
        result.append({
            "id": game.id,
            "number": game.number,
            "name": game.name,
            "lobby_id": game.lobby_id
        })

    return jsonify(result), 200

@game_bp.route('/lobbies/<int:lobby_id>/games/<int:game_id>', methods=['DELETE'])
@jwt_required()
def delete_game(lobby_id, game_id):
    """
    Delete a game from a lobby
    ---
    tags:
      - Games
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: ID of the lobby
      - name: game_id
        in: path
        type: integer
        required: true
        description: ID of the game
    responses:
      200:
        description: Game deleted successfully
      403:
        description: Admin access required
      404:
        description: Lobby or Game not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    game = Game.query.get(game_id)
    if not game or game.lobby_id != lobby.id:
        return jsonify({"error": "Game not found in this lobby"}), 404

    db.session.delete(game)
    db.session.commit()

    return jsonify({"message": "Game deleted successfully"}), 200

from models import Result, Team

@game_bp.route('/games/<int:game_id>/results', methods=['POST'])
@jwt_required()
def add_result(game_id):
    """
    Add a result for a team in a game
    ---
    tags:
      - Results
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
            team_id:
              type: integer
              example: 2
            place:
              type: integer
              example: 1
            kills:
              type: integer
              example: 10
            points:
              type: integer
              example: 25
    responses:
      201:
        description: Result saved successfully
      400:
        description: Bad request
      403:
        description: Admin access required
      404:
        description: Game or Team not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    data = request.get_json()
    team_id = data.get('team_id')
    place = data.get('place')
    kills = data.get('kills')
    points = data.get('points')

    if not team_id:
        return jsonify({"error": "Team ID is required"}), 400

    team = Team.query.get(team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    result = Result(
        game_id=game.id,
        team_id=team.id,
        place=place,
        kills=kills,
        points=points
    )
    db.session.add(result)
    db.session.commit()

    return jsonify({
        "message": "Result saved successfully",
        "result": {
            "id": result.id,
            "game_id": result.game_id,
            "team_id": result.team_id,
            "place": result.place,
            "kills": result.kills,
            "points": result.points
        }
    }), 201

@game_bp.route('/games/<int:game_id>/results', methods=['GET'])
def get_results_for_game(game_id):
    """
    Get results for a game
    ---
    tags:
      - Results
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
        description: ID of the game
    responses:
      200:
        description: List of results for the game
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              team_id:
                type: integer
              team_name:
                type: string
              place:
                type: integer
              kills:
                type: integer
              points:
                type: integer
      404:
        description: Game not found
    """
    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    results = Result.query.filter_by(game_id=game.id).all()

    output = []
    for result in results:
        team = Team.query.get(result.team_id)
        output.append({
            "id": result.id,
            "team_id": result.team_id,
            "team_name": team.name if team else None,
            "place": result.place,
            "kills": result.kills,
            "points": result.points
        })

    return jsonify(output), 200

@game_bp.route('/lobbies/<int:lobby_id>/results/summary', methods=['GET'])
@jwt_required()
def get_lobby_results_summary(lobby_id):
    """
    Get total results summary for a lobby
    ---
    tags:
      - Results
    security:
      - BearerAuth: []
    parameters:
      - name: lobby_id
        in: path
        type: integer
        required: true
        description: ID of the lobby
    responses:
        200:
            description: Summary of results for all games in the lobby
            schema:
            type: array
            items:
                type: object
                properties:
                team_id:
                    type: integer
                team_name:
                    type: string
                kills_total:
                    type: integer
                points_total:
                    type: integer
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    # Собираем все игры в лобби
    games = Game.query.filter_by(lobby_id=lobby.id).all()
    game_ids = [game.id for game in games]

    if not game_ids:
        return jsonify([]), 200

    # Все результаты по этим играм
    all_results = Result.query.filter(Result.game_id.in_(game_ids)).all()

    # Группируем по командам
    summary = {}
    for result in all_results:
        if result.team_id not in summary:
            summary[result.team_id] = {"kills": 0, "points": 0}
        summary[result.team_id]["kills"] += result.kills or 0
        summary[result.team_id]["points"] += result.points or 0

    # Формируем финальный список
    output = []
    for team_id, stats in summary.items():
        team = Team.query.get(team_id)
        if team:
            output.append({
                "team_id": team.id,
                "team_name": team.name,
                "kills_total": stats["kills"],
                "points_total": stats["points"]
            })

    return jsonify(output), 200

@game_bp.route('/games/<int:game_id>/results/<int:result_id>', methods=['PATCH'])
@jwt_required()
def update_result(game_id, result_id):
    """
    Update an existing result for a team in a game
    ---
    tags:
      - Results
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
        description: ID of the game
      - name: result_id
        in: path
        type: integer
        required: true
        description: ID of the result to update
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            place:
              type: integer
              example: 2
            kills:
              type: integer
              example: 5
            points:
              type: integer
              example: 15
    responses:
      200:
        description: Result updated successfully
      400:
        description: Bad request
      403:
        description: Admin access required
      404:
        description: Result or Game not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    result = Result.query.get(result_id)
    if not result or result.game_id != game.id:
        return jsonify({"error": "Result not found in this game"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing request body"}), 400

    # Обновляем только присланные поля
    if 'place' in data:
        result.place = data['place']
    if 'kills' in data:
        result.kills = data['kills']
    if 'points' in data:
        result.points = data['points']

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

@game_bp.route('/games/<int:game_id>/results/<int:result_id>', methods=['DELETE'])
@jwt_required()
def delete_result(game_id, result_id):
    """
    Delete a specific result for a team in a game
    ---
    tags:
      - Results
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
        description: ID of the game
      - name: result_id
        in: path
        type: integer
        required: true
        description: ID of the result to delete
    responses:
      200:
        description: Result deleted successfully
      403:
        description: Admin access required
      404:
        description: Result or Game not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    result = Result.query.get(result_id)
    if not result or result.game_id != game.id:
        return jsonify({"error": "Result not found in this game"}), 404

    db.session.delete(result)
    db.session.commit()

    return jsonify({"message": "Result deleted successfully"}), 200
