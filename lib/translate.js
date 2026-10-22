const httpClient = {get: async (url, {params, timeout}) => {
 const response = await fetch(url + '?' + new URLSearchParams(params), {signal: AbortSignal.timeout(timeout)});
 if (!response.ok) throw new Error('Translation service unavailable');
 return {data: await response.json()};
}};

// MyMemory anonymous API: 5,000 characters/day; only public model titles sent.
// It has no availability guarantee; failures must never hide catalogue items.
function createTranslator(http = httpClient, now = Date.now) {
 const cache = new Map(), pending = new Map();
 function remember(key, value, ttl) {
  cache.delete(key);
  if (cache.size >= 2000) cache.delete(cache.keys().next().value);
  cache.set(key, {value, expires: now() + ttl});
 }
 async function titleToEnglish(originalTitle) {
  const title = String(originalTitle || '').trim();
  const fallback = {title, originalTitle: title, translationStatus: 'unavailable'};
  if (!title || title.length > 500) return fallback;
  const hit = cache.get(title);
  if (hit && hit.expires > now()) return hit.value;
  if (pending.has(title)) return pending.get(title);
  const job = (async () => {
   try {
    // Detect every title, including French/Spanish titles containing only ASCII.
    // Explicit script hints avoid short Chinese titles being misdetected as English.
    const source = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(title) ? 'ja' :
     /\p{Script=Hangul}/u.test(title) ? 'ko' : /\p{Script=Han}/u.test(title) ? 'zh-CN' :
     /\p{Script=Arabic}/u.test(title) ? 'ar' : 'autodetect';
    const {data} = await http.get('https://api.mymemory.translated.net/get', {
     params: {langpair: source + '|en', q: title},
     timeout: 4500
    });
    // Auto-detection rejects source=target for already-English titles.
    const alreadyEnglish = source==='autodetect' && String(data?.responseStatus)==='403' && data.responseDetails==='PLEASE SELECT TWO DISTINCT LANGUAGES';
    if (!alreadyEnglish && (Number(data?.responseStatus)!==200 || data.quotaFinished)) throw new Error('Translation unavailable');
    const translated = alreadyEnglish ? title : String(data?.responseData?.translatedText || '').trim();
    if (!translated || translated.length > 500) throw new Error('Empty translation');
    const value = {title: translated, originalTitle: title, translationStatus: 'ready'};
    remember(title, value, 24 * 60 * 60 * 1000);
    return value;
   } catch {
    remember(title, fallback, 30000);
    return fallback;
   } finally { pending.delete(title); }
  })();
  pending.set(title, job);
  return job;
 }
 return async posts => Promise.all(posts.map(async post => ({...post, ...await titleToEnglish(post.title)})));
}
module.exports = {translatePosts: createTranslator(), createTranslator};
