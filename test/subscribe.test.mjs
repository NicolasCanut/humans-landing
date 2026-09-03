import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/subscribe.js';

const mockRes = () => {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.setHeader = (k, v) => ((res.headers[k] = v), res);
  return res;
};
const call = (body, { method = 'POST', ip = '10.0.0.1' } = {}) => {
  const res = mockRes();
  return handler(
    { method, headers: { 'x-forwarded-for': ip }, socket: {}, body },
    res,
  ).then(() => res);
};

test('subscribe: rejects non-POST', async () => {
  const res = await call({}, { method: 'GET' });
  assert.equal(res.statusCode, 405);
});

test('subscribe: honeypot -> 200 but not stored', async () => {
  const res = await call({ email: 'real@person.com', hp: 'i am a bot' }, { ip: '1.1.1.1' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.stored, false);
});

test('subscribe: invalid email -> 400', async () => {
  for (const bad of ['', 'nope', 'a@b', 'x@y.']) {
    const res = await call({ email: bad }, { ip: '2.2.2.2' });
    assert.equal(res.statusCode, 400, `"${bad}" should be 400`);
  }
});

test('subscribe: valid email with no BREVO key -> 200 accepted-not-stored', async () => {
  const prev = process.env.BREVO_API_KEY;
  delete process.env.BREVO_API_KEY;
  const res = await call({ email: 'someone@example.org' }, { ip: '3.3.3.3' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.stored, false);
  if (prev !== undefined) process.env.BREVO_API_KEY = prev;
});

test('subscribe: never fakes success on a hard failure path', async () => {
  // a request that passes validation but the honeypot check means "drop":
  // the response body must not claim stored:true
  const res = await call({ email: 'ok@ok.com', hp: 'x' }, { ip: '4.4.4.4' });
  assert.notEqual(res.body?.stored, true);
});

test('subscribe: per-IP rate limit kicks in after a burst', async () => {
  const ip = '9.9.9.9';
  let last;
  for (let i = 0; i < 7; i++) last = await call({ email: `u${i}@ex.com` }, { ip });
  assert.equal(last.statusCode, 429);
});
