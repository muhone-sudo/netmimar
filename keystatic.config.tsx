import { config, fields, collection, singleton } from '@keystatic/core';
import { useEffect } from 'react';

/**
 * GitHub'a ait UI elemanlarını Keystatic panelinden gizleyen bileşen.
 * - Branch picker + git menü (sidebar)
 * - "View on GitHub" linkleri
 * - Kullanıcı adı göstergesi ("Hello, muhone-sudo!")
 * - Dashboard branch bölümü
 */
function KeystaticMark() {
    useEffect(() => {
        // ── CSS ile gizle ──────────────────────────────────────────────────
        if (!document.getElementById('nm-ks-hide')) {
            const s = document.createElement('style');
            s.id = 'nm-ks-hide';
            s.textContent = `
                /* Branch picker + git menü kapsayıcısı */
                div:has(> [aria-label="git actions"]) { display: none !important; }
                /* Kullanıcı adı / avatar butonu */
                [aria-label="User menu"] { display: none !important; }
                /* GitHub.com'a giden tüm linkler (View on GitHub, repo linki vb.) */
                a[href*="github.com"] { display: none !important; }
                /* Dashboard: "Hello, ...!" başlığı + avatar satırı */
                h1:has(+ section) { display: none !important; }
                /* Dashboard: "CURRENT BRANCH" + "New branch" bölümü */
                section:has([aria-label="git actions"]),
                section:has(button[aria-label*="branch"]),
                div:has(> button[aria-label*="branch"]) { display: none !important; }
            `;
            document.head.appendChild(s);
        }

        // ── MutationObserver ile metin tabanlı gizleme ─────────────────────
        // startsWith kullan — "New branch..." gibi noktalı varyantları da yakala
        const HIDE_PREFIXES = [
            'New branch', 'Delete branch',
            'Create pull request', 'Current branch',
            'Pull request #', 'Hello, ',
        ];
        const hideByText = () => {
            // Butonlar
            document.querySelectorAll<HTMLElement>('button, [role="button"]').forEach(el => {
                const text = el.textContent?.trim() ?? '';
                if (HIDE_PREFIXES.some(p => text.startsWith(p))) {
                    let target: HTMLElement = el;
                    const parent = el.parentElement;
                    if (parent && parent !== document.body) target = parent;
                    target.style.setProperty('display', 'none', 'important');
                }
            });
            // "Hello, username!" başlığı (h1/h2)
            document.querySelectorAll<HTMLElement>('h1, h2').forEach(el => {
                const text = el.textContent?.trim() ?? '';
                if (text.startsWith('Hello, ')) {
                    const section = el.closest('section, div[class]');
                    const target = section instanceof HTMLElement ? section : el;
                    target.style.setProperty('display', 'none', 'important');
                }
            });
        };

        const observer = new MutationObserver(hideByText);
        observer.observe(document.body, { childList: true, subtree: true });
        hideByText(); // ilk çalıştırma

        return () => observer.disconnect();
    }, []);

    return null;
}

/**
 * NetMimar Keystatic CMS Konfigürasyonu
 * GitHub storage ile çalışır, local proxy üzerinden GitHub API'ye erişir.
 */
