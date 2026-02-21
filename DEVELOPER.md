# NetMimar — Developer Teknik Rehber

Bu doküman, projenin **tüm teknik yapısını** anlatan kapsamlı bir rehberdir. Bu projeyi devralan developer'ın hata yapmadan çalışabilmesi için her katman detaylı açıklanmıştır.

---

## 1. Projenin Amacı

Bu proje bir **white-label ajans web sitesi iskeleti**dir. Amaç:

- Müşteriye **içerik yönetim paneli** (CMS) sunmak
- Müşterinin hiçbir kod bilgisi olmadan site içeriğini yönetmesini sağlamak
- Developer'ın bu iskelet üzerine **sadece tasarım giydirmesi** yeterli olacak şekilde tüm altyapıyı hazır tutmak

**Önemli:** Bu iskelet yeniden kullanılabilir (white-label). Farklı müşteriler için aynı yapı fork'lanıp tasarım değiştirilir. İçerik yapısı, auth sistemi ve CMS entegrasyonu aynen kalır.

---

## 2. Teknoloji Çerçevesi

| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| **Astro** | ^5.17 | Ana framework. Hibrit mod (`output: 'server'`). İçerik sayfaları statik (prerender), admin paneli ve API'ler SSR. |
| **Keystatic** | ^0.5.48 | Git-tabanlı headless CMS. İçerikler dosya sistemi üzerinde saklanır (JSON + MDOC). |
| **@keystatic/astro** | ^5.0.6 | Keystatic'in Astro entegrasyonu. Admin paneli UI'ını otomatik mount eder. |
| **React** | ^19 | Yalnızca Keystatic admin paneli için gerekli. Frontend sayfalarında React kullanılmaz. |
| **TailwindCSS** | ^4.1 (v4) | CSS framework. `@tailwindcss/vite` üzerinden çalışır. **v4 kullanıldığı için `tailwind.config.js` yoktur** — config `global.css` içinde `@theme` direktifi ile yapılır. |
| **Cloudflare Pages** | — | Hosting platformu. SSR adapter: `@astrojs/cloudflare`. |
| **Cloudflare D1** | — | SQLite tabanlı veritabanı. Sadece iletişim formu verilerini saklar. |
| **Web Crypto API** | — | Session cookie HMAC imzalama. Node.js crypto değil, Cloudflare Workers uyumlu. |

### Neden Bu Teknolojiler?

- **Astro Hibrit Mod:** `output: 'server'` ama çoğu sayfa `prerender = true` ile build-time statik HTML olarak üretilir. Sadece admin paneli (Keystatic UI) ve API endpoint'leri runtime'da SSR olarak çalışır.
- **Keystatic:** Veritabanı gerektirmez, içerik Git repo'suna commit olur. Müşteri panelden düzenleme yapar → Keystatic bu değişiklikleri GitHub'a commit eder → Cloudflare Pages otomatik yeni build alır → Site güncellenir.
- **Cloudflare:** Sıfır maliyet (free plan), global CDN, D1 veritabanı ve Workers runtime.

---

## 3. Proje Mimarisi — Dosya Ağacı

```
admin-base-site-structure/
│
├── astro.config.mjs          # Astro framework konfigürasyonu
├── keystatic.config.tsx       # CMS şeması — TÜM içerik alanları burada tanımlı (.tsx — JSX gerektirir)
├── wrangler.toml              # Cloudflare Workers/Pages konfigürasyonu
├── schema.sql                 # D1 veritabanı şeması (iletişim formu)
├── package.json               # Bağımlılıklar ve script'ler
├── tsconfig.json              # TypeScript konfigürasyonu
├── .env.example               # Ortam değişkenleri şablonu
├── .env                       # Gerçek ortam değişkenleri (GIT'E EKLENMEMELİ)
│
├── public/                    # Statik dosyalar (doğrudan serve edilir)
│   ├── _redirects             # Cloudflare Pages yönlendirme kuralları (/admin → /keystatic)
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── templates/             # İndirilebilir boş CSV şablonları (toplu içerik aktarımı için)
│   │   ├── hizmetler-sablon.csv
│   │   ├── projeler-sablon.csv
│   │   ├── blog-sablon.csv
│   │   └── ekip-sablon.csv
│   └── images/                # CMS tarafından yüklenen görseller
│       ├── brand/             # Logo ve favicon
│       ├── hero/              # Ana sayfa hero görselleri
│       ├── services/          # Hizmet görselleri
│       ├── projects/          # Proje görselleri
│       ├── blog/              # Blog görselleri
│       ├── team/              # Ekip fotoğrafları
│       └── testimonials/      # Müşteri yorum fotoğrafları
│
└── src/
    ├── env.d.ts               # TypeScript type tanımları (CloudflareEnv)
    ├── content.config.ts      # Astro Content Collections şeması
    ├── middleware.ts           # Fetch patch + Auth middleware — /keystatic, /toplu, /api/import yollarını korur
    ├── lib/
    │   └── reader.ts          # getReader() helper — CMS verilerini okuyan fonksiyon
    ├── styles/
    │   └── global.css         # TailwindCSS v4 design system token'ları
    │
    ├── layouts/
    │   └── BaseLayout.astro   # Ana layout — header, footer, meta, scripts
    │
    ├── content/               # CMS İÇERİK DEPOSU (Keystatic buraya yazar)
    │   ├── singletons/
    │   │   ├── settings.json          # Site ayarları (logo, telefon, email, sosyal medya, scripts)
    │   │   ├── settings/
    │   │   │   ├── kvkkText.mdoc      # KVKK aydınlatma metni (zengin metin)
    │   │   │   └── privacyPolicy.mdoc # Gizlilik politikası (zengin metin)
    │   │   └── homepage.json          # Ana sayfa içerikleri (hero, features, counters, testimonials)
    │   ├── services/                  # Hizmetler (her biri bir .mdoc dosyası)
    │   ├── projects/                  # Projeler (her biri bir .mdoc dosyası)
    │   ├── blog/                      # Blog yazıları (her biri bir .mdoc dosyası)
    │   └── team/                      # Ekip üyeleri (her biri bir .json dosyası)
    │
    └── pages/                 # ASTRO SAYFALARI (URL yönlendirme)
        ├── index.astro                # Ana sayfa — tüm CMS verilerini çeker
        ├── login.astro                # Giriş sayfası (noindex, nofollow)
        ├── hizmetler/
        │   ├── index.astro            # Hizmetler listesi
        │   └── [slug].astro           # Hizmet detay sayfası
        ├── projeler/
        │   ├── index.astro            # Projeler listesi
        │   └── [slug].astro           # Proje detay sayfası
        ├── blog/
        │   ├── index.astro            # Blog listesi
        │   └── [slug].astro           # Blog yazısı detay
        ├── ekip.astro                 # Ekip sayfası
        ├── kvkk.astro                 # KVKK aydınlatma metni
        ├── gizlilik.astro             # Gizlilik politikası
        └── api/
            ├── auth/
            │   ├── login.ts           # POST — giriş doğrulama
            │   └── logout.ts          # GET/POST — çıkış
            ├── contact.ts             # POST — iletişim formu → D1
            └── keystatic/
                └── [...params].ts     # GitHub API proxy
```

---

## 4. CMS Yapısı (Keystatic)

Tüm CMS şeması `keystatic.config.tsx` dosyasında tanımlıdır. İki tür veri yapısı vardır:

### 4.1. Singleton'lar (Tekil Veriler)

Singleton = Tek bir kayıt. Birden fazla oluşturulamaz. Site genelinde bir tane olan veriler için kullanılır.

#### `settings` Singleton

**Dosya Yolu:** `src/content/singletons/settings.json`  
**Admin Paneli Konumu:** Sol menü → Genel → Site Ayarları

