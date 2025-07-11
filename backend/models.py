from flask_sqlalchemy import SQLAlchemy
from app import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    discord = db.Column(db.String(120))
    is_admin = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f"<User {self.username}>"


class Lobby(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    teams = db.relationship('Team', backref='lobby', lazy=True)
    games = db.relationship('Game', backref='lobby', lazy=True)
    drop_zones = db.relationship('DropZone', backref='lobby', lazy=True)

    def __repr__(self):
        return f"<Lobby {self.name}>"


class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey('lobby.id'), nullable=False)
    number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(120))  # название карты или опциональное описание

    results = db.relationship('Result', backref='game', lazy=True)

    def __repr__(self):
        return f"<Game {self.number} in Lobby {self.lobby_id}>"


class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey('lobby.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    players = db.relationship('Player', backref='team', lazy=True)
    results = db.relationship('Result', backref='team', lazy=True)
    drop_zones = db.relationship('DropZone', backref='team', lazy=True)

    def __repr__(self):
        return f"<Team {self.name}>"


class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    username = db.Column(db.String(120), nullable=False)

    def __repr__(self):
        return f"<Player {self.username}>"


class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    place = db.Column(db.Integer)
    kills = db.Column(db.Integer)
    points = db.Column(db.Integer)

    def __repr__(self):
        return f"<Result Game {self.game_id} Team {self.team_id}>"


class DropZone(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lobby_id = db.Column(db.Integer, db.ForeignKey('lobby.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=True)
    name = db.Column(db.String(120))
    x_percent = db.Column(db.Float)
    y_percent = db.Column(db.Float)

    def __repr__(self):
        return f"<DropZone {self.name}>"


class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(120))
    prize = db.Column(db.String(120))

    def __repr__(self):
        return f"<Announcement {self.title}>"
