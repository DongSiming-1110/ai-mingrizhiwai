// The page is static HTML; JavaScript only enlarges diagrams and loads verified video links.
const viewer = document.querySelector('#image-viewer');
const viewerImage = document.querySelector('#viewer-image');
let opener;
document.querySelectorAll('.drawing-link').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || !viewer.showModal) return;
    event.preventDefault(); opener = link;
    viewerImage.src = link.href; viewerImage.alt = link.querySelector('img').alt;
    document.querySelector('#image-title').textContent = link.dataset.title;
    viewer.showModal();
  });
});
document.querySelector('#close-viewer').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => {
  const rect = viewer.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
});
viewer.addEventListener('close', () => opener?.focus());
fetch('./videos.json').then(r => { if (!r.ok) throw new Error('Video list unavailable'); return r.json(); }).then(videos => {
  if (!Array.isArray(videos) || !videos.length) return;
  const grid = document.createElement('div'); grid.className = 'video-grid';
  videos.forEach(video => {
    let url; try { url = new URL(video.url); } catch { return; }
    if (url.protocol !== 'https:' || !(url.hostname === 'douyin.com' || url.hostname.endsWith('.douyin.com'))) return;
    const card = document.createElement('article'); card.className = 'video-card';
    if (video.poster && /^\.\/assets\/[a-z0-9-]+\.(webp|jpg|png)$/.test(video.poster)) {
      const imageLink = document.createElement('a'); imageLink.href = url.href; imageLink.target = '_blank'; imageLink.rel = 'noopener noreferrer';
      const img = document.createElement('img'); img.src = video.poster; img.alt = video.title; img.loading = 'lazy'; imageLink.append(img); card.append(imageLink);
    }
    const title = document.createElement('h3'); title.textContent = video.title; card.append(title);
    if (video.description) { const p = document.createElement('p'); p.textContent = video.description; card.append(p); }
    const link = document.createElement('a'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'text-link'; link.textContent = '在抖音观看 ↗'; card.append(link); grid.append(card);
  });
  document.querySelector('#video-list').append(grid);
}).catch(() => {});
