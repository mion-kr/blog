\set ON_ERROR_STOP on
SET TIME ZONE 'UTC';
SELECT '2026-09-09 09:00:00+09'::timestamptz AS utc_value;
SET TIME ZONE 'Asia/Seoul';
SELECT '2026-09-09 00:00:00+00'::timestamptz AS seoul_value;
SET TIME ZONE 'UTC';
SELECT local_time,
       local_time AT TIME ZONE 'Europe/Amsterdam' AS instant,
       (local_time AT TIME ZONE 'Europe/Amsterdam')
         AT TIME ZONE 'Europe/Amsterdam' AS round_trip
FROM (VALUES
  (timestamp '2026-03-29 02:30:00'),
  (timestamp '2026-10-25 02:30:00')
) AS cases(local_time);
SELECT timestamptz '2026-10-25 02:30:00+02' AS earlier,
       timestamptz '2026-10-25 02:30:00+01' AS later;
