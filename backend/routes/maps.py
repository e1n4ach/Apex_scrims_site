# routes/maps.py
from flask import Blueprint, request, jsonify, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from uuid import uuid4

from app import db
from models import Map, DropzoneTemplate, User
from config import UPLOAD_DIR, ALLOWED_EXT

maps_bp = Blueprint("maps", __name__)

# ===== helpers =====

def _allowed(name: str) -> bool:
    return "." in name and name.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def _map_url(m: Map) -> str:
    # абсолютная ссылка на файл из static/maps
    return url_for("static", filename=f"maps/{m.image_filename}", _external=True)

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
        schema:
          type: array
          items:
            type: object
            properties:
              id: {type: integer}
              name: {type: string}
              image_url: {type: string}
    """
    maps = Map.query.all()
    return jsonify([{
        "id": m.id,
        "name": m.name,
        "image_url": _map_url(m)
    } for m in maps]), 200


@maps_bp.route("/maps/upload", methods=["POST"])
@jwt_required()
def upload_map_image():
    """
    Upload map image (PNG/JPG/WEBP). Admin only.
    ---
    tags:
      - Maps
    security:
      - BearerAuth: []
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: Image file (png/jpg/jpeg/webp), up to 5MB
    responses:
      201:
        description: Uploaded successfully
        schema:
          type: object
          properties:
            filename: {type: string}
            url: {type: string}
      400:
        description: No file / invalid type
      403:
        description: Admin access required
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "No file"}), 400
    if not _allowed(f.filename):
        return jsonify({"error": "Invalid file type"}), 400

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}_{secure_filename(f.filename)}"
    f.save(UPLOAD_DIR / filename)

    return jsonify({
        "filename": filename,
        "url": url_for("static", filename=f"maps/{filename}", _external=True)
    }), 201


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
            image_filename: {type: string, description: "Value from /maps/upload response"}
    responses:
      201:
        description: Map created
        schema:
          type: object
          properties:
            message: {type: string}
            id: {type: integer}
      400:
        description: name and image_filename are required / file not found / duplicate name
      403:
        description: Admin access required
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}
    name = data.get("name")
    image_filename = data.get("image_filename")

    if not name or not image_filename:
        return jsonify({"error": "name and image_filename are required"}), 400

    if not (UPLOAD_DIR / image_filename).exists():
        return jsonify({"error": "Uploaded file not found on server"}), 400

    if Map.query.filter_by(name=name).first():
        return jsonify({"error": "Map with this name already exists"}), 400

    m = Map(name=name, image_filename=image_filename)
    db.session.add(m)
    db.session.commit()
    return jsonify({"message": "Map created", "id": m.id}), 201


@maps_bp.route("/maps/<int:map_id>", methods=["PATCH"])
@jwt_required()
def update_map(map_id):
    """
    Update map (rename and/or change image). Admin only.
    ---
    tags:
      - Maps
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: map_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name: {type: string}
            image_filename: {type: string, description: "New filename from /maps/upload"}
            delete_old_file: {type: boolean, description: "Delete previous image if unused", default: false}
    responses:
      200:
        description: Map updated
      400:
        description: File not found on server
      403:
        description: Admin access required
      404:
        description: Map not found
    """
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    m = Map.query.get(map_id)
    if not m:
        return jsonify({"error": "Map not found"}), 404

    data = request.get_json() or {}
    new_name = data.get("name")
    new_filename = data.get("image_filename")
    delete_old = bool(data.get("delete_old_file"))

    old_filename = m.image_filename

    if new_name is not None:
        m.name = new_name

    if new_filename:
        if not (UPLOAD_DIR / new_filename).exists():
            return jsonify({"error": "Uploaded file not found on server"}), 400
        m.image_filename = new_filename

    db.session.commit()

    # при желании удалим старый файл, если он больше не используется никакой картой
    if new_filename and delete_old:
        still_used = Map.query.filter_by(image_filename=old_filename).first()
        if not still_used:
            try:
                (UPLOAD_DIR / old_filename).unlink(missing_ok=True)
            except Exception:
                pass

    return jsonify({"message": "Map updated"}), 200


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
      - in: path
        name: map_id
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
    filename = m.image_filename

    db.session.delete(m)
    db.session.commit()

    # удаляем физический файл, если он больше не используется
    still = Map.query.filter_by(image_filename=filename).first()
    if not still:
        try:
            (UPLOAD_DIR / filename).unlink(missing_ok=True)
        except Exception:
            pass

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
        schema:
          type: array
          items:
            type: object
            properties:
              id: {type: integer}
              name: {type: string}
              x_percent: {type: number}
              y_percent: {type: number}
              radius: {type: number}
              capacity: {type: integer}
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
