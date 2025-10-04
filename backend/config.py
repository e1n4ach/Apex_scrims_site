from pathlib import Path

# где храним картинки карт
UPLOAD_DIR = Path("static/maps")

# ограничения
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
