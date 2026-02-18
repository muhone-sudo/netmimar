import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

/**
 * Keystatic Reader — Build-time lokal dosya okuyucu
 * 
 * Tüm içerik sayfaları prerender edildiği için reader sadece
 * build sırasında çalışır. Build ortamında (Cloudflare Pages dahil)
 * repo klonlanmış durumda olduğundan dosyalar lokalde mevcuttur.
 * 
 * Akış: Keystatic → GitHub push → CF Pages build tetiklenir →
 *       Build sırasında bu reader ile içerik okunur → Statik HTML üretilir
 */
export function getReader() {
    return createReader(process.cwd(), keystaticConfig);
}
