"""네트워크 없는 전용 PostgreSQL 컨테이너에서 실행하는 설명용 행 잠금 실험."""
import subprocess

container = 'adsense-experience-pg-20260914'
command = ['docker', 'exec', '-i', container, 'psql', '-X', '-U', 'postgres']

def sql(statement):
    return subprocess.run(command + ['-v', 'ON_ERROR_STOP=1', '-At', '-c', statement],
                          text=True, capture_output=True)

setup = sql('CREATE TABLE lock_example (id bigint PRIMARY KEY, remaining integer NOT NULL CHECK (remaining >= 0)); INSERT INTO lock_example VALUES (1, 1);')
assert setup.returncode == 0, setup.stderr
session_a = subprocess.Popen(command + ['-At', '-v', 'ON_ERROR_STOP=1'],
                             stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, text=True, bufsize=1)
try:
    session_a.stdin.write('BEGIN; SELECT remaining FROM lock_example WHERE id=1 FOR UPDATE;\n\\echo LOCK_HELD\n')
    session_a.stdin.flush()
    while True:
        line = session_a.stdout.readline()
        if line.strip() == 'LOCK_HELD':
            break
        assert line, 'session A ended before taking the lock'
    timeout = sql("SET lock_timeout='500ms'; SELECT remaining FROM lock_example WHERE id=1 FOR UPDATE;")
    assert timeout.returncode != 0 and 'lock timeout' in timeout.stderr, timeout
    print('B while A holds lock: lock timeout')
    session_a.stdin.write('UPDATE lock_example SET remaining=remaining-1 WHERE id=1 AND remaining>0; COMMIT;\n\\q\n')
    session_a.stdin.flush()
    _, errors = session_a.communicate(timeout=10)
    assert session_a.returncode == 0, errors
    after = sql('BEGIN; SELECT remaining FROM lock_example WHERE id=1 FOR UPDATE; UPDATE lock_example SET remaining=remaining-1 WHERE id=1 AND remaining>0 RETURNING remaining; COMMIT;')
    assert after.returncode == 0, after.stderr
    assert 'UPDATE 0' in after.stdout, after.stdout
    print('B after A commits:\n' + after.stdout.strip())
    final = sql('SELECT remaining FROM lock_example WHERE id=1;')
    assert final.stdout.strip() == '0'
    print('final remaining: 0')
finally:
    if session_a.poll() is None:
        session_a.terminate()
    cleanup = sql('DROP TABLE lock_example;')
    assert cleanup.returncode == 0, cleanup.stderr
