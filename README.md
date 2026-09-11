#  Nişan Fotoğraf Sistemi

QR kod bazlı nişan/düğün fotoğraf paylaşım sistemi.

## 📁 Dosya Yapısı

```
QrNişanFoto/
├── index.html          ← Misafir yükleme sayfası (QR ile açılan)
├── galeri.html         ← Gelin-damat admin galerisi (şifre korumalı)
├── qr-olustur.html     ← QR kod oluşturma sayfası
├── css/
│   ├── style.css       ← Global tasarım sistemi
│   ├── upload.css      ← Yükleme sayfası stilleri
│   ├── gallery.css     ← Galeri sayfası stilleri
│   └── qr.css          ← QR sayfası stilleri
└── js/
    ├── firebase-config.js  ← Depolama ayarları (buradan Firebase bağlanır)
    ├── upload.js           ← Yükleme mantığı
    ├── gallery.js          ← Galeri mantığı
    └── qr-generator.js     ← QR kod oluşturma
```

## 🚀 Nasıl Kullanılır?

### 1. Hemen Test (Firebase gerekmez)
`index.html` dosyasını tarayıcıda açın. Fotoğraflar bu tarayıcıda saklanır.
> ⚠️ Farklı cihazlar arasında paylaşım için Firebase gerekli.

### 2. QR Kodları Oluşturun
`qr-olustur.html` sayfasını açın:
- Sitenizin URL'sini girin
- Masa sayısını girin (örn: 35)
- "QR Kodları Oluştur" butonuna tıklayın
- Her masaya bir kart yazdırın

### 3. Galeriyi Görüntüleyin
`galeri.html` sayfasını açın:
- Şifre: `ogulcanburcu2026`
- Tüm fotoğrafları görebilir, ZIP indirebilirsiniz

---

## 🔥 Firebase Kurulumu (Production için)

### Adım 1: Firebase Projesi Oluşturun
1. [Firebase Console](https://console.firebase.google.com) → "Proje ekle"
2. Proje adı: 
3. Google Analytics: isteğe bağlı

### Adım 2: Storage Etkinleştirin
1. Sol menü → Storage → "Başlayın"
2. Blaze planına geçin (kredi kartı bağlayın)
3. Security Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read, write: if true;  // Basit versiyon
    }
  }
}
```

### Adım 3: Firestore Etkinleştirin
1. Sol menü → Firestore → "Veritabanı oluştur"
2. Test modunda başlat
3. Bölge: `europe-west1` (Avrupa)

### Adım 4: Web Uygulaması Ekleyin
1. Proje ayarları → "Web uygulaması ekle" (</> ikonu)
2. Uygulama adı: `nisan-foto`
3. Firebase config değerlerini kopyalayın

### Adım 5: firebase-config.js'i Güncelleyin
```javascript

const STORAGE_MODE = "firebase";  // "local" → "firebase" olarak değiştirin
```

### Adım 6: Firebase SDK Ekleyin
`index.html` ve `galeri.html` dosyalarında `</body>` öncesine ekleyin:
```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
```

---

## 💰 Tahmini Maliyet

| Senaryo | Depolama | İndirme | **Toplam** |
|---|---|---|---|
| 200 misafir, 3 fotoğraf | ~2GB | ~2GB | ~$0.30 |
| 300 misafir, 5 foto+video | ~15GB | ~15GB | ~$2.20 |
| 400 misafir, foto+video | ~30GB | ~30GB | ~$4.20 |

Sadece 1 ay kullandığınız için gerçek maliyet çok düşük olacak.

---

## 🎨 Özelleştirme

### Admin Şifresini Değiştirin (`firebase-config.js`):
```javascript
adminPassword: "yeni_şifre_buraya",
```

### Etkinlik Adını Değiştirin:
```javascript
eventName: "Düğün",  // veya "Nişan"
eventDate: "2026",
```

---

## 📱 Misafir Akışı

1. Masadaki QR kodu okutun (telefon kamerası veya QR okuyucu)
2. Yükleme sayfası açılır (`index.html?masa=5`)
3. Fotoğraf/video seçin veya sürükleyin
4. "Yükle" butonuna tıklayın
5. Teşekkür ekranı görünür 🎉

---

## ❓ Sorunlar

**QR kod çalışmıyor:** URL'nin doğru olduğundan emin olun. Local dosya açıyorsanız önce bir sunucuya yükleyin.

**Fotoğraflar farklı cihazda görünmüyor:** Firebase kurulumu yapın, `STORAGE_MODE = "firebase"` olarak ayarlayın.

**Storage doldu:** Firebase Console → Storage → Kullanım takip edin.
