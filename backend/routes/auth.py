from flask import Blueprint, request, jsonify
from app import db
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            email:
              type: string
            password:
              type: string
            discord:
              type: string
    responses:
      201:
        description: User registered successfully
      400:
        description: Missing required fields or user exists
    """
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    discord = data.get('discord')

    if not username or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        return jsonify({"error": "User with that username or email already exists"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        username=username,
        email=email,
        password_hash=hashed_password,
        discord=discord
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login a user
    ---
    tags:
      - Auth
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Access token and user info
      400:
        description: Missing username or password
      401:
        description: Invalid credentials
    """
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid username or password"}), 401

    # ✅ identity как int (не строка)
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "username": user.username,
        "email": user.email,
        "discord": user.discord,
        "is_admin": user.is_admin
    }), 200


@auth_bp.route('/account', methods=['GET'])
@jwt_required()
def account():
    """
    Get current user's account info
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: User details
        schema:
          type: object
          properties:
            id:
              type: integer
            username:
              type: string
            email:
              type: string
            discord:
              type: string
            is_admin:
              type: boolean
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "discord": user.discord,
        "is_admin": user.is_admin
    }), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """
    Get all users (Admin only)
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: List of users
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              username:
                type: string
              email:
                type: string
              discord:
                type: string
              is_admin:
                type: boolean
      403:
        description: Admin access required
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "discord": u.discord,
            "is_admin": u.is_admin
        })
    return jsonify(result), 200


@auth_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """
    Delete your own account
    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: Account deleted successfully
      404:
        description: User not found
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "Your account has been deleted."}), 200
