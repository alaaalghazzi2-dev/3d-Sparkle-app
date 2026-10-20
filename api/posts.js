const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { data } = await axios.get('https://www.makeronline.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    const posts = [];

    $('article').each((i, el) => {
      const titleEl = $(el).find('h2 a, h3 a, .entry-title a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const imgEl = $(el).find('img').first();
      let image = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
      if (image.startsWith('/')) image = 'https://www.makeronline.com' + image;
      if (title && image) posts.push({ title, image, link });
    });

    res.status(200).json(posts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch from makeronline.com' });
  }
};