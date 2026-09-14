import os, subprocess, pathlib, json, urllib.parse, argparse
parser=argparse.ArgumentParser(description="공개 글 원문을 읽기 전용으로 백업합니다")
parser.add_argument("--out", required=True)
args=parser.parse_args()
root=pathlib.Path(args.out);root.mkdir(parents=True, exist_ok=False)
url=os.environ['DATABASE_URL']; parsed=urllib.parse.urlparse(url)
env=os.environ.copy()
for key,val in {'PGHOST':parsed.hostname,'PGPORT':str(parsed.port or 5432),'PGDATABASE':urllib.parse.unquote(parsed.path[1:]),'PGUSER':urllib.parse.unquote(parsed.username or ''),'PGPASSWORD':urllib.parse.unquote(parsed.password or ''),'PGCONNECT_TIMEOUT':'10','PGOPTIONS':'-c default_transaction_read_only=on -c statement_timeout=15000','PGSSLMODE':urllib.parse.parse_qs(parsed.query).get('sslmode',['require'])[0]}.items():env[key]=val
sql='''BEGIN READ ONLY;
SELECT json_build_object('id',p.id,'slug',p.slug,'title',p.title,'content',p.content,'excerpt',p.excerpt,'coverImage',p.cover_image,'published',p.published,'createdAt',p.created_at,'updatedAt',p.updated_at,'publishedAt',p.published_at,'categoryId',p.category_id,'authorId',p.author_id,'viewCount',p.view_count,'tags',COALESCE((SELECT json_agg(json_build_object('id',t.id,'name',t.name,'slug',t.slug) ORDER BY t.id) FROM post_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.post_id=p.id),'[]'::json)) FROM posts p WHERE p.published=true ORDER BY p.slug;
COMMIT;'''
r=subprocess.run(['psql','-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-c',sql],env=env,capture_output=True,text=True)
if r.returncode:
 print('읽기 전용 조회 실패',r.returncode, 'DNS' if 'translate host' in r.stderr else 'connection' if 'connection' in r.stderr else 'query');raise SystemExit(1)
posts=[json.loads(line) for line in r.stdout.splitlines() if line.startswith('{')]
for p in posts:
 path=root/(p['slug']+'.json')
 with path.open('x') as f:
  path.chmod(0o600);json.dump(p,f,ensure_ascii=False,indent=2);f.write('\n')
print('읽기 전용 백업 완료',len(posts),'개')
