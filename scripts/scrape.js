#!/usr/bin/env node
/**
 * Scrape Penon category pages and produce site/data/items.json
 * - Targets <img class~="c-item__img"> tags and extracts src/alt
 * - Dependency-free (Node built-ins only)
 * - Single page per category (no pagination)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  { name: 'artpen', url: 'https://shop.penon.co.jp/view/category/artpen' },
  { name: 'magnet', url: 'https://shop.penon.co.jp/view/category/magnet' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          fetchPage(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed: ${res.statusCode}`));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://shop.penon.co.jp' + url;
  return url;
}

function extractAttr(tag, attr) {
  const re = new RegExp(attr + '\\s*=\\s*([\"\'])(.*?)\\1', 'i');
  const m = tag.match(re);
  return m ? m[2] : '';
}

function parseListing(html, category) {
  const items = [];
  const imgRe = /<img[^>]*class=["'][^"']*c-item__img[^"']*["'][^>]*>/gi;
  const tags = html.match(imgRe) || [];
  for (const tag of tags) {
    const alt = extractAttr(tag, 'alt').trim();
    let src =
      extractAttr(tag, 'src') ||
      extractAttr(tag, 'data-src') ||
      extractAttr(tag, 'data-original') ||
      extractAttr(tag, 'data-srcset');
    src = (src || '').split(' ').filter(Boolean)[0]; // handle srcset first URL
    src = resolveUrl(src);
    if (!src) continue;
    items.push({ category, alt, src });
  }
  return items;
}

async function main() {
  const all = [];
  for (const c of CATEGORIES) {
    process.stderr.write(`Fetching ${c.name}...\n`);
    const html = await fetchPage(c.url);
    const items = parseListing(html, c.name);
    process.stderr.write(` - found ${items.length} items\n`);
    all.push(...items);
  }

  const outDir = path.join(__dirname, '..', 'site', 'data');
  const outPath = path.join(outDir, 'items.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
  process.stderr.write(`Wrote ${outPath} (${all.length} records)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

