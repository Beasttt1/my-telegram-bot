const Parser = require('rss-parser');
const parser = new Parser();

async function sendMLNews(bot, userId) {
  try {
    const feed = await parser.parseURL('https://feeds.bbci.co.uk/news/rss.xml');
    const news = feed.items.slice(0, 5); // فقط ۵ خبر اول

    if (news.length === 0) {
      await bot.sendMessage(userId, '❌ خبری برای نمایش وجود ندارد.');
      return;
    }

    let message = '📰 آخرین اخبار:\n\n';
    news.forEach((item, index) => {
      message += `🔹 ${item.title}\n${item.link}\n\n`;
    });

    await bot.sendMessage(userId, message);
  } catch (err) {
    console.error('خطا در دریافت RSS:', err.message);
    await bot.sendMessage(userId, '❌ خطا در دریافت اخبار. لطفاً بعداً امتحان کنید.');
  }
}

module.exports = { sendNews };