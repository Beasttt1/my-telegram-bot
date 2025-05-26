const fs = require('fs');
const { set, get } = require('firebase/database');

// بارگذاری سوالات از challenge.json
function loadQuestions() {
  return JSON.parse(fs.readFileSync('./challenge.json', 'utf8'));
}

//.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-${week}`;
}

// وضعیت چالش برای هر کاربر
const challengeState = {}; // userId -> state

// شروع چالش برای کاربر
 شما این هفته چالش را انجام داده‌اید! هفته بعد دوباره امتحان کنید.");
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
  sendChallengeQuestion(userId, bot, challengeUserRef, db, adminId);
}

// ارسال سوال به کاربر (پشتی.finished) return;
  const qObj = state.questions[state.current];
  const qNum = state.current + 1;
  const total = state.questions.length;

  // تقسیم گزینه‌ها در چند ردیف (هر ردیف 2 یا 3 تا)
  let inlineKeyboard = [];
  const perRow = qObj.choices.length > 4 ? 3 :qNum - 1}_${i + idx}`
      }))
    );
  }

  const opts = {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };
  bot.sendMessage(
    userId,
    `سوال ${qNum} از ${total}:\n${qObj.question}`,
    }, { chat_id: chatId, message_id: messageId });
        await bot.sendMessage(userId, `⏱ زمان این سوال تمام شد! (${qNum}/${total})`);
        nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId);
      }
    }, 10000);
Id];
  if (!state || state.finished) return;
  const [_, qIdxStr, ansIdxStr] = query.data.split('_');
  const qIdx = parseInt(qIdxStr), ansIdx = parseInt(ansIdxStr);
  if (!state.waitingFor || state.waitingFor.qIdx !== qIdx) return;
  if (state.waitingFor.expired) return;
  }
  state.waitingFor.setAnswered();
  clearTimeout(state.waitingFor.timer);
  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: state.waitingFor.chatId, message_id: state.waitingFor.messageId });
  const qObj = state.questions[qIdx];
  const correct = qObj.answer === ansIdx;
  if (correct) state.correct++;
  state.results.push({ correct, timedOut: false });
  if (correct) {
    if (updatePoints) await updatePoints(userId, 2);
    await bot.answerCallbackQuery(query.id, { text: `}/${state.questions.length})`);
  } else {
    await bot.answerCallbackQuery(query.id, { text: `❌ اشتباه بود! (${qIdx + 1}/${state.questions.length})`, show_alert: false });
    await bot.sendMessage(userId, `❌ اشتباه جواب دادی! (${qIdx + 1}/${state.questions.length})`);
  }
  setTimeout(() => nextChallengeOrFinish(userId, bot, state, challengeUserRef, db, adminId), 400);
}

// سوال بعد && userId !== adminId) {
      await set(challengeUserRef(userId, state.week), {
        finished: true,
        correct: state.correct,
        total: state.questions.length,
        results: state.results
      });
    }
    let details = '';
    state.results.forEach((r, i) => {
      details += `سوال ${i+1}: ${r.timedOut ? '⏱ بی‌جواب' : (r.correct ? '✅ صحیح' : '❌ اشتباه')}\n`;
    });
    await bot.sendMessage(
      userId,
      `🎉 چالش این هفته تمام شدn${details}امتیاز کل: ${state.correct * 2} سکه`
    );
    delete challengeState[userId];
  }
}

module.exports = {
  startChallenge,
  handleAnswer,
  challengeState
};