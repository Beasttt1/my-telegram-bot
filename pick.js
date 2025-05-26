const { get, set, ref } = require('firebase/database');

const pickSettings = {
  async getDeduct(db) {
    const snap = await get(ref(db, 'settings/pick_deduct'));
    return snap.exists() ? snap.val() : false;
  },
  async setDeduct(value) {
    await set(ref(global.db, 'settings/pick_deduct'), !!value);
  }
};

const heroes = {
  xp: ['Balmond', 'Dyroth', 'Lapu-Lapu'],
  roam: ['Lolita', 'Minotaur', 'Tigreal'],
  jungle: ['Ling', 'Hayabusa', 'Roger'],
  gold: ['Brody', 'Beatrix', 'Miya'],
  mid: ['Lylia', 'Yve', 'Kagura']
};

async function handlePick(userId, bot, settings, updatePoints) {
  const deduct = await settings.getDeduct(global.db);
  if (deduct) {
    const snap = await get(ref(global.db, `users/${userId}`));
    const user = snap.val();
    if ((user.points || 0) < 1) {
      return bot.sendMessage(userId, '❌ برای استفاده از این قابلیت باید حداقل ۱ امتیاز داشته باشید.');
    }
    await updatePoints(userId, -1);
  }

  await bot.sendMessage(userId, 'لطفاً رول مورد نظر را انتخاب کنید:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'XP', callback_data: 'pick_role_xp' },
          { text: 'Roam', callback_data: 'pick_role_roam' }
        ],
        [
          { text: 'Jungle', callback_data: 'pick_role_jungle' },
          { text: 'Gold', callback_data: 'pick_role_gold' }
        ],
        [
          { text: 'Mid', callback_data: 'pick_role_mid' }
        ]
      ]
    }
  });
}

async function handlePickRole(userId, data, bot, updatePoints, settings) {
  const role = data.split('_')[2]; // xp, roam, ...
  const heroList = heroes[role] || [];
  if (heroList.length === 0) return;

  const selected = heroList[Math.floor(Math.random() * heroList.length)];
  await bot.sendMessage(userId, `🎯 پیشنهاد پیک برای رول ${role.toUpperCase()}:\n👉 ${selected}`);
}

module.exports = { handlePick, pickSettings, handlePickRole };