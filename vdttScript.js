'use strict';

const DEFAULT_VIDEOS = [
  {
    id: 'endfield-edit', title: 'Endfield Edit', creator: 'Kafa Pajar',
    views: 1800, duration: 'MP4', category: 'edit', thumbnail: '../pictures/1791600198688.jpeg',
    video: '../MY EDITS/lv_7693511978068823304_20261018182141.mp4',
    description: 'Salah satu editan dari koleksi pribadi Kafa Pajar. Setiap potongan, transisi, dan pilihan visual menjadi bagian dari cerita yang ingin dibagikan.',
    featured: true, createdAt: 1
  }
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const homePage = $('#home-page'), watchPage = $('#watch-page'), videoGrid = $('#video-grid');
const emptyState = $('#empty-state'), mainVideo = $('#main-video'), videoSource = $('#video-source');
const toast = $('#toast'), searchInput = $('#search-input');
const STORE_KEY = 'vydt-custom-videos-v2';
let VIDEOS = [...DEFAULT_VIDEOS];
let mediaURLs = new Map();
let activeFilter = 'all', activeView = 'home', sortNewestFirst = true, currentVideoId = null, toastTimer;
const readStore = (key, fallback) => { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
const writeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { notify('Penyimpanan browser penuh atau tidak tersedia.'); } };
let likedVideos = readStore('vydt-liked', []), dislikedVideos = readStore('vydt-disliked', []), followed = readStore('vydt-followed', false);
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function formatViews(value) { const count = Math.max(0, Number(value) || 0); return new Intl.NumberFormat('id-ID', { notation: count >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(count); }
function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
function getCurrentVideo() { return VIDEOS.find(video => video.id === currentVideoId); }
function getVideoURL(video, key) { return mediaURLs.get(`${video.id}:${key}`) || video[key]; }
function visibleVideos() {
  const query = searchInput.value.trim().toLocaleLowerCase('id');
  let videos = VIDEOS.filter(video => {
    const matchesQuery = `${video.title} ${video.creator} ${video.category}`.toLocaleLowerCase('id').includes(query);
    const matchesFilter = activeFilter === 'all' || video.category === activeFilter;
    const matchesView = activeView !== 'liked' || likedVideos.includes(video.id);
    return matchesQuery && matchesFilter && matchesView;
  });
  videos.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  return sortNewestFirst ? videos : videos.reverse();
}
function renderCards() {
  const videos = visibleVideos();
  videoGrid.innerHTML = videos.map((video, index) => {
    const thumb = getVideoURL(video, 'thumbnail');
    return `<article class="video-card" data-video-id="${escapeHTML(video.id)}" tabindex="0" role="button" aria-label="Tonton ${escapeHTML(video.title)}" style="--i:${index}">
      <div class="thumbnail-wrap">${thumb ? `<img class="thumbnail" src="${escapeHTML(thumb)}" alt="Thumbnail ${escapeHTML(video.title)}" loading="lazy" onerror="this.style.opacity='.12';this.alt='Thumbnail tidak ditemukan'">` : `<div class="thumbnail thumbnail-placeholder"><span>VYDT<span>.</span></span></div>`}
      <div class="thumbnail-overlay"></div><div class="play-indicator"><span>▶</span></div>${video.featured ? '<span class="featured-tag">FEATURED</span>' : ''}<span class="duration-tag">${escapeHTML(video.duration || 'VIDEO')}</span></div>
      <div class="video-card-info"><div class="mini-avatar">${escapeHTML((video.creator || 'V').charAt(0).toUpperCase())}</div><div class="video-copy"><h3>${escapeHTML(video.title)}</h3><p>${escapeHTML(video.creator || 'Kreator')}</p><p class="card-views"><span aria-hidden="true">◉</span> ${formatViews(video.views)} tayangan <span class="meta-dot">·</span> VYDT</p></div><button class="card-menu" type="button" aria-label="Info video" data-info-id="${escapeHTML(video.id)}">⋯</button></div></article>`;
  }).join('');
  emptyState.hidden = videos.length !== 0; videoGrid.hidden = videos.length === 0;
  $('#result-summary').textContent = videos.length ? `${videos.length} karya dalam koleksi ini.` : 'Tidak ada video yang ditemukan.';
  $$('.video-card').forEach(card => {
    const open = () => openWatchPage(card.dataset.videoId);
    card.addEventListener('click', event => { if (event.target.closest('[data-info-id]')) { event.stopPropagation(); const video = VIDEOS.find(item => item.id === event.target.closest('[data-info-id]').dataset.infoId); if (video) notify(`${video.title} · ${formatViews(video.views)} tayangan`); return; } open(); });
    card.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === card) { event.preventDefault(); open(); } });
  });
}
function renderRelated() {
  const related = VIDEOS.filter(video => video.id !== currentVideoId);
  $('#related-count').textContent = String(related.length).padStart(2, '0');
  $('#related-videos').innerHTML = related.length ? related.map(video => {
    const thumb = getVideoURL(video, 'thumbnail');
    return `<article class="related-card" data-related-id="${escapeHTML(video.id)}" tabindex="0" role="button" aria-label="Tonton ${escapeHTML(video.title)}"><div class="related-thumb">${thumb ? `<img src="${escapeHTML(thumb)}" alt="" loading="lazy">` : '<div class="related-placeholder">V.</div>'}</div><div><h3>${escapeHTML(video.title)}</h3><p>${escapeHTML(video.creator || 'Kreator')}<br>${formatViews(video.views)} tayangan</p></div></article>`;
  }).join('') : '<p class="comment-note">Karya lainnya akan muncul di sini saat koleksi bertambah.</p>';
  $$('[data-related-id]').forEach(card => { const open = () => openWatchPage(card.dataset.relatedId); card.addEventListener('click', open); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }); });
}
function updateActionState() {
  const liked = likedVideos.includes(currentVideoId), disliked = dislikedVideos.includes(currentVideoId);
  $('#like-button').setAttribute('aria-pressed', String(liked)); $('#dislike-button').setAttribute('aria-pressed', String(disliked));
  $('#like-button').querySelector('span').textContent = liked ? '♥' : '♡'; $('#like-count').textContent = liked ? '1' : '0';
  $('#subscribe-button').classList.toggle('subscribed', followed); $('#subscribe-button').textContent = followed ? '✓ Mengikuti' : '＋ Ikuti kreator';
}
function openWatchPage(videoId) {
  const video = VIDEOS.find(item => item.id === videoId); if (!video) return;
  currentVideoId = video.id; homePage.hidden = true; watchPage.hidden = false;
  watchPage.classList.remove('page-enter'); void watchPage.offsetWidth; watchPage.classList.add('page-enter');
  $('#breadcrumb-current').textContent = 'Sedang diputar'; $('#video-title').textContent = video.title;
  $('#watch-category').textContent = video.featured ? 'FEATURED EDIT' : `${String(video.category || 'edit').toUpperCase()} VIDEO`;
  $('#watch-views').textContent = `${formatViews(video.views)} tayangan`; $('#watch-date').textContent = video.createdAt && video.createdAt > 1 ? new Date(video.createdAt).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) : 'Koleksi VYDT';
  $('.channel-copy h3').textContent = video.creator || 'Kreator'; $('#video-description').textContent = video.description || 'Tidak ada deskripsi untuk video ini.';
  $('#video-description').classList.remove('description-extra'); $('#description-toggle').setAttribute('aria-expanded', 'false'); $('#description-toggle').innerHTML = 'Lihat selengkapnya <span>⌄</span>';
  mainVideo.pause(); mainVideo.poster = getVideoURL(video, 'thumbnail') || ''; videoSource.src = getVideoURL(video, 'video'); mainVideo.load();
  $('#download-button').href = getVideoURL(video, 'video'); $('#download-button').setAttribute('download', `${(video.title || video.id).replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || video.id}.mp4`);
  updateActionState(); renderRelated(); closeSidebar(); window.scrollTo({top:0,behavior:'smooth'});
  const attempt = mainVideo.play(); if (attempt?.catch) attempt.catch(() => {});
}
function closeWatchPage() { mainVideo.pause(); watchPage.hidden = true; homePage.hidden = false; homePage.classList.remove('page-enter'); void homePage.offsetWidth; homePage.classList.add('page-enter'); $('#breadcrumb-current').textContent = activeView === 'home' ? 'Beranda' : activeView === 'liked' ? 'Video disukai' : 'Koleksi saya'; window.scrollTo({top:0,behavior:'smooth'}); }
function setView(view) {
  activeView = view; $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#breadcrumb-current').textContent = view === 'home' ? 'Beranda' : view === 'liked' ? 'Video disukai' : 'Koleksi saya';
  $('#page-heading').innerHTML = view === 'liked' ? 'Video <span>disukai.</span>' : view === 'library' ? 'Koleksi <span>saya.</span>' : 'Koleksi <span>editan.</span>';
  $('#result-summary').textContent = view === 'liked' ? 'Editan yang kamu tandai suka di perangkat ini.' : view === 'library' ? 'Semua video yang tersimpan di arsip VYDT.' : 'Semua karya dalam satu tempat.';
  renderCards(); closeSidebar(); if (!watchPage.hidden) closeWatchPage();
}
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#mobile-backdrop').classList.remove('show'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); }
function toggleVideoReaction(type) {
  const current = type === 'like' ? likedVideos : dislikedVideos, other = type === 'like' ? dislikedVideos : likedVideos;
  const index = current.indexOf(currentVideoId); if (index >= 0) current.splice(index, 1); else current.push(currentVideoId);
  const otherIndex = other.indexOf(currentVideoId); if (otherIndex >= 0) other.splice(otherIndex, 1);
  if (type === 'like') { likedVideos = current; dislikedVideos = other; } else { dislikedVideos = current; likedVideos = other; }
  writeStore('vydt-liked', likedVideos); writeStore('vydt-disliked', dislikedVideos); updateActionState(); renderCards(); notify(index >= 0 ? 'Pilihanmu dibatalkan.' : type === 'like' ? 'Ditambahkan ke video disukai.' : 'Feedback tersimpan di perangkat ini.');
}
async function shareCurrentVideo() {
  const video = getCurrentVideo(); if (!video) return;
  const shareData = {title:video.title,text:`Tonton ${video.title} di VYDT`,url:window.location.href.split('#')[0]+`#video=${encodeURIComponent(video.id)}`};
  try { if (navigator.share) await navigator.share(shareData); else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(shareData.url); notify('Tautan video disalin.'); } else window.prompt('Salin tautan video ini:',shareData.url); } catch(error) { if(error.name!=='AbortError') notify('Tautan belum bisa dibagikan dari browser ini.'); }
}

