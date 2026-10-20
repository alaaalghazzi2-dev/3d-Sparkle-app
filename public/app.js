const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const errorEl = document.getElementById('error');
const refreshBtn = document.getElementById('refreshBtn');

async function loadPosts() {
  loader.style.display = 'block';
  errorEl.textContent = '';
  refreshBtn.disabled = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);
  try {
    const res = await fetch('/api/posts', { signal: controller.signal });
    const posts = await res.json();
    if (!res.ok) throw new Error(posts.error || 'تعذّر تحميل المنشورات.');
    if (!Array.isArray(posts)) throw new Error('وصلت بيانات غير صالحة من الخادم.');
    if (!posts.length) throw new Error('لم يتم العثور على منشورات. حاول التحديث لاحقًا.');
    const fragment = document.createDocumentFragment();
    posts.forEach(post => {
      const a = document.createElement('a');
      a.href = post.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'card';
      const img = document.createElement('img');
      img.src = post.image;
      img.alt = post.title;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.textContent = 'تعذّر تحميل الصورة';
        img.replaceWith(placeholder);
      }, { once: true });
      const title = document.createElement('h3');
      title.textContent = post.title;
      title.dir = 'auto';
      a.append(img, title);
      fragment.appendChild(a);
    });
    grid.replaceChildren(fragment);
  } catch (error) {
    errorEl.textContent = error.name === 'AbortError' ? 'استغرق الاتصال وقتًا طويلًا. حاول مجددًا.' : error.message;
  } finally {
    clearTimeout(timer);
    loader.style.display = 'none';
    refreshBtn.disabled = false;
  }
}
refreshBtn.addEventListener('click', loadPosts);
loadPosts();
