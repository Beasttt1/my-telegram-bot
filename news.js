const Parser = require("rss-parser");
const parser = new Parser();

// تابعی برای دریافت ۳ خبر جدید
async function fetchLatestNews() {
  try {
    const feed = await parser.parseURL("https://www.mlbbesports.com/rss");
    return feed.items.slice(0, 5); // فقط ۳ خبر اول
  } catch (err) {
    console.error("خطا در دریافت RSS:", err.message);
    return null;
  }
}

module.exports = { fetchLatestNews };