| Alan | Tür | Açıklama | Nerede Görünür |
|------|-----|----------|----------------|
| `siteLogo` | image | Site logosu | Header ve footer |
| `favicon` | image | Tarayıcı sekmesi ikonu | `<head>` |
| `siteTitle` | text | Site başlığı | Header, footer, `<title>` |
| `slogan` | text | Alt metin | Footer |
| `phone` | text | Telefon numarası | Footer |
| `whatsapp` | text | WhatsApp numarası | Footer (wa.me linki) |
| `email` | text | E-posta | Footer |
| `address` | text | Adres | Footer |
| `googleMapEmbed` | text | Google Maps iframe kodu | İletişim bölümünde |
| `socialFacebook` | text | Facebook URL | Footer |
| `socialInstagram` | text | Instagram URL | Footer |
| `socialTwitter` | text | Twitter/X URL | Footer |
| `socialLinkedin` | text | LinkedIn URL | Footer |
| `socialYoutube` | text | YouTube URL | Footer |
| `metaDescription` | text | Varsayılan meta açıklama | `<head>` |
| `metaKeywords` | text | Anahtar kelimeler | `<head>` |
| `headerScripts` | text | Head script'leri (Analytics vb.) | `<head>` içinde `set:html` ile render |
| `footerScripts` | text | Footer script'leri (chat vb.) | `</body>` öncesinde `set:html` ile render |
| `contactEmail` | text | Bildirim e-postası (iletişim formu) | `/api/contact` endpoint'i e-posta gönderir |
| `contactEmailSenderName` | text | Gönderici adı | E-postada "Kimden" kısmı |
| `kvkkText` | document | KVKK aydınlatma (zengin metin) | `/kvkk` sayfası |
| `privacyPolicy` | document | Gizlilik politikası (zengin metin) | `/gizlilik` sayfası |

> **Not:** `kvkkText` ve `privacyPolicy` alanları `fields.document()` tipindedir. Bu alanlar `settings.json` içinde değil, ayrı `.mdoc` dosyalarında saklanır:
> - `src/content/singletons/settings/kvkkText.mdoc`
> - `src/content/singletons/settings/privacyPolicy.mdoc`

#### `homepage` Singleton

**Dosya Yolu:** `src/content/singletons/homepage.json`  
**Admin Paneli Konumu:** Sol menü → Genel → Ana Sayfa

| Alan | Tür | Açıklama |
|------|-----|----------|
| `heroHeading` | text | Hero bölümü başlık |
| `heroSubheading` | text | Hero alt başlık |
| `heroBackgroundImage` | image | Hero arka plan görseli (`public/images/hero/`) |
| `heroCtaText` | text | CTA buton metni |
| `heroCtaLink` | text | CTA buton linki |
| `features` | array | Özellik kartları (iconClass, title, description) |
| `counters` | array | İstatistik sayaçları (number, label) |
| `testimonials` | array | Müşteri yorumları (clientName, clientRole, clientPhoto, quote) |

### 4.2. Collection'lar (Koleksiyonlar)

Collection = Birden fazla kayıt oluşturulabilen yapı. Her kayıt bir dosyadır.

#### `services` Collection (Hizmetler)

**Dosya Yolu:** `src/content/services/*.mdoc`  
**Slug Alanı:** `title`  
**Format:** MDOC (frontmatter + zengin metin)

| Frontmatter Alanı | Tür | Zorunlu | Açıklama |
|--------------------|-----|---------|----------|
| `title` | slug | ✅ | Hizmet başlığı (slug otomatik oluşturulur) |
| `icon` | text | ❌ | CSS ikon sınıfı (ör: `fas fa-wrench`) |
| `shortDescription` | text | ✅ | Kısa açıklama (liste görünümünde) |
| `featuredImage` | image | ❌ | Öne çıkan görsel (`public/images/services/`) |
| `content` | document | — | Detaylı içerik (MDOC gövdesi) |

#### `projects` Collection (Projeler)

**Dosya Yolu:** `src/content/projects/*.mdoc`  
**Slug Alanı:** `projectName`

| Frontmatter Alanı | Tür | Zorunlu | Açıklama |
|--------------------|-----|---------|----------|
| `projectName` | slug | ✅ | Proje adı |
| `client` | text | ❌ | Müşteri adı |
| `date` | date | ❌ | Proje tarihi |
| `category` | text | ❌ | Kategori (ör: Web Tasarım) |
| `coverImage` | image | ❌ | Kapak görseli (`public/images/projects/`) |
| `gallery` | array(image) | ❌ | Galeri görselleri (`public/images/projects/`) |
| `description` | document | — | Proje açıklaması (MDOC gövdesi) |

#### `blog` Collection (Blog)

**Dosya Yolu:** `src/content/blog/*.mdoc`  
**Slug Alanı:** `title`

| Frontmatter Alanı | Tür | Zorunlu | Açıklama |
|--------------------|-----|---------|----------|
| `title` | slug | ✅ | Başlık |
| `date` | date | ❌ | Yayın tarihi (varsayılan: bugün) |
| `author` | text | ❌ | Yazar |
| `category` | text | ❌ | Kategori |
| `tags` | array(text) | ❌ | Etiketler |
| `coverImage` | image | ❌ | Kapak görseli (`public/images/blog/`) |
| `body` | document | — | İçerik (MDOC gövdesi) |

#### `team` Collection (Ekip)

**Dosya Yolu:** `src/content/team/*.json`  
**Slug Alanı:** `name`  
**Format:** JSON (zengin metin yok)

| Alan | Tür | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | slug | ✅ | Ad Soyad |
| `role` | text | ✅ | Ünvan / Rol |
| `photo` | image | ❌ | Fotoğraf (`public/images/team/`) |
| `order` | integer | ❌ | Sıralama (küçük = önce) |
| `socialLinkedin` | text | ❌ | LinkedIn URL |
| `socialTwitter` | text | ❌ | Twitter URL |
| `socialInstagram` | text | ❌ | Instagram URL |
| `socialEmail` | text | ❌ | E-posta |

---

## 5. Site Mimarisi — Statik Prerender + SSR Hibrit Modeli

### Temel Mimari Prensibi

Bu site **JAMstack mimarisi** kullanır. İçerik sayfaları (ana sayfa, blog, hizmetler vb.) **build sırasında** statik HTML olarak üretilir. Ziyaretçi siteye girdiğinde **hazır HTML** servis edilir — hiçbir API çağrısı, veritabanı sorgusu veya sunucu işlemi olmaz.

**Sadece** admin paneli (`/keystatic`) ve API endpoint'leri (`/api/*`) runtime'da SSR olarak çalışır.

### Veri Akışı — Büyük Resim

```
┌────────────────┐    ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Admin Paneli   │───→│ GitHub   │───→│ Cloudflare Pages │───→│ Statik HTML      │
│ (/keystatic)   │    │ Push     │    │ Auto Build       │    │ CDN'den servis   │
│ İçerik düzenle │    │ (commit) │    │ (1-2 dk)         │    │ (anında yüklenir)│
└────────────────┘    └──────────┘    └─────────────────┘    └──────────────────┘
```

### Adım adım:

1. **Müşteri** admin paneline giriş yapar (`/login` → `/keystatic`)
2. Müşteri bir içerik düzenler (ör: yeni bir blog yazısı ekler)
3. "Save" butonuna basar → Keystatic bu değişikliği **GitHub'a commit** eder
4. GitHub'a push geldiğinde **Cloudflare Pages otomatik build tetikler** (webhook)
5. Build sırasında `createReader` içerikleri **lokal dosya sisteminden** okur (repo klonlanmış halde)
6. Tüm sayfalar **statik HTML** olarak üretilir (`prerender = true`)
7. Build tamamlanır → Yeni HTML dosyaları Cloudflare CDN'e deploy edilir
8. Ziyaretçi siteye girdiğinde **hazır HTML** servis edilir — GitHub API'ye bağlanılmaz

### Prerender vs SSR Ayrımı

| Sayfa | Mod | Ne Zaman Çalışır |
|-------|-----|-------------------|
| `/` (ana sayfa) | **Prerender** (statik) | Build sırasında |
| `/hizmetler`, `/hizmetler/[slug]` | **Prerender** (statik) | Build sırasında |
| `/projeler`, `/projeler/[slug]` | **Prerender** (statik) | Build sırasında |
| `/blog`, `/blog/[slug]` | **Prerender** (statik) | Build sırasında |
| `/ekip` | **Prerender** (statik) | Build sırasında |
| `/kvkk`, `/gizlilik` | **Prerender** (statik) | Build sırasında |
| `/login` | **SSR** (runtime) | Her istekte (`?next=` parametresini okur) |
| `/toplu` | **SSR** (runtime) | Her istekte (korumalı, oturum gerektirir) |
| `/keystatic/*` | **SSR** (runtime) | Her ziyarette |
| `/api/*` | **SSR** (runtime) | Her istekte |

> **Prerendered sayfalar** `export const prerender = true;` ile işaretlidir. Astro, build sırasında bu sayfaları çalıştırır ve çıktıyı statik HTML olarak kaydeder.
>
> **[slug] sayfalarında** ek olarak `getStaticPaths()` fonksiyonu tanımlıdır. Bu, build sırasında mevcut tüm slug'ları keşfeder ve her biri için ayrı bir HTML dosyası üretir.

### `getReader()` Kullanımı

İçerik okumak için `src/lib/reader.ts` içindeki `getReader()` helper'ı kullanılır:

