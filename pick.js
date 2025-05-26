const fs = require('fs');
const { get, set, update, ref } = require('firebase/database');
const heroes = JSON.parse(fs.readFileSync('./heroes.json', 'utf8'));

const getRoleFa = (role) => {
  switch (role) {
    case 'XP': return 'XP Lane';
    case 'Gold': return 'Gold Lane';
    case 'Mid': return 'Mid Lane';
    case 'Roam': return 'Roam';
    case 'Jungle': return 'Jungle';
    default: return role;
  }
};

async function handlePickCommand(userId, bot) {
  const roles = [
    [
      { text: 'XP Lane', callback_data: 'pick_XP' },
      { text: 'Gold Lane', callback_data: 'pick_Gold' }
    ],
    [
      { text: 'Mid Lane', callback_data: 'pick_Mid' },
      { text: 'Roamer', callback_data: 'pick_Roamer' },
      { text: 'Jungle', callback_data: 'pick_Jungle' }
    ]
  ];

  await bot.sendMessage(userId, "رول خود را انتخاب کنید:", {
    reply_markup: { inline_keyboard: roles }
  });
}

async function handlePickRole(userId, data, bot, updatePoints, pickSettings, query, db, getUser) {
  const role = data.replace("pick_", "");
  const filtered = heroes.filter((h) => h.role.toLowerCase() === role.toLowerCase());
  if (!filtered.length) {
    await bot.sendMessage(userId, "هیرویی برای این رول پیدا نشد!");
    return;
  }
  const hero = filtered[Math.floor(Math.random() * filtered.length)];

  const deductRef = ref(db, 'settings/pick_deduct');
  const deductSnap = await get(deductRef);
  const deductMode = deductSnap.exists() ? deductSnap.val() : false;

  let shouldDeduct = false;

  if (deductMode === true) {
    shouldDeduct = true;
  } else if (deductMode === 'once') {
    const accessRef = ref(db, `pick_access/${userId}`);
    const accessSnap = await get(accessRef);
    const alreadyPaid = accessSnap.exists();

    if (!alreadyPaid) {
      const confirmMsg = await bot.sendMessage(userId, "آیا مطمئن هستید که می‌خواهید با پرداخت ۳ امتیاز، دسترسی دائمی به این بخش داشته باشید؟", {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'بله، پرداخت ۳ امتیاز', callback_data: 'pick_pay_confirm' }],
            [{ text: 'لغو', callback_data: 'cancel' }]
          ]
        }
      });
      // ثبت وضعیت برای ادامه در فایل اصلی (باید هندل شود)
      return;
    }
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

module.exports = { handlePickCommand, handlePickRole };