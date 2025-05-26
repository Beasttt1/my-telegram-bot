const fs = require("fs");
const path = require("path");
const { ref, get, set } = require("firebase/database");

const heroes = JSON.parse(fs.readFileSync(path.join(__dirname, "heroes.json"), "utf8"));

async function handlePickCommand(userId, bot) {
  const roles = [
    [{ text: "ایکس پی لاین", callback_data: "pick_role_xp" }],
    [{ text: "مید لاین",     callback_data: "pick_role_mid" }],
    [{ text: "گلد لاین",     callback_data: "pick_role_gold" }],
    [{ text: "جنگل",         callback_data: "pick_role_jungle" }],
    [{ text: "روم",          callback_data: "pick_role_roam" }]
  ];
  await bot.sendMessage(userId, "رول خود را انتخاب کنید:", {
    reply_markup: { inline_keyboard: roles }
  });
}

async function handlePickRole(userId, data, bot, updatePoints, pickSettings, query) {
  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id
  });
  // ادامه کد اینجاست

  // ادامه کد...
  const role = data.replace("pick_role_", "");
  const filtered = heroes.filter((h) => h.role === role);
  if (!filtered.length) {
    await bot.sendMessage(userId, "هیرویی برای این رول پیدا نشد!");
    return;
  }
  const hero = filtered[Math.floor(Math.random() * filtered.length)];
  const shouldDeduct = typeof pickSettings?.getDeduct === "function"
    ? await pickSettings.getDeduct()
    : !!pickSettings;

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

function getRoleFa(role) {
  switch (role) {
    case "xp": return "ایکس پی لاین";
    case "mid": return "مید لاین";
    case "gold": return "گلد لاین";
    case "jungle": return "جنگل";
    case "roam": return "روم";
    default: return role;
  }
}

const pickSettings = {
  async getDeduct() {
    const snap = await get(ref(global.db, "settings/pick_deduct"));
    return snap.exists() ? !!snap.val() : false;
  },
  async setDeduct(val) {
    await set(ref(global.db, "settings/pick_deduct"), !!val);
  }
};

module.exports = { handlePickCommand, handlePickRole, pickSettings };