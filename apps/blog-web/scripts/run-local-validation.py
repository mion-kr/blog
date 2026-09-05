"""Doppler local 설정과 임시 PostgreSQL로 실제 웹/API 검증 서버를 실행합니다.

운영 DB를 사용하지 않으며 종료 시 이 스크립트가 만든 서버와 DB만 정리합니다.
"""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
CONTAINER = 'mion-blog-web-validation'
LOG_ROOT = Path.home() / '.cache' / 'mion-blog-web-validation'
processes = []
created = False


def local_config(name):
    result = subprocess.run(
        ['doppler', 'secrets', 'download', '--project', 'mion-blog', '--config', name,
         '--no-file', '--format', 'json'], capture_output=True, check=True, text=True,
    )
    return {**os.environ, **json.loads(result.stdout)}


def launch(command, env, log_name):
    log = open(LOG_ROOT / log_name, 'w')
    os.chmod(LOG_ROOT / log_name, 0o600)
    child = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=log, start_new_session=True)
    processes.append(child)


try:
    for port in [3120, 3121, 55432]:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', port))
    api_env = local_config('local_api')
    web_env = local_config('local_web')
    password = secrets.token_hex(32)
    caller_secret = secrets.token_hex(32)
    docker_env = {**os.environ, 'POSTGRES_PASSWORD': password}
    subprocess.run(['docker', 'run', '--rm', '-d', '--name', CONTAINER,
                    '-e', 'POSTGRES_PASSWORD', '-p', '127.0.0.1:55432:5432',
                    'postgres:17-alpine'], env=docker_env, check=True, stdout=subprocess.DEVNULL)
    created = True
    for _ in range(30):
        ready = subprocess.run(['docker', 'exec', CONTAINER, 'pg_isready', '-U', 'postgres'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError('임시 PostgreSQL 기동 실패')
    for migration in sorted((ROOT / 'packages/database/migrations').glob('*.sql')):
        subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                       input=migration.read_text(), text=True, check=True, stdout=subprocess.DEVNULL)
    # 이 컨테이너 안에만 존재하는 실제 개발 데이터이며 외부 DB에서 실행하지 않습니다.
    seed = """
    INSERT INTO users (id,email,name,google_id) VALUES
      ('web-validation-author','web-validation@example.invalid','로컬 검증 작성자','web-validation');
    INSERT INTO categories (id,name,slug,post_count) VALUES
      ('web-validation-category','로컬 검증','web-validation',15);
    INSERT INTO tags (id,name,slug,post_count) VALUES
      ('web-validation-tag','검증 태그','web-validation',15);
    INSERT INTO posts (id,title,slug,content,excerpt,published,category_id,author_id,published_at,view_count)
      SELECT 'web-validation-'||n, '로컬 경로 검증 '||n, 'web-validation-'||n,
      '# 로컬 검증 본문 '||n, '실제 개발 DB 경로 검증', true,
      'web-validation-category','web-validation-author',now()-n*interval '1 day',n
      FROM generate_series(1,15) AS n;
    INSERT INTO post_tags (post_id,tag_id)
      SELECT id,'web-validation-tag' FROM posts;
    """
    subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                   input=seed, text=True, check=True, stdout=subprocess.DEVNULL)
    database_url = f'postgresql://postgres:{password}@127.0.0.1:55432/postgres'
    for env in [api_env, web_env]:
        for key in ['VERCEL', 'VERCEL_OIDC_TOKEN', 'NEXT_PUBLIC_API_URL']:
            env.pop(key, None)
        env.update(NODE_ENV='development', DATABASE_URL=database_url,
                   DATABASE_MIGRATION_URL=database_url, BLOG_API_LOCAL_SECRET=caller_secret,
                   BLOG_API_URL='http://127.0.0.1:3121', NEXTAUTH_URL='http://localhost:3120',
                   NEXT_PUBLIC_SITE_URL='http://localhost:3120', LOG_LEVEL='silent')
    api_env['PORT'] = '3121'
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    launch(['pnpm', '--filter', 'blog-api', 'exec', 'nest', 'start'], api_env, 'api.log')
    launch(['pnpm', '--filter', 'blog-web', 'exec', 'next', 'dev', '--turbopack', '--port', '3120'],
           web_env, 'web.log')
    print('실제 로컬 검증 실행: web=3120 API=3121 PostgreSQL=55432; Ctrl-C로 전용 자원 정리', flush=True)
    while all(child.poll() is None for child in processes):
        time.sleep(1)
    raise RuntimeError('검증 서버가 종료되었습니다. 전용 로그를 확인하세요.')
except KeyboardInterrupt:
    pass
finally:
    import signal
    for child in processes:
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
    if created:
        subprocess.run(['docker', 'stop', CONTAINER], stdout=subprocess.DEVNULL, check=False)
