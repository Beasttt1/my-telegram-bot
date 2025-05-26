// --- pick.js ---

const fs = require('fs'); const { ref, set, get, update } = require('firebase/database'); const heroes = JSON.parse(fs.readFileSync('./heroes.json', 'utf-8'));

const getRoleFa = (role) => { const roles = { xp: 'XP Lane', gold: 'Gold Lane', mid: 'Mid Lane', jungle: 'Jungle', roam: 'Roamer', }; return roles[role.toLowerCase()] || role; };

async function handlePickCommand(userId, bot, db) { const deductModeSnap = await get(ref(db, 'settings/pick_deduct')); const deductMode = deductModeSnap.exists() ? deductModeSnap.val() : false;

if (deductMode === 'once') { const accessSnap = await get(ref(db, pick_access/${userId})); if (!accessSnap.exists()) { await bot.sendMessage(userId, 'آیا مطمئن هستید که می‌خواهید با پرداخت ۳ امتیاز این بخش را برای همیشه فعال کنید؟', { reply_markup: { inline_keyboard: [ [{ text: 'بله، فعال‌سازی دائمی', callback_data: 'pick_once_confirm' }], [{ text: 'خیر، بازگشت', callback_data: 'cancel_pick_access' }] ] } }); return; } }

// نمایش لیست رول‌ها await bot.sendMessage(userId, 'رول خود را انتخاب کنید:', { reply_markup: { inline_keyboard: [ [ { text: 'XP Lane', callback_data: 'pick_XP' }, { text: 'Gold Lane', callback_data: 'pick_Gold' } ], [ { text: 'Mid Lane', callback_data: 'pick_Mid' }, { text: 'Roamer', callback_data: 'pick_Roamer' }, { text: 'Jungle', callback_data: 'pick_Jungle' } ] ] } }); }

async function handlePickAccessConfirmation(userId, bot, db, getUser, updatePoints) { const user = await getUser(userId); const points = user?.points || 0; if (points >= 3) { await updatePoints(userId, -3); await set(ref(db, pick_access/${userId}), { paid: true }); await bot.sendMessage(userId, '✅ شما با پرداخت ۳ امتیاز، دسترسی دائمی به این بخش پیدا کردید. حالا دوباره روی دکمه رندوم پیک بزنید.'); } else { await bot.sendMessage(userId, '❌ برای فعال‌سازی دائمی این بخش، حداقل ۳ امتیاز نیاز دارید.'); } }

async function handlePickRole(userId, data, bot, updatePoints, pickSettings, query, db, getUser) { await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id });

const role = data.replace('pick_', '').toLowerCase(); const filtered = heroes.filter(h => h.role.toLowerCase() === role);

if (!filtered.length) { await bot.sendMessage(userId, 'هیرویی برای این رول پیدا نشد!'); return; }

const hero = filtered[Math.floor(Math.random() * filtered.length)]; let shouldDeduct = false;

if (pickSettings === true) { shouldDeduct = true; } else if (pickSettings === 'once') { const accessSnap = await get(ref(db, pick_access/${userId})); if (!accessSnap.exists()) { await bot.sendMessage(userId, '❌ ابتدا باید با پرداخت ۳ امتیاز این بخش را فعال کنید.'); return; } }

if (shouldDeduct) { await updatePoints(userId, -1); await bot.sendMessage(userId, هیروی تصادفی رول ${getRoleFa(role)}: ${hero.name}\n(۱ امتیاز از حساب شما کم شد)); } else { await bot.sendMessage(userId, هیروی تصادفی رول ${getRoleFa(role)}: ${hero.name}\n(این بخش رایگان است)); } }

module.exports = { handlePickCommand, handlePickAccessConfirmation, handlePickRole };

