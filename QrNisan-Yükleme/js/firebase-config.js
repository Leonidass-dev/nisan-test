/**
 * storage-config.js
 *
 * Desteklenen modlar:
 *   "gdrive"     → Google Drive (ÜCRETSİZ, 15 GB, önerilen!) ⭐
 *   "cloudinary" → Cloudinary (25 GB, ücretsiz)
 *   "local"      → Sadece bu tarayıcıda (demo/test)
 *   "firebase"   → Firebase Blaze (kredi kartı gerekli)
 */

// ============================================================
//  ETKİNLİK AYARLARI
// ============================================================
const EVENT_CONFIG = {
  coupleName:    "Burcu & Oğulcan",
  eventName:     "Nişan",
  eventDate:     "2026",
  adminPassword: "ogulcanburcu2026",
  maxImageSizeMB: 10,  // Cloudinary ücretsiz katman fotoğraf limiti
  maxVideoSizeMB: 100, // Cloudinary ücretsiz katman video limiti
  allowedTypes:  ["image/*", "video/*"],
};

// ============================================================
//  DEPOLAMA MODU
// ============================================================
const STORAGE_MODE = "cloudinary";

// ============================================================
//  GOOGLE DRIVE AYARLARI ⭐
//  Apps Script'i yıkalayınca aldığın URL'yi buraya yaz
// ============================================================
const GDRIVE_CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbzXjAcTjqVd0CgWlmwKev3L2Ulkd5g5vc2nLsDexH8l9bsW8K6Qx6XZaUxE0CGSLs29/exec",
};

// ============================================================
//  CLOUDINARY AYARLARI (yedek olarak kalsın)
// ============================================================
const CLOUDINARY_CONFIG = {
  cloudName:    "cxn0glou",
  uploadPreset: "nisan-foto",
  apiKey:       "",     // GÜVENLİK: GitHub'da açıkta kalmaması için silindi
  apiSecret:    "",     // GÜVENLİK: GitHub'da açıkta kalmaması için silindi
  folder:       "ogulcan-burcu-nisan",
};

// ============================================================
//  FIREBASE AYARLARI (kullanmak istersen)
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "BURAYA_API_KEY",
  authDomain:        "BURAYA_AUTH_DOMAIN",
  projectId:         "BURAYA_PROJECT_ID",
  storageBucket:     "BURAYA_STORAGE_BUCKET",
  messagingSenderId: "BURAYA_MESSAGING_SENDER_ID",
  appId:             "BURAYA_APP_ID"
};

// ============================================================
//  GENEL API — tüm modlar için aynı fonksiyonlar
// ============================================================

async function uploadFile(file, masaNo, onProgress) {
  // Fotoğrafları yüklemeden önce otomatik sıkıştır (2MB üzerindeyse)
  let fileToUpload = file;
  if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
    try {
      fileToUpload = await compressImage(file);
      console.log(`📐 Sıkıştırıldı: ${(file.size/1024/1024).toFixed(1)}MB → ${(fileToUpload.size/1024/1024).toFixed(1)}MB`);
    } catch (e) {
      console.warn('Sıkıştırma başarısız, orijinal dosya kullanılacak:', e);
      fileToUpload = file;
    }
  }

  switch (STORAGE_MODE) {
    case "gdrive":     return uploadToDrive(fileToUpload, masaNo, onProgress);
    case "cloudinary": return uploadToCloudinary(fileToUpload, masaNo, onProgress);
    case "firebase":   return uploadToFirebase(fileToUpload, masaNo, onProgress);
    default:           return uploadToLocal(fileToUpload, masaNo, onProgress);
  }
}

// ============================================================
//  OTOMATİK FOTOĞRAF SIKIŞTIRMA
//  Telefon fotoğraflarını (15-20MB) kaliteyi bozmadan 2-3MB'a düşürür
// ============================================================
function compressImage(file, maxDimension = 3840, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Çok büyükse küçült (en fazla 3840px — 4K kalitesinde)
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width  = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Sıkıştırma başarısız'));
          // Orijinal dosya adını koruyarak yeni File oluştur
          const compressed = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Görsel okunamadı'));
    };

    img.src = url;
  });
}

async function getAllUploads() {
  switch (STORAGE_MODE) {
    case "gdrive":     return getUploadsFromDrive();
    case "cloudinary": return getUploadsFromCloudinary();
    case "firebase":   return getUploadsFromFirebase();
    default:           return getUploadsFromLocal();
  }
}

async function deleteUpload(uploadId) {
  switch (STORAGE_MODE) {
    case "gdrive":     return deleteFromDrive(uploadId);
    case "cloudinary": return deleteFromCloudinary(uploadId);
    case "firebase":   return deleteFromFirebase(uploadId);
    default:           return deleteFromLocal(uploadId);
  }
}

