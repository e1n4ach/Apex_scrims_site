from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Announcement, User

announcement_bp = Blueprint('announcement', __name__)

# ==============================
# Announcements
# ==============================

@announcement_bp.route('/announcements', methods=['GET'])
def get_announcements():
    """
    Get all announcements (public)
    ---
    tags:
      - Announcements
    responses:
      200:
        description: List of announcements
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              title:
                type: string
              time:
                type: string
              prize:
                type: string
    """
    announcements = Announcement.query.all()
    return jsonify([{
        "id": a.id,
        "title": a.title,
        "time": a.time or a.description or "Не указано",
        "prize": a.prize or a.date or "Не указано"
    } for a in announcements]), 200


@announcement_bp.route('/announcements', methods=['POST'])
@jwt_required()
def create_announcement():
    """
    Create a new announcement (Admin only)
    ---
    tags:
      - Announcements
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
              description: Tournament title
            time:
              type: string
              description: Tournament time
            prize:
              type: string
              description: Prize pool
    responses:
      201:
        description: Announcement created successfully
      400:
        description: Missing required fields
      403:
        description: Admin access required
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json() or {}
    title = data.get('title')
    time = data.get('time')
    prize = data.get('prize')

    if not title or not time or not prize:
        return jsonify({"error": "title, time, and prize are required"}), 400

    announcement = Announcement(
        title=title, 
        time=time, 
        prize=prize,
        description=time,  # Дублируем для совместимости
        date=prize  # Дублируем для совместимости
    )
    db.session.add(announcement)
    db.session.commit()

    return jsonify({
        "message": "Announcement created successfully",
        "announcement": {
            "id": announcement.id,
            "title": announcement.title,
            "time": announcement.time,
            "prize": announcement.prize
        }
    }), 201


@announcement_bp.route('/announcements/<int:announcement_id>', methods=['PUT'])
@jwt_required()
def update_announcement(announcement_id):
    """
    Update an announcement (Admin only)
    ---
    tags:
      - Announcements
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: announcement_id
        type: integer
        required: true
        description: ID of the announcement
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
              description: Tournament title
            time:
              type: string
              description: Tournament time
            prize:
              type: string
              description: Prize pool
    responses:
      200:
        description: Announcement updated successfully
      403:
        description: Admin access required
      404:
        description: Announcement not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    announcement = Announcement.query.get(announcement_id)
    if not announcement:
        return jsonify({"error": "Announcement not found"}), 404

    data = request.get_json() or {}
    if 'title' in data:
        announcement.title = data['title']
    if 'time' in data:
        announcement.time = data['time']
        announcement.description = data['time']  # Дублируем для совместимости
    if 'prize' in data:
        announcement.prize = data['prize']
        announcement.date = data['prize']  # Дублируем для совместимости

    db.session.commit()

    return jsonify({
        "message": "Announcement updated successfully",
        "announcement": {
            "id": announcement.id,
            "title": announcement.title,
            "time": announcement.time,
            "prize": announcement.prize
        }
    }), 200


@announcement_bp.route('/announcements/<int:announcement_id>', methods=['DELETE'])
@jwt_required()
def delete_announcement(announcement_id):
    """
    Delete an announcement (Admin only)
    ---
    tags:
      - Announcements
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: announcement_id
        type: integer
        required: true
        description: ID of the announcement
    responses:
      200:
        description: Announcement deleted successfully
      403:
        description: Admin access required
      404:
        description: Announcement not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    announcement = Announcement.query.get(announcement_id)
    if not announcement:
        return jsonify({"error": "Announcement not found"}), 404

    db.session.delete(announcement)
    db.session.commit()

    return jsonify({"message": "Announcement deleted successfully"}), 200