// File media disimpan di IndexedDB supaya video tidak membebani localStorage.
const DB_NAME = 'vydt-media-db', DB_STORE = 'media';
function openMediaDB() { return new Promise((resolve,reject) => { if (!('indexedDB' in window)) return reject(new Error('Browser tidak mendukung penyimpanan media.')); const request = indexedDB.open(DB_NAME,1); request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE,{keyPath:'key'}); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function mediaDBPut(key, blob) { const db = await openMediaDB(); return new Promise((resolve,reject) => { const tx = db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put({key,blob}); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
async function mediaDBGetAll() { const db = await openMediaDB(); return new Promise((resolve,reject) => { const request = db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).getAll(); request.onsuccess = () => { db.close(); resolve(request.result || []); }; request.onerror = () => { db.close(); reject(request.error); }; }); }
async function mediaDBDeleteVideo(id) { const db = await openMediaDB(); return new Promise((resolve,reject) => { const tx = db.transaction(DB_STORE,'readwrite'), store = tx.objectStore(DB_STORE); store.delete(`${id}:video`); store.delete(`${id}:thumbnail`); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
async function loadCustomVideos() {
  const saved = readStore(STORE_KEY, []);
  try { for (const item of await mediaDBGetAll()) { const old = mediaURLs.get(item.key); if (old) URL.revokeObjectURL(old); mediaURLs.set(item.key, URL.createObjectURL(item.blob)); } } catch { /* File media akan tetap bisa ditambahkan bila IndexedDB tersedia. */ }
  VIDEOS = [...DEFAULT_VIDEOS, ...saved.map(video => ({...video, video:mediaURLs.get(`${video.id}:video`) || '', thumbnail:mediaURLs.get(`${video.id}:thumbnail`) || ''}))];
}
function openAddVideoModal() { $('#add-video-modal').hidden = false; document.body.classList.add('modal-open'); setTimeout(() => $('#add-video-form [name="title"]').focus(),50); }
function closeAddVideoModal() { $('#add-video-modal').hidden = true; document.body.classList.remove('modal-open'); $('#add-video-form').reset(); $('#add-video-form [name="creator"]').value = 'Kafa Pajar'; }
async function saveNewVideo(event) {
  event.preventDefault(); const form = event.currentTarget, data = new FormData(form), videoFile = data.get('videoFile'), thumbFile = data.get('thumbnailFile');
  if (!(videoFile instanceof File) || !videoFile.size) { notify('Pilih file video terlebih dahulu.'); return; }
  const submit = $('.submit-video-button'); submit.disabled = true; submit.textContent = 'Menyimpan...';
  const id = `vydt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const item = {id,title:String(data.get('title')).trim(),creator:String(data.get('creator')||'Kafa Pajar').trim()||'Kafa Pajar',views:0,duration:(videoFile.name.split('.').pop()||'VIDEO').toUpperCase(),category:String(data.get('category')||'edit'),description:String(data.get('description')||'').trim(),createdAt:Date.now(),featured:false};
  try {
    await mediaDBPut(`${id}:video`,videoFile); const videoURL = URL.createObjectURL(videoFile); mediaURLs.set(`${id}:video`,videoURL); item.video = videoURL;
    if (thumbFile instanceof File && thumbFile.size) { await mediaDBPut(`${id}:thumbnail`,thumbFile); const thumbURL = URL.createObjectURL(thumbFile); mediaURLs.set(`${id}:thumbnail`,thumbURL); item.thumbnail = thumbURL; }
    const saved = readStore(STORE_KEY,[]); saved.push({...item,video:'',thumbnail:''}); writeStore(STORE_KEY,saved);
    VIDEOS.push(item); closeAddVideoModal(); searchInput.value = ''; activeFilter = 'all'; activeView = 'home'; $$('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.view==='home')); $$('.filter-pill').forEach(button=>button.classList.toggle('active',button.dataset.filter==='all')); renderCards(); notify('Video berhasil ditambahkan ke koleksi VYDT.');
  } catch(error) { console.error(error); notify('Gagal menyimpan. Coba file lebih kecil atau periksa ruang penyimpanan browser.'); }
  finally { submit.disabled = false; submit.innerHTML = '<span>＋</span> Simpan ke koleksi'; }
}

$('#back-button').addEventListener('click',closeWatchPage); $('#like-button').addEventListener('click',()=>toggleVideoReaction('like')); $('#dislike-button').addEventListener('click',()=>toggleVideoReaction('dislike')); $('#share-button').addEventListener('click',shareCurrentVideo);
$('#subscribe-button').addEventListener('click',()=>{followed=!followed;writeStore('vydt-followed',followed);updateActionState();notify(followed?'Kamu sekarang mengikuti Kafa Pajar di perangkat ini.':'Kamu berhenti mengikuti kreator.');});
$('#description-toggle').addEventListener('click',()=>{const panel=$('.description-panel'),expanded=panel.classList.toggle('expanded');$('#description-toggle').setAttribute('aria-expanded',String(expanded));$('#description-toggle').innerHTML=expanded?'Tampilkan lebih sedikit <span>⌄</span>':'Lihat selengkapnya <span>⌄</span>';});
searchInput.addEventListener('input',renderCards);
$('#reset-search').addEventListener('click',()=>{searchInput.value='';activeFilter='all';$$('.filter-pill').forEach(button=>button.classList.toggle('active',button.dataset.filter==='all'));renderCards();});
$$('.filter-pill').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;$$('.filter-pill').forEach(item=>item.classList.toggle('active',item===button));renderCards();}));
$('#sort-button').addEventListener('click',()=>{sortNewestFirst=!sortNewestFirst;$('#sort-button').querySelector('span').textContent=sortNewestFirst?'Terbaru':'Terlama';renderCards();});
$$('.nav-item').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
$('#menu-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#mobile-backdrop').classList.toggle('show',open);$('#menu-toggle').setAttribute('aria-expanded',String(open));});
$('#mobile-backdrop').addEventListener('click',closeSidebar); $('#profile-button').addEventListener('click',()=>notify('VYDT adalah arsip editan pribadi Kafa Pajar.'));
$('#open-add-video').addEventListener('click',openAddVideoModal); $('#hero-add-video').addEventListener('click',openAddVideoModal); $('#close-add-video').addEventListener('click',closeAddVideoModal); $('#cancel-add-video').addEventListener('click',closeAddVideoModal); $('#add-video-form').addEventListener('submit',saveNewVideo);
$('#add-video-modal').addEventListener('click',event=>{if(event.target.id==='add-video-modal')closeAddVideoModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeSidebar();if(!watchPage.hidden)closeWatchPage();if(!$('#add-video-modal').hidden)closeAddVideoModal();}if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();searchInput.focus();}});
window.addEventListener('hashchange',()=>{const match=window.location.hash.match(/video=([^&]+)/);if(match)openWatchPage(decodeURIComponent(match[1]));});
$('#year').textContent=new Date().getFullYear();
(async()=>{await loadCustomVideos();renderCards();const initial=window.location.hash.match(/video=([^&]+)/);if(initial)openWatchPage(decodeURIComponent(initial[1]));})();
