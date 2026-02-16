# NetMimar — White-Label Agency Website Boilerplate

White-label ajans web sitesi starter kit'i. Astro + Keystatic + Cloudflare Pages üzerine kurulu, üretim ortamına hazır bir şablondur.

## 🏗️ Teknoloji Yığını

| Teknoloji | Kullanım |
|-----------|----------|
| [Astro](https://astro.build) | Framework (SSR) |
| [Keystatic](https://keystatic.com) | Git-tabanlı CMS |
| [Cloudflare Pages](https://pages.cloudflare.com) | Hosting |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | İletişim Formu DB |
| [TailwindCSS v4](https://tailwindcss.com) | Styling |
| React | Keystatic UI |

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun:

```bash
cp .env.example .env
```

### 3. Geliştirme Sunucusu

```bash
npm run dev
```

Tarayıcınızda `http://localhost:4321` açılacaktır.

### 4. CMS Paneli (Local Development)

`http://localhost:4321/keystatic` adresinden Keystatic CMS paneline erişin.

> **Not:** Local geliştirmede Keystatic `local` modda çalışır, dosyalar doğrudan disk üzerinde saklanır.

---

## 🔐 Kimlik Doğrulama

Sisteme giriş `Email + Şifre` ile yapılır. Cloudflare Access kullanılmaz.

- **Giriş:** `/login`
- **CMS Paneli:** `/keystatic` (kimlik doğrulama gerektirir)
- **Çıkış:** `/api/auth/logout`

Giriş bilgileri ortam değişkenleri olarak tanımlanır:
- `CLIENT_EMAIL`
- `CLIENT_PASSWORD`

---

## ⚙️ Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `GITHUB_TOKEN` | Agency GitHub Personal Access Token |
| `REPO_OWNER` | GitHub repo sahibi |
| `REPO_NAME` | GitHub repo adı |
| `PUBLIC_REPO_OWNER` | (Client-side) Repo sahibi |
| `PUBLIC_REPO_NAME` | (Client-side) Repo adı |
| `CLIENT_EMAIL` | Müşteri giriş e-postası |
| `CLIENT_PASSWORD` | Müşteri giriş şifresi |
| `COOKIE_SECRET` | Session cookie imzalama anahtarı (min 32 karakter) |

---

## 📁 İçerik Yapısı

```
src/content/
├── singletons/
│   ├── settings.json    # Site ayarları, iletişim, SEO
│   └── homepage.json    # Ana sayfa içerikleri
├── services/            # Hizmetler (MDX)
├── projects/            # Projeler/Portföy (MDX)
├── blog/                # Blog yazıları (MDX)
└── team/                # Ekip üyeleri (JSON)
```

---

## 🗄️ D1 Veritabanı (İletişim Formu)

### Veritabanı Oluşturma

```bash
wrangler d1 create netmimar-contacts
```

`wrangler.toml` dosyasındaki `database_id`'yi güncelleyin.

### Şemayı Uygulama

```bash
wrangler d1 execute netmimar-contacts --local --file=./schema.sql
# Production için:
wrangler d1 execute netmimar-contacts --remote --file=./schema.sql
```

---

## 🚢 Deployment (Cloudflare Pages)

### 1. Build

```bash
npm run build
```

### 2. Cloudflare Pages'e Deploy

```bash
wrangler pages deploy ./dist
```

### 3. Ortam Değişkenleri

Cloudflare Dashboard → Pages → Proje → Settings → Environment Variables bölümünden tüm değişkenleri tanımlayın.

---

## 📄 Lisans

© NetMimar — Tüm hakları saklıdır.
