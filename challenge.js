const fs = require('fs');
const');

// بارگذاری سوالات از challenge.json
function loadQuestions() {
  return JSON.parse(fs.readFileSync('./challenge.json', 'utf8'));
}

// دریافت رشته هفته فعلی (سال-هفته)
function getCurrentWeekString() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
 week}`;
}

// وضعیت چالش برای هر کاربر
const challengeState = {}; // userId -> state

// شروع چالش برای کاربر
async function startChallenge({ userId, bot, db, challengeUserRef, adminId }) {
  const weekStr = getCurrentWeekString();
  if (typeof challengeUser شما این هفته چالش را انجام داده‌اید! هفته بعد دوباره امتحان کنید.");
    return;
  }
  const questions = loadQuestions();
  const selected = questions.sort(() => Math.random() - 0.5).slice(0, 3);
  challengeState[userId] = {
    week: weekStr,
    questions, bot, challengeUserRef, db, adminId) {
  const state = challengeState[userId];
  if (!state || state.finished) return;
  const qObj = state.questions[state.current];
  const qNum = state.current + 1;
  const total = state.questions.length;

  // تقسیم گزینه‌ها در = qObj.choices.length > 4 ? 3 : 2;
  for (let i = 0; i < qObj.choices.length; i += perRow) {
    inlineKeyboard.push(
      qObj.choices.slice(i, i + perRow).map((choice, idx) => ({
        text: choice,
        callback_data: `challenge_answer_${qNum - 1}_${i + idx}`
      }))
    );
  }

  const opts = {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };
  bot.sendMessage(
    msg.message_id;
    const chatId = msg.chat.id;
    const timer = setTimeout(async () => {
      if (!answered) {
        answered = true;
        state.waitingFor.expired = true;
        state.results.push({ correct: false, timedOut: true });
        await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
        await bot.sendMessage(userId, `⏱ زمان این سوال تمام شد! (${qNum}/${total})`);
        nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId);
      }
    }, 10000);
    state.waitingFor = {
      qIdx: qNum - 1,
      timer,
      expired: false,
      messageId,
      chatId,
      answeredFlag: () => answered,
      setAnswered: () => { answered = true; }
    };
  });
}

// هندل جواب کاربر به سوال چالش
async function handleAnswer({ query parseInt(ansIdxStr);
  if (!state.waitingFor || state.waitingFor.qIdx !== qIdx) return;
  if (state.waitingFor.expired) {
    await bot.answerCallbackQuery(query.id, { text: '⏱ وقت پاسخ به این سوال تموم شده.', show_alert: true });
    return;
  }
  if (state.waitingFor.ingFor.setAnswered();
  clearTimeout(state.waitingFor.timer);
  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: state.waitingFor.chatId, message_id: state.waitingFor.messageId });
  const qObj = state.questions[qIdx];
  const correct = qObj.answer === ansIdx;
  if (correct) state.correct++;
  state.results.push({ correct, timedOut: false });
  if (correct) {
    if (updatePoints) await updatePoints(userId, 2);
    await bot.answerCallbackQuery(query.id, { text: `✅ درست جواب دادی! +2 امتیاز1}/${state.questions.length})`, show_alert: false });
    await bot.sendMessage(userId, `✅ درست جواب دادی! +2 امتیاز (${qIdx + 1}/${state.questions.length})`);
  } else {
    await bot.answerCallbackQuery(query.id, { text: `❌ اشتباه بود! (${qIdx + 1}/${state.questions.length})`, show_alert: false });
    await bot.sendMessage(userId, `❌ اشتباه جواب دادی! (${qIdx + 1}/${state.questions.length})`);
  }
  setTimeout(() => nextChallengeOrFinish(userId, bot, state, challenge, adminId), 400);
}

// سوال بعدی یا پایان چالش
async function nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId) {
  state.current++;
  if (state.current < state.questions.length) {
    sendChallengeQuestion(userId, bot, challengeUserRef, db, adminId);
  } else {
    state.finished = true;
    if (typeof challengeUserRef === "function" && userId !== adminId) {
      await set(challengeUserRef(userId, state.week), {
        finished: true,
        correct: state.correct,
        total: state '';
    state.results.forEach((r, i) => {
      details += `سوال ${i+1}: ${r.timedOut ? '⏱ بی‌جواب' : (r.correct ? '✅ صحیح' : '❌ اشتباه')}\n`;
    });
    await bot.sendMessage(
      userId,
      `🎉 چالش این هفته تمام شد!\nتعداد پاسخ صحیح: ${state.correct} از ${state.questions.length}\n${details}امتیاز کل: ${state.correct * 2} سکه`
    );
    delete challengeState[userId];
  }
}

module.exports = {
  startChallenge,
  handleAnswer,
  challengeState
};