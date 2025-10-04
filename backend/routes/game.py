from flask import Blueprint, request, jsonify, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import (
    Lobby, Game, User, Map,
    Result, Team,
)

game_bp = Blueprint("game", __name__)

def _serialize_game(g: Game):
    return {
        "id": g.id,
        "number": g.number,
        "lobby_id": g.lobby_id,
        "map": {
            "id": g.map.id,
            "name": g.map.name,
            "image_url": url_for("static", filename=f"maps/{g.map.image_filename}", _external=True)
        } if g.map else None
    }

# ==============================
# Games
# ==============================
@game_bp.route("/lobbies/<int:lobby_id>/games", methods=["POST"])
@jwt_required()
def create_game(lobby_id):
    """
    Create a new game in a lobby (Admin only)
    ---
    tags:
      - Games
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lobby_id
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
              description: Game number in the lobby
            map_id:
              type: integer
              description: ID of the map for this game
    responses:
      201:
        description: Game created successfully
        schema:
          type: object
          properties:
            message:
              type: string
            game:
              type: object
              properties:
                id:
                  type: integer
                number:
                  type: integer
                lobby_id:
                  type: integer
                map:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    image_url:
                      type: string
      400:
        description: Missing required fields
      403:
        description: Admin access required
      404:
        description: Lobby or map not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    data = request.get_json() or {}
    number = data.get("number")
    map_id = data.get("map_id")

    if number is None or map_id is None:
        return jsonify({"error": "number and map_id are required"}), 400

    m = Map.query.get(map_id)
    if not m:
        return jsonify({"error": "Map not found"}), 404

    new_game = Game(lobby_id=lobby.id, number=number, map_id=m.id)
    db.session.add(new_game)
    db.session.commit()

    return jsonify({"message": "Game created", "game": _serialize_game(new_game)}), 201


@game_bp.route("/lobbies/<int:lobby_id>/games", methods=["GET"])
def get_games_for_lobby(lobby_id):
    """
    List games for a lobby (with embedded map)
    ---
    tags:
      - Games
    parameters:
      - in: path
        name: lobby_id
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
              lobby_id:
                type: integer
              map:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  image_url:
                    type: string
      404:
        description: Lobby not found
    """
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    games = (
        Game.query
        .filter_by(lobby_id=lobby.id)
        .order_by(Game.number.asc())
        .all()
    )
    return jsonify([_serialize_game(g) for g in games]), 200


@game_bp.route("/lobbies/<int:lobby_id>/games/<int:game_id>", methods=["DELETE"])
@jwt_required()
def delete_game(lobby_id, game_id):
    """
    Delete a game (Admin only)
    ---
    tags:
      - Games
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: lobby_id
        type: integer
        required: true
        description: ID of the lobby
      - in: path
        name: game_id
        type: integer
        required: true
        description: ID of the game to delete
    responses:
      200:
        description: Game deleted successfully
        schema:
          type: object
          properties:
            message:
              type: string
      403:
        description: Admin access required
      404:
        description: Lobby or game not found
    """
    user_id = int(get_jwt_identity())
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


# ==============================
# Results
# ==============================
@game_bp.route("/games/<int:game_id>/results", methods=["POST"])
@jwt_required()
def add_result(game_id):
    """
    Add a result for a team in a game (Admin only)
    ---
    tags:
      - Results
    security:
      - Bearer: []
    parameters:
      - in: path
        name: game_id
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
              description: ID of the team
            place:
              type: integer
              description: Team's placement in the game
            kills:
              type: integer
              description: Number of kills
            points:
              type: integer
              description: Points earned
    responses:
      201:
        description: Result saved successfully
        schema:
          type: object
          properties:
            message:
              type: string
            result:
              type: object
              properties:
                id:
                  type: integer
                game_id:
                  type: integer
                team_id:
                  type: integer
                place:
                  type: integer
                kills:
                  type: integer
                points:
                  type: integer
      400:
        description: Missing required fields
      403:
        description: Admin access required
      404:
        description: Game or team not found
      409:
        description: Result for this team already exists
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    data = request.get_json() or {}
    team_id = data.get("team_id")
    place = data.get("place")
    kills = data.get("kills")
    points = data.get("points")

    if not team_id:
        return jsonify({"error": "team_id is required"}), 400

    team = Team.query.get(team_id)
    if not team or team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    existing = Result.query.filter_by(game_id=game.id, team_id=team.id).first()
    if existing:
        return jsonify({"error": "Result for this team already exists"}), 409

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


