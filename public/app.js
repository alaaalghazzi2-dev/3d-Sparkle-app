const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const errorEl = document.getElementById('error');
const refreshBtn = document.getElementById('refreshBtn');

async function loadPosts() {
  loader.style.display = 'block';
  grid.innerHTML = '';
  errorEl.textContent = '';
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    loader.style.display = 'none';
    posts.forEach(post => {
      const a = document.createElement('a');
      a.href = post.link;
      a.target = '_blank';
      a.className = 'card';
      a.innerHTML = `<img src="${post.image}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'"><h3>${post.title}</h3>`;
      grid.appendChild(a);
    });
  } catch (e) {
    loader.style.display = 'none';
    errorEl.textContent = 'Failed to load posts.';
  }
}
refreshBtn.addEventListener('click', loadPosts);
loadPosts();