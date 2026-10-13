const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('supabase-js z CDN: dokładna wersja i suma kontrolna (SRI)', () => {
  const tag = html.match(/<script[^>]*supabase-js[^>]*><\/script>/);
  assert.ok(tag, 'brak skryptu supabase-js');
  assert.match(tag[0], /supabase-js@\d+\.\d+\.\d+\//, 'wersja musi być przypięta (x.y.z)');
  assert.match(tag[0], /integrity="sha384-[A-Za-z0-9+/=]+"/, 'brak atrybutu integrity');
  assert.match(tag[0], /crossorigin="anonymous"/, 'SRI wymaga crossorigin="anonymous"');
});
