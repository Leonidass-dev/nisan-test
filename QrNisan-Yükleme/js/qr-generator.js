/**
 * qr-generator.js — QR Davetiye Oluşturma
 */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('base-url');
  if (input) {
    // KESİNLİKLE NETLIFY ADRESİ (Bilgisayardan açılsa bile hata olmasın diye)
    input.value = 'https://burcu-ogulcan.netlify.app';
  }
});

function generateCards() {
  const baseUrl   = 'https://burcu-ogulcan.netlify.app';
  const count     = parseInt(document.getElementById('masa-count').value) || 35;
  const start     = parseInt(document.getElementById('masa-start').value) || 1;
  const eventLine = document.getElementById('event-line').value.trim() || 'Nişan · 2026';
  const inviteTxt = document.getElementById('invite-text').value.trim() || 'Anınızı fotoğraflayın, bize hediye edin';

  if (!baseUrl) {
    showToast('Lütfen sitenin URL\'sini girin.', 'error');
    document.getElementById('base-url').focus();
    return;
  }

  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const masaNo = start + i;
    const masaUrl = `${baseUrl}/index.html?masa=${masaNo}`;
    
    // Wrapper (A4 sayfası ayırıcı)
    const wrap = document.createElement('div');
    wrap.className = 'invite-card-wrap';

    const card = document.createElement('div');
    card.className = 'invite-card';
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-top">
          <div class="card-couple-names">Burcu <span>∞</span> Oğulcan</div>
          
          <div class="card-families">
            <div class="family-name">YILMAZ AİLESİ</div>
            <div class="family-name">ÇOBAN AİLESİ</div>
          </div>
        </div>
        
        <div class="card-poetry">
          Bugünden bize kalacak hatıraları<br>bırakmak için lütfen QR kodu okutun.
        </div>

        <div class="card-qr-section">
          <div class="card-qr-box" id="qr-${masaNo}">
            <div class="qr-center-logo">
              <span class="masa-label">MASA</span>
              <span class="masa-num">${masaNo}</span>
            </div>
          </div>
        </div>

        <div class="card-bottom">
          <p class="card-desc">13 EYLÜL &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 19:00</p>
        </div>
      </div>
    `;

    wrap.appendChild(card);
    container.appendChild(wrap);

    // QR oluştur (kısa gecikmeyle UI donmasını engelle)
    setTimeout(() => {
      const qrBox = card.querySelector(`#qr-${masaNo}`);
      try {
        new QRCode(qrBox, {
          text: masaUrl,
          width: 140,
          height: 140,
          colorDark: '#2c2118',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        });
      } catch(e) {
        qrBox.innerHTML = '<div style="width:140px;height:140px;color:red;display:flex;align-items:center;justify-content:center">Hata</div>';
      }
    }, i * 20);
  }

  document.getElementById('btn-print').classList.remove('hidden');
  showToast(`${count} masa kartı oluşturuldu. Artık yazdırabilirsiniz! ✨`, 'success');
  
  // İlk karta kaydır
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── Toast Mesajı ──────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✗', info: '✦' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity    = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