export default config({
    storage:
        import.meta.env.MODE === 'development'
            ? { kind: 'local' }
            : {
                kind: 'github',
                repo: {
                    owner: import.meta.env.PUBLIC_REPO_OWNER || 'muhone-sudo',
                    name: import.meta.env.PUBLIC_REPO_NAME || 'netmimar-base',
                },
            },

    ui: {
        brand: {
            name: 'Hoşgeldiniz',
            mark: () => <KeystaticMark />,
        },
        navigation: {
            'Genel': ['settings', 'homepage'],
            'İçerik': ['services', 'projects', 'blog'],
            'Ekip': ['team'],
        },
    },

    // ================================================
    // SINGLETONS — Tekil Global Veriler
    // ================================================
    singletons: {
        // ----- Site Ayarları -----
        settings: singleton({
            label: 'Site Ayarları',
            path: 'src/content/singletons/settings',
            format: { data: 'json' },
            schema: {
                // — Kimlik —
                siteLogo: fields.image({
                    label: 'Site Logosu',
                    directory: 'public/images/brand',
                    publicPath: '/images/brand/',
                }),
                favicon: fields.image({
                    label: 'Favicon',
                    directory: 'public/images/brand',
                    publicPath: '/images/brand/',
                }),
                siteTitle: fields.text({
                    label: 'Site Başlığı',
                    validation: { isRequired: true },
                }),
                slogan: fields.text({
                    label: 'Slogan',
                }),

                // — İletişim Bilgileri —
                phone: fields.text({ label: 'Telefon' }),
                whatsapp: fields.text({ label: 'WhatsApp Numarası' }),
                email: fields.text({ label: 'E-posta Adresi' }),
                address: fields.text({ label: 'Adres', multiline: true }),
                googleMapEmbed: fields.text({
                    label: 'Google Maps Embed Kodu',
                    multiline: true,
                    description: 'Google Maps iframe embed kodunu buraya yapıştırın.',
                }),

                // — Sosyal Medya —
                socialFacebook: fields.text({ label: 'Facebook URL' }),
                socialInstagram: fields.text({ label: 'Instagram URL' }),
                socialTwitter: fields.text({ label: 'Twitter / X URL' }),
                socialLinkedin: fields.text({ label: 'LinkedIn URL' }),
                socialYoutube: fields.text({ label: 'YouTube URL' }),

                // — SEO & Scripts —
                metaDescription: fields.text({
                    label: 'Varsayılan Meta Description',
                    multiline: true,
                }),
                metaKeywords: fields.text({
                    label: 'Anahtar Kelimeler',
                    description: 'Virgülle ayrılmış anahtar kelimeler',
                }),
                headerScripts: fields.text({
                    label: 'Header Scripts (Analytics vb.)',
                    multiline: true,
                    description: 'Google Analytics, Meta Pixel vb. kodlar. <head> etiketine eklenir.',
                }),
                footerScripts: fields.text({
                    label: 'Footer Scripts (Chat widget vb.)',
                    multiline: true,
                    description: 'Canlı destek, chatbot vb. kodlar. </body> öncesine eklenir.',
                }),

                // — Yasal —
                kvkkText: fields.document({
                    label: 'KVKK Aydınlatma Metni',
                    formatting: true,
                    links: true,
                }),
                privacyPolicy: fields.document({
                    label: 'Gizlilik Politikası',
                    formatting: true,
                    links: true,
                }),
            },
        }),

        // ----- Ana Sayfa -----
        homepage: singleton({
            label: 'Ana Sayfa',
            path: 'src/content/singletons/homepage',
            format: { data: 'json' },
            schema: {
                // — Hero Section —
                heroHeading: fields.text({
                    label: 'Hero Başlık',
                    validation: { isRequired: true },
                }),
                heroSubheading: fields.text({
                    label: 'Hero Alt Başlık',
                    multiline: true,
                }),
                heroBackgroundImage: fields.image({
                    label: 'Hero Arka Plan Görseli',
                    directory: 'public/images/hero',
                    publicPath: '/images/hero/',
                }),
                heroCtaText: fields.text({ label: 'CTA Buton Metni' }),
                heroCtaLink: fields.text({ label: 'CTA Buton Linki' }),

                // — Features / Neden Biz —
                features: fields.array(
                    fields.object({
                        iconClass: fields.text({
                            label: 'İkon CSS Sınıfı',
                            description: 'Örn: fas fa-bolt, lucide-zap vb.',
                        }),
                        title: fields.text({ label: 'Başlık', validation: { isRequired: true } }),
                        description: fields.text({ label: 'Açıklama', multiline: true }),
                    }),
                    {
                        label: 'Özellikler / Neden Biz',
                        itemLabel: (props) => props.fields.title.value || 'Yeni Özellik',
                    }
                ),

                // — Sayaçlar —
                counters: fields.array(
                    fields.object({
                        number: fields.text({
                            label: 'Sayı',
                            description: 'Örn: 100+, 500, 1000+',
                            validation: { isRequired: true },
                        }),
                        label: fields.text({
                            label: 'Etiket',
                            description: 'Örn: Tamamlanan Proje',
                            validation: { isRequired: true },
                        }),
                    }),
                    {
                        label: 'Sayaçlar',
                        itemLabel: (props) => props.fields.label.value || 'Yeni Sayaç',
                    }
                ),

                // — Müşteri Yorumları —
                testimonials: fields.array(
                    fields.object({
                        clientName: fields.text({ label: 'Müşteri Adı', validation: { isRequired: true } }),
                        clientRole: fields.text({ label: 'Ünvanı / Rolü' }),
                        clientPhoto: fields.image({
                            label: 'Fotoğraf',
                            directory: 'public/images/testimonials',
                            publicPath: '/images/testimonials/',
                        }),
                        quote: fields.text({
                            label: 'Yorum',
                            multiline: true,
                            validation: { isRequired: true },
                        }),
                    }),
                    {
                        label: 'Müşteri Yorumları',
                        itemLabel: (props) => props.fields.clientName.value || 'Yeni Yorum',
                    }
                ),
            },
        }),
    },

    // ================================================
    // COLLECTIONS — Dinamik İçerikler
    // ================================================
    collections: {
        // ----- Hizmetler -----
        services: collection({
            label: 'Hizmetler',
            slugField: 'title',
            path: 'src/content/services/*',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({
                    name: { label: 'Hizmet Başlığı', validation: { isRequired: true } },
                }),
                icon: fields.text({
                    label: 'İkon CSS Sınıfı',
                    description: 'Örn: fas fa-wrench',
                }),
                shortDescription: fields.text({
                    label: 'Kısa Açıklama',
                    multiline: true,
                    validation: { isRequired: true },
                }),
                featuredImage: fields.image({
                    label: 'Öne Çıkan Görsel',
                    directory: 'public/images/services',
                    publicPath: '/images/services/',
                }),
                content: fields.document({
                    label: 'Detaylı İçerik',
                    formatting: true,
                    dividers: true,
                    links: true,
                    images: {
                        directory: 'public/images/services',
                        publicPath: '/images/services/',
                    },
                }),
            },
        }),

        // ----- Projeler / Portföy -----
        projects: collection({
            label: 'Projeler',
            slugField: 'projectName',
            path: 'src/content/projects/*',
            format: { contentField: 'description' },
            schema: {
                projectName: fields.slug({
                    name: { label: 'Proje Adı', validation: { isRequired: true } },
                }),
                client: fields.text({ label: 'Müşteri' }),
                date: fields.date({ label: 'Tarih' }),
                category: fields.text({ label: 'Kategori' }),
                coverImage: fields.image({
                    label: 'Kapak Görseli',
                    directory: 'public/images/projects',
                    publicPath: '/images/projects/',
                }),
                gallery: fields.array(
                    fields.image({
                        label: 'Görsel',
                        directory: 'public/images/projects',
                        publicPath: '/images/projects/',
                    }),
                    {
                        label: 'Galeri',
                        itemLabel: (props) => {
                            const val = props.value;
                            if (val && typeof val === 'object' && 'filename' in val) {
                                return (val as any).filename || 'Yeni Görsel';
                            }
                            return typeof val === 'string' ? val : 'Yeni Görsel';
                        },
                    }
                ),
                description: fields.document({
                    label: 'Proje Açıklaması',
                    formatting: true,
                    links: true,
                    images: {
                        directory: 'public/images/projects',
                        publicPath: '/images/projects/',
                    },
                }),
            },
        }),

        // ----- Blog / Haberler -----
        blog: collection({
            label: 'Blog',
            slugField: 'title',
            path: 'src/content/blog/*',
            format: { contentField: 'body' },
            schema: {
                title: fields.slug({
                    name: { label: 'Başlık', validation: { isRequired: true } },
                }),
                date: fields.date({
                    label: 'Tarih',
                    defaultValue: { kind: 'today' },
                }),
                author: fields.text({ label: 'Yazar' }),
                category: fields.text({ label: 'Kategori' }),
                tags: fields.array(fields.text({ label: 'Etiket' }), {
                    label: 'Etiketler',
                    itemLabel: (props) => props.value || 'Yeni Etiket',
                }),
                coverImage: fields.image({
                    label: 'Kapak Görseli',
                    directory: 'public/images/blog',
                    publicPath: '/images/blog/',
                }),
                body: fields.document({
                    label: 'İçerik',
                    formatting: true,
                    dividers: true,
                    links: true,
                    images: {
                        directory: 'public/images/blog',
                        publicPath: '/images/blog/',
                    },
                }),
            },
        }),

        // ----- Ekip -----
        team: collection({
            label: 'Ekip',
            slugField: 'name',
            path: 'src/content/team/*',
            format: { data: 'json' },
            schema: {
                name: fields.slug({
                    name: { label: 'Ad Soyad', validation: { isRequired: true } },
                }),
                role: fields.text({
                    label: 'Ünvan / Rol',
                    validation: { isRequired: true },
                }),
                photo: fields.image({
                    label: 'Fotoğraf',
                    directory: 'public/images/team',
                    publicPath: '/images/team/',
                }),
                order: fields.integer({
                    label: 'Sıralama',
                    defaultValue: 0,
                    description: 'Küçük sayı önce gösterilir.',
                }),
                socialLinkedin: fields.text({ label: 'LinkedIn URL' }),
                socialTwitter: fields.text({ label: 'Twitter URL' }),
                socialInstagram: fields.text({ label: 'Instagram URL' }),
                socialEmail: fields.text({ label: 'E-posta' }),
            },
        }),
    },
});
