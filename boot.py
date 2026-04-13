import os
import logging
import sqlite3
import threading
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, LabeledPrice
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# ==================== ENV ====================
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
SITE_URL = os.getenv("SITE_URL")
API_KEY = os.getenv("API_KEY")

API_PORT = 5000

# ==================== LOGGING ====================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bot")

# ==================== DATABASE ====================
def get_db():
    conn = sqlite3.connect("bot.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        points INTEGER DEFAULT 0,
        joined_at TEXT
    );
    """)
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = get_db()
    u = conn.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    return dict(u) if u else None

def add_points(user_id, points):
    conn = get_db()
    conn.execute("""
        INSERT INTO users (user_id, points, joined_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET points = points + ?
    """, (user_id, points, datetime.now().isoformat(), points))
    conn.commit()
    conn.close()

# ==================== FLASK ====================
app = Flask(__name__)
CORS(app)

# ----  API KEY ----
def require_key(func):
    def wrapper(*args, **kwargs):
        key = request.headers.get("X-API-KEY")
        if key != API_KEY:
            return jsonify({"ok": False, "error": "unauthorized"}), 403
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

# ==================== API ====================
@app.route("/api/add_points", methods=["POST"])
@require_key
def api_add_points():
    data = request.get_json()

    user_id = data.get("user_id")
    points = int(data.get("points", 0))

    if not user_id or points <= 0:
        return jsonify({"ok": False}), 400

    add_points(int(user_id), points)
    return jsonify({"ok": True})


@app.route("/api/user/<int:user_id>")
@require_key
def api_user(user_id):
    u = get_user(user_id)
    if not u:
        return jsonify({"ok": False}), 404
    return jsonify({"ok": True, "user": u})


def run_flask():
    app.run(host="0.0.0.0", port=API_PORT, debug=False, use_reloader=False)

# ==================== BOT ====================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user

    conn = get_db()
    conn.execute("""
        INSERT OR IGNORE INTO users (user_id, points, joined_at)
        VALUES (?, 0, ?)
    """, (user.id, datetime.now().isoformat()))
    conn.commit()
    conn.close()

    keyboard = [
        [InlineKeyboardButton(" Play", url=f"{SITE_URL}?user_id={user.id}")],
        [InlineKeyboardButton(" Balance", callback_data="balance")]
    ]

    await update.message.reply_text(
        f" Welcome {user.first_name}",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    await q.answer()

    u = get_user(q.from_user.id)
    points = u["points"] if u else 0

    await q.edit_message_text(
        f" Balance: {points} points"
    )


async def btn_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    data = q.data

    if data == "balance":
        await balance(update, context)

# ==================== START ====================
def main():
    init_db()

    # Flask thread
    threading.Thread(target=run_flask, daemon=True).start()

    # Telegram bot
    app_bot = Application.builder().token(BOT_TOKEN).build()

    app_bot.add_handler(CommandHandler("start", start))
    app_bot.add_handler(CallbackQueryHandler(btn_handler))

    logger.info("Bot running...")
    app_bot.run_polling()

if __name__ == "__main__":
    main()
