import assert from 'node:assert/strict';
import test from 'node:test';
import { safeReturnPath, sameOriginMutation } from './paths.ts';

test('auth redirects stay on Cotiza and avoid authentication loops', () => {
  assert.equal(safeReturnPath('/app'), '/app');
  assert.equal(safeReturnPath('/p/abc?mode=preview#detalle'), '/p/abc?mode=preview#detalle');
  for (const value of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2f%2fevil.test', '/%252f%252fevil.test', '/auth/callback', '/auth/signout?next=/app', '/acceso/registro', '/callback', '/signin-with-chatgpt', '/app\nLocation:evil']) {
    assert.equal(safeReturnPath(value), '/app', String(value));
  }
});

test('auth mutations require the exact current origin', () => {
  const url = 'https://cotiza.example/auth/signin';
  assert.equal(sameOriginMutation(new Request(url, { method: 'POST', headers: { origin: 'https://cotiza.example', 'sec-fetch-site': 'same-origin' } })), true);
  for (const headers of [{}, { origin: 'https://evil.test' }, { origin: 'null' }, { origin: 'https://cotiza.example', 'sec-fetch-site': 'cross-site' }]) {
    assert.equal(sameOriginMutation(new Request(url, { method: 'POST', headers })), false);
  }
});
