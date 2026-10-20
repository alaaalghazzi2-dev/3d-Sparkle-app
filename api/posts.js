const axios = require('axios');
const { extractPosts } = require('../lib/extract-posts');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { data } = await axios.get('https://www.makeronline.com/en/', {
      timeout: 20000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html', 'Accept-Language': 'en' }
    });
    const posts = extractPosts(data);
    if (!posts.length) {
      console.error('MakerOnline returned no model cards');
      return res.status(502).json({ error: 'لم نتمكن من استخراج المنشورات من المصدر. حاول مجددًا لاحقًا.' });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(posts);
  } catch (error) {
    console.error('MakerOnline fetch failed', error.code, error.response?.status);
    return res.status(502).json({ error: 'تعذّر الاتصال بموقع MakerOnline. حاول مجددًا بعد قليل.' });
  }
};
