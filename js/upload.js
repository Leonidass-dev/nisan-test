/**
 * upload.js — Misafir yükleme sayfası mantığı
 * Toplu yükleme desteği: Kuyruk sistemi, Wake Lock, akıllı önizleme
 */

// ── Sabitler ──────────────────────────────
const MAX_PREVIEW_COUNT = 12;   // Bu kadardan fazlaysa önizleme gösterme
const CONCURRENT_UPLOADS = 3;   // Aynı anda kaç dosya yüklensin

// ── Durum ─────────────────────────────────
let selectedFiles = [];
let masaNo = 'bilinmiyor';
let wakeLock = null;

// ── DOM referansları ──────────────────────
const dropZone         = document.getElementById('drop-zone');
const fileInput        = document.getElementById('file-input');
const previewSection   = document.getElementById('preview-section');
const previewGrid      = document.getElementById('preview-grid');
const previewCount     = document.getElementById('preview-count');
const uploadSection    = document.getElementById('upload-section');
const successScreen    = document.getElementById('success-screen');
const btnUpload        = document.getElementById('btn-upload');
const btnAddMore       = document.getElementById('btn-add-more');
const btnUploadMore    = document.getElementById('btn-upload-more');
const progressWrap     = document.getElementById('upload-progress-wrap');
const progressBar      = document.getElementById('progress-bar');
const progressPct      = document.getElementById('progress-pct');
const progressLabel    = document.getElementById('progress-label');
const successCount     = document.getElementById('success-count');
const masaNum          = document.getElementById('masa-num');

// ── Başlatma ──────────────────────────────
function init() {
  const params = new URLSearchParams(window.location.search);
  masaNo = params.get('masa') || params.get('m') || 'misafir';
  masaNum.textContent = isNaN(masaNo) ? masaNo : masaNo;

  if (!params.get('masa') && !params.get('m')) {
    document.getElementById('masa-badge').style.display = 'none';
  }

  // Çoklu dosya seçimine izin ver
  fileInput.setAttribute('multiple', 'true');

  bindEvents();
}

// ── Olaylar ───────────────────────────────
function bindEvents() {
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => e.key === 'Enter' && fileInput.click());

  fileInput.addEventListener('change', e => addFiles(Array.from(e.target.files)));

  dropZone.addEventListener('dragover',  handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop',      handleDrop);

  btnUpload.addEventListener('click',     startUpload);
  btnAddMore.addEventListener('click',    () => fileInput.click());
  btnUploadMore.addEventListener('click', resetPage);
}

function handleDragOver(e) {
  e.preventDefault();
  dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(isAllowedFile);
  if (files.length) addFiles(files);
  else showToast('Sadece fotoğraf ve video dosyaları kabul edilir.', 'error');
}

// ── Dosya İşleme ──────────────────────────
function isAllowedFile(file) {
  return file.type.startsWith('image/') || file.type.startsWith('video/');
}

function getMaxSize(file) {
  if (file.type.startsWith('image/')) return EVENT_CONFIG.maxImageSizeMB * 1024 * 1024;
  if (file.type.startsWith('video/')) return EVENT_CONFIG.maxVideoSizeMB * 1024 * 1024;
  return 0;
}

function addFiles(newFiles) {
  const allowed = newFiles.filter(isAllowedFile);

  // Sadece videoları boyut kontrolüne tabi tut (fotoğraflar otomatik sıkıştırılacak)
  const oversizedVideos = allowed.filter(f =>
    f.type.startsWith('video/') && f.size > EVENT_CONFIG.maxVideoSizeMB * 1024 * 1024
  );

  if (oversizedVideos.length) {
    showToast(`${oversizedVideos.length} video ${EVENT_CONFIG.maxVideoSizeMB}MB limitini aşıyor.`, 'error');
  }

  // Fotoğraflar → HEPSINI kabul et (yüklerken otomatik sıkıştırılacak)
  // Videolar → Sadece 100MB altındakileri kabul et
  const valid = allowed.filter(f => {
    if (f.type.startsWith('image/')) return true; // Hepsini al
    if (f.type.startsWith('video/')) return f.size <= EVENT_CONFIG.maxVideoSizeMB * 1024 * 1024;
    return false;
  });

  if (!valid.length) return;

  // Tekrar eklemeyi önle
  const unique = valid.filter(nf =>
    !selectedFiles.some(sf => sf.name === nf.name && sf.size === nf.size)
  );

  selectedFiles = [...selectedFiles, ...unique];
  renderPreviews();
  updateUI();

  if (unique.length < valid.length) {
    showToast('Bazı dosyalar zaten eklenmiş.', 'info');
  }

  if (unique.length > 0) {
    showToast(`${unique.length} dosya eklendi. Toplam: ${selectedFiles.length}`, 'success');
  }
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreviews();
  updateUI();
}

// ── Akıllı Önizleme ─────────────────────
// 12'den fazla dosya varsa önizleme gösterme (telefon çökmesin)
function renderPreviews() {
  previewGrid.innerHTML = '';

  if (selectedFiles.length > MAX_PREVIEW_COUNT) {
    // Çok fazla dosya — sadece özet göster, önizleme yok
    const summary = document.createElement('div');
    summary.className = 'bulk-summary';
    summary.innerHTML = `
      <div class="bulk-icon">📸</div>
      <div class="bulk-text">
        <strong>${selectedFiles.length}</strong> dosya yüklenmeye hazır
      </div>
      <div class="bulk-detail">
        ${countByType()} · Toplam ${formatBytes(totalSize())}
      </div>
    `;
    previewGrid.appendChild(summary);
    return;
  }

  // Normal önizleme (12 veya daha az dosya)
  selectedFiles.forEach((file, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.setAttribute('role', 'listitem');

    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);

    if (isVideo) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.muted = true;
      vid.preload = 'metadata';
      vid.addEventListener('loadedmetadata', () => URL.revokeObjectURL(url));
      item.appendChild(vid);

      const badge = document.createElement('span');
      badge.className = 'video-badge';
      badge.textContent = '▶ VIDEO';
      item.appendChild(badge);
    } else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = file.name;
      img.loading = 'lazy';
      img.addEventListener('load', () => URL.revokeObjectURL(url));
      item.appendChild(img);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', `${file.name} dosyasını kaldır`);
    removeBtn.addEventListener('click', e => { e.stopPropagation(); removeFile(i); });
    item.appendChild(removeBtn);

    previewGrid.appendChild(item);
  });
}

