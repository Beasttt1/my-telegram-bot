const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();

const token = '8129314550:AAFQTvL8VVg-4QtQD8QLY03LCWiSP1uaCak';  // توکن ربات
const adminId = 381183017;  // آیدی ادمین
const webhookUrl = 'https://my-telegram-bot-albl.onrender.com';  // آدرس وبهوک شما
const port = process.env.PORT || 10000;

// تنظیم وبهوک و ربات
const bot = new TelegramBot(token, { polling: false });
bot.setWebHook(`${webhookUrl}/bot${token}`);

app.use(express.json());

// دریافت آپدیت‌ها از تلگرام از طریق وبهوک
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// باز کردن دیتابیس و ایجاد جدول‌ها
const db = new sqlite3.Database('./botdata.sqlite', (err) => {
  if (err) {
    console.error('خطا در باز کردن دیتابیس:', err.message);
    return;
  }

  // ایجاد جدول users اگر وجود نداشته باشد
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    banned INTEGER DEFAULT 0,
    last_chance_use INTEGER DEFAULT 0,
    username TEXT,
    invites INTEGER DEFAULT 0
  )`, (err) => {
    if (err) {
      console.error('خطا در ایجاد جدول users:', err.message);
      return;
    }

    // چک کردن وجود ستون points
    db.all(`PRAGMA table_info(users)`, (err, columns) => {
      if (err) {
        console.error('خطا در خواندن ساختار جدول users:', err.message);
        return;
      }

      const hasPoints = columns.some(col => col.name === 'points');

      if (!hasPoints) {
        db.run("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0", (err) => {
          if (err) {
            console.error("خطا در افزودن ستون points:", err.message);
          } else {
            console.log("ستون points با موفقیت اضافه شد");
          }
        });
      } else {
        console.log("ستون points قبلاً وجود دارد");
      }
    });
  });

  // ادامه کد ایجاد جدول settings و غیره
});

// وضعیت موقت کاربر برای مراحل مختلف
const userState = {};

// کمک برای ایجاد یا اطمینان از وجود کاربر در دیتابیس
function ensureUser(user) {
  db.get(`SELECT user_id FROM users WHERE user_id = ?`, [user.id], (err, row) => {
    if (err) {
      console.error('خطا در انتخاب کاربر:', err);
      return;
    }
    if (!row) {
      db.run(`INSERT INTO users (user_id, username, points) VALUES (?, ?, 5)`, [user.id, user.username || ''], (err) => {
        if (err) console.error('خطا در درج کاربر جدید:', err);
      });
    }
  });
}

// گرفتن اطلاعات کاربر از دیتابیس
function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE user_id = ?`, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// آپدیت امتیاز کاربر (مثبت یا منفی)
function updatePoints(userId, amount) {
  db.run(`UPDATE users SET points = points + ? WHERE user_id = ?`, [amount, userId]);
}

function updateLastChanceUse(userId, timestamp) {
  db.run(`UPDATE users SET last_chance_use = ? WHERE user_id = ?`, [timestamp, userId]);
}

function getLastChanceUse(userId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT last_chance_use FROM users WHERE user_id = ?`, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.last_chance_use : 0);
    });
  });
}

// تغییر وضعیت بن کاربر
function setBanStatus(userId, status) {
  db.run(`UPDATE users SET banned = ? WHERE user_id = ?`, [status ? 1 : 0, userId]);
}

// گرفتن متن راهنما
function getHelpText() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT value FROM settings WHERE key = 'help_text'`, (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : 'متن راهنما موجود نیست.');
    });
  });
}

