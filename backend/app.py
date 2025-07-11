from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate


# Создаем Flask-приложение
app = Flask(__name__)

# Конфигурация
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key'  # ПОТОМ ЗАМЕНИ НА СВОЙ

# Инициализация расширений
CORS(app)
db = SQLAlchemy(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)


from models import User, Lobby, Game, Team, Player, Result, DropZone, Announcement

# Пример роут для проверки
@app.route('/api/hello', methods=['GET'])
def hello():
    return {"message": "Hello from Flask backend!"}, 200

if __name__ == "__main__":
    app.run(debug=True)
