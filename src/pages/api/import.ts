import type { APIRoute } from 'astro';

// ─── Slug Üreticisi (Türkçe karakter desteğiyle) ─────────────────────────────
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// ─── CSV Parser (quoted field + iç satır sonu desteğiyle) ────────────────────
function parseCSVRow(line: string, full: string, offset: number): [string[], number] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = offset;

    while (i < full.length) {
        const ch = full[i];
        if (ch === '"') {
            if (inQuotes && full[i + 1] === '"') { current += '"'; i += 2; continue; }
            inQuotes = !inQuotes;
            i++;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current); current = ''; i++;
        } else if ((ch === '\n' || (ch === '\r' && full[i + 1] === '\n')) && !inQuotes) {
            if (ch === '\r') i++;
            fields.push(current);
            return [fields, i + 1];
        } else {
            current += ch; i++;
        }
    }
    fields.push(current);
    return [fields, full.length];
}

function parseCSV(raw: string): Record<string, string>[] {
    const text = raw.replace(/^\uFEFF/, ''); // BOM temizle
    let offset = 0;
    const [headerFields, nextOffset] = parseCSVRow('', text, offset);
    offset = nextOffset;
    const headers = headerFields.map(h => h.trim());
    const rows: Record<string, string>[] = [];

    while (offset < text.length) {
        const [values, newOffset] = parseCSVRow('', text, offset);
        offset = newOffset;
        if (values.every(v => !v.trim())) continue;
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
        rows.push(row);
    }
    return rows;
}

// ─── YAML string kaçışı ───────────────────────────────────────────────────────
function ys(value: string): string {
    if (!value) return '""';
    if (value.includes('\n')) {
        return '|-\n' + value.split('\n').map(l => '  ' + l).join('\n');
    }
    const needsQuoting = /[:#\[\]{},|>&\*!?`@%'"\\]/.test(value) || /^\s|\s$/.test(value);
    if (needsQuoting) {
        return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return value;
}

// ─── İçerik Üreticileri ───────────────────────────────────────────────────────
function generateService(row: Record<string, string>): { filename: string; content: string } {
    const slug = row.slug || slugify(row.title || '');
    if (!slug) throw new Error('Başlık boş olamaz.');
    const content =
        `---\ntitle: ${ys(row.title)}\nicon: ${ys(row.icon || '')}\nshortDescription: ${ys(row.shortDescription || '')}\n---\n${row.content || ''}`;
    return { filename: `${slug}.mdoc`, content };
}

function generateProject(row: Record<string, string>): { filename: string; content: string } {
    const slug = row.slug || slugify(row.projectName || '');
    if (!slug) throw new Error('Proje adı boş olamaz.');
    const date = row.date || new Date().toISOString().split('T')[0];
    const content =
        `---\nprojectName: ${ys(row.projectName)}\nclient: ${ys(row.client || '')}\ndate: ${date}\ncategory: ${ys(row.category || '')}\ngallery: []\n---\n${row.description || ''}`;
    return { filename: `${slug}.mdoc`, content };
}

function generateBlog(row: Record<string, string>): { filename: string; content: string } {
    const slug = row.slug || slugify(row.title || '');
    if (!slug) throw new Error('Başlık boş olamaz.');
    const date = row.date || new Date().toISOString().split('T')[0];
    const tags = row.tags
        ? row.tags.split('|').map(t => t.trim()).filter(Boolean).map(t => `  - ${t}`).join('\n')
        : '';
    const tagsYaml = tags ? `tags:\n${tags}` : 'tags: []';
    const content =
        `---\ntitle: ${ys(row.title)}\ndate: ${date}\nauthor: ${ys(row.author || '')}\ncategory: ${ys(row.category || '')}\n${tagsYaml}\n---\n${row.body || ''}`;
    return { filename: `${slug}.mdoc`, content };
}

function generateTeam(row: Record<string, string>): { filename: string; content: string } {
    const slug = row.slug || slugify(row.name || '');
    if (!slug) throw new Error('İsim boş olamaz.');
    const json = JSON.stringify({
        name: row.name || '',
        role: row.role || '',
        order: parseInt(row.order || '0') || 0,
        socialLinkedin: row.socialLinkedin || '',
        socialTwitter: row.socialTwitter || '',
        socialInstagram: row.socialInstagram || '',
        socialEmail: row.socialEmail || '',
    }, null, 2);
    return { filename: `${slug}.json`, content: json };
}

// ─── GitHub API: Dosya oluştur / güncelle ─────────────────────────────────────
async function putGitHubFile(
    token: string, owner: string, repo: string,
    path: string, content: string, message: string
): Promise<{ ok: boolean; status: string }> {
    const encoded = btoa(encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
    ));

    // Mevcut dosyanın SHA'sını al (güncelleme için gerekli)
    let sha: string | undefined;
    const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'NetMimar-CMS' }
    });
    if (checkRes.ok) {
        const existing = await checkRes.json() as any;
        sha = existing.sha;
    }

    const body: Record<string, string> = { message, content: encoded };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'NetMimar-CMS',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (putRes.ok) {
        return { ok: true, status: sha ? 'Güncellendi' : 'Oluşturuldu' };
    }
    const err = await putRes.json() as any;
    return { ok: false, status: err.message || `HTTP ${putRes.status}` };
}

