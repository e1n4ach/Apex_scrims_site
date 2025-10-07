from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Game, Map, DropzoneTemplate, DropzoneAssignment, Team, Player, User, Lobby

dropzone_bp = Blueprint('dropzone', __name__)


# ========================
# GAME DROPZONES (Assignments)
# ========================

@dropzone_bp.route('/games/<int:game_id>/dropzones', methods=['POST'])
@jwt_required()
def create_dropzones_for_game(game_id):
    """
    Create dropzones for a game based on its map templates (Admin only)
    ---
    tags:
      - Drop Zones (Assignments)
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
    responses:
      201:
        description: Dropzones created for game
      400:
        description: No map on game / no templates for map
      403:
        description: Admin access required
      404:
        description: Game not found
    """
    user = User.query.get(int(get_jwt_identity()))
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    if not game.map_id:
        return jsonify({"error": "Game has no map assigned"}), 400

    templates = DropzoneTemplate.query.filter_by(map_id=game.map_id).all()
    if not templates:
        return jsonify({"error": "No templates for this map"}), 400

    # ensure one assignment per template for this game
    existing = DropzoneAssignment.query.filter_by(game_id=game.id).all()
    existing_zone_ids = {a.dropzone_id for a in existing}

    created = 0
    for t in templates:
        if t.id in existing_zone_ids:
            continue
        assignment = DropzoneAssignment(game_id=game.id, dropzone_id=t.id)
        db.session.add(assignment)
        created += 1

    db.session.commit()
    return jsonify({"message": "Dropzones created for game", "created": created}), 201


@dropzone_bp.route('/games/<int:game_id>/dropzones', methods=['GET'])
def get_dropzones_for_game(game_id):
    """
    Get game dropzones (templates + current team assignments)
    ---
    tags:
      - Drop Zones (Assignments)
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: List of dropzones with assignment info
    """
    assignments = DropzoneAssignment.query.filter_by(game_id=game_id).all()
    result = []
    for a in assignments:
        template = DropzoneTemplate.query.get(a.dropzone_id)
        result.append({
            "assignment_id": a.id,
            "dropzone_id": template.id,
            "name": template.name,
            "x_percent": template.x_percent,
            "y_percent": template.y_percent,
            "radius": template.radius,
            "capacity": template.capacity,
            "team_id": a.team_id
        })
    return jsonify(result), 200


# ========================
# TEAM ASSIGN / REMOVE
# ========================

@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:assignment_id>/assign', methods=['POST'])
@jwt_required()
def assign_team(game_id, assignment_id):
    """
    Assign a team to a dropzone assignment
    ---
    tags:
      - Drop Zones (Assignments)
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: assignment_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            team_id: {type: integer, example: 5}
    responses:
      200:
        description: Team assigned
      400:
        description: Missing team_id
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Not found
      409:
        description: Team already assigned elsewhere
    """
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    assignment = DropzoneAssignment.query.get(assignment_id)
    if not assignment or assignment.game_id != game_id:
        return jsonify({"error": "Dropzone not found"}), 404

    data = request.get_json() or {}
    team_id = data.get('team_id')
    if not team_id:
        return jsonify({"error": "Missing team_id"}), 400

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # team must belong to the same lobby as the game
    game = Game.query.get(game_id)
    if team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    # permissions: admin or player of this team
    if not user.is_admin:
        player = Player.query.filter_by(username=user.username, team_id=team.id).first()
        if not player:
            return jsonify({"error": "You cannot assign for this team"}), 403

    # team must not be assigned to any other assignment in this game
    already_assigned = DropzoneAssignment.query.filter_by(game_id=game_id, team_id=team.id).first()
    if already_assigned:
        return jsonify({"error": "Team already assigned"}), 409

    assignment.team_id = team.id
    
    db.session.commit()

    return jsonify({"message": "Team assigned"}), 200


@dropzone_bp.route('/games/<int:game_id>/dropzones/assign-by-template/<int:template_id>', methods=['POST'])
@jwt_required()
def assign_team_by_template(game_id, template_id):
    """
    Assign a team to a dropzone by template ID (creates assignment if needed)
    ---
    tags:
      - Drop Zones (Assignments)
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: template_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            team_id: {type: integer, example: 5}
    responses:
      200:
        description: Team assigned
      201:
        description: Assignment created and team assigned
      400:
        description: Missing team_id
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Not found
      409:
        description: Team already assigned elsewhere
    """
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    template = DropzoneTemplate.query.get(template_id)
    if not template or template.map_id != game.map_id:
        return jsonify({"error": "Dropzone template not found for this game"}), 404

    data = request.get_json() or {}
    team_id = data.get('team_id')
    if not team_id:
        return jsonify({"error": "Missing team_id"}), 400

    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404

    # team must belong to the same lobby as the game
    if team.lobby_id != game.lobby_id:
        return jsonify({"error": "Team not found in this lobby"}), 404

    # permissions: admin or player of this team
    if not user.is_admin:
        player = Player.query.filter_by(username=user.username, team_id=team.id).first()
        if not player:
            return jsonify({"error": "You cannot assign for this team"}), 403

    # team must not be assigned to any other assignment in this game
    already_assigned = DropzoneAssignment.query.filter_by(game_id=game_id, team_id=team.id).first()
    if already_assigned:
        return jsonify({"error": "Team already assigned"}), 409

    # check if team is already assigned to this dropzone
    existing_assignment = DropzoneAssignment.query.filter_by(
        game_id=game_id, 
        dropzone_id=template_id, 
        team_id=team.id
    ).first()
    if existing_assignment:
        return jsonify({"error": "Team already assigned to this dropzone"}), 409

    # check capacity
    current_assignments = DropzoneAssignment.query.filter_by(
        game_id=game_id, 
        dropzone_id=template_id
    ).count()
    
    if current_assignments >= template.capacity:
        return jsonify({"error": f"Dropzone is at full capacity ({template.capacity} teams)"}), 409

    # create new assignment for this team
    assignment = DropzoneAssignment(
        game_id=game_id, 
        dropzone_id=template_id, 
        team_id=team.id
    )
    db.session.add(assignment)
    db.session.commit()

    return jsonify({"message": "Team assigned to dropzone", "assignment_id": assignment.id}), 201


