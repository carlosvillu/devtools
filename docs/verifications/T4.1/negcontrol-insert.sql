BEGIN;
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjIjoiQ0FOQVJZSFRUUDQxIiwic3ViIjoidmVy…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJjIjoiQ0FOQVJZTk9ORTQxIiwic3ViIjoidmVya…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Authorization: Bearer v2.local.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjIjoiQ0FOQVJZUEFTRVRPNDEiLCJ…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjIjoiQ0FOQVJZUEFERElORzQxIiwic3ViIjoi…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjIjoiQ0FOQVJZQ09PS0lFNDEiLCJzdWIiOiJ2Z…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /cb?id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjIjoiQ0FOQVJZUVVFUlk0MSIsInN1YiI6InZlcmlmaWVyIiwiZXhwIjoxNzk5O…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'POST /token HTTP/1.1
grant_type=refresh&id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjIjoiQ0FOQVJZRk9STTQxIiwic3ViI…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXIn0=.eyJjIjoiQ0FOQVJZUEFEMXg0MSIsInN1YiI6InZl…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
INSERT INTO history_entry (user_id, preview, input_kind, chain) SELECT id, 'GET /v1/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkoifQ==.eyJjIjoiQ0FOQVJZUEFEMng0MSIsInN1YiI6InZl…', 'text', '[]'::jsonb FROM "user" WHERE email='verifier-t41@example.test';
COMMIT;