// ============================================================
//  GOOGLE DRIVE IMPLEMENTASYONU
// ============================================================

async function uploadToDrive(file, masaNo, onProgress) {
  const { scriptUrl } = GDRIVE_CONFIG;
  const MAX_RETRY = 3;

  // Base64 dönüşümü (bir kez yap, retry'da tekrar okuma)
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress && onProgress(Math.round((e.loaded / e.total) * 45));
    };
    reader.onload  = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });

  onProgress && onProgress(50);

  const payload = {
    file:     base64,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    masa:     masaNo,
  };

  // Eş zamanlı istekleri doğal dağıtmak için küçük rastgele gecikme
  const jitter = Math.random() * 1500;
  await new Promise(r => setTimeout(r, jitter));

  onProgress && onProgress(55);

  // Retry döngüsü — max 3 deneme, artan bekleme süresiyle
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      onProgress && onProgress(55 + attempt * 5);

      const response = await fetch(scriptUrl, {
        method: 'POST',
        body:   JSON.stringify(payload),
      });

      onProgress && onProgress(85);
      const result = await response.json();

      if (result.success) {
        onProgress && onProgress(100);
        return {
          id:         result.id,
          url:        result.url,
          path:       result.id,
          masaNo,
          fileName:   file.name,
          fileType:   file.type,
          fileSize:   file.size,
          uploadedAt: new Date().toISOString(),
        };
      }

      // Apps Script hata döndürdü
      if (attempt === MAX_RETRY) throw new Error(result.error || 'Drive yükleme hatası');

      // Bir sonraki denemeden önce bekle (2s, 4s, 8s)
      console.warn(`Deneme ${attempt} başarısız, ${attempt * 2}s sonra tekrar...`);
      await new Promise(r => setTimeout(r, attempt * 2000));

    } catch (err) {
      if (attempt === MAX_RETRY) throw new Error('Bağlantı hatası: ' + err.message);
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}


async function getUploadsFromDrive() {
  const { scriptUrl } = GDRIVE_CONFIG;
  const response = await fetch(scriptUrl + '?action=list');
  if (!response.ok) throw new Error('Drive listesi alinamadi');
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Drive hatasi');
  return data.uploads || [];
}

async function deleteFromDrive(fileId) {
  const { scriptUrl } = GDRIVE_CONFIG;
  const response = await fetch(`${scriptUrl}?action=delete&id=${encodeURIComponent(fileId)}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Silme hatasi');
}

// ============================================================
//  CLOUDINARY IMPLEMENTASYONU
// ============================================================

async function uploadToCloudinary(file, masaNo, onProgress) {
  const MAX_RETRY = 3;

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const result = await _cloudinaryUploadAttempt(file, masaNo, onProgress);
      return result;
    } catch (err) {
      console.warn(`☁️ Cloudinary deneme ${attempt}/${MAX_RETRY} başarısız:`, err.message);

      if (attempt < MAX_RETRY) {
        // Artan bekleme süresiyle tekrar dene (2s, 4s)
        const waitMs = attempt * 2000;
        onProgress && onProgress(0);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        // 3 deneme de başarısız — Google Drive'a otomatik geç (yedek plan)
        console.warn('🔄 Cloudinary 3 kez başarısız. Google Drive yedek planına geçiliyor...');
        try {
          const driveResult = await uploadToDrive(file, masaNo, onProgress);
          return driveResult;
        } catch (driveErr) {
          // Drive da başarısız olduysa asıl hatayı fırlat
          throw new Error('Sunuculara ulaşılamıyor. İnternet bağlantınızı kontrol edin.');
        }
      }
    }
  }
}

function _cloudinaryUploadAttempt(file, masaNo, onProgress) {
  const { cloudName, uploadPreset, folder } = CLOUDINARY_CONFIG;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `${folder}/masa-${masaNo}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.timeout = 60000; // 60 saniye timeout

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress && onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve({
          id:         res.public_id,
          url:        res.secure_url,
          path:       res.public_id,
          masaNo:     masaNo,
          fileName:   file.name,
          fileType:   file.type,
          fileSize:   file.size,
          uploadedAt: res.created_at,
          resourceType: res.resource_type,
          format:       res.format,
        });
      } else {
        console.error('🔴 Cloudinary hata (status ' + xhr.status + '):', xhr.responseText);
        let msg = 'Yükleme hatası';
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch(e) {}
        reject(new Error(msg));
      }
    };

    xhr.ontimeout = () => reject(new Error('Bağlantı zaman aşımına uğradı.'));
    xhr.onerror = () => reject(new Error('Ağ hatası.'));
    xhr.send(formData);
  });
}