@game_bp.route("/games/<int:game_id>/results", methods=["GET"])
def get_results_for_game(game_id):
    """
    Get results for a game
    ---
    tags:
      - Results
    parameters:
      - in: path
        name: game_id
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

    results = (
        Result.query
        .filter_by(game_id=game.id)
        .order_by(Result.points.desc(), Result.kills.desc())  # проще и кросс-СУБД
        .all()
    )
    output = []
    for r in results:
        team = Team.query.get(r.team_id)
        output.append({
            "id": r.id,
            "team_id": r.team_id,
            "team_name": team.name if team else None,
            "place": r.place,
            "kills": r.kills,
            "points": r.points
        })
    return jsonify(output), 200


@game_bp.route("/lobbies/<int:lobby_id>/results/summary", methods=["GET"])
def get_lobby_results_summary(lobby_id):
    """
    Aggregate results for a lobby (public)
    ---
    tags:
      - Results
    parameters:
      - in: path
        name: lobby_id
        type: integer
        required: true
        description: ID of the lobby
    responses:
      200:
        description: Summary of all results in the lobby
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
      404:
        description: Lobby not found
    """
    lobby = Lobby.query.get(lobby_id)
    if not lobby:
        return jsonify({"error": "Lobby not found"}), 404

    games = Game.query.filter_by(lobby_id=lobby.id).all()
    game_ids = [g.id for g in games]
    if not game_ids:
        return jsonify([]), 200

    all_results = Result.query.filter(Result.game_id.in_(game_ids)).all()
    summary = {}
    for r in all_results:
        if r.team_id not in summary:
            summary[r.team_id] = {"kills": 0, "points": 0}
        summary[r.team_id]["kills"] += r.kills or 0
        summary[r.team_id]["points"] += r.points or 0

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
    # можно отсортировать итоговую таблицу
    output.sort(key=lambda x: (x["points_total"], x["kills_total"]), reverse=True)
    return jsonify(output), 200


@game_bp.route("/games/<int:game_id>/results/<int:result_id>", methods=["PATCH"])
@jwt_required()
def update_result(game_id, result_id):
    """
    Update an existing result (Admin only)
    ---
    tags:
      - Results
    security:
      - Bearer: []
    parameters:
      - in: path
        name: game_id
        type: integer
        required: true
        description: ID of the game
      - in: path
        name: result_id
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
              description: Team's placement in the game
            kills:
              type: integer
              description: Number of kills
            points:
              type: integer
              description: Points earned
    responses:
      200:
        description: Result updated successfully
        schema:
          type: object
          properties:
            message:
              type: string
            result:
              type: object
              properties:
                id:
                  type: integer
                game_id:
                  type: integer
                team_id:
                  type: integer
                place:
                  type: integer
                kills:
                  type: integer
                points:
                  type: integer
      403:
        description: Admin access required
      404:
        description: Game or result not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    result = Result.query.get(result_id)
    if not result or result.game_id != game.id:
        return jsonify({"error": "Result not found in this game"}), 404

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


@game_bp.route("/games/<int:game_id>/results/<int:result_id>", methods=["DELETE"])
@jwt_required()
def delete_result(game_id, result_id):
    """
    Delete a result (Admin only)
    ---
    tags:
      - Results
    security:
      - Bearer: []
    parameters:
      - in: path
        name: game_id
        type: integer
        required: true
        description: ID of the game
      - in: path
        name: result_id
        type: integer
        required: true
        description: ID of the result to delete
    responses:
      200:
        description: Result deleted successfully
        schema:
          type: object
          properties:
            message:
              type: string
      403:
        description: Admin access required
      404:
        description: Game or result not found
    """
    user_id = int(get_jwt_identity())
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
