import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the shared homepage advertises the same public preview to Open Graph and X crawlers', () => {
  const head = readFileSync(new URL('../index.html', import.meta.url), 'utf8').split('</head>')[0];
  const metadata = new Map();
  let canonical;
  for (const [tag] of head.matchAll(/<(?:link|meta)\b[^>]*>/gi)) {
    const attrs = {};
    for (const [, name, , value] of tag.matchAll(/([\w:-]+)=(["'])(.*?)\2/g)) attrs[name] = value;
    if (attrs.rel === 'canonical') canonical = new URL(attrs.href);
    if (attrs.content) metadata.set(attrs.property || attrs.name, attrs.content);
  }
  assert.equal(canonical.protocol, 'https:');
  assert.equal(metadata.get('og:url'), canonical.href);
  assert.equal(metadata.get('twitter:card'), 'summary_large_image');
  const image = new URL(metadata.get('og:image'));
  assert.equal(image.origin, canonical.origin);
  assert.equal(image.pathname, '/social/pocket-garden.png');
  for (const field of ['image', 'image:alt', 'title', 'description']) {
    assert.ok(metadata.get('og:' + field)?.trim(), 'Missing Open Graph ' + field);
    assert.equal(metadata.get('twitter:' + field), metadata.get('og:' + field));
  }
  const png = readFileSync(new URL('../public' + image.pathname, import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(metadata.get('og:image:type'), 'image/png');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.deepEqual([width, height], [1200, 630]);
  assert.equal(metadata.get('og:image:width'), String(width));
  assert.equal(metadata.get('og:image:height'), String(height));
});
