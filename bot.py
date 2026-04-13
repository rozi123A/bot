"""
بوت تيليغرام متكامل مع:
- لوحة تحكم للأدمن
- سحب حقيقي بنجوم تيليغرام (Telegram Stars)
- API للموقع
- يعمل 24/7

تثبيت: pip install python-telegram-bot==20.7 flask flask-cors
تشغيل: python bot.py
"""

import logging
import sqlite3
import asyncio
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup,
    LabeledPrice, StarTransaction
)
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    ContextTypes, MessageHandler, filters, PreCheckoutQueryHandler
)

# ==================== الإعدادات ====================
BOT_TOKEN   = "8095849338:AAFRFLiVl27Nvzyx0VOG69FtneFHVYUO4HE"   # ← التوكن الجديد من @BotFather
ADMIN_ID    = 5279238199                       # ← ID حسابك
SITE_URL    = "https://roaring-starburst-71e2e9.netlify.app/"     # ← رابط الموقع
API_PORT    = 5000

# جدول أسعار السحب
WITHDRAW_TABLE = [
    {"stars": 15, "points": 10000},
    {"stars": 20, "points": 13340},
    {"stars": 25, "points": 16675},
    {"stars": 30, "points": 20010},
    {"stars": 35, "points": 23345},
]

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler("bot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ==================== قاعدة البيانات ====================
def get_db():
    conn = sqlite3.connect("luckyearn.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            user_id     INTEGER PRIMARY KEY,
            username    TEXT,
            full_name   TEXT,
            points      INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            total_withdrawn INTEGER DEFAULT 0,
            joined_at   TEXT,
            last_seen   TEXT
        );
        CREATE TABLE IF NOT EXISTS withdrawals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER,
            stars       INTEGER,
            points_spent INTEGER,
            status      TEXT DEFAULT "pending",
            telegram_payment_id TEXT,
            requested_at TEXT,
            processed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS points_log (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id  INTEGER,
            points   INTEGER,
            type     TEXT,
            logged_at TEXT
        );
    ''')
    conn.commit()
    conn.close()

def upsert_user(user_id, username, full_name):
    conn = get_db()
    conn.execute('''
        INSERT INTO users (user_id, username, full_name, joined_at, last_seen)
        VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET
            username=excluded.username,
            full_name=excluded.full_name,
            last_seen=excluded.last_seen
    ''', (user_id, username or "", full_name, datetime.now().isoformat(), datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def add_points_db(user_id, points, type_="web"):
    conn = get_db()
    conn.execute("UPDATE users SET points=points+?, total_earned=total_earned+? WHERE user_id=?",
                 (points, points, user_id))
    conn.execute("INSERT INTO points_log (user_id, points, type, logged_at) VALUES (?,?,?,?)",
                 (user_id, points, type_, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def deduct_points(user_id, points):
    conn = get_db()
    conn.execute("UPDATE users SET points=points-?, total_withdrawn=total_withdrawn+? WHERE user_id=?",
                 (points, points, user_id))
    conn.commit()
    conn.close()

def create_withdrawal(user_id, stars, points):
    conn = get_db()
    c = conn.execute(
        "INSERT INTO withdrawals (user_id, stars, points_spent, requested_at) VALUES (?,?,?,?)",
        (user_id, stars, points, datetime.now().isoformat())
    )
    wid = c.lastrowid
    conn.commit()
    conn.close()
    return wid

def get_stats():
    conn = get_db()
    stats = {
        "users":    conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        "points":   conn.execute("SELECT COALESCE(SUM(points),0) FROM users").fetchone()[0],
        "withdrawals": conn.execute("SELECT COUNT(*) FROM withdrawals WHERE status='pending'").fetchone()[0],
        "total_paid": conn.execute("SELECT COALESCE(SUM(stars),0) FROM withdrawals WHERE status='completed'").fetchone()[0],
    }
    conn.close()
    return stats

def get_top_users(limit=10):
    conn = get_db()
    rows = conn.execute(
        "SELECT user_id, full_name, username, points FROM users ORDER BY total_earned DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ==================== Flask API ====================
flask_app = Flask(__name__)
CORS(flask_app)

@flask_app.route("/api/add_points", methods=["POST"])
def api_add_points():
    data = request.get_json()
    user_id = data.get("user_id")
    points  = data.get("points", 0)
    type_   = data.get("type", "web")
    if not user_id or points <= 0:
        return jsonify({"ok": False}), 400
    add_points_db(int(user_id), int(points), type_)
    return jsonify({"ok": True})

@flask_app.route("/api/user/<user_id>", methods=["GET"])
def api_get_user(user_id):
    u = get_user(int(user_id))
    if not u:
        return jsonify({"ok": False}), 404
    return jsonify({"ok": True, "user": u})

def run_flask():
    flask_app.run(host="0.0.0.0", port=API_PORT, debug=False, use_reloader=False)

# ==================== أوامر البوت ====================

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    upsert_user(user.id, user.username, user.full_name)

    # فحص إذا كان طلب سحب
    args = context.args
    if args and args[0].startswith("withdraw_"):
        parts = args[0].split("_")
        if len(parts) >= 2:
            stars = int(parts[1])
            await handle_withdraw_request(update, context, stars)
            return

    keyboard = [
        [InlineKeyboardButton("🎰 العب الآن", url=f"{SITE_URL}?user_id={user.id}")],
        [InlineKeyboardButton("💰 رصيدي", callback_data="my_balance"),
         InlineKeyboardButton("💸 سحب النجوم", callback_data="withdraw_menu")],
        [InlineKeyboardButton("🏆 المتصدرون", callback_data="leaderboard"),
         InlineKeyboardButton("ℹ️ كيف يعمل", callback_data="how_it_works")],
    ]

    u = get_user(user.id)
    points = u["points"] if u else 0

    await update.message.reply_text(
        f"👋 أهلاً <b>{user.first_name}</b>!\n\n"
        f"🎰 <b>LuckyEarn</b> — العب واكسب نجوم تيليغرام!\n\n"
        f"💰 رصيدك: <b>{points:,} نقطة</b>\n\n"
        f"🎡 العب العجلة يومياً\n"
        f"📺 شاهد إعلانات واكسب نقاط\n"
        f"⭐ اسحب النجوم مباشرة لحسابك\n\n"
        f"اضغط <b>العب الآن</b> للبدء 👇",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def handle_withdraw_request(update, context, stars):
    user = update.effective_user
    u = get_user(user.id)
    if not u:
        await update.message.reply_text("❌ حسابك غير موجود، اضغط /start أولاً")
        return

    # إيجاد المطلوب
    req = next((w for w in WITHDRAW_TABLE if w["stars"] == stars), None)
    if not req:
        await update.message.reply_text("❌ خيار غير صحيح")
        return

    if u["points"] < req["points"]:
        needed = req["points"] - u["points"]
        await update.message.reply_text(
            f"❌ <b>رصيد غير كافٍ!</b>\n\n"
            f"💰 رصيدك: <b>{u['points']:,} نقطة</b>\n"
            f"📌 مطلوب: <b>{req['points']:,} نقطة</b>\n"
            f"⏳ تحتاج: <b>{needed:,} نقطة</b> إضافية",
            parse_mode="HTML"
        )
        return

    keyboard = [
        [InlineKeyboardButton(f"✅ تأكيد سحب {stars} ⭐", callback_data=f"confirm_wd_{stars}")],
        [InlineKeyboardButton("❌ إلغاء", callback_data="cancel_wd")],
    ]
    await update.message.reply_text(
        f"⭐ <b>تأكيد طلب السحب</b>\n\n"
        f"النجوم: <b>{stars} ⭐</b>\n"
        f"النقاط المخصومة: <b>{req['points']:,}</b>\n"
        f"رصيدك بعد السحب: <b>{u['points'] - req['points']:,}</b>\n\n"
        f"⚠️ تأكد من صحة الطلب!",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def btn_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    user = query.from_user
    upsert_user(user.id, user.username, user.full_name)

    if data == "my_balance":
        await show_balance(query, context)
    elif data == "withdraw_menu":
        await show_withdraw_menu(query, context)
    elif data == "leaderboard":
        await show_leaderboard(query, context)
    elif data == "how_it_works":
        await show_how(query, context)
    elif data.startswith("confirm_wd_"):
        stars = int(data.split("_")[2])
        await process_withdrawal(query, context, stars)
    elif data == "cancel_wd":
        await query.edit_message_text("❌ تم إلغاء طلب السحب.")
    elif data.startswith("admin_approve_"):
        wid = int(data.split("_")[2])
        await admin_approve(query, context, wid)
    elif data.startswith("admin_reject_"):
        wid = int(data.split("_")[2])
        await admin_reject(query, context, wid)

async def show_balance(query, context):
    u = get_user(query.from_user.id)
    if not u:
        return
    stars = u["points"] // 667
    keyboard = [
        [InlineKeyboardButton("🎰 العب الآن", url=f"{SITE_URL}?user_id={query.from_user.id}")],
        [InlineKeyboardButton("💸 سحب النجوم", callback_data="withdraw_menu")],
    ]
    await query.edit_message_text(
        f"💰 <b>رصيدك</b>\n\n"
        f"🔵 النقاط: <b>{u['points']:,}</b>\n"
        f"⭐ النجوم المتاحة: <b>{stars}</b>\n\n"
        f"📊 الإحصائيات:\n"
        f"✅ إجمالي مكتسب: {u['total_earned']:,} نقطة\n"
        f"💸 إجمالي مسحوب: {u['total_withdrawn']:,} نقطة",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def show_withdraw_menu(query, context):
    u = get_user(query.from_user.id)
    pts = u["points"] if u else 0

    rows = []
    for w in WITHDRAW_TABLE:
        status = "✅" if pts >= w["points"] else "🔒"
        rows.append([InlineKeyboardButton(
            f"{status} {w['stars']}⭐ = {w['points']:,} نقطة",
            callback_data=f"confirm_wd_{w['stars']}" if pts >= w["points"] else "insufficient"
        )])
    rows.append([InlineKeyboardButton("🔙 رجوع", callback_data="back_main")])

    await query.edit_message_text(
        f"💸 <b>سحب النجوم</b>\n\n"
        f"💰 رصيدك: <b>{pts:,} نقطة</b>\n\n"
        f"اختر الكمية المطلوبة:",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(rows)
    )

async def process_withdrawal(query, context, stars):
    user = query.from_user
    u = get_user(user.id)
    req = next((w for w in WITHDRAW_TABLE if w["stars"] == stars), None)

    if not req or not u or u["points"] < req["points"]:
        await query.edit_message_text("❌ رصيد غير كافٍ!")
        return

    # خصم النقاط
    deduct_points(user.id, req["points"])
    wid = create_withdrawal(user.id, stars, req["points"])

    # إرسال النجوم مباشرة عبر Telegram Stars API
    try:
        await context.bot.send_invoice(
            chat_id=user.id,
            title=f"⭐ {stars} نجمة - LuckyEarn",
            description=f"سحب {stars} نجمة مقابل {req['points']:,} نقطة",
            payload=f"withdraw_{wid}_{stars}",
            currency="XTR",  # عملة نجوم تيليغرام
            prices=[LabeledPrice(label=f"{stars} نجمة", amount=stars)],
        )
        await query.edit_message_text(
            f"⭐ <b>تم إرسال طلب الدفع!</b>\n\n"
            f"اضغط على فاتورة الدفع أعلاه لاستلام <b>{stars} نجمة</b>\n"
            f"رقم الطلب: <b>#{wid}</b>",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Stars payment error: {e}")
        # إعادة النقاط في حالة الفشل
        add_points_db(user.id, req["points"], "refund")

        # إرسال للأدمن يدوياً
        admin_keyboard = [[
            InlineKeyboardButton("✅ موافقة", callback_data=f"admin_approve_{wid}"),
            InlineKeyboardButton("❌ رفض", callback_data=f"admin_reject_{wid}")
        ]]
        try:
            await context.bot.send_message(
                ADMIN_ID,
                f"🔔 <b>طلب سحب يدوي #{wid}</b>\n\n"
                f"👤 {user.full_name} (@{user.username or 'N/A'})\n"
                f"🆔 {user.id}\n"
                f"⭐ {stars} نجمة\n"
                f"💰 {req['points']:,} نقطة\n"
                f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                parse_mode="HTML",
                reply_markup=InlineKeyboardMarkup(admin_keyboard)
            )
        except:
            pass

        await query.edit_message_text(
            f"⏳ <b>طلب السحب قيد المعالجة</b>\n\n"
            f"⭐ {stars} نجمة\n"
            f"رقم الطلب: <b>#{wid}</b>\n\n"
            f"سيتم إرسال النجوم خلال 24 ساعة",
            parse_mode="HTML"
        )

async def admin_approve(query, context, wid):
    if query.from_user.id != ADMIN_ID:
        return
    conn = get_db()
    w = conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone()
    if not w:
        conn.close(); return
    conn.execute("UPDATE withdrawals SET status='completed', processed_at=? WHERE id=?",
                 (datetime.now().isoformat(), wid))
    conn.commit()
    conn.close()
    try:
        await context.bot.send_message(
            w["user_id"],
            f"🎉 <b>تم إرسال نجومك!</b>\n\n"
            f"⭐ {w['stars']} نجمة أُضيفت لحسابك\n"
            f"شكراً لاستخدامك LuckyEarn! 💙",
            parse_mode="HTML"
        )
    except:
        pass
    await query.edit_message_text(query.message.text + "\n\n✅ <b>تمت الموافقة</b>", parse_mode="HTML")

async def admin_reject(query, context, wid):
    if query.from_user.id != ADMIN_ID:
        return
    conn = get_db()
    w = conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone()
    if not w:
        conn.close(); return
    conn.execute("UPDATE withdrawals SET status='rejected', processed_at=? WHERE id=?",
                 (datetime.now().isoformat(), wid))
    conn.commit()
    conn.close()
    add_points_db(w["user_id"], w["points_spent"], "refund")
    try:
        await context.bot.send_message(
            w["user_id"],
            f"❌ <b>تم رفض طلب السحب #{wid}</b>\n"
            f"💰 تم إعادة {w['points_spent']:,} نقطة لرصيدك",
            parse_mode="HTML"
        )
    except:
        pass
    await query.edit_message_text(query.message.text + "\n\n❌ <b>تم الرفض وإعادة النقاط</b>", parse_mode="HTML")

async def show_leaderboard(query, context):
    top = get_top_users(10)
    medals = ["🥇","🥈","🥉"] + ["🔹"]*7
    text = "🏆 <b>أفضل 10 لاعبين</b>\n\n"
    for i, u in enumerate(top):
        name = u["full_name"] or u["username"] or f"User{u['user_id']}"
        text += f"{medals[i]} {name}: <b>{u['points']:,} نقطة</b>\n"
    await query.edit_message_text(text, parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 رجوع", callback_data="back_main")]]))

async def show_how(query, context):
    await query.edit_message_text(
        "ℹ️ <b>كيف يعمل LuckyEarn؟</b>\n\n"
        "1️⃣ اضغط <b>العب الآن</b> لفتح الموقع\n"
        "2️⃣ العب <b>عجلة الحظ</b> يومياً (5 دورات)\n"
        "3️⃣ شاهد <b>إعلانات</b> واكسب 50 نقطة لكل إعلان\n"
        "4️⃣ عند انتهاء الدورات شاهد إعلاناً للحصول على دورة إضافية\n\n"
        "💸 <b>جدول السحب:</b>\n"
        "• 10,000 نقطة → 15 ⭐\n"
        "• 13,340 نقطة → 20 ⭐\n"
        "• 16,675 نقطة → 25 ⭐\n"
        "• 20,010 نقطة → 30 ⭐\n"
        "• 23,345 نقطة → 35 ⭐\n\n"
        "⭐ النجوم تُضاف مباشرة لحسابك في تيليغرام!",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 رجوع", callback_data="back_main")]]))

async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    s = get_stats()
    await update.message.reply_text(
        f"📊 <b>إحصائيات LuckyEarn</b>\n\n"
        f"👥 المستخدمون: <b>{s['users']:,}</b>\n"
        f"💰 إجمالي النقاط: <b>{s['points']:,}</b>\n"
        f"⏳ طلبات معلقة: <b>{s['withdrawals']}</b>\n"
        f"⭐ إجمالي نجوم مُرسَلة: <b>{s['total_paid']}</b>",
        parse_mode="HTML"
    )

async def cmd_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    if not context.args:
        await update.message.reply_text("الاستخدام: /broadcast رسالتك هنا")
        return
    msg = " ".join(context.args)
    conn = get_db()
    users = conn.execute("SELECT user_id FROM users").fetchall()
    conn.close()
    sent, failed = 0, 0
    for u in users:
        try:
            await context.bot.send_message(u["user_id"], f"📢 <b>إعلان:</b>\n\n{msg}", parse_mode="HTML")
            sent += 1
        except:
            failed += 1
    await update.message.reply_text(f"✅ أُرسلت لـ {sent} مستخدم | ❌ فشل: {failed}")

# ==================== تشغيل البوت ====================
def main():
    init_db()
    logger.info("✅ قاعدة البيانات جاهزة")

    # تشغيل Flask في خيط منفصل
    t = threading.Thread(target=run_flask, daemon=True)
    t.start()
    logger.info(f"✅ API يعمل على المنفذ {API_PORT}")

    # تشغيل البوت
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("broadcast", cmd_broadcast))
    app.add_handler(CallbackQueryHandler(btn_handler))

    logger.info("🤖 البوت يعمل 24/7...")
    app.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)

if __name__ == "__main__":
    main()
