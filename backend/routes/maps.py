from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Map, DropzoneTemplate, User

maps_bp = Blueprint("maps", __name__)

# ========== MAP ROUTES ==========

@maps_bp.route("/maps", methods=["GET"])
def get_maps():
    """
    Get maps list
    ---
    tags:
      - Maps
    responses:
      200:
        description: List of maps
    """
    maps = Map.query.all()
    return jsonify([{
        "id": m.id,
        "name": m.name,
        "image_url": m.image_url
    } for m in maps]), 200


@maps_bp.route("/maps", methods=["POST"])
@jwt_required()
def create_map():
    """
    Create a map (Admin only)
    ---
    tags:
      - Maps
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name: {type: string}
            image_url: {type: string}
    responses:
      201:
        description: Map created
      400:
        description: Name and image_url are required / duplicate name
      403:
        description: Admin access required
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}
    name = data.get("name")
    image_url = data.get("image_url")

    if not name or not image_url:
        return jsonify({"error": "Name and image_url are required"}), 400

    if Map.query.filter_by(name=name).first():
        return jsonify({"error": "Map with this name already exists"}), 400

    new_map = Map(name=name, image_url=image_url)
    db.session.add(new_map)
    db.session.commit()
    return jsonify({"message": "Map created", "id": new_map.id}), 201


@maps_bp.route("/maps/<int:map_id>", methods=["DELETE"])
@jwt_required()
def delete_map(map_id):
    """
    Delete a map (Admin only)
    ---
    tags:
      - Maps
    security:
      - BearerAuth: []
    parameters:
      - name: map_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Map deleted
      403:
        description: Admin access required
      404:
        description: Map not found
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    m = Map.query.get_or_404(map_id)
    db.session.delete(m)
    db.session.commit()
    return jsonify({"message": "Map deleted"}), 200


# ========== DROPZONE TEMPLATE ROUTES ==========

@maps_bp.route("/maps/<int:map_id>/dropzones", methods=["GET"])
def get_dropzones(map_id):
    """
    Get dropzone templates for a map
    ---
    tags:
      - Drop Zones (Templates)
    parameters:
      - name: map_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Dropzone templates list
    """
    zones = DropzoneTemplate.query.filter_by(map_id=map_id).all()
    return jsonify([{
        "id": z.id,
        "name": z.name,
        "x_percent": z.x_percent,
        "y_percent": z.y_percent,
        "radius": z.radius,
        "capacity": z.capacity
    } for z in zones]), 200


@maps_bp.route("/maps/<int:map_id>/dropzones", methods=["POST"])
@jwt_required()
def create_dropzone(map_id):
    """
    Create a dropzone template for a map (Admin only)
    ---
    tags:
      - Drop Zones (Templates)
    security:
      - BearerAuth: []
    parameters:
      - name: map_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name: {type: string}
            x_percent: {type: number}
            y_percent: {type: number}
            radius: {type: number}
            capacity: {type: integer}
    responses:
      201:
        description: Dropzone created
      400:
        description: Invalid fields
      403:
        description: Admin access required
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}
    name = data.get("name")
    x_percent = data.get("x_percent")
    y_percent = data.get("y_percent")
    radius = data.get("radius", 5)
    capacity = data.get("capacity", 1)

    if not name or x_percent is None or y_percent is None:
        return jsonify({"error": "Name, x_percent, and y_percent are required"}), 400

    if not (0 <= x_percent <= 100 and 0 <= y_percent <= 100):
        return jsonify({"error": "x_percent and y_percent must be between 0 and 100"}), 400

    dropzone = DropzoneTemplate(
        map_id=map_id,
        name=name,
        x_percent=x_percent,
        y_percent=y_percent,
        radius=radius,
        capacity=capacity
    )
    db.session.add(dropzone)
    db.session.commit()
    return jsonify({"message": "Dropzone created", "id": dropzone.id}), 201


@maps_bp.route("/dropzones/<int:dropzone_id>", methods=["DELETE"])
@jwt_required()
def delete_dropzone(dropzone_id):
    """
    Delete a dropzone template (Admin only)
    ---
    tags:
      - Drop Zones (Templates)
    security:
      - BearerAuth: []
    parameters:
      - name: dropzone_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Dropzone deleted
      403:
        description: Admin access required
      404:
        description: Dropzone not found
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    z = DropzoneTemplate.query.get_or_404(dropzone_id)
    db.session.delete(z)
    db.session.commit()
    return jsonify({"message": "Dropzone deleted"}), 200