```typescript
import { getReader } from "../lib/reader"; // veya "../../lib/reader" (derinliğe göre)

const reader = getReader();

// Singleton okuma
const settings = await reader.singletons.settings.read();
const homepage = await reader.singletons.homepage.read();

// Collection okuma — tüm kayıtlar
const services = await reader.collections.services.all();

// Collection okuma — tek kayıt (slug ile)
const service = await reader.collections.services.read('tasarim-hizmeti');

// Zengin metin (document) alanını render için alma
const content = await service.content(); // → DocumentRenderer'a verilir
```

> **Not:** `getReader()` hiçbir parametre almaz. Build sırasında çalışır ve lokal dosya sisteminden okur.

### `DocumentRenderer` Kullanımı

MDOC dosyalarındaki zengin metin içeriğini render etmek için:

```astro
---
import { DocumentRenderer } from '@keystatic/core/renderer';
const content = await post.body(); // veya service.content(), project.description()
---

<div class="prose">
  <DocumentRenderer document={content} />
</div>
```

> **Dikkat:** `content()`, `body()`, `description()` gibi metotlar **async**'tir ve `await` gerektirir. Bunlar `keystatic.config.tsx`'de `fields.document()` olarak tanımlanan alanlardan gelir.

### Bir Sayfa Nasıl Yapılandırılır? (Kalıp)

**Liste sayfası (ör: hizmetler/index.astro):**

```astro
---
export const prerender = true;

import BaseLayout from "../../layouts/BaseLayout.astro";
import { getReader } from "../../lib/reader";

const reader = getReader();
const servicesRaw = await reader.collections.services.all();
const services = servicesRaw.map((s) => ({ slug: s.slug, ...s.entry }));
---

<BaseLayout title="Hizmetlerimiz">
  <!-- Burada services array'ini kullanarak HTML yazarsın -->
</BaseLayout>
```

**Detay sayfası (ör: hizmetler/[slug].astro):**

```astro
---
export const prerender = true;

import BaseLayout from "../../layouts/BaseLayout.astro";
import { getReader } from "../../lib/reader";
import { DocumentRenderer } from "@keystatic/core/renderer";

export async function getStaticPaths() {
    const reader = getReader();
    const services = await reader.collections.services.all();
    return services.map((s) => ({ params: { slug: s.slug } }));
}

const { slug } = Astro.params;
const reader = getReader();
const service = await reader.collections.services.read(slug!);
if (!service) return Astro.redirect("/hizmetler");
const content = await service.content();
---

<BaseLayout title={service.title}>
  <DocumentRenderer document={content} />
</BaseLayout>
```

> **Kritik kural:** Tüm içerik sayfalarında `export const prerender = true;` satırı frontmatter'ın **en üstünde** olmalıdır. Bu satır olmadan sayfa SSR modunda çalışır ve her ziyarette sunucu tarafında işlenir — ki bu gereksiz ve yavaştır.

---

## 6. Sayfa Haritası

| URL | Dosya | Mod | Çektiği CMS Verisi | Açıklama |
|-----|-------|-----|---------------------|----------|
| `/` | `pages/index.astro` | **Prerender** | settings, homepage, services, projects, blog (top 3), team | Ana sayfa — tüm bölümler |
| `/hizmetler` | `pages/hizmetler/index.astro` | **Prerender** | services (all) | Hizmet listesi |
| `/hizmetler/[slug]` | `pages/hizmetler/[slug].astro` | **Prerender** + `getStaticPaths` | services (tekil, slug ile) | Hizmet detay + DocumentRenderer |
| `/projeler` | `pages/projeler/index.astro` | **Prerender** | projects (all) | Proje listesi |
| `/projeler/[slug]` | `pages/projeler/[slug].astro` | **Prerender** + `getStaticPaths` | projects (tekil) | Proje detay + galeri + DocumentRenderer |
| `/blog` | `pages/blog/index.astro` | **Prerender** | blog (all, tarihe göre sıralı) | Blog listesi |
| `/blog/[slug]` | `pages/blog/[slug].astro` | **Prerender** + `getStaticPaths` | blog (tekil) | Blog yazısı + DocumentRenderer |
| `/ekip` | `pages/ekip.astro` | **Prerender** | team (all, order'a göre sıralı) | Ekip listesi |
| `/kvkk` | `pages/kvkk.astro` | **Prerender** | settings (kvkkText document) | KVKK aydınlatma metni |
| `/gizlilik` | `pages/gizlilik.astro` | **Prerender** | settings (privacyPolicy document) | Gizlilik politikası |
| `/login` | `pages/login.astro` | **SSR** | — | Giriş formu (noindex) — `?next=` parametresini runtime'da okur |
| `/admin` | `public/_redirects` | **Edge redirect** | — | Cloudflare edge'de `/keystatic`'e 302 yönlendirir (kısayol) |
| `/toplu` | `pages/toplu.astro` | **SSR** | — | Toplu CSV içerik aktarım sayfası (korumalı, sadece admin kullanımı) |
| `/keystatic` | Keystatic UI (otomatik) | **SSR** | — | Admin paneli (korumalı, runtime) |

> **Prerender** = Build sırasında statik HTML üretilir, CDN'den servis edilir, süper hızlı.
> **SSR** = Her istekte Cloudflare Workers runtime'da çalışır.

### API Endpoint'leri (hepsi SSR — runtime)

| URL | Metot | Dosya | İşlev |
|-----|-------|-------|-------|
| `/api/auth/login` | POST | `pages/api/auth/login.ts` | E-posta + şifre doğrulama, 2 cookie set etme, `?next=` destekli yönlendirme |
| `/api/auth/logout` | GET/POST | `pages/api/auth/logout.ts` | 2 cookie silme, `/login`'e yönlendirme |
| `/api/contact` | POST | `pages/api/contact.ts` | İletişim formu → D1'e kaydet + Resend ile e-posta bildirimi gönder |
| `/api/import` | POST | `pages/api/import.ts` | CSV parse → GitHub API ile toplu içerik dosyası oluşturma/güncelleme |
| `/api/keystatic/[...params]` | ALL | `pages/api/keystatic/[...params].ts` | GitHub API proxy + internal auth route handler |

---

## 7. Auth (Kimlik Doğrulama) Sistemi

### Genel Akış

```
┌─────────┐    ┌──────────────┐    ┌────────────────────┐    ┌───────────────────────┐
│ /login  │───→│ POST         │───→│ Credential         │───→│ 2 Cookie Set:         │
│ Formu   │    │ /api/auth/   │    │ Doğrulama          │    │ 1. netmimar_session   │
│         │    │ login        │    │ (env vars ile)     │    │ 2. keystatic-gh-...   │
└─────────┘    └──────────────┘    └────────────────────┘    │ + Redirect /keystatic │
                                                             └───────────────────────┘

┌────────────────┐    ┌────────────────┐    ┌─────────────────────┐
│ /keystatic     │───→│ middleware.ts   │───→│ Cookie HMAC doğrula │
│ veya           │    │ (her request)  │    │ + Süre kontrolü     │
│ /api/keystatic │    │                │    │ Başarısız → /login  │
└────────────────┘    └────────────────┘    └─────────────────────┘
```

### Cookie Yapısı — İki Ayrı Cookie

Login başarılı olduğunda **iki cookie** set edilir:

#### 1. `netmimar_session` — Auth Cookie

```
base64(JSON.stringify({ email, iat, exp })).HMAC_SHA256_SIGNATURE
```

- `iat` = oluşturulma zamanı (milisaniye)
- `exp` = sona erme zamanı (24 saat sonra)
- İmza `COOKIE_SECRET` ile `HMAC-SHA256` kullanılarak üretilir
- İmza URL-safe Base64 formatındadır (`+` → `-`, `/` → `_`, trailing `=` kaldırılır)
- **httpOnly: true** — JavaScript erişemez, güvenli
- **`secure` flag:** HTTPS'de `true`, HTTP'de (localhost) `false` — `context.request.url.startsWith('https://')` ile dinamik belirlenir. `secure: true` sabit yapılırsa localhost'ta cookie saklanmaz ve giriş çalışmıyor gibi görünür.
- **Amacı:** Middleware, bu cookie'yi kontrol ederek `/keystatic` ve `/api/keystatic` erişimini doğrular

#### 2. `keystatic-gh-access-token` — GitHub Token Cookie

```
Değer: GITHUB_TOKEN (ortam değişkeninden)
```

- **httpOnly: false** — Keystatic'in JavaScript frontend'i bu token'a erişmeli
- **Amacı:** Keystatic admin panelinin GitHub API ile iletişim kurması için gerekli. Keystatic, bu cookie'yi okuyarak GitHub'a erişim sağlar.
- **Neden httpOnly: false?** Keystatic'in client-side JS kodu bu token'ı alıp GitHub API çağrılarında kullanır. httpOnly: true yapılırsa Keystatic çalışmaz.

> **Güvenlik notu:** `keystatic-gh-access-token` sadece login başarılı olduğunda set edilir ve 24 saat sonra expire olur. Token görmek için önce geçerli kimlik bilgileriyle giriş yapmak gerekir.

### Korunan Yollar

`middleware.ts` şu yolları korur:
- `/keystatic` ve altı
- `/api/keystatic` ve altı
- `/toplu` — toplu içerik aktarım sayfası
- `/api/import` — toplu aktarım API endpoint'i

Diğer tüm yollar (ana sayfa, blog, hizmetler vb.) herkese açıktır.

### `/admin` Yönlendirmesi

`public/_redirects` dosyası içinde Cloudflare edge seviyesinde 302 yönlendirme yapılır:

```
/admin       /keystatic      302
/admin/*     /keystatic/:splat  302
```

Bu yönlendirme SSR veya middleware'den **önce** çalışır. Böylece esnafın `/admin` adresini ezberlemesi yeterlidir — Keystatic paneline yönlendirilir.

> **Neden middleware'de değil?** Cloudflare Pages, bilinmeyen bir route'a geldiğinde önce `_redirects` dosyasına bakar. Eğer orada eşleşme yoksa SPA fallback olarak `index.html` döner — middleware hiç devreye girmez. Bu yüzden `/admin` yönlendirmesi `_redirects` ile yapılmalıdır.

### Login `?next=` Parametresi

Middleware, korunan bir sayfaya oturumsuz erişildiğinde `/login?next=/sayfa` şeklinde yönlendirir. Login formu bu değeri gizli alan olarak tutar. Giriş başarılı olduğunda kullanıcı direkt o sayfaya yönlendirilir.

Örnek: `/toplu` adresine girince `/login?next=%2Ftoplu` → giriş yapınca `/toplu`'ya döner.

Giriş başarısız olsa bile hata URL'inde `next` parametresi korunur (örn: `/login?error=1&next=%2Ftoplu`).

### GitHub API Proxy (/api/keystatic/[...params])

Bu dosya Keystatic admin panelinin GitHub ile iletişimini sağlar. İki ayrı görevi vardır:

#### A. Internal Auth Routes (Keystatic'in OAuth akışını override eder)

Keystatic normalde GitHub OAuth akışı kullanır. Ancak biz kendi auth sistemimizi kullandığımız için bu route'ları kendimiz handle ediyoruz:

| Path | Ne Yapar |
|------|----------|
| `github/login` | `keystatic-gh-access-token` cookie'sini kontrol eder, varsa JSON olarak döner |
| `github/refresh-token` | Token'ı cookie'den okuyup döner (token yenileme simülasyonu) |
| `github/logout` | Cookie'yi siler (ama auth session devam eder) |
| `github/repo-not-found` | Hata sayfası döner |

#### B. GitHub API Proxy (Asıl veri trafiği)

Internal route'lar dışındaki tüm istekler GitHub API'ye proxy'lenir:

1. Gelen isteği alır
2. `Authorization: Bearer GITHUB_TOKEN` header'ını ekler
3. `User-Agent` header'ını ekler (GitHub bu header'ı zorunlu tutar)
4. İsteği `https://api.github.com/...` adresine forward eder
5. Yanıtı istemciye döner