// ─── Koleksiyon ayarları ──────────────────────────────────────────────────────
const COLLECTIONS: Record<string, { basePath: string; generate: (r: Record<string, string>) => { filename: string; content: string } }> = {
    services: { basePath: 'src/content/services', generate: generateService },
    projects: { basePath: 'src/content/projects', generate: generateProject },
    blog:     { basePath: 'src/content/blog',     generate: generateBlog },
    team:     { basePath: 'src/content/team',     generate: generateTeam },
};

// ─── API Handler ──────────────────────────────────────────────────────────────
export const POST: APIRoute = async (context) => {
    const env = context.locals.runtime?.env ?? {};
    const token: string = env.GITHUB_TOKEN ?? import.meta.env.GITHUB_TOKEN ?? '';
    const owner: string = env.PUBLIC_REPO_OWNER ?? import.meta.env.PUBLIC_REPO_OWNER ?? '';
    const repo: string  = env.PUBLIC_REPO_NAME  ?? import.meta.env.PUBLIC_REPO_NAME  ?? '';

    if (!token || !owner || !repo) {
        return new Response(JSON.stringify({ error: 'GitHub ortam değişkenleri (GITHUB_TOKEN, PUBLIC_REPO_OWNER, PUBLIC_REPO_NAME) eksik.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return new Response(JSON.stringify({ error: 'Form verisi okunamadı.' }), { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const collection = (formData.get('collection') as string | null)?.trim();

    if (!file || !collection) {
        return new Response(JSON.stringify({ error: 'Dosya ve koleksiyon seçimi zorunludur.' }), { status: 400 });
    }

    const col = COLLECTIONS[collection];
    if (!col) {
        return new Response(JSON.stringify({ error: `Geçersiz koleksiyon: ${collection}` }), { status: 400 });
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
        return new Response(JSON.stringify({ error: 'CSV dosyası boş veya okunamadı.' }), { status: 400 });
    }

    const results: Array<{ row: string; ok: boolean; status: string }> = [];

    for (const row of rows) {
        const label = row.title || row.projectName || row.name || '(isimsiz)';
        let generated: { filename: string; content: string };

        try {
            generated = col.generate(row);
        } catch (e: any) {
            results.push({ row: label, ok: false, status: e.message || 'İçerik üretilemedi' });
            continue;
        }

        const filePath = `${col.basePath}/${generated.filename}`;
        const commitMsg = `İçerik eklendi: ${label}`;
        const result = await putGitHubFile(token, owner, repo, filePath, generated.content, commitMsg);
        results.push({ row: label, ...result });
    }

    return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
