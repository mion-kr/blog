#!/usr/bin/env python3
"""공식 조회 JSON을 비교하고 보존값을 포함한 요청 파일만 생성합니다. 네트워크 쓰기는 없습니다."""
import argparse
import hashlib
import json
import pathlib
import re

FIELDS = ('id', 'slug', 'title', 'content', 'excerpt', 'coverImage', 'published', 'createdAt', 'updatedAt')


def read_post(path):
    value = json.loads(pathlib.Path(path).read_text())
    if 'success' in value:
        if value['success'] is not True:
            raise ValueError('실패 응답입니다')
        value = value['data']
    for key in FIELDS:
        if key not in value:
            raise ValueError(f'원본 필드 누락: {key}')
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', value['slug']):
        raise ValueError('안전하지 않은 slug 경로')
    if not isinstance(value['content'], str) or not value['content'].strip():
        raise ValueError('본문이 비어 있습니다')
    if 'tags' not in value or not ('categoryId' in value or 'category' in value):
        raise ValueError('태그 또는 카테고리 정보가 필요합니다')
    return value


def stable(post):
    result = {key: post[key] for key in FIELDS}
    result['publishedAt'] = post.get('publishedAt')
    result['categoryId'] = post.get('categoryId') or (post.get('category') or {}).get('id')
    result['tagIds'] = sorted(tag['id'] for tag in post['tags'])
    result['authorId'] = post.get('authorId') or (post.get('author') or {}).get('id')
    return result


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def urls(content):
    return sorted(set(re.findall(r'https?://[^\s<>"\)]+', content)))


def media_urls(content):
    return sorted(set(re.findall(r'(?:!\[[^\]]*\]\(\s*|(?:src|poster)\s*=\s*["\'])(https?://[^\s"\')>]+)', content)))


def check_media(original, revised):
    if any(url not in revised for url in media_urls(original)):
        raise ValueError('기존 이미지·미디어 URL 제거 감지: 별도 검토가 필요합니다')
    if re.search(r'https?://[^\s]+/draft/', revised):
        raise ValueError('초안 이미지 경로는 공식 이미지 확정 처리가 필요합니다')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    prepare = sub.add_parser('prepare')
    prepare.add_argument('--original', required=True)
    prepare.add_argument('--current', required=True, help='적용 직전 공식 재조회 JSON')
    prepare.add_argument('--revised', required=True)
    prepare.add_argument('--out', required=True, help='새 출력 디렉터리; 기존 경로는 거부')
    verify = sub.add_parser('verify')
    verify.add_argument('--original', required=True)
    verify.add_argument('--after', required=True)
    verify.add_argument('--revised', required=True)
    args = parser.parse_args()
    original = read_post(args.original)
    revised = pathlib.Path(args.revised).read_text()
    if not revised.strip() or revised == original['content']:
        raise ValueError('빈 본문 또는 변경 없음')
    check_media(original['content'], revised)
    if args.command == 'prepare':
        current = read_post(args.current)
        if stable(original) != stable(current):
            raise ValueError('동시 변경 감지: 원본을 재검토하세요')
        out = pathlib.Path(args.out)
        out.mkdir(parents=True, exist_ok=False)
        # 기존 서비스가 미전달 excerpt/coverImage를 null로 바꾸므로 명시적으로 보존합니다.
        payload = {key: original[key] for key in ('excerpt', 'coverImage')}
        payload['content'] = revised
        report = {'slug': original['slug'], 'originalSha256': sha(original['content']),
                  'revisedSha256': sha(revised), 'removedUrls': sorted(set(urls(original['content'])) - set(urls(revised))),
                  'addedUrls': sorted(set(urls(revised)) - set(urls(original['content']))),
                  'warning': '적용 직전 비교는 원자적 잠금이 아닙니다. 편집 독점 후 공식 관리자 경로로 적용하세요.'}
        for name, data in [('backup.json', original), ('request.json', payload), ('review.json', report)]:
            path = out / name
            with path.open('x') as f:
                path.chmod(0o600)
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write('\n')
        print(json.dumps({'slug': original['slug'], 'files': ['backup.json', 'request.json', 'review.json']}, ensure_ascii=False))
    else:
        after = read_post(args.after)
        before_state, after_state = stable(original), stable(after)
        for state in (before_state, after_state):
            state.pop('content')
            state.pop('updatedAt')
        if before_state != after_state:
            raise ValueError('보존 필드 변경 감지')
        if after['content'] != revised:
            raise ValueError('적용 본문 불일치')
        print(json.dumps({'slug': after['slug'], 'result': '통과', 'sha256': sha(revised)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