// ذخیره متن جدید راهنما
function setHelpText(newText) {
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('help_text', ?)`, [newText]);
}

// پاک کردن وضعیت موقت کاربر
function resetUserState(userId) {
  delete userState[userId];
}

// ارسال منوی اصلی با دکمه‌ها
function sendMainMenu(userId) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊محاسبه ریت', callback_data: 'calculate_rate' },
          { text: '🏆محاسبه برد/باخت', callback_data: 'calculate_wl' }
        ],
        [
          { text: '🔗دعوت دوستان', callback_data: 'referral' },
          { text: '👤 پروفایل', callback_data: 'profile' }
        ],
        [
          { text: '💬پشتیبانی', callback_data: 'support' }
        ],
        [
          { text: '📚راهنما', callback_data: 'help' }
        ],
        [
           { text: '🎁خرید امتیاز', callback_data: 'buy' }
        ],
        [ // این ردیف دکمه شانس اضافه شده
          { text: '🍀 شانس', callback_data: 'chance' }
        ]
      ]
    }
  };


    bot.sendMessage(userId, 'سلام، به ربات محاسبه‌گر Mobile Legends خوش آمدید ✨', keyboard);
}

// هندل دستور /start با امکان لینک دعوت
bot.onText(/\/start(?: (\d+))?/, async (msg, match) => {
  const userId = msg.from.id;
  const refId = match[1] ? parseInt(match[1]) : null;

  ensureUser(msg.from);
  const user = await getUser(userId);
  if (user?.banned) {
    return bot.sendMessage(userId, 'شما بن شده‌اید و اجازه استفاده از ربات را ندارید.');
  }

  resetUserState(userId);

  // مدیریت دعوت
if (refId && refId !== userId) {
  db.get(`SELECT invites FROM users WHERE user_id = ?`, [userId], (err, row) => {
    if (!row) {
      // کاربر جدیدی که دعوت شده
      db.run(`INSERT INTO users (user_id, username, points, invites) VALUES (?, ?, 5, 0)`, [userId, msg.from.username || '']);
      
      // به دعوت‌کننده امتیاز اضافه کن
      updatePoints(refId, 5);

      // افزایش تعداد دعوتی‌ها برای دعوت‌کننده
      db.run(`UPDATE users SET invites = invites + 1 WHERE user_id = ?`, [refId]);
    }
  });
}

  sendMainMenu(userId);
});

// هندل دستور /panel فقط برای ادمین
bot.onText(/\/panel/, async (msg) => {
  const userId = msg.from.id;
  if (userId !== adminId) {
    return bot.sendMessage(userId, 'شما دسترسی به پنل مدیریت ندارید.');
  }

  bot.sendMessage(userId, 'پنل مدیریت:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '➕ افزودن امتیاز', callback_data: 'add_points' },
          { text: '➖ کسر امتیاز', callback_data: 'sub_points' }
        ],
        [
          { text: '📢 پیام همگانی', callback_data: 'broadcast' }
        ],
        [
          { text: '🚫بن کردن کاربر', callback_data: 'ban_user' },
          { text: '☑️حذف بن کاربر', callback_data: 'unban_user' }
        ],
        [
          { text: '🌐تغییر متن راهنما', callback_data: 'edit_help' }
        ]
      ]
    }
  });
});

// هندل کلیک روی دکمه‌های منو و پنل مدیریت
bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const data = query.data;
  switch (data) {
  case 'add_points_all':
    userState[userId] = { step: 'add_points_all_enter' };
    await bot.answerCallbackQuery(query.id);
    return bot.sendMessage(userId, 'لطفا مقدار امتیازی که می‌خواهید به همه کاربران اضافه شود را وارد کنید یا /cancel برای لغو:');

  // سایر case ها مثل panel_back و ...
}
  const user = await getUser(userId);
  if (!user) return bot.answerCallbackQuery(query.id);

  if (user.banned) {
    return bot.answerCallbackQuery(query.id, { text: 'شما بن شده‌اید.', show_alert: true });
  }

  switch (data) {
    case 'calculate_rate':
    case 'calculate_wl':
      if (user.points <= 0) {
        return bot.answerCallbackQuery(query.id, { text: 'شما امتیازی برای استفاده ندارید.', show_alert: true });
      }
      userState[userId] = {
        type: data === 'calculate_rate' ? 'rate' : 'w/l',
        step: 'total'
      };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'تعداد کل بازی‌ها را وارد کن:');

    case 'referral':
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, `می‌خوای امتیاز بیشتری بگیری؟ 🎁
لینک اختصاصی خودتو برای دوستات بفرست!
هر کسی که با لینک تو وارد ربات بشه، ۵ امتیاز دائمی می‌گیری ⭐️
لینک دعوت مخصوص شما⬇️:\nhttps://t.me/mlbbratebot?start=${userId}`);

    case 'profile':
      await bot.answerCallbackQuery(query.id);
      const invitesCount = user.invites || 0;
return bot.sendMessage(userId, `🆔 آیدی عددی: ${userId}\n⭐ امتیاز فعلی: ${user.points}\n📨 تعداد دعوتی‌ها: ${invitesCount}`);

    case 'buy':
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, '🎁 برای خرید امتیاز و دسترسی به امکانات بیشتر به پیوی زیر پیام دهید:\n\n📩 @Beast3694');

