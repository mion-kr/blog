#!/usr/bin/env python3
"""읽기 전용 트랜잭션에서 조건 일치 건수와 UPDATE 계획만 확인합니다. ANALYZE를 사용하지 않습니다."""
import argparse
import json
import os
import pathlib
import subprocess
import urllib.parse
from contentRevision import read_post
from contentSql import update_statement

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--original', required=True)
parser.add_argument('--revised', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args()
original = read_post(args.original)
revised = pathlib.Path(args.revised).read_text()
statement = update_statement(original, revised)
condition = statement.split('\nWHERE ', 1)[1]
url = urllib.parse.urlparse(os.environ['DATABASE_URL'])
env = os.environ.copy()
env.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432),
           PGDATABASE=urllib.parse.unquote(url.path[1:]),
           PGUSER=urllib.parse.unquote(url.username or ''),
           PGPASSWORD=urllib.parse.unquote(url.password or ''),
           PGCONNECT_TIMEOUT='10',
           PGSSLMODE=urllib.parse.parse_qs(url.query).get('sslmode', ['require'])[0],
           PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=15000')
sql = ('BEGIN READ ONLY;\nSELECT count(*) FROM public.posts WHERE ' + condition +
       ';\nEXPLAIN (FORMAT JSON)\n' + statement + ';\nROLLBACK;')
result = subprocess.run(['psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                        env=env, capture_output=True, text=True)
if result.returncode:
    raise SystemExit(f'읽기 전용 계획 조회 실패: 종료 코드 {result.returncode}; 비밀 보호를 위해 원문 오류를 출력하지 않습니다')
first_line, plan = result.stdout.strip().split('\n', 1)
if first_line != '1':
    raise SystemExit('동시 변경 또는 잘못된 대상: 조건 일치 건수가 1이 아닙니다')
report = {'slug': original['slug'], 'matchedRows': int(first_line),
          'executedUpdate': False, 'plan': json.loads(plan)}
with pathlib.Path(args.out).open('x') as f:
    pathlib.Path(args.out).chmod(0o600)
    json.dump(report, f, ensure_ascii=False, indent=2)
print(json.dumps({'slug': original['slug'], 'matchedRows': 1, 'executedUpdate': False}, ensure_ascii=False))
