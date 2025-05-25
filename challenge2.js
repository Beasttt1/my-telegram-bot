const fs = require('fs');
const { set, get } = require('firebase/database');

// سوال‌ها را می رشته هفته جاری (سال-هفته) برای ثبت در دیتابیس
function getCurrentWeekString() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil((((now - onejan) / 86400000) کاربرها (موقت)
const challengeState = {}; // userId -> state

/**
 * شروع چالش برای کاربر
 */
async function startChallenge({ userId, bot, db, challengeUserRef, adminId }) {
  const weekStr = getCurrentWeekString();
  const prev = await get(challengeUserRef(userId, weekStr));
  // اگر کاربر ادمین نیست و قبلاً این هفته چالش داده، اجازه نداره
  if (prev.exists() && userId !== adminId) {
    await bot.sendMessage(userId, "❌ شما این هفته چالش را انجام داده‌اید! هفته بعد دوباره امتحان کنید.");
    return;
  }

  const questions = loadQuestions();
  // ۳ سوال تصادفی از بین همه سوال‌ها
  const selected = questions
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  challengeState[user return;
  const qObj = state.questions[state.current];
  const qNum = state.current + 1;
  const total = state.questions.length;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        qObj.choices.map((choice, idx) => ({
          text: choice,
          callback ).then(msg => {
    let answered = false;
    // تایمر ۱۰ ثانیه‌ای برای هر سوال
    const timer = setTimeout(async () => {
      if (!answered) {
        answered = true;
        state.results.push({ correct: false, timedOut: true });
        await bot.sendMessage(userId qNum - 1,
      timer,
      answeredFlag: () => answered,
      setAnswered: () => { answered = true; }
    };
  });
}

/**
 * مدیریت جواب کاربر به هر سوال
 */
async function handleAnswer({ query, bot, updatePoints, challengeUserRef, db, adminId }) // فقط اگر سوال جاری است
  if (!state.waitingFor || state.waitingFor.qIdx !== qIdx) return;
  if (state.waitingFor.answeredFlag()) {
    await bot.answerCallbackQuery(query.id, { text: 'این سوال تمام شده است.', show_alert: false });
    return;
, timedOut: false });

  if (correct) {
    await updatePoints(userId, 2);
    await bot.answerCallbackQuery(query.id, { text: `✅ درست جواب دادی! +2 امتیاز (${qIdx+1}/3)`, show_alert: false });
    await bot.sendMessage(user1}/3)`, show_alert: false });
    await bot.sendMessage(userId, `❌ اشتباه جواب دادی! (${qIdx+1}/3)`);
  }

  setTimeout(() => nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId), 400);
}

/) {
  state.current++;
  if (state.current < state.questions.length) {
    sendChallengeQuestion(userId, bot);
  } else {
    state.finished = true;
    // فقط کاربر عادی، نتیجه هفته رو تو دیتابیس ذخیره کن. ادمین ذخیره نشه.
    if ( });
    }
    await bot.sendMessage(
      userId,
      `🎉 چالش این هفته تمام شد!\nتعداد پاسخ صحیح: ${state.correct} از ۳\nامتیاز کل: ${state.correct * 2} سکه`
    );
    delete challengeState[userId];
  }
}