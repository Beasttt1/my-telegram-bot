const { ref, get, set } = require('firebase/database');
const heroes = require('./heroes.json');

function getRoleFa(role) {
  const map = {
    XP: 'XP لاین',
    Gold: 'Gold لاین',
    Mid: 'Mid لاین',
    Roamer: 'Roam',
    Jungle: 'جنگل',
  };
  return map[role] || role;
}

async function handlePickCommand(userId, bot, db) {
  const deductSnap = await get(ref(db, 'settings/pick_deduct'));
  const mode = deductSnap.exists() ? deductSnap.val() : false;

  if (mode === 'once') {
    const accessSnap = await get(ref(db, `pick_access/${userId}`));
    const hasAccess = accessSnap.exists();
    if (!hasAccess) {
      await bot.sendMessage(
        userId,
        'آیا مایلید با پرداخت ۳ امتیاز، برای همیشه به این بخش دسترسی داشته باشید؟',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ بله، فعالش کن', callback_data: 'pick_once_confirm' }],
              [{ text: '❌ انصراف', callback_data: 'cancel_pick_access' }],
            ],
          },
        }
      );
      return;
    }
  }

  await bot.sendMessage(userId, 'رول خود را انتخاب کنید:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'XP Lane', callback_data: 'pick_XP' },
          { text: 'Gold Lane', callback_data: 'pick_Gold' },
        ],
        [
          { text: 'Mid Lane', callback_data: 'pick_Mid' },
          { text: 'Roamer', callback_data: 'pick_Roamer' },
          { text: 'Jungle', callback_data: 'pick_Jungle' },
        ],
      ],
    },
  });
}

async function handlePickAccessConfirmation(userId, bot, db, getUser, updatePoints) {
  const user = await getUser(userId);
  const points = user?.points || 0;

  if (points < 3) {
    await bot.sendMessage(userId, '❌ برای فعال‌سازی دائمی این بخش، حداقل ۳ امتیاز نیاز دارید.');
    return;
  }

  await updatePoints(userId, -3);
  await set(ref(db, `pick_access/${userId}`), { paid: true });

  await bot.sendMessage(userId, '✅ شما با پرداخت ۳ امتیاز، دسترسی دائمی به این بخش پیدا کردید.');

  // حالا دکمه‌های رول رو نشون بده
  await bot.sendMessage(userId, 'رول خود را انتخاب کنید:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'XP Lane', callback_data: 'pick_XP' },
          { text: 'Gold Lane', callback_data: 'pick_Gold' },
        ],
        [
          { text: 'Mid Lane', callback_data: 'pick_Mid' },
          { text: 'Roamer', callback_data: 'pick_Roamer' },
          { text: 'Jungle', callback_data: 'pick_Jungle' },
        ],
      ],
    },
  });
}

async function handlePickRole(userId, data, bot, updatePoints, pickSettings, db, getUser) {
  const queryRole = data.replace('pick_', '');

  // بستن پنجره شیشه‌ای انتخاب رول
  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
    chat_id: userId,
    message_id: undefined // پیام شناسایی نشده، این قسمت باید از query گرفته شود اگر داخل index مدیریت شود
  }).catch(() => {});

  const role = queryRole;
  const filtered = heroes.filter((h) => h.role.toLowerCase() === role.toLowerCase());
  if (!filtered.length) {
    await bot.sendMessage(userId, 'هیرویی برای این رول پیدا نشد!');
    return;
  }

  const hero = filtered[Math.floor(Math.random() * filtered.length)];

  let shouldDeduct = false;

  if (pickSettings === true) {
    shouldDeduct = true;
  } else if (pickSettings === 'once') {
    const accessSnap = await get(ref(db, `pick_access/${userId}`));
    const alreadyPaid = accessSnap.exists();
    shouldDeduct = !alreadyPaid;
  }

  if (shouldDeduct) {
    const user = await getUser(userId);
    const points = user?.points || 0;
    if (points < 1) {
      await bot.sendMessage(userId, '❌ امتیاز کافی ندارید!');
      return;
    }
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
  handlePickAccessConfirmation,
  handlePickRole
};