async function getUploadsFromCloudinary() {
  const { cloudName, apiKey, apiSecret, folder } = CLOUDINARY_CONFIG;

  // Cloudinary Search API
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':' + apiSecret)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression: `folder:${folder}/*`,
        sort_by: [{ created_at: 'desc' }],
        max_results: 500,
        with_field: ['context', 'tags'],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Cloudinary bağlantı hatası. API Key/Secret kontrol edin.');
  }

  const data = await response.json();

  return (data.resources || []).map(r => {
    // Masa numarasını folder veya public_id'den çıkar
    // folder: "ogulcan-burcu-nisan/masa-5/masa-5_1234567"
    // public_id: "ogulcan-burcu-nisan/masa-5/masa-5_1234567"
    const folderParts = (r.asset_folder || r.folder || r.public_id || '').split('/');
    let masaNo = '?';
    for (const part of folderParts) {
      const m = part.match(/^masa-(\w+)/);
      if (m) { masaNo = m[1]; break; }
    }

    return {
      id:         r.public_id,
      url:        r.secure_url,
      path:       r.public_id,
      masaNo:     masaNo,
      fileName:   (r.original_filename || r.public_id.split('/').pop()) + '.' + r.format,
      fileType:   r.resource_type === 'video' ? 'video/' + r.format : 'image/' + r.format,
      fileSize:   r.bytes,
      uploadedAt: r.created_at,
    };
  });
}

async function deleteFromCloudinary(publicId) {
  const { cloudName, apiKey, apiSecret } = CLOUDINARY_CONFIG;

  // Hangi resource type olduğunu belirle
  const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(publicId);
  const resourceType = isVideo ? 'video' : 'image';

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':' + apiSecret)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_ids: [publicId] }),
    }
  );

  if (!response.ok) throw new Error('Silme hatası');
}

// ============================================================
//  FIREBASE İMPLEMENTASYONU
// ============================================================
let firebaseApp = null, firebaseStore = null, firebaseDB = null;

function initFirebase() {
  if (STORAGE_MODE !== "firebase") return;
  if (typeof firebase === 'undefined') {
    console.error("Firebase SDK bulunamadı.");
    return;
  }
  if (!firebaseApp) {
    firebaseApp   = firebase.initializeApp(FIREBASE_CONFIG);
    firebaseStore = firebase.storage();
    firebaseDB    = firebase.firestore();
  }
}

async function uploadToFirebase(file, masaNo, onProgress) {
  initFirebase();
  const id   = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const ext  = file.name.split('.').pop();
  const path = `uploads/masa-${masaNo}/${id}.${ext}`;
  const ref  = firebaseStore.ref(path);
  const task = ref.put(file);

  return new Promise((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      reject,
      async () => {
        const url = await task.snapshot.ref.getDownloadURL();
        const doc = { id, url, path, masaNo, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: firebase.firestore.FieldValue.serverTimestamp() };
        await firebaseDB.collection('uploads').doc(id).set(doc);
        resolve(doc);
      }
    );
  });
}

async function getUploadsFromFirebase() {
  initFirebase();
  const snap = await firebaseDB.collection('uploads').orderBy('uploadedAt', 'desc').get();
  return snap.docs.map(d => d.data());
}

async function deleteFromFirebase(uploadId) {
  initFirebase();
  const doc = await firebaseDB.collection('uploads').doc(uploadId).get();
  const data = doc.data();
  if (data?.path) await firebaseStore.ref(data.path).delete();
  await firebaseDB.collection('uploads').doc(uploadId).delete();
}

// ============================================================
//  LOCAL (demo/test) İMPLEMENTASYONU
// ============================================================
const LS_KEY = 'nisan_uploads';

function getLocalDB() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLocalDB(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

async function uploadToLocal(file, masaNo, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + 10, 90);
      onProgress && onProgress(progress);
    }, 80);

    reader.onload = (e) => {
      clearInterval(interval);
      onProgress && onProgress(100);
      const id  = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const doc = { id, url: e.target.result, path: `local/${id}`, masaNo, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: new Date().toISOString() };
      try {
        const db = getLocalDB();
        db.unshift(doc);
        saveLocalDB(db);
        resolve(doc);
      } catch(e) {
        reject(new Error("LocalStorage dolu. Cloudinary moduna geçin."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getUploadsFromLocal() { return getLocalDB(); }
async function deleteFromLocal(uploadId) {
  saveLocalDB(getLocalDB().filter(u => u.id !== uploadId));
}
