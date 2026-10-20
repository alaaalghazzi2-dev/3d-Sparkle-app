const cheerio = require('cheerio');
const BASE = 'https://www.makeronline.com';

function safeUrl(value) {
  try {
    const url = new URL(value, BASE);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}

function extractPosts(html) {
  const $ = cheerio.load(html);
  const posts = new Map();
  // Current server-rendered cards: model link containing its preview image.
  // Avoid CSS utility classes, which change more frequently than model URLs.
  $('a[href*="/model/"]').each((_, element) => {
    const anchor = $(element);
    const link = safeUrl(anchor.attr('href'));
    if (!link || link.hostname !== 'www.makeronline.com' || !/\/model\/.+\/\d+\.html$/.test(link.pathname)) return;
    const img = anchor.find('img').first();
    if (!img.length) return;
    const title = (img.attr('alt') || anchor.attr('title') || '').replace(/\s+/g, ' ').trim();
    const candidates = [img.attr('data-src'), img.attr('data-lazy-src'), img.attr('src')];
    const image = candidates.filter(Boolean).map(safeUrl).find(Boolean);
    if (!title || !image) return;
    link.search = ''; link.hash = '';
    posts.set(link.href, { title, image: image.href, link: link.href });
  });
  return [...posts.values()];
}
module.exports = { extractPosts };
