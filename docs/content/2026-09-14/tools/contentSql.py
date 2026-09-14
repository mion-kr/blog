#!/usr/bin/env python3
"""검토용 조건부 SQL 생성 전용. 데이터베이스에 접속하지 않습니다."""
import argparse
import base64
import json
import pathlib
from contentRevision import read_post, check_media


def sql_text(value):
    encoded = base64.b64encode(value.encode()).decode()
    return f"convert_from(decode('{encoded}', 'base64'), 'UTF8')"


def update_statement(original, revised):
    check_media(original['content'], revised)
    conditions = []
    columns = {'id': 'id', 'slug': 'slug', 'content': 'content', 'updatedAt': 'updated_at',
               'title': 'title', 'excerpt': 'excerpt', 'coverImage': 'cover_image',
               'published': 'published', 'createdAt': 'created_at', 'publishedAt': 'published_at',
               'categoryId': 'category_id', 'authorId': 'author_id'}
    for key, column in columns.items():
        if key not in original:
            raise ValueError(f'SQL 생성에 필요한 정확한 DB 백업 필드 누락: {key}')
        value = original[key]
        if value is None:
            expression = 'NULL'
        elif isinstance(value, bool):
            expression = 'TRUE' if value else 'FALSE'
        else:
            expression = sql_text(value)
            if key in ('createdAt', 'updatedAt', 'publishedAt'):
                expression += '::timestamp'
        conditions.append(f'{column} IS NOT DISTINCT FROM {expression}')
    tag_ids = ', '.join(sql_text(tag['id']) for tag in sorted(original['tags'], key=lambda t: t['id']))
    conditions.append("ARRAY(SELECT tag_id FROM public.post_tags WHERE post_id = public.posts.id ORDER BY tag_id) = ARRAY[" + tag_ids + "]::text[]")
    return (f"UPDATE public.posts SET content = {sql_text(revised)}, updated_at = timezone('UTC', CURRENT_TIMESTAMP)\n"
            + 'WHERE ' + '\nAND '.join(conditions))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original')
    parser.add_argument('--revised')
    parser.add_argument('--manifest', help='original/revised 절대 경로 객체의 JSON 배열')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    if args.manifest:
        if args.original or args.revised:
            parser.error('--manifest와 개별 파일 옵션은 함께 사용할 수 없습니다')
        import subprocess
        entries = json.loads(pathlib.Path(args.manifest).read_text())
        if not isinstance(entries, list) or not entries:
            parser.error('비어 있지 않은 배열이 필요합니다')
        root = pathlib.Path(args.out)
        root.mkdir(parents=True, exist_ok=False)
        for entry in entries:
            if not all(pathlib.Path(entry[k]).is_absolute() for k in ('original', 'revised')):
                parser.error('manifest 파일 경로는 절대 경로여야 합니다')
            post = read_post(entry['original'])
            subprocess.run(['python3', str(pathlib.Path(__file__).resolve()), '--original', entry['original'],
                            '--revised', entry['revised'], '--out', str(root / post['slug'])], check=True)
        return
    if not args.original or not args.revised:
        parser.error('--original과 --revised가 필요합니다')
    original = read_post(args.original)
    revised = pathlib.Path(args.revised).read_text()
    if not revised.strip() or revised == original['content']:
        raise ValueError('빈 본문 또는 변경 없음')
    statement = update_statement(original, revised)
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=False)
    plan = 'BEGIN READ ONLY;\nEXPLAIN (FORMAT JSON)\n' + statement + ';\nROLLBACK;\n'
    apply = ("-- 검토용: 실행하면 실제 UPDATE를 시도합니다. 이 Dispatch에서는 실행 금지.\n"
             "-- 마지막 ROLLBACK은 기본 보호장치이며 사후 승인 없이 COMMIT으로 바꾸지 않습니다.\n"
             "BEGIN ISOLATION LEVEL SERIALIZABLE;\nSET LOCAL TIME ZONE 'UTC';\nSET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '15s';\n"
             "DO $content_revision$\nDECLARE affected integer; before_state jsonb; after_state jsonb;\nBEGIN\n"
             + "SELECT to_jsonb(p) - 'content' - 'updated_at' - 'view_count' INTO before_state FROM public.posts p WHERE id = "
             + sql_text(original['id']) + " AND slug = " + sql_text(original['slug']) + " FOR UPDATE;\n"
             + statement + ";\n"
             "GET DIAGNOSTICS affected = ROW_COUNT;\n"
             "IF affected <> 1 THEN RAISE EXCEPTION 'content revision conflict: % rows', affected; END IF;\n"
             "SELECT to_jsonb(p) - 'content' - 'updated_at' - 'view_count' INTO after_state FROM public.posts p WHERE id = "
             + sql_text(original['id']) + ";\n"
             + "IF before_state IS DISTINCT FROM after_state THEN RAISE EXCEPTION 'preserved fields changed'; END IF;\n"
             + "RAISE NOTICE 'content revision verified: % row', affected;\n"
             + "END;\n$content_revision$;\nROLLBACK;\n")
    for name, value in [('explain.sql', plan), ('review-only.sql', apply)]:
        with (out/name).open('x') as f:
            (out/name).chmod(0o600)
            f.write(value)
    print(json.dumps({'slug': original['slug'], 'files': ['explain.sql', 'review-only.sql']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