**Neden gerekli?** Müşterinin GitHub token'ını bilmemesi için. Token yalnızca sunucu tarafında (ortam değişkeni olarak) tutulur.

### Logout

`/api/auth/logout` her iki cookie'yi de siler:
- `netmimar_session` → siler
- `keystatic-gh-access-token` → siler
- Kullanıcıyı `/login`'e yönlendirir

---

## 8. Ortam Değişkenleri

### Tam Liste

| Değişken | Nerede Kullanılır | Açıklama | Örnek |
|----------|-------------------|----------|-------|
| `GITHUB_TOKEN` | GitHub proxy (`/api/keystatic/[...params].ts`) | Agency'nin GitHub Personal Access Token'ı | `ghp_xxxx...` |
| `PUBLIC_REPO_OWNER` | Keystatic config (client-side) | GitHub repo sahibi — Keystatic GitHub storage için | `muhone-sudo` |
| `PUBLIC_REPO_NAME` | Keystatic config (client-side) | GitHub repo adı — Keystatic GitHub storage için | `netmimar-base` |
| `CLIENT_EMAIL` | `login.ts` | Admin paneli giriş e-postası | `admin@example.com` |
| `CLIENT_PASSWORD` | `login.ts` | Admin paneli giriş şifresi | `SecurePass123!` |
| `COOKIE_SECRET` | `middleware.ts` + `login.ts` | HMAC imzalama anahtarı (min 32 karakter) | `cEsnqL2I0StPtsps7D+n5KdSz...` |
| `RESEND_API_KEY` | `api/contact.ts` | Resend.com API anahtarı (iletişim formu e-posta bildirimi) | `re_xxxx...` |

### Değişkenler Detaylı Açıklama

#### `GITHUB_TOKEN` — GitHub Personal Access Token

**Ne işe yarıyor?** Keystatic, production'da içerikleri GitHub reposuna okuyup yazıyor. Bu işlem GitHub API üzerinden yapılıyor. GitHub API'ye erişmek için yetkili bir token gerekiyor. Bu token `/api/keystatic/[...params].ts` proxy'si üzerinden GitHub'a enjekte ediliyor — müşteri token'ı hiç görmüyor.

**Nereden alınır?**
1. GitHub → Settings → Developer Settings → Personal Access Tokens → **Fine-grained tokens**
2. "Generate new token" tıklayın
3. **Token name:** İstediğiniz bir isim (ör: `netmimar-site-cms`)
4. **Expiration:** `No expiration` (sınırsız) seçin — süreli yaparsanız her dolduğunda yenilemeniz gerekir
5. **Repository access:** `Only select repositories` → sadece bu sitenin reposunu seçin
6. **Permissions → Repository permissions → Contents:** `Read and write`
7. Token'ı kopyalayın ve Cloudflare'de `GITHUB_TOKEN` olarak kaydedin

> **Güvenlik notu:** Sınırsız token güvenlidir çünkü Fine-grained token ile sadece seçilen repoya ve sadece `contents` iznine erişim verilir. Başka repolar etkilenmez.

#### `PUBLIC_REPO_OWNER` — GitHub Repo Sahibi

**Ne işe yarıyor?** Keystatic'in hangi GitHub hesabındaki repoya bağlanacağını belirler.

**Nereden alınır?** GitHub repository URL'inizden: `https://github.com/OWNER/REPO` → `OWNER` kısmı.

#### `PUBLIC_REPO_NAME` — GitHub Repo Adı

**Ne işe yarıyor?** Keystatic'in hangi repoya bağlanacağını belirler.

**Nereden alınır?** GitHub repository URL'inizden: `https://github.com/OWNER/REPO` → `REPO` kısmı.

#### `CLIENT_EMAIL` — Admin Paneli Giriş E-postası

**Ne işe yarıyor?** `/login` sayfasındaki giriş formunda kullanılır. Bu e-posta ile giriş yapan kişi `/keystatic` admin paneline yönlendirilir.

**Nasıl belirlenir?** Müşteriye vereceğiniz herhangi bir e-posta adresi. Gerçek bir e-posta hesabıyla ilişkili olmak zorunda değil, sadece giriş bilgisi olarak kullanılır.

#### `CLIENT_PASSWORD` — Admin Paneli Giriş Şifresi

**Ne işe yarıyor?** `/login` sayfasındaki giriş formunda e-posta ile birlikte doğrulanır.

**Nasıl belirlenir?** Güçlü bir şifre belirleyin ve müşteriye iletin. Şifreler düz metin olarak karşılaştırılır (hashlenmiyor), bu nedenle Cloudflare Dashboard'da `Encrypt` seçeneği ile saklayın.

#### `COOKIE_SECRET` — Session Cookie İmzalama Anahtarı

**Ne işe yarıyor?** Giriş başarılı olduğunda oluşturulan session cookie'sini HMAC-SHA256 ile imzalar. Bu sayede cookie'nin sahte olup olmadığı doğrulanır. Middleware (`middleware.ts`) her `/keystatic` isteğinde bu imzayı kontrol eder.

**Nasıl üretilir?** Terminalde:
```bash
openssl rand -base64 32
```

> **Önemli:** Her müşteri sitesi için **ayrı** bir COOKIE_SECRET üretin. Aynı anahtarı birden fazla sitede kullanmayın.

