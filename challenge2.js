const fs = require('fs');
const { set, get } = require('firebase/database');

// بارگذاری سوالات از challenge.json
function loadQuestions() {
  return JSON.parse(fs.readFileSync('./challenge.json', 'utf8'));
}

// دریافت رشته هفته فعلی (سال-هفته)
function getCurrentWeekString() {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-${week}`;
}

// وضعیت چالش برای هر کاربر
const challengeState = {}; // userId -> state

// شروع چالش برای کاربر
async function startChallenge({ userId, bot, db, challengeUserRef, adminId }) {
  const weekStr = getCurrentWeekString();
  // فقط اینجا از await استفاده می‌شود و تابع async است
  const prev = await get(challengeUserRef(userId, weekStr));
  if (prev.exists() && userId !== adminId) {
    await bot.sendMessage(userId, "❌ شما این هفته چالش را انجام داده‌اید! هفته بعد دوباره امتحان کنید.");
    return;
  }
  const questions = loadQuestions();
  const selected = questions.sort(() => Math.random() - 0.5).slice(0, 3);
  challengeState[userId] = {
    week: weekStr,
    questions: selected,
    current: 0,
    correct: 0,
    finished: false,
    results: [],
    waitingFor: null
  };
  sendChallengeQuestion(userId, bot);
}

// ارسال سوال به کاربر
function sendChallengeQuestion(userId, bot) {
  const state = challengeState[userId];
  if (!state || state.finished) return;
  const qObj = state.questions[state.current];
  const qNum = state.current + 1;
  const total = state.questions.length;
  const opts = {
    reply_markup: {
      inline_keyboard: [
        qObj.choices.map((choice, idx) => ({
          text: choice,
          callback_data: `challenge_answer_${qNum - 1}_${idx}`
        }))
      ]
    }
  };
  bot.sendMessage(
    userId,
    `سوال ${qNum} از ${total}:\n${qObj.question}`,
    opts
  ).then(msg => {
    let answered = false;
    const timer = setTimeout(async () => {
      if (!answered) {
        answered = true;
        state.results.push({ correct: false, timedOut: true });
        await bot.sendMessage(userId, `⏱ زمان این سوال تمام شد! (${qNum}/${total})`);
        nextChallengeOrFinish(userId, bot, state);
      }
    }, 10000);
    state.waitingFor = {
      qIdx: qNum - 1,
      timer,
      answeredFlag: () => answered,
      setAnswered: () => { answered = true; }
    };
  });
}

// هندل جواب کاربر به سوال چالش
async function handleAnswer({ query, bot, updatePoints, challengeUserRef, db, adminId }) {
  const userId = query.from.id;
  const state = challengeState[userId];
  if (!state || state.finished) return;
  const [_, qIdxStr, ansIdxStr] = query.data.split('_');
  const qIdx = parseInt(qIdxStr), ansIdx = parseInt(ansIdxStr);
  if (!state.waitingFor || state.waitingFor.qIdx !== qIdx) return;
  if (state.waitingFor.answeredFlag()) {
    await bot.answerCallbackQuery(query.id, { text: 'این سوال تمام شده است.', show_alert: false });
    return;
  }
  state.waitingFor.setAnswered();
  clearTimeout(state.waitingFor.timer);
  const qObj = state.questions[qIdx];
  const correct = qObj.answer === ansIdx;
  if (correct) state.correct++;
  state.results.push({ correct, timedOut: false });
  if (correct) {
    await updatePoints(userId, 2);
    await bot.answerCallbackQuery(query.id, { text: `✅ درست جواب دادی! +2 امتیاز (${qIdx+1}/3)`, show_alert: false });
    await bot.sendMessage(userId, `✅ درست جواب دادی! +2 امتیاز (${qIdx+1}/3)`);
  } else {
    await bot.answerCallbackQuery(query.id, { text: `❌ اشتباه بود! (${qIdx+1}/3)`, show_alert: false });
    await bot.sendMessage(userId, `❌ اشتباه جواب دادی! (${qIdx+1}/3)`);
  }
  setTimeout(() => nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId), 400);
}

// سوال بعدی یا پایان چالش
async function nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId) {
  state.current++;
  if (state.current < state.questions.length) {
    sendChallengeQuestion(userId, bot);
  } else {
    state.finished = true;
    if (userId !== adminId) {
      await set(challengeUserRef(userId, state.week), {
        finished: true,
        correct: state.correct,
        total: state.questions.length,
        results: state.results
      });
    }
    await bot.sendMessage(
      userId,
      `🎉 چالش این هفته تمام شد!\nتعداد پاسخ صحیح: ${state.correct} از ${state.questions.length}\nامتیاز کل: ${state.correct * 2} سکه`
    );
    delete challengeState[userId];
  }
}

module.exports = {
  startChallenge,
  handleAnswer,
  challengeState
};