function countByType() {
  const images = selectedFiles.filter(f => f.type.startsWith('image/')).length;
  const videos = selectedFiles.filter(f => f.type.startsWith('video/')).length;
  const parts = [];
  if (images) parts.push(`${images} fotoğraf`);
  if (videos) parts.push(`${videos} video`);
  return parts.join(', ');
}

function totalSize() {
  return selectedFiles.reduce((sum, f) => sum + f.size, 0);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function updateUI() {
  const hasFiles = selectedFiles.length > 0;
  previewSection.classList.toggle('hidden', !hasFiles);
  previewCount.textContent = `${selectedFiles.length} dosya seçildi`;
  btnUpload.disabled = !hasFiles;

  const icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`;

  if (hasFiles) {
    btnUpload.innerHTML = `${icon} ${selectedFiles.length} Dosyayı Yükle`;
  } else {
    btnUpload.innerHTML = `${icon} Yükle`;
  }
}

// ── Wake Lock (Ekranı Açık Tut) ──────────
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('🔆 Ekran açık tutulacak');
    }
  } catch (err) {
    console.warn('Wake Lock alınamadı:', err);
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('🔅 Wake Lock bırakıldı');
    } catch (e) { /* ignore */ }
  }
}

// ── Toplu Yükleme — Kuyruk Sistemi ───────
async function startUpload() {
  if (!selectedFiles.length) return;

  // Ekranı açık tut
  await requestWakeLock();

  // UI'yi kilitle
  btnUpload.disabled = true;
  progressWrap.classList.remove('hidden');
  dropZone.style.pointerEvents = 'none';
  dropZone.style.opacity = '0.5';
  if (btnAddMore) btnAddMore.disabled = true;

  let uploaded = 0;
  let failed = 0;
  const total = selectedFiles.length;
  const files = [...selectedFiles]; // Kopya al

  // Kuyruk: Aynı anda CONCURRENT_UPLOADS kadar dosya yükle
  let currentIndex = 0;

  async function uploadNext() {
    while (currentIndex < files.length) {
      const i = currentIndex++;
      const file = files[i];

      progressLabel.textContent = `Yükleniyor: ${uploaded + failed + 1} / ${total}`;

      try {
        await uploadFile(file, masaNo, (pct) => {
          // Her bir dosyanın ilerlemesi tüm yüklemeye yansır
          const completedPortion = (uploaded + failed) / total;
          const currentPortion = (pct / 100) / total;
          const overall = Math.round((completedPortion + currentPortion) * 100);
          setProgress(Math.min(overall, 99));
        });
        uploaded++;
      } catch (err) {
        failed++;
        console.error(`Yükleme hatası (${file.name}):`, err);
        showToast(`"${file.name}" yüklenemedi`, 'error');
      }

      // İlerleme güncelle
      const doneCount = uploaded + failed;
      progressLabel.textContent = `${uploaded} / ${total} yüklendi${failed > 0 ? ` (${failed} başarısız)` : ''}`;
      setProgress(Math.round((doneCount / total) * 100));
    }
  }

  // N adet paralel worker başlat
  const workers = [];
  for (let w = 0; w < Math.min(CONCURRENT_UPLOADS, total); w++) {
    workers.push(uploadNext());
  }

  // Hepsi bitene kadar bekle
  await Promise.all(workers);

  setProgress(100);
  progressLabel.textContent = `${uploaded}/${total} dosya yüklendi!`;

  // Wake Lock'u bırak
  await releaseWakeLock();

  await sleep(600);
  showSuccessScreen(uploaded);
}

function setProgress(pct) {
  progressBar.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', pct);
  progressPct.textContent = pct + '%';
}

// ── Başarı ekranı ─────────────────────────
function showSuccessScreen(count) {
  uploadSection.classList.add('hidden');
  successScreen.classList.remove('hidden');
  successCount.textContent = `${count} dosya başarıyla yüklendi ✨`;
  spawnConfetti();
}

function spawnConfetti() {
  const area = document.getElementById('confetti-area');
  const colors = ['#d4b886','#e6d3a8','#d8b8b8','#ebd6d6','#fff'];
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${40 + Math.random() * 20}%;
      top: ${20 + Math.random() * 20}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      --cx: ${(Math.random() - 0.5) * 160}px;
      --cy: ${60 + Math.random() * 60}px;
      animation-delay: ${Math.random() * 0.4}s;
    `;
    area.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function resetPage() {
  selectedFiles = [];
  fileInput.value = '';
  previewGrid.innerHTML = '';
  previewSection.classList.add('hidden');
  progressWrap.classList.add('hidden');
  successScreen.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  dropZone.style.pointerEvents = '';
  dropZone.style.opacity = '';
  setProgress(0);
  updateUI();
}

// ── Toast ─────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✗', info: '✦' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Yardımcı ──────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Başlat ────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