### Tanımlama Yerleri

**Local geliştirme:** `.env` dosyası (repo root'unda)
```bash
cp .env.example .env
# Değerleri düzenle
```

> **Not:** `.env.example` dosyası projede hazır olarak bulunmaktadır. Tüm değişken isimlerini içerir, değerleri boş bırakılmıştır.

**Production (Cloudflare):** Cloudflare Dashboard → Pages → Proje → Settings → Environment Variables

> **Kritik:** `.env` dosyası `.gitignore`'a eklidir. ASLA Git'e commit edilmemelidir.

#### `RESEND_API_KEY` — Resend E-posta API Anahtarı

**Ne işe yarıyor?** İletişim formu doldurulduğunda müşteriye e-posta bildirimi gönderir. Resend, Cloudflare Workers ile uyumlu HTTP tabanlı bir e-posta servisidir (Workers'ta klasik SMTP/TCP soketi açılamaz).

**Nereden alınır?**
1. [resend.com](https://resend.com) → ücretsiz hesap açın (aylık 3.000 e-posta, günlük 100)
2. Dashboard → Domains → müşterinin domain'ini ekleyin ve DNS kaydı ile doğrulatın
3. Dashboard → API Keys → yeni anahtar oluşturun
4. Cloudflare Dashboard → Pages → Proje → Settings → Environment Variables → `RESEND_API_KEY` olarak ekleyin

> **Boş bırakılırsa ne olur?** `RESEND_API_KEY` tanımlı değilse veya `contactEmail` (Keystatic → Site Ayarları'ndan) boş bırakılmışsa e-posta gönderilmez — form verisi D1 veritabanına kaydedilmeye devam eder.

> **Gönderici adres:** Domain doğrulaması yapılana kadar `from` adresi `onboarding@resend.dev` olarak kalır. Doğrulama sonrası `noreply@musteri-domain.com` gibi özel adres kullanılabilir (`contact.ts` içinde güncellenir).

### Local vs Production Farkı

`keystatic.config.tsx` içinde:

```typescript
storage:
    import.meta.env.MODE === 'development'
        ? { kind: 'local' }         // Local: dosya sistemi
        : {
            kind: 'github',          // Production: GitHub API
            repo: { owner: ..., name: ... },
          },
```

---

## 16. Toplu İçerik Aktarımı (CSV Import)

### Genel Bakış

Admin kullanıcısına (müşteriye değil, siteyi yöneten kişiye) özel bir CSV yükleme sayfası mevcuttur. Bu sayfa `/toplu` adresinde bulunur ve oturum gerektirmektedir.

**Kullanım senaryosu:** Müşteriden içerik listesi Excel/CSV olarak alınır → şablona uygun doldurulur → `/toplu` sayfasından yüklenir → içerikler doğrudan GitHub'a commit edilir.

### Erişim

- **URL:** `/toplu`
- **Korumalı:** Evet (middleware ile — oturum olmadan `/login?next=/toplu`'ya yönlendirir)
- **Giriş sonrası:** Direkt `/toplu`'ya döner (`?next=` mekanizması)

### CSV Şablonları

`public/templates/` klasöründe 4 adet indirilebilir şablon bulunur:

| Dosya | Koleksiyon | Alanlar |
|-------|------------|---------|
| `hizmetler-sablon.csv` | Hizmetler | `title, slug, icon, shortDescription, content` |
| `projeler-sablon.csv` | Projeler | `projectName, slug, client, date, category, description` |
| `blog-sablon.csv` | Blog | `title, slug, date, author, category, tags, body` |
| `ekip-sablon.csv` | Ekip | `name, slug, role, order, socialLinkedin, socialTwitter, socialInstagram, socialEmail` |

> **Not:** `slug` sütunu boş bırakılabilir — başlık/isimden otomatik üretilir (Türkçe karakter dönüşümü dahil). Blog'daki `tags` sütununda birden fazla etiket `|` ile ayrılır (ör: `web|tasarım|seo`).

### API Endpoint — `/api/import`

**Dosya:** `src/pages/api/import.ts`  
**Metot:** POST (multipart/form-data)  
**Alanlar:** `collection` (services/projects/blog/team), `file` (CSV dosyası)

**Akış:**
1. CSV parse edilir (quoted field + iç satır sonu desteği)
2. Her satır için koleksiyona uygun dosya içeriği üretilir (`.mdoc` veya `.json`)
3. Her dosya için GitHub API'ye `GET` isteği atılır — varsa `sha` alınır
4. `PUT /repos/{owner}/{repo}/contents/{path}` ile dosya oluşturulur veya güncellenir
5. Sonuçlar (başarılı/hatalı, satır bazında) JSON olarak döner

**Gerekli env değişkenleri:** `GITHUB_TOKEN`, `PUBLIC_REPO_OWNER`, `PUBLIC_REPO_NAME`

> **Önemli:** Bu endpoint her zaman GitHub API kullanır (local'de bile). `wrangler pages dev` ile test ederken gerçek GitHub'a yazılır.

---

## 17. Keystatic UI Özelleştirmeleri

### GitHub Öğelerinin Gizlenmesi / Değiştirilmesi

Keystatic admin paneli GitHub modunda çalışırken bazı GitHub'a özgü UI öğeleri gösterir (branch seçici, "View on GitHub" linkleri, kullanıcı adı vb.). Bu öğeler esnafin görmesi gerekmediğinden gizlenmiş ya da değiştirilmiştir.

**Yöntem:** `keystatic.config.tsx` içinde `ui.brand.mark` React bileşeni (`KeystaticMark`) kullanılır. Bu bileşen:
- `useEffect` ile bir `<style>` etiketi enjekte eder (CSS ile gizleme)
- `MutationObserver` ile dinamik olarak yüklenen öğeleri metin bazında gizler veya değiştirir

**CSS ile gizlenenler:**
- `div:has(> [aria-label="git actions"])` — sidebar'daki branch picker + git menü kapsayıcısı
- `[aria-label="User menu"]` — kullanıcı adı / GitHub avatar menüsü
- `a[href*="github.com"]` — tüm GitHub.com linkleri ("View on GitHub" dahil)

**MutationObserver ile gizlenenler** (`startsWith` tablanlı eşleşme — "New branch..." gibi noktalı varyantlar da yakalanr):
- `'New branch'`, `'Delete branch'`, `'Create pull request'`, `'Current branch'`, `'Pull request #'` ile başlayan butonlar
- Dashboard'daki "CURRENT BRANCH / main" bölümü: `'CURRENT BRANCH'` metnini taşıyan yapı bulunup 4 seviye üst kapsayıcısı gizlenir

**MutationObserver ile değiştirilenler:**
- `'Hello, '` ile başlayan `h1/h2/h3` öğeleri — `textContent` doğrudan `'Hoşgeldiniz'` ile değiştirilir (gizlemek yerine; böylece düzen bozulmaz)

**Neden `keystatic.config.tsx`?**  
Keystatic'in `ui.brand.mark` özelliği bir React bileşeni kabul eder. JSX kullanabilmek için dosya uzantısı `.ts`'ten `.tsx`'e dönüştürülmüştür. `tsconfig.json`'da `"jsx": "react-jsx"` ve `"jsxImportSource": "react"` zaten tanımlıdır.

> **Önemli:** `MutationObserver` sadece istemci tarafında çalışır. Bu bileşen SSR'da render edilmez, Astro build'ini etkilemez.

> **Dikkat:** Keystatic güncellemesi HTML yapısını veya `aria-label` değerlerini değiştirebilir. Güncelleme sonrası gizlenen öğelerin hâlâ gizli, "Hoşgeldiniz" yazısının göründüğünü kontrol edin.

### Brand İsmi

`ui.brand.name` → `'Hoşgeldiniz'` olarak ayarlanmıştır. Sidebar sol üst köşesinde görünür.

- **`development`** (npm run dev): Keystatic dosyaları doğrudan disk üzerinde okur/yazar. GitHub'a gitmez.
- **`production`** (deploy sonrası): Keystatic, GitHub API üzerinden dosyaları okur/yazar.

---

## 18. İletişim Formu E-posta Bildirimi (Resend)

### Genel Bakış

İletişim formu gönderiminde iki şey olur:
1. **Her zaman:** Form verisi Cloudflare D1 veritabanına kaydedilir
2. **Koşullu:** `RESEND_API_KEY` env değişkeni ve Keystatic'teki `contactEmail` alanı doluysa Resend API aracılığıyla e-posta bildirimi gönderilir

E-posta gönderilemese bile form başarılı sayılır — ziyaretçiye hata gösterilmez, D1 kaydı yapılır.

### Neden Resend?

Cloudflare Workers **ham TCP soketi açamaz** — dolayısıyla klasik SMTP/nodemailer çalışmaz. Resend, saf HTTP API üzerinden e-posta gönderir ve Cloudflare Workers ile tam uyumludur.

### Yapılandırma

**1. API Anahtarı (developer yapar — tek seferlik):**
- [resend.com](https://resend.com) → ücretsiz hesap (aylık 3.000 e-posta, günlük 100)
- Dashboard → Domains → müşterinin domain'ini ekle → DNS TXT kaydı ile doğrulat
- Dashboard → API Keys → yeni anahtar oluştur
- Cloudflare Dashboard → Pages → Proje → Settings → Environment Variables → `RESEND_API_KEY`
- Local: `.env` dosyasına `RESEND_API_KEY=re_xxx...` ekle

**2. Bildirim adresi (müşteri yapar — panelden):**
- Keystatic → Site Ayarları → **Bildirim E-postası** → müşterinin kendi e-postasını girer
- İsteğe bağlı: **Gönderici Adı** (varsayılan: "İletişim Formu")
- Save → GitHub'a commit → Cloudflare otomatik build → aktif

### Bildirim E-posta İçeriği

- **Konu:** `Yeni Mesaj: {ziyaretçinin adı}`
- **Kimden:** `{Gönderici Adı} <onboarding@resend.dev>` (domain doğrulanana kadar)
- **Yanıtla (reply-to):** Ziyaretçinin e-postası — müşteri direkt "Yanıtla" diyerek cevap verebilir
- **İçerik:** HTML tablo formatında isim, e-posta, telefon, mesaj

### Gönderici Adresi Özelleştirme (Domain Doğrulama Sonrası)

Domain doğrulandıktan sonra `src/pages/api/contact.ts` içindeki `from` satırı güncellenir:

```typescript
from: `${senderName} <noreply@musteri-domain.com>`,
```

### settings.json Alanları

| Alan | Keystatic Etiketi | Açıklama |
|------|-------------------|----------|
| `contactEmail` | Bildirim E-postası | Bildirimlerin gideceği adres. Boş = e-posta yok |
| `contactEmailSenderName` | Gönderici Adı | "Kimden" kısmı. Varsayılan: "İletişim Formu" |

> **Önemli:** `settings.json` build sırasında bundle'a dahil edilir. Müşteri Keystatic'ten `contactEmail`'i değiştirip save edince GitHub'a commit gider → yeni build tetiklenir → yeni adres aktif olur. Bu işlem 1-2 dakika sürer.

---

## 9. İçerik Dosyaları — Nerede Ne Tutulur?

### Görseller

Tüm CMS görselleri `public/images/` altında ayrı klasörlerde saklanır:

| Klasör | İçerik | Kaynak |
|--------|--------|--------|
| `public/images/brand/` | Logo, favicon | Settings singleton |
| `public/images/hero/` | Hero arka plan görseli | Homepage singleton |
| `public/images/services/` | Hizmet görselleri | Services collection |
| `public/images/projects/` | Proje kapak + galeri görselleri | Projects collection |
| `public/images/blog/` | Blog kapak görselleri | Blog collection |
| `public/images/team/` | Ekip fotoğrafları | Team collection |
| `public/images/testimonials/` | Müşteri fotoğrafları | Homepage testimonials |

**Görseller nasıl eklenir?** Admin panelinden. Keystatic'te bir image alanında dosya yüklendiğinde, `keystatic.config.tsx`'teki `directory` ayarına göre otomatik olarak doğru klasöre kaydedilir.

### Metin İçerikleri

| Dosya | Format | İçerik |
|-------|--------|--------|
| `settings.json` | JSON | Site başlığı, telefon, email, adres, sosyal medya, SEO, scripts |
| `homepage.json` | JSON | Hero, features, counters, testimonials |
| `services/*.mdoc` | YAML frontmatter + Markdoc | Hizmet başlığı, açıklama, detaylı içerik |
| `projects/*.mdoc` | YAML frontmatter + Markdoc | Proje bilgileri ve açıklaması |
| `blog/*.mdoc` | YAML frontmatter + Markdoc | Blog başlığı, tarih, yazar, gövde |
| `team/*.json` | JSON | İsim, rol, sosyal linkler |
| `settings/kvkkText.mdoc` | Markdoc | KVKK aydınlatma metni |
| `settings/privacyPolicy.mdoc` | Markdoc | Gizlilik politikası |

---

## 10. Stil Sistemi

### TailwindCSS v4

Bu projede **TailwindCSS v4** kullanılmaktadır. V4'te yapılandırma `tailwind.config.js` yerine CSS içinde yapılır.

**Konfigürasyon dosyası:** `src/styles/global.css`

```css
@import "tailwindcss";

@theme {
  --color-primary: #0f172a;          /* Ana renk (koyu lacivert) */
  --color-primary-light: #1e293b;    /* Açık primary */
  --color-accent: #3b82f6;           /* Vurgu rengi (mavi) */
  --color-accent-hover: #2563eb;     /* Vurgu hover */
  --color-accent-light: #60a5fa;     /* Açık vurgu */
  --color-surface: #ffffff;          /* Beyaz yüzey */
  --color-surface-dark: #f8fafc;     /* Koyu yüzey */
  --color-text: #0f172a;             /* Metin rengi */
  --color-text-muted: #64748b;       /* Soluk metin */
  --color-border: #e2e8f0;           /* Kenarlık rengi */
  --color-success: #10b981;          /* Başarı */
  --color-error: #ef4444;            /* Hata */
  --color-warning: #f59e0b;          /* Uyarı */

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-heading: 'Inter', system-ui, sans-serif;
}
```

### Tasarım Değişikliği Nasıl Yapılır?

**Renkleri değiştirmek için:** `global.css` içindeki `@theme` bloğundaki renk değerlerini değiştirin. Tüm sayfalarda otomatik güncellenir.

**Fontu değiştirmek için:**
1. `global.css` içindeki `--font-sans` ve `--font-heading` değerlerini değiştirin
2. `BaseLayout.astro` ve `login.astro` içindeki Google Fonts `<link>` etiketini güncelleyin

**Layout'u değiştirmek için:** `BaseLayout.astro` dosyasını düzenleyin. Header, footer ve tüm ortak yapı burada.

**Sayfa tasarımını değiştirmek için:** İlgili `.astro` dosyasındaki HTML/CSS'i düzenleyin. CMS veri çekme kodu fonksiyon bölümünde (`---` arası), tasarım kodu HTML bölümünde.

### Kullanılan Utility Animasyonlar

```css
.animate-fade-in   /* 0.5s fade + slide-up */
.animate-slide-up  /* 0.6s slide-up */
```

---

## 11. astro.config.mjs Açıklaması

Bu dosya projenin en kritik yapılandırma dosyasıdır. İçindeki her satır belirli bir sorunu çözmek için vardır. **Ellemeyin!**

### Tam Yapı Açıklaması

```javascript
// 1. Adapter — Cloudflare Pages'a deploy için
import cloudflare from "@astrojs/cloudflare";

// 2. keystatic() entegrasyonu — Özel sarmalayıcı ile
import keystatic from "@keystatic/astro";

// NOT: keystatic() doğrudan kullanılmaz!
// keystaticNoApiRoute() sarmalayıcısı kullanılır (aşağıda açıklanıyor)
```

### `keystaticNoApiRoute()` Sarmalayıcısı — Neden Var?

Keystatic'in Astro entegrasyonu (`@keystatic/astro`) otomatik olarak `/api/keystatic/[...params]` route'unu oluşturmak ister. **Ama bizim zaten özel bir proxy'miz var** (`src/pages/api/keystatic/[...params].ts`). İki route aynı path'i kullandığında **route collision** hatası oluşur.

Bu sarmalayıcı:
1. `keystatic()` fonksiyonunu çağırır
2. Dönen entegrasyon objesini klonlar
3. `hooks.astro:config:setup` içindeki `injectRoute` fonksiyonunu **override** eder
4. `/api/keystatic` ile başlayan route enjeksiyonlarını **engeller**
5. Diğer route'ları (admin paneli UI) olduğu gibi bırakır

> **Bu fonksiyona dokunmayın.** Silip `keystatic()` olarak kullanırsanız build patlar.

### Vite Alias — `react-dom/server.edge`

```javascript
vite: {
  resolve: {
    alias: {
      "react-dom/server": "react-dom/server.edge",
    },
  },
},
```

**Neden var?** Keystatic admin paneli React ile render edilir. `react-dom/server` normal halinde `MessageChannel` API'sini kullanır. Cloudflare Workers'da `MessageChannel` yoktur. `react-dom/server.edge` edge runtime'a uygun alternatiftir.

> **Bu alias'ı silmeyin.** Sildiğinizde `MessageChannel is not defined` hatası alırsınız.

### TailwindCSS Vite Plugin

```javascript
import tailwindcss from "@tailwindcss/vite";
// ...
vite: { plugins: [tailwindcss()] }
```

TailwindCSS v4, Vite plugin üzerinden çalışır. `tailwind.config.js` yoktur — yapılandırma `global.css` içindeki `@theme` bloğunda yapılır.

---

## 12. Cloudflare Workers Uyumluluk Notları

Bu proje Cloudflare Workers (Pages Functions) runtime'ında çalışır. Workers, Node.js'den farklıdır ve bazı sınırlamaları vardır. Aşağıdaki sorunlar çözülmüştür — ilgili kodlara **dokunmayın**.

### Fetch `cache` Alanı Sorunu

**Sorun:** Keystatic, `fetch({ cache: 'no-store' })` çağrısı yapar. Cloudflare Workers bu `cache` alanını desteklemez ve hata fırlatır:
```
The 'cache' field on 'RequestInitializerDict' is not implemented.
```

**Çözüm:** `middleware.ts` dosyasının en üstünde `globalThis.fetch` patch'lenir. Bu patch, her `fetch` çağrısından `cache` alanını siler:

```typescript
const _origFetch = globalThis.fetch;
globalThis.fetch = (input: any, init?: any) => {
  if (init) { delete init.cache; }
  return _origFetch(input, init);
};
```

> **Bu patch'i silmeyin.** Sildiğinizde Keystatic admin paneli çalışmaz (production'da).

### `MessageChannel` Yokluğu

Workers'da `MessageChannel` API'si yoktur. React SSR normalde bunu kullanır. `astro.config.mjs`'deki `react-dom/server.edge` alias'ı ile çözülmüştür (Bkz. Bölüm 11).

### Node.js `fs` Yokluğu

Workers'da dosya sistemi yoktur (`fs`, `path` modülleri çalışmaz). Ancak **build sırasında** bu modüller çalışır çünkü build Node.js ortamında gerçekleşir. Bu yüzden `createReader` build-time'da kullanılabilir ama runtime'da kullanılamaz. Prerender mimarisi bu sorunu ortadan kaldırır.

### `nodejs_compat_v2` Flag'i

`wrangler.toml`'da:
```toml
compatibility_flags = ["nodejs_compat_v2"]
```

Bu flag bazı Node.js API'lerinin Workers'da çalışmasını sağlar. Kaldırmayın.

---

## 13. Developer Rehberi — Ön Yüz Tasarımını Değiştirme

Bu bölüm, siteye yeni tasarım giydirmek isteyen developer için yazılmıştır.

### ✏️ DEĞİŞTİREBİLECEĞİN Dosyalar

| Dosya | Ne Yaparsın |
|-------|-------------|
| `src/styles/global.css` | Renk token'ları, fontlar, genel stiller. `@theme` bloğunu düzenle. |
| `src/layouts/BaseLayout.astro` | Header, footer, `<head>` meta tagları, Google Fonts linki. Ortak UI. |
| `src/pages/index.astro` | Ana sayfa HTML/CSS tasarımı. `---` altındaki HTML bölümünü değiştir. |
| `src/pages/hizmetler/index.astro` | Hizmetler listesi tasarımı. |
| `src/pages/hizmetler/[slug].astro` | Hizmet detay sayfası tasarımı. |
| `src/pages/projeler/index.astro` | Projeler listesi tasarımı. |
| `src/pages/projeler/[slug].astro` | Proje detay sayfası tasarımı. |
| `src/pages/blog/index.astro` | Blog listesi tasarımı. |
| `src/pages/blog/[slug].astro` | Blog yazısı detay tasarımı. |
| `src/pages/ekip.astro` | Ekip sayfası tasarımı. |
| `src/pages/kvkk.astro` | KVKK sayfası tasarımı. |
| `src/pages/gizlilik.astro` | Gizlilik sayfası tasarımı. |
| `src/pages/login.astro` | Login sayfası tasarımı (ayrı bir layout, BaseLayout kullanmaz). |
| `public/images/brand/` | Logo ve favicon dosyaları (değiştir veya yeniden yükle). |

### 🚨 DOKUNMA Dosyalar

| Dosya | Neden Dokunma |
|-------|---------------|
| `src/lib/reader.ts` | CMS okuma köprüsü. Çalışıyor, bozulursa içerik gelmez. |
| `src/middleware.ts` | Fetch patch + auth. Bozulursa admin paneli çalışmaz. |
| `astro.config.mjs` | Kritik alias ve sarmalayıcılar. Bozulursa build patlar. |
| `keystatic.config.tsx` | CMS şeması. Değiştirirsen mevcut içeriklerle uyum bozulur. `.tsx` uzantılıdır — JSX kullanılır. |
| `src/pages/api/**` | Auth, contact, GitHub proxy. Backend logic. |
| `src/content/**` | CMS tarafından yönetilir. Elle düzenleme yapma. |
| `wrangler.toml` | Cloudflare konfigürasyonu. Yanlış değişiklik deploy'u bozar. |
| `src/env.d.ts` | TypeScript type tanımları. |
| `src/content.config.ts` | Astro content collections. `keystatic.config.tsx` ile eşleşmeli. |
| `public/_redirects` | Cloudflare edge yönlendirme. `/admin → /keystatic` kuralı burada. |
| `public/templates/*.csv` | Toplu aktarım CSV şablonları. Değiştirilirse `/toplu` sayfasıyla uyum kontrol et. |
| `src/content/singletons/settings.json` | `contactEmail` ve `contactEmailSenderName` alanları e-posta bildirimini yönetir. Boş bırakılırsa bildirim gitmez. |

### Astro Dosya Yapısı — Script vs Template

Her `.astro` dosyası iki bölümden oluşur:

```astro
---
// 📦 SCRIPT (Frontmatter) — CMS veri çekme kodu
// ⚠️ Bu bölüme dokunma (prerender, import, reader çağrıları)
export const prerender = true;

import BaseLayout from "../../layouts/BaseLayout.astro";
import { getReader } from "../../lib/reader";

const reader = getReader();
const services = await reader.collections.services.all();
---

<!-- 🎨 TEMPLATE — HTML/CSS tasarım kodu -->
<!-- ✅ Bu bölümü istediğin gibi değiştir -->
<BaseLayout title="Hizmetlerimiz">
  <section class="py-20">
    {services.map((s) => (
      <div class="p-4">
        <h2>{s.entry.title}</h2>
        <img src={s.entry.coverImage} alt={s.entry.title} />
      </div>
    ))}
  </section>
</BaseLayout>
```

> **Altın kural:** `---` içindeki koda dokunma, `---` altındaki HTML/CSS'i istediğin gibi değiştir.

### Yeni Sayfa Ekleme İş Akışı

Mevcut bir collection için yeni sayfa eklemenize gerek yok — zaten `[slug].astro` her yeni içerik için otomatik sayfa oluşturur.

Tamamen **yeni bir statik sayfa** eklemek isterseniz (ör: `/hakkimizda`):

1. `src/pages/hakkimizda.astro` dosyası oluştur
2. En üste `export const prerender = true;` ekle
3. `getReader()` ile gerekli CMS verisini çek
4. HTML/CSS tasarımını yaz
5. **Build ve deploy** — yeni sayfa otomatik oluşturulur

### İçerik Güncellemesi Sonrası Ne Olur?

```
Müşteri admin panelden değişiklik yapar
       → Keystatic değişikliği GitHub'a commit eder
       → Cloudflare Pages webhook'u tetiklenir
       → Yeni build başlar (1-2 dakika)
       → Statik HTML dosyaları yeniden üretilir
       → Site güncellenir
```

Yani developer olarak **hiçbir şey yapmanıza gerek yok**. Müşteri içerik değiştirdiğinde site otomatik güncellenir.

---

## 14. Cloudflare Deploy — Adım Adım

### Ön Koşullar

- Cloudflare hesabı
- `wrangler` CLI kurulu (`npm i -g wrangler`)
- GitHub repository (içerik depolama + auto-build tetikleme için)

### Adım 1: GitHub Repository Hazırlığı

```bash
# Yeni repo oluştur (GitHub'da) veya mevcut repo'yu kullan
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

### Adım 2: GitHub Personal Access Token

GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens

Gerekli izinler:
- `contents: read & write` (repo dosyalarını okuma/yazma)

Token'ı not alın, `GITHUB_TOKEN` olarak kullanılacak.

### Adım 3: D1 Veritabanı Oluşturma

```bash
wrangler d1 create netmimar-contacts
```

Çıktıdaki `database_id`'yi `wrangler.toml`'a yazın:

```toml
[[d1_databases]]
binding = "DB"
database_name = "netmimar-contacts"
database_id = "BURAYA_YAPIŞTIRIN"
```

### Adım 4: Şemayı Uygulama

```bash
# Önce local D1'e (test)
wrangler d1 execute netmimar-contacts --local --file=./schema.sql

# Sonra production'a
wrangler d1 execute netmimar-contacts --remote --file=./schema.sql
```

### Adım 5: Cloudflare Pages Projesi

**Seçenek A — GitHub Bağlantılı (Önerilen):**

Cloudflare Dashboard → Pages → Create a project → Connect to Git

1. GitHub hesabınızı bağlayın
2. Repo'yu seçin
3. Build ayarları:
   - **Framework preset:** `Astro`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy'a tıklayın

> **Bu yöntemle:** GitHub'a her push geldiğinde Cloudflare otomatik build alır. Müşteri admin panelden değişiklik yapınca → GitHub'a commit → auto-build → site güncellenir. **Manuel deploy gerekmez.**

**Seçenek B — Manuel deploy (wrangler ile):**

```bash
# Build
npm run build

# Deploy
wrangler pages deploy ./dist
```

> Bu yöntemde her güncelleme için elle `build + deploy` çalıştırmanız gerekir. Önerilmez.

### Adım 6: Ortam Değişkenleri Tanımlama

Cloudflare Dashboard → Pages → Proje → Settings → Environment Variables

Aşağıdaki tüm değişkenleri ekleyin:

| Değişken | Değer |
|----------|-------|
| `GITHUB_TOKEN` | GitHub PAT (Fine-grained) |
| `PUBLIC_REPO_OWNER` | GitHub repo sahibi |
| `PUBLIC_REPO_NAME` | GitHub repo adı |
| `CLIENT_EMAIL` | Müşteriye verilecek giriş e-postası |
| `CLIENT_PASSWORD` | Müşteriye verilecek şifre |
| `COOKIE_SECRET` | Min 32 karakter rastgele string |

> **Önemli:** `COOKIE_SECRET` için `openssl rand -base64 32` komutu ile güçlü bir anahtar oluşturun.

---

## 15. Yeni Müşteri Sitesi Kurulumu (White-Label Fork Rehberi)

Bu boilerplate'ten yeni bir müşteri sitesi oluşturmak için:

### 1. Repository'yi Kopyala

```bash
# Seçenek A: Template olarak fork
gh repo create yeni-musteri-site --template muhone-sudo/netmimar --private

# Seçenek B: Manuel kopyalama
git clone https://github.com/muhone-sudo/netmimar.git yeni-musteri-site
cd yeni-musteri-site
rm -rf .git
git init
git remote add origin https://github.com/OWNER/yeni-musteri-site.git
```

### 2. Ortam Değişkenlerini Yapılandır

```bash
cp .env.example .env
# Yeni müşterinin bilgileri ile doldur
```

### 3. Mevcut Demo İçerikleri Temizle

Demo içerikleri silip temiz başlayabilirsiniz:

```bash
# Demo blog yazılarını sil
rm -f src/content/blog/*.mdoc

# Demo hizmetleri sil
rm -f src/content/services/*.mdoc

# Demo projeleri sil
rm -f src/content/projects/*.mdoc

# Demo ekip üyelerini sil
rm -f src/content/team/*.json

# Demo görselleri sil (ama klasörleri koru)
rm -f public/images/blog/*
rm -f public/images/services/*
rm -f public/images/projects/*
rm -f public/images/team/*
rm -f public/images/testimonials/*
rm -f public/images/hero/*
```

> **Dikkat:** `settings.json` ve `homepage.json` dosyalarını **silmeyin**. İçeriklerini müşteriye göre düzenleyin. Silerseniz site hata verir.

### 4. Tasarımı Değiştir

Developer olarak yapmanız gereken:

1. **`global.css`** — Renk token'larını müşterinin marka renklerine çevirin
2. **`BaseLayout.astro`** — Header ve footer yapısını yeni tasarıma uyarlayın
3. **`index.astro`** — Ana sayfa section tasarımlarını değiştirin
4. **Alt sayfa dosyaları** — Liste ve detay sayfa tasarımlarını güncelleyin
5. **`login.astro`** — Login ekranı tasarımını müşteriye uyarlayın

> **Kural:** Dosyaların `---` (frontmatter/script) bölümündeki CMS veri çekme kodlarına **dokunmayın**. Sadece HTML/CSS kısmını değiştirin. Veri akışı zaten doğru çalışıyor.

### 5. Deploy Et

Bölüm 14'teki adımları takip edin.

---

## Sık Yapılan Hatalar

### Genel Hatalar

| Hata | Çözüm |
|------|-------|
| `settings.json` silindi, site çöktü | `src/content/singletons/settings.json` dosyası olmalı. Admin panelden ilk açılışta oluşturulabilir. |
| Görseller görünmüyor | Görseller `public/images/` altında olmalı. Path'in başında `/images/...` olduğundan emin olun. |
| Login çalışmıyor | `CLIENT_EMAIL`, `CLIENT_PASSWORD` ve `COOKIE_SECRET` ortam değişkenleri tanımlı mı kontrol edin. |
| Login başarılı ama hemen tekrar `/login`'e dönüyor | Cookie `secure: true` ile oluşturulmuş olabilir — HTTP'de (localhost) `secure: true` cookie saklanmaz. `login.ts`'de `isSecure` kontrolünün doğru çalıştığını kontrol edin. |
| E-posta bildirimi gelmiyor | 1) `RESEND_API_KEY` env değişkeni tanımlı mı? 2) Keystatic → Site Ayarları → Bildirim E-postası dolu mu? 3) Resend'de domain doğrulandı mı? 4) Ücretsiz planda günlük 100 limit aşıldı mı? |
| Keystatic paneli açılmıyor (prod) | `GITHUB_TOKEN` doğru mu? Token permission'ları yeterli mi? `PUBLIC_REPO_OWNER` ve `PUBLIC_REPO_NAME` doğru mu? |
| Content değişiklikleri görünmüyor (prod) | Admin panelden save edildikten sonra 1-2 dakika bekleyin — Cloudflare otomatik build tetikler. CF Dashboard → Pages → Deployments'tan build durumunu kontrol edin. |
| `npm run dev` çalışmıyor | `npm install` çalıştırdığınızdan emin olun. Node.js ≥ 18 gerekli. |
| Build hatası: "Cannot find module" | `npm install` çalıştırın, `node_modules` temizlenmiş olabilir. |
| D1 hatası: "no such table: contacts" | `schema.sql` dosyasını D1'e uyguladığınızdan emin olun (Bölüm 14 Adım 4). |

### Cloudflare Workers'a Özgü Hatalar

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `MessageChannel is not defined` | `react-dom/server` Workers'da çalışmaz | `astro.config.mjs`'deki `react-dom/server.edge` alias'ını kontrol edin. Silmeyin! |
| `The 'cache' field on 'RequestInitializerDict' is not implemented` | Workers'da `fetch({ cache: ... })` desteklenmez | `middleware.ts`'deki fetch patch'ini kontrol edin. Silmeyin! |
| `Route collision: /api/keystatic/[...params]` | Keystatic kendi route'unu enjekte etmeye çalışır | `astro.config.mjs`'deki `keystaticNoApiRoute()` sarmalayıcısını kontrol edin. |
| `export const prerender = true` olan sayfa 500 veriyor | Build sırasında içerik dosyası eksik veya hatalı | İlgili `.mdoc` / `.json` dosyasının `src/content/` altında var olduğundan emin olun. |
| Yeni eklenen blog/hizmet sayfası 404 veriyor | `getStaticPaths()` yeni slug'u build sırasında üretmedi | Yeni içerik eklendikten sonra build tetiklenmeli. Cloudflare otomatik yapıyor, ama local'de `npm run build` gerekir. |

---

## Komut Referansı

```bash
# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Build sonucunu önizleme
npm run preview

# Cloudflare'e deploy
wrangler pages deploy ./dist

# D1 veritabanına şema uygula (local)
wrangler d1 execute netmimar-contacts --local --file=./schema.sql

# D1 veritabanına şema uygula (production)
wrangler d1 execute netmimar-contacts --remote --file=./schema.sql

# D1'deki verileri sorgula
wrangler d1 execute netmimar-contacts --remote --command "SELECT * FROM contacts"
```
