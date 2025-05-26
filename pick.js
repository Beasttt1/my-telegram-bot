const fs = require("fs");
const { get, set, ref } = require("firebase/database");

const heroes = JSON.parse(fs.readFileSync("./heroes.json", "utf8"));

function getRoleFa(role) {
  switch (role) {
    case "xp": return "XP Lane";
    case "gold": return "Gold Lane";
    case "mid": return "Mid Lane";
    case "jungle": return "Jungle";
    case "roam": return "Roamer";
    default: return role;
  }
}

// مرحله اول: بررسی دسترسی و در صورت لزوم نمایش سوال خرید
async function handlePickCommand(userId, bot, db) {
  const deductModeSnap = await get(ref(db, "settings/pick_deduct"));
  const deductMode = deductModeSnap.exists() ? deductModeSnap.val() : false;

  if (deductMode === "once") {
    const accessSnap = await get(ref(db, `pick_access/${userId}`));
    if (!accessSnap.exists()) {
      await bot.sendMessage(userId, "آیا مطمئن هستید که می‌خواهید با پرداخت ۳ امتیاز این بخش را برای همیشه فعال کنید؟", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "بله، فعال‌سازی دائمی", callback_data: "pick_once_confirm" }],
            [{ text: "خیر، بازگشت", callback_data: "cancel_pick_access" }]
          ]
        }
      });
      return;
    }
  }

  // اگر رایگان یا خرید انجام شده بود: نمایش لیست رول‌ها
  const roles = [
    [{ text: "XP Lane", callback_data: "pick_xp" }, { text: "Gold Lane", callback_data: "pick_gold" }],
    [{ text: "Mid Lane", callback_data: "pick_mid" }, { text: "Roamer", callback_data: "pick_roam" }, { text: "Jungle", callback_data: "pick_jungle" }]
  ];

  await bot.sendMessage(userId, "رول مورد نظر را انتخاب کنید:", {
    reply_markup: { inline_keyboard: roles }
  });
}

// تایید خرید دائمی و فعال‌سازی
async function handlePickAccessConfirmation(userId, bot, db, getUser, updatePoints, query) {
  const user = await getUser(userId);
  const points = user?.points || 0;

  if (points >= 3) {
    await updatePoints(userId, -3);
    await set(ref(db, `pick_access/${userId}`), { paid: true });
    await bot.sendMessage(userId, "✅ شما با پرداخت ۳ امتیاز، دسترسی دائمی به این بخش پیدا کردید.");
  } else {
    await bot.sendMessage(userId, "❌ برای فعال‌سازی دائمی این بخش، حداقل ۳ امتیاز نیاز دارید.");
    return;
  }

  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id
  });

  await handlePickCommand(userId, bot, db); // بازگشت به منوی رول‌ها
}

// نمایش هیروی رندوم بعد از انتخاب رول
async function handlePickRole(userId, data, bot, updatePoints, pickSettings, query, db) {
  const role = data.replace("pick_", "").toLowerCase();
  const now = Date.now();
  const filtered = heroes.filter((h) => h.role.toLowerCase() === role);
  
  const globalBanSnap = await get(ref(db, `global_ban/${userId}`));
if (globalBanSnap.exists() && globalBanSnap.val().until > now) {
  await bot.answerCallbackQuery(query.id, {
    text: '⛔ به دلیل کلیک‌های مکرر، شما تا ۱۰ دقیقه نمی‌توانید از ربات استفاده کنید.',
    show_alert: true
  });
  return;
}

  // بررسی ضد اسپم (۴ بار در ۸ ثانیه = بن ۱۰ دقیقه‌ای)
  const spamRef = ref(db, `antiSpam_pick/${userId}`);
const spamSnap = await get(spamRef);
let clicks = spamSnap.exists() ? spamSnap.val() : [];

clicks = clicks.filter(ts => now - ts < 8000); // فقط کلیک‌های ۸ ثانیه اخیر
clicks.push(now);

if (clicks.length >= 4) {
  // بن کردن کل ربات برای ۱۰ دقیقه
  await set(ref(db, `global_ban/${userId}`), { until: now + 10 * 60 * 1000 });
  await bot.answerCallbackQuery(query.id, {
    text: '⛔ به دلیل کلیک‌های مکرر، شما تا ۱۰ دقیقه نمی‌توانید از ربات استفاده کنید.',
    show_alert: true
  });
  return;
} else {
  await set(spamRef, clicks);
}
  // ادامه‌ی کدت...

  // ۳. ادامه کد قبلی...


// محدودیت زمانی برای کلیک (هر ۶۰ ثانیه یک بار)
const cooldownRef = ref(db, `cooldowns/pick/${userId}`);
const cooldownSnap = await get(cooldownRef);

if (cooldownSnap.exists()) {
  const lastUsed = cooldownSnap.val();
  const secondsPassed = Math.floor((now - lastUsed) / 1000);
  if (secondsPassed < 60) {
    await bot.sendMessage(userId, `⏱ لطفاً ${60 - secondsPassed} ثانیه دیگر صبر کنید و دوباره امتحان کنید.`);
    return;
  }
}

await set(cooldownRef, now);

  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id
  });

  if (!filtered.length) {
    await bot.sendMessage(userId, "هیرویی برای این رول پیدا نشد!");
    return;
  }

  const hero = filtered[Math.floor(Math.random() * filtered.length)];
  let shouldDeduct = false;

  if (pickSettings === true) {
    shouldDeduct = true;
  }

  if (shouldDeduct) {
    await updatePoints(userId, -1);
    await bot.sendMessage(
      userId,
      `هیروی تصادفی رول ${getRoleFa(role)}: ${hero.name}\n(۱ امتیاز از حساب شما کم شد)`
    );
  } else {
    await bot.sendMessage(
      userId,
      `هیروی تصادفی رول ${getRoleFa(role)}: ${hero.name}\n(این بخش رایگان است)`
    );
  }
}

module.exports = {
  handlePickCommand,
  handlePickRole,
  handlePickAccessConfirmation // این باید باشه
};