case 'chance':
  {
    const now = Date.now();
    const lastUse = await getLastChanceUse(userId);

    const diff = now - lastUse;
    if (diff < 24 * 60 * 60 * 1000) {
      const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
      await bot.answerCallbackQuery(query.id, {
        text: `شما فقط هر ۲۴ ساعت یک بار می‌توانید این گزینه را استفاده کنید. لطفا ${hoursLeft} ساعت دیگر تلاش کنید.`,
        show_alert: true
      });
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    let message = `تاس شما: ${dice}\n`;

    if (dice === 6) {
      updatePoints(userId, 1);
      message += 'تبریک! 1 امتیاز به شما اضافه شد.';
    } else {
      message += 'امتیازی به شما تعلق نگرفت. شانس خود را برای دفعه بعد حفظ کنید.';
    }

    updateLastChanceUse(userId, now);

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(userId, message);
  }
  break;

    case 'support':
      userState[userId] = { step: 'support' };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'شما وارد بخش پشتیبانی شده‌اید!\nپیام شما به من فوروارد خواهد شد 📤\nبرای خروج و بازگشت به منوی اصلی، دستور /start را ارسال کنید ⏪');

    // فرض بر اینه که bot، userState، adminId، و توابع کمکی مثل getHelpText و getUser تعریف شده‌اند

bot.on('callback_query', async (query) => {
  const data = query.data;
  const userId = query.from.id;

  switch (data) {
    case 'help':
      await bot.answerCallbackQuery(query.id);
      const helpText = await getHelpText();
      return bot.sendMessage(userId, helpText);

    case 'add_points':
    case 'sub_points':
      userState[userId] = { step: 'enter_id', type: data === 'add_points' ? 'add' : 'sub' };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'آیدی عددی کاربر را وارد کنید:');

    case 'broadcast':
      userState[userId] = { step: 'broadcast' };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'متن پیام همگانی را ارسال کنید یا /cancel برای لغو:');

    case 'ban_user':
      userState[userId] = { step: 'ban_enter_id' };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'آیدی عددی کاربر برای بن کردن را وارد کنید:');

    case 'unban_user':
      userState[userId] = { step: 'unban_enter_id' };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'آیدی عددی کاربر برای آن‌بن کردن را وارد کنید:');

    case 'edit_help':
      userState[userId] = { step: 'edit_help' };
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(userId, 'متن جدید راهنما را ارسال کنید یا /cancel برای لغو:');

    default:
      await bot.answerCallbackQuery(query.id, { text: 'دستور نامشخص است.' });
      break;
  }
});

bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const text = msg.text;

  if (!userState[userId]) return; // اگر در مرحله‌ای نبود، کاری نکن

  const user = await getUser(userId);
  if (user?.banned) {
    return bot.sendMessage(userId, 'شما بن شده‌اید و اجازه استفاده ندارید.');
  }

  const state = userState[userId];

  // لغو عملیات
  if (text === '/cancel') {
    delete userState[userId];
    return bot.sendMessage(userId, 'عملیات لغو شد.', { reply_markup: { remove_keyboard: true } });
  }

  if (userId === adminId) {
    switch (state.step) {
      case 'enter_id':
        if (!/^\d+$/.test(text)) {
          return bot.sendMessage(userId, 'لطفا یک آیدی عددی معتبر وارد کنید.');
        }
        state.targetId = parseInt(text);
        state.step = 'enter_points';
        return bot.sendMessage(userId, state.type === 'add' ? 'تعداد امتیاز برای اضافه کردن را وارد کنید:' : 'تعداد امتیاز برای کسر را وارد کنید:');

      case 'enter_points':
        if (!/^\d+$/.test(text)) {
          return bot.sendMessage(userId, 'لطفا یک عدد معتبر وارد کنید.');
        }
        const points = parseInt(text);
        if (state.type === 'add') {
          await addPointsToUser(state.targetId, points);
          delete userState[userId];
          return bot.sendMessage(userId, `با موفقیت ${points} امتیاز اضافه شد به کاربر ${state.targetId}.`);
        } else if (state.type === 'sub') {
          await subtractPointsFromUser(state.targetId, points);
          delete userState[userId];
          return bot.sendMessage(userId, `با موفقیت ${points} امتیاز از کاربر ${state.targetId} کسر شد.`);
        }
        break;

      case 'broadcast':
        await broadcastMessage(text);
        delete userState[userId];
        return bot.sendMessage(userId, 'پیام همگانی با موفقیت ارسال شد.');

      case 'ban_enter_id':
        if (!/^\d+$/.test(text)) {
          return bot.sendMessage(userId, 'لطفا یک آیدی عددی معتبر وارد کنید.');
        }
        await banUser(parseInt(text));
        delete userState[userId];
        return bot.sendMessage(userId, `کاربر ${text} بن شد.`);

      case 'unban_enter_id':
        if (!/^\d+$/.test(text)) {
          return bot.sendMessage(userId, 'لطفا یک آیدی عددی معتبر وارد کنید.');
        }
        await unbanUser(parseInt(text));
        delete userState[userId];
        return bot.sendMessage(userId, `کاربر ${text} آن‌بن شد.`);

      case 'edit_help':
        await updateHelpText(text);
        delete userState[userId];
        return bot.sendMessage(userId, 'متن راهنما با موفقیت به‌روزرسانی شد.');

      case 'target':
        const target = parseFloat(text);
        if (isNaN(target)) return bot.sendMessage(userId, 'ریت هدف را به صورت عدد وارد کن.');

        const currentWins = (state.total * state.rate) / 100;
        const neededWins = Math.ceil(((target / 100 * state.total) - currentWins) / (1 - target / 100));

        await updatePoints(userId, -1);
        delete userState[userId];

        await bot.sendMessage(userId, `برای رسیدن به ${target}% باید ${neededWins} بازی متوالی ببری.\nامتیاز باقی‌مانده: ${user.points - 1}`);
        return sendMainMenu(userId);

      default:
        return bot.sendMessage(userId, 'مرحله نامشخص است.');
    }
  } else {
    // بخش کاربران عادی یا سایر مراحل

    // مرحله پشتیبانی: فوروارد پیام به ادمین
    if (state.step === 'support') {
      if (msg.text || msg.photo || msg.video || msg.sticker) {
        await bot.forwardMessage(adminId, userId, msg.message_id);
        return bot.sendMessage(userId, 'پیام شما ارسال شد. برای خروج /start را بزنید.');
      }
    }

    // اینجا میتونی بقیه منطق کاربران عادی رو اضافه کنی
    return bot.sendMessage(userId, 'شما اجازه دسترسی به این بخش را ندارید.');
  }
});
  
// شروع سرور
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
