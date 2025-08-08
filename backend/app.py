from flask import Flask
from flasgger import Swagger
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

# Инициализация Flask-приложения
app = Flask(__name__)

# Конфигурация базы данных и JWT
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key'  # замени на свой в проде

# Настройки Swagger
app.config['SWAGGER'] = {
    'title': 'Apex Scrims API',
    'uiversion': 3
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Apex Scrims API",
        "version": "0.0.1",
        "description": "API for managing Apex scrims."
    },
    "securityDefinitions": {
        "BearerAuth": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header **with** Bearer prefix. Example: 'Bearer {token}'"
        }
    },
    "security": [
        {
            "BearerAuth": []
        }
    ]
}

# Инициализация Swagger с шаблоном
swagger = Swagger(app, template=swagger_template)

# Инициализация расширений
CORS(app)
db = SQLAlchemy(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)

# Регистрация Blueprints
from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix='/api/auth')

from routes.lobby import lobby_bp
app.register_blueprint(lobby_bp, url_prefix='/api/lobbies')

from routes.team import team_bp
app.register_blueprint(team_bp, url_prefix='/api')

from routes.game import game_bp
app.register_blueprint(game_bp, url_prefix='/api')

from routes.dropzone import dropzone_bp
app.register_blueprint(dropzone_bp, url_prefix='/api')

# Импорт моделей для миграций
from models import User, Lobby, Game, Team, Player, Result, DropZone, Announcement

# Пример простой проверки
@app.route('/api/hello', methods=['GET'])
def hello():
    return {"message": "Hello from Flask backend!"}, 200

if __name__ == "__main__":
    app.run(debug=True)