@dropzone_bp.route('/games/<int:game_id>/dropzones/<int:assignment_id>/remove', methods=['DELETE'])
@jwt_required()
def remove_team(game_id, assignment_id):
    """
    Remove team from a dropzone assignment
    ---
    tags:
      - Drop Zones (Assignments)
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: assignment_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Team removed
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Not found
    """
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    assignment = DropzoneAssignment.query.get(assignment_id)
    if not assignment or assignment.game_id != game_id:
        return jsonify({"error": "Dropzone not found"}), 404
    

    # admin or the assigned team itself
    if not user.is_admin:
        # Находим игрока в команде, которая назначена на эту дропзону
        if not assignment.team_id:
            return jsonify({"error": "No team assigned to this dropzone"}), 404
            
        # Проверяем, является ли пользователь игроком команды, назначенной на это assignment
        player = Player.query.filter_by(
            username=user.username, 
            team_id=assignment.team_id
        ).first()
        if not player:
            return jsonify({"error": "You cannot remove this team"}), 403

    # Удаляем назначение полностью
    db.session.delete(assignment)
    db.session.commit()

    return jsonify({"message": "Team removed"}), 200


@dropzone_bp.route('/games/<int:game_id>/dropzones/remove-by-template/<int:template_id>', methods=['DELETE'])
@jwt_required()
def remove_team_by_template(game_id, template_id):
    """
    Remove team from a dropzone by template ID
    ---
    tags:
      - Drop Zones (Assignments)
    security:
      - BearerAuth: []
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
      - name: template_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Team removed
      401:
        description: Unauthorized
      403:
        description: Forbidden
      404:
        description: Not found
    """
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    game = Game.query.get(game_id)
    if not game:
        return jsonify({"error": "Game not found"}), 404

    template = DropzoneTemplate.query.get(template_id)
    if not template or template.map_id != game.map_id:
        return jsonify({"error": "Dropzone template not found for this game"}), 404

    # find user's team assignment to this dropzone
    if not user.is_admin:
        player = Player.query.filter_by(username=user.username).first()
        if not player:
            return jsonify({"error": "You are not a player"}), 403
        
        assignment = DropzoneAssignment.query.filter_by(
            game_id=game_id, 
            dropzone_id=template_id, 
            team_id=player.team_id
        ).first()
        
        if not assignment:
            return jsonify({"error": "Your team is not assigned to this dropzone"}), 404
    else:
        # admin can remove any team - we need team_id in request
        data = request.get_json() or {}
        team_id = data.get('team_id')
        if not team_id:
            return jsonify({"error": "team_id required for admin removal"}), 400
            
        assignment = DropzoneAssignment.query.filter_by(
            game_id=game_id, 
            dropzone_id=template_id, 
            team_id=team_id
        ).first()
        
        if not assignment:
            return jsonify({"error": "Team not assigned to this dropzone"}), 404

    db.session.delete(assignment)
    db.session.commit()

    return jsonify({"message": "Team removed from dropzone"}), 200


@dropzone_bp.route('/dropzones/for-game/<int:game_id>', methods=['GET'])
def get_dropzones_for_game_full(game_id):
    """
    Full dropzone view for a game: map templates + assignment_id + team info
    (не конфликтует с /games/<id>/dropzones из других файлов)
    ---
    tags:
      - Drop Zones (Assignments)
    parameters:
      - name: game_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Dropzones with assignment and team info
    """
    game = Game.query.get(game_id)
    if not game:
      return jsonify({"error": "Game not found"}), 404

    # все зоны карты (шаблоны)
    templates = DropzoneTemplate.query.filter_by(map_id=game.map_id).all()

    # все назначения для этой игры
    assns = DropzoneAssignment.query.filter_by(game_id=game.id).all()
    by_zone = {}
    for a in assns:
        if a.dropzone_id not in by_zone:
            by_zone[a.dropzone_id] = []
        team = Team.query.get(a.team_id) if a.team_id else None
        by_zone[a.dropzone_id].append({
            "assignment_id": a.id,
            "team_id": a.team_id,
            "team_name": team.name if team else None,
        })

    out = []
    for t in templates:
        assignments = by_zone.get(t.id, [])
        out.append({
            "id": t.id,               # id шаблона зоны (для ключа/отображения)
            "name": t.name,
            "x_percent": t.x_percent,
            "y_percent": t.y_percent,
            "radius": t.radius,
            "capacity": t.capacity,
            "current_teams": len(assignments),
            "teams": assignments,     # список всех команд в этой зоне
            # для обратной совместимости
            "assignment_id": assignments[0]["assignment_id"] if assignments else None,
            "team_id": assignments[0]["team_id"] if assignments else None,
            "team_name": assignments[0]["team_name"] if assignments else None,
        })
    return jsonify(out), 200
  