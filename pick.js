const { get } = require('firebase/database');
const fs = require('fs');

const heros = JSON.parse(fs.readFileSync('./heros.json', 'utf-8'));

// رول‌های قابل پشتیبانی
const roles = ['XP', 'Gold', 'Mid', 'Roamer', 'Jungle'];

// مسیر تنظیمات سکه از Firebase
const pickSettingsRef = ref => ref.child('settings/pick_settings');

// هندل کلیک اولیه روی دکمه رندوم پیک
async function handlePickHero(bot, query, db) {
  const userId = query.from.id;

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(userId, 'کدام رول را می‌خواهید؟', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'XP Lane', callback_data: 'pick_XP' },
          { text: 'Gold Lane', callback_data: 'pick_Gold' }
        ],
        [
          { text: 'Mid Lane', callback_data: 'pick_Mid' },
          { text: 'Roamer', callback_data: 'pick_Roamer' },
          { text: 'Jungle', callback_data: 'pick_Jungle' }
        ]
      ]
    }
  });
}

// هندل انتخاب رول
async function handlePickByRole(bot, query, db, updatePoints, getUser) {
  const userId = query.from.id;
  const data = query.data;

  const role = data.replace('pick_', '');
  if (!roles.includes(role)) return;

  const user = await getUser(userId);
  const settingsSnap = await get(pickSettingsRef(db));
  const settings = settingsSnap.exists() ? settingsSnap.val() : { cost: 0 };
  const cost = settings.cost || 0;

  if (user.points < cost) {
    return bot.answerCallbackQuery(query.id, {
      text: `❌ برای استفاده از این ویژگی حداقل ${cost} سکه لازم است.`,
      show_alert: true
    });
  }

  const filtered = heros.filter(h => h.role === role);
  const randomHero = filtered[Math.floor(Math.random() * filtered.length)];

  if (cost > 0) await updatePoints(userId, -cost);
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(userId, `✅ هیروی پیشنهادی برای رول ${role}: *${randomHero.name}*`, { parse_mode: 'Markdown' });
}

module.exports = {
  handlePickHero,
  handlePickByRole
};