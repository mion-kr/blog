import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT, jwtVerify, EncryptJWT, jwtDecrypt } from 'jose';

// 이번 글의 검증 예제 전용 키와 클레임이며 운영 계정·키를 사용하지 않습니다.
const { privateKey, publicKey } = await generateKeyPair('ES256');
const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
const issuer = 'urn:example:article-issuer';
const audience = 'urn:example:article-reader';
const options = { issuer, audience, algorithms: ['ES256'],
  requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat'], typ: 'JWT' };
const token = await new SignJWT({ purpose: 'article-verification' })
  .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
  .setIssuer(issuer).setAudience(audience).setSubject('article-example')
  .setIssuedAt().setExpirationTime('2m').sign(privateKey);
const verified = await jwtVerify(token, publicKey, options);
assert.equal(verified.payload.sub, 'article-example');
const parts = token.split('.');
const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
assert.equal(decoded.purpose, 'article-verification'); // 디코딩은 검증이 아닙니다.
parts[1] = Buffer.from(JSON.stringify({ ...decoded, sub: 'changed' })).toString('base64url');
await assert.rejects(jwtVerify(parts.join('.'), publicKey, options), { code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' });
await assert.rejects(jwtVerify(token, publicKey, { ...options, audience: 'urn:example:other-reader' }), { code: 'ERR_JWT_CLAIM_VALIDATION_FAILED' });
await assert.rejects(jwtVerify(token, publicKey, { ...options, currentDate: new Date((verified.payload.exp + 1) * 1000) }), { code: 'ERR_JWT_EXPIRED' });
const encrypted = await new EncryptJWT({ purpose: 'article-verification' })
  .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', typ: 'JWT' })
  .setIssuer(issuer).setAudience(audience).setSubject('article-example')
  .setIssuedAt().setExpirationTime('2m').encrypt(encryptionKey);
const decryptOptions = { issuer, audience, typ: 'JWT',
  requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat'],
  keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] };
assert.equal((await jwtDecrypt(encrypted, encryptionKey, decryptOptions)).payload.sub, 'article-example');
const encryptedParts = encrypted.split('.');
assert.equal(encryptedParts.length, 5);
assert.equal(encryptedParts[1], '');
const ciphertext = Buffer.from(encryptedParts[3], 'base64url');
ciphertext[0] ^= 1;
encryptedParts[3] = ciphertext.toString('base64url');
await assert.rejects(jwtDecrypt(encryptedParts.join('.'), encryptionKey, decryptOptions), { code: 'ERR_JWE_DECRYPTION_FAILED' });
console.log('통과: JWS 검증·디코딩, 변조/대상/만료 거부, JWE 복호화·변조 거부');
