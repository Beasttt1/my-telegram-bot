const fs = require('fs');

// بارگذاری لیست هیروها
const heros = JSON.parse(fs.readFileSync('./heroes.json', 'utf8'));

// رول به‌فارسی برای نمایش زیباتر
const roleNames = {
  XP: 'XP Lane',
  Gold: 'Gold Lane',
  Mid: 'Mid Lane',
  Roamer: 'Roamer',
  Jungle: 'Jungle'
};

// نمایش منوی انتخاب رول
async function handlePickCommand(userId, bot) {
  await bot.sendMessage(userId, 'کدام رول را می‌خواهید؟', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'XP Lane', callback_data: 'pick_role_XP' },
          { text: 'Gold Lane', callback_data: 'pick_role_Gold' }
        ],
        [
          { text: 'Mid Lane', callback_data: 'pick_role_Mid' },
          { text: 'Roamer', callback_data: 'pick_role_Roamer' },
          { text: 'Jungle', callback_data: 'pick_role_Jungle' }
        ]
      ]
    }
  });
}

// هندل انتخاب رول
async function handlePickRole(userId, data, bot, updatePoints, pickSettings) {
  const role = data.replace('pick_role_', '');
  const filtered = heros.filter(h => h.role === role);
  if (filtered.length === 0) {
    await bot.sendMessage(userId, 'هیچ هیرویی برای این رول پیدا نشد.');
    return;
  }
  const hero = filtered[Math.floor(Math.random() * filtered.length)];
  let message = `🎲 هیرو پیشنهادی برای ${roleNames[role]}:\n\n⭐ ${hero.name}`;
  if (pickSettings && updatePoints) {
    await updatePoints(userId, -1);
    message += '\n\n❗ ۱ امتیاز بابت استفاده از این قابلیت کسر شد.';
  }
  await bot.sendMessage(userId, message);
}

module.exports = {
  handlePickCommand,
  handlePickRole
};