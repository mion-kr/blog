import assert from 'node:assert/strict';

export function parseTitle(value) {
  if (typeof value !== 'string') {
    throw new TypeError('제목은 문자열이어야 합니다.');
  }
  const title = value.trim();
  if (!title) throw new Error('제목을 입력해주세요.');
  return title;
}

const form = new FormData();
form.set('title', '  검증 예제  ');
assert.equal(parseTitle(form.get('title')), '검증 예제');
console.log('문자열: 검증 예제');
for (const value of [null, 123, new File(['본문'], 'title.txt')]) {
  assert.throws(() => parseTitle(value), TypeError);
}
assert.throws(() => parseTitle('   '), /제목을 입력/);
console.log('누락·숫자·파일·공백: 거절');
form.set('title', new File(['본문'], 'title.txt'));
assert.equal(String(form.get('title')), '[object File]');
console.log('String(File): [object File]');
