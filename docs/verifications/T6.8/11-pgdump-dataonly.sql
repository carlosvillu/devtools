--
-- PostgreSQL database dump
--

\restrict 0gMfNc4dOa14yAXIgg4IIzAg8j5Ao3j42vdDGfMdvOU0BrFkMTLvnTM4y0eONxr

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: devtools
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	d2054d18c793548b7665c41e547766fd5e7f49f8856cb27fb276a4484b505165	1784393302811
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: devtools
--

COPY public."user" (id, email, password_hash, created_at) FROM stdin;
3e27bf87-0307-4101-93db-db5cfd4e4514	verifier-t21-1784446211@example.com	scrypt$ln=16384,r=8,p=1$4vDvQ80ljU2QzqKse9zlBQ==$BwD9DgwMfHpCtA0b24o2UdhmoxukXZ+tK5TE4Bm2EB+l06KkvdYE5mib1ijpWNEH8M16j4bWkwyevW8fc/KtLA==	2026-07-19 07:30:12.537551+00
4ed5eae0-7cf6-4679-80ba-f033f7fa1936	verifier-t21-d6-1784446410@example.com	scrypt$ln=16384,r=8,p=1$Rm1y+F585okD2nPmTtZgwg==$se2JzJkyPOi2xSCVdwIzpSogh1FpbRLovK95NQan/bbMlIF6yDM8DY2rmeLGkg4/9Sv0iYCTHPyJ435v5U/AHw==	2026-07-19 07:33:31.049442+00
be38ac4e-d01b-466d-a2cb-d2f780fa6748	pausetest-3286@example.com	scrypt$ln=16384,r=8,p=1$/hGXDg+gOWYAz/xU7kyWIA==$Xu5Tsyc3/BepOrN2aoniyIsQsRPrMPDodyw36lnwmZtHkd515btu/I4KYrSVTZJx8aPEn3dPuyza2gBfjQICrA==	2026-07-19 07:48:11.619039+00
b608e0c3-94f4-48cb-b4be-95a25f99009e	verifier-t21-fix-1784448363@example.com	scrypt$ln=16384,r=8,p=1$yJQhmOR4DTe1ZoNTsZIOJQ==$2K8Nv/GU1/0BidczQaXgY/bqHshwM/mjqBfq7Qw3jWv9j/x3cw195Hh33r7p+8GeqCCDfm4NLUZwwC54YNfdEA==	2026-07-19 08:06:04.142471+00
5884d494-a421-4a00-8cdd-3032e2f561da	verifier-t21-stop-1784448438@example.com	scrypt$ln=16384,r=8,p=1$WIxZA+6U7vVxONyE+FpnXA==$pAN+r2S0XjFUaoRZtqvKy7RC9P/VSe73ptJDtkaeLJqO255dLSZFeWGRmoKsl55Onx66ZWnyV7KaOEGlqTIU1Q==	2026-07-19 08:07:18.981599+00
564ed890-7445-4755-99ba-a734dc4d85fe	alice-t22@test-not-a-secret.dev	scrypt$ln=16384,r=8,p=1$lb7anDPBfTFPhEew6NoqaQ==$rmubpAOPC4IWNVG2V1wgh+sVQ8/d+G0hfnnd8y9vOA7p6Ut6o/SJC2mVNEIvD+5RhmgHkvZQXuuRx1oaRImrhA==	2026-07-19 09:55:30.330145+00
b7557b06-971e-44d4-a68d-6654c58912a5	bob-t22@test-not-a-secret.dev	scrypt$ln=16384,r=8,p=1$Bb2b12AkDYbBSdCVH7dnDw==$2Hd6725PxhIhbccguC1Vr61yYnsXb/0Ov44XIwUDOqfs07NumG6wcYR3fSg8+SltJ+3eTdH/98gSotb82UUicQ==	2026-07-19 10:00:18.303683+00
899ad21b-c2dd-4c95-b7cb-8158cb4c2f8d	t23-verifier-1784461614@e2e.local	scrypt$ln=16384,r=8,p=1$7RBk3S1OpmWU86Hl9MCIpw==$kpivp6uvZ9F+p5dAV7XHZeBApoPz96kalSpqxBFHPx6AtB8ZdHNsEZhcbp8k6d9b7naYHe+UBD1rvbnfgXnCKQ==	2026-07-19 11:47:09.244394+00
881761ba-b522-40a0-9965-29cf58722a3a	verifier-t24@example.com	scrypt$ln=16384,r=8,p=1$31MtIfjt5mNT92smSSDb6g==$DunlfnVffEzROSe70pI7kyBEFFWrP844MefKwoULfnnS1cMqyD0pTz98iJvT7FFAFlpAsK3W/0ESqevwMdFeQA==	2026-07-19 18:31:24.347967+00
6c32275f-e47b-4842-9b85-f8c70423e2e8	verifier-t24-round2@example.com	scrypt$ln=16384,r=8,p=1$ChIB4qUO2bMBig9jfnmLtw==$BsTftvaSyJqUnej+BRNgm0IUff266or37HQmqE8By5VHMg2HJdl7g9nvgoAApAWM1VTb3b310nc0lzDObR33cw==	2026-07-19 19:03:06.558276+00
6331be67-230f-4757-bdf0-8cfff1ea555c	t54-cua-1784627101@e2e.local	scrypt$ln=16384,r=8,p=1$bR4ng+rQRzwFGTXKUsB4zA==$PAWGsxrFOKWiaupnbDYy36nw+Cd+ItuP6iqe4BKrHISr83gXwsh6+fhTdQO9yNo/TdU2kOezZrWzzXMZBKOPyQ==	2026-07-21 09:45:16.23625+00
aac77aa2-f68d-40b2-a5ff-fdb5af841ccf	verifier-t55@example.com	scrypt$ln=16384,r=8,p=1$m5cgaXJxJWxu6SlA3yQUaw==$LXYpIC9Xf6D10Ad1Nshuq1y6ro89GWqeRcLBraMNCKHvkjzcT26qAgGZZ1cQkCbXXbPuMh8y+y8msbQ9GuiCPw==	2026-07-21 11:37:46.57127+00
\.


--
-- Data for Name: history_entry; Type: TABLE DATA; Schema: public; Owner: devtools
--

COPY public.history_entry (id, user_id, preview, input_kind, chain, created_at) FROM stdin;
c9bbf357-1235-436c-9173-d668aa0f7804	3e27bf87-0307-4101-93db-db5cfd4e4514	Bearer eyJhbGciOiJIUzI1NiJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 07:30:22.683537+00
214af5c4-a684-4bf0-8880-6ef9734e99f6	4ed5eae0-7cf6-4679-80ba-f033f7fa1936	Bearer eyJhbGciOiJIUzI1NiJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 07:34:24.447308+00
7b3ee0b8-a007-4677-ac5d-df6533e66b96	b608e0c3-94f4-48cb-b4be-95a25f99009e	Bearer eyJhbGciOiJIUzI1NiJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 08:06:44.433548+00
eaa6a7ca-2d7b-4592-a624-86c2ab4bea6b	564ed890-7445-4755-99ba-a734dc4d85fe	us-500900	text	[]	2026-07-19 11:00:00.5009+00
2bd84d9a-1c37-4a9d-88e5-c39304ac77b9	564ed890-7445-4755-99ba-a734dc4d85fe	us-500500	text	[]	2026-07-19 11:00:00.5005+00
6091710a-1f28-4014-b751-d3bf78646bfa	564ed890-7445-4755-99ba-a734dc4d85fe	us-500100	text	[]	2026-07-19 11:00:00.5001+00
b24800d1-e08b-4387-a3c3-b1ce64a27ca9	564ed890-7445-4755-99ba-a734dc4d85fe	f-11:00:01.100000	text	[]	2026-07-19 11:00:01.1+00
f6edae69-903e-42d7-aaca-70db2a68727c	564ed890-7445-4755-99ba-a734dc4d85fe	f-11:00:02.200000	text	[]	2026-07-19 11:00:02.2+00
f6ce73b8-0a7a-45d5-a003-f045cfc45c82	564ed890-7445-4755-99ba-a734dc4d85fe	f-11:00:03.300000	text	[]	2026-07-19 11:00:03.3+00
a79c3e2b-0326-4d0d-b69c-d3e8c476a677	899ad21b-c2dd-4c95-b7cb-8158cb4c2f8d	1700000000	unix_timestamp	[{"kind": "unix_timestamp", "transformId": "timestamp.to_iso"}, {"kind": "text", "transformId": null}]	2026-07-19 11:47:55.76675+00
1c1fa11b-02cf-4883-acae-ceb160ddd878	881761ba-b522-40a0-9965-29cf58722a3a	… (28 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 18:31:50.221275+00
f2be3de9-f26d-4fe9-8c68-377f6d3b3b4e	881761ba-b522-40a0-9965-29cf58722a3a	{"api_key":…,"port":…,"admin":…,"note":…}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:32:03.150178+00
f72749f6-f547-4fd1-a654-e893fd3748d8	881761ba-b522-40a0-9965-29cf58722a3a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:32:17.431931+00
3702167d-9809-4768-b8a2-b98e7b0b2b37	881761ba-b522-40a0-9965-29cf58722a3a	… (27 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 18:33:05.792457+00
59fa9d44-67ec-4547-ad50-aa42e0d53ee4	881761ba-b522-40a0-9965-29cf58722a3a	… (27 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 18:33:06.384694+00
5701a218-d9b4-4389-b6fe-05a21d9abbfe	881761ba-b522-40a0-9965-29cf58722a3a	{"pw":"leakme123",}	text	[{"kind": "text", "transformId": null}]	2026-07-19 18:33:06.957568+00
7d0a29b8-350c-4dff-a8b9-c5b636a5c7d3	881761ba-b522-40a0-9965-29cf58722a3a	"supersecretvalue"	text	[{"kind": "text", "transformId": null}]	2026-07-19 18:33:07.508337+00
6dcd651e-bca9-4c0d-8104-bdab07726888	881761ba-b522-40a0-9965-29cf58722a3a	{"a":{"b":{"c":…}}}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:33:08.072775+00
5c262843-972b-4116-bdf1-b3fdca0668da	881761ba-b522-40a0-9965-29cf58722a3a	[…,…,…]	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:33:08.637152+00
465ae5b4-a8c5-4203-bc22-0d12e41017da	881761ba-b522-40a0-9965-29cf58722a3a	{"sk-live-abc123xyz":…}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:33:09.434318+00
7abdbb42-d9d0-409c-9d56-8e8ef8273d60	881761ba-b522-40a0-9965-29cf58722a3a	https://api.example.com/…	url	[{"kind": "url", "transformId": "url.split_query"}, {"kind": "json", "transformId": null}]	2026-07-19 18:33:10.00854+00
61f765f6-513f-41a5-a15f-48a96d9c5975	881761ba-b522-40a0-9965-29cf58722a3a	https://example.com/…	url	[{"kind": "url", "transformId": null}]	2026-07-19 18:33:10.570484+00
7db868f0-a69a-4f4c-af9b-43f55a18aa55	881761ba-b522-40a0-9965-29cf58722a3a	https://example.com/…	url	[{"kind": "url", "transformId": null}]	2026-07-19 18:33:11.212588+00
0c323d0c-19a4-42f2-ac73-0822c0e054b6	881761ba-b522-40a0-9965-29cf58722a3a	a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90	hash	[{"kind": "hash", "transformId": "hash.identify"}, {"kind": "json", "transformId": null}]	2026-07-19 18:33:11.795891+00
128dc5b8-b257-40d9-86e5-0102cf16bd72	881761ba-b522-40a0-9965-29cf58722a3a	550e8400-e29b-41d4-a716-446655440000	uuid	[{"kind": "uuid", "transformId": "uuid.describe"}, {"kind": "json", "transformId": null}]	2026-07-19 18:33:12.368816+00
64585896-b5c9-4bf9-a343-bca71799edee	881761ba-b522-40a0-9965-29cf58722a3a	my password is hunter2pass	text	[{"kind": "text", "transformId": null}]	2026-07-19 18:33:12.955745+00
074a23ca-eec1-4afe-a993-ed2761c2945a	881761ba-b522-40a0-9965-29cf58722a3a	… (27 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 18:37:46.22997+00
d665a598-f259-4949-982c-39bc2ddf0782	881761ba-b522-40a0-9965-29cf58722a3a	… (27 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 18:37:46.793119+00
00feba04-a42f-4b7e-b466-6a3d81a8f2da	881761ba-b522-40a0-9965-29cf58722a3a	{"pw":"leakme123",}	text	[{"kind": "text", "transformId": null}]	2026-07-19 18:37:47.319249+00
edcb1034-e38c-439f-926d-4269feb11a44	881761ba-b522-40a0-9965-29cf58722a3a	"supersecretvalue"	text	[{"kind": "text", "transformId": null}]	2026-07-19 18:37:47.845922+00
01490259-074d-4dcd-9a55-4fee8df0340e	881761ba-b522-40a0-9965-29cf58722a3a	{"a":{"b":{"c":…}}}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:37:48.376852+00
5f922656-ecd9-4e80-9cd6-0030cb56e769	881761ba-b522-40a0-9965-29cf58722a3a	[…,…,…]	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:37:48.899353+00
02e0c063-30ff-4467-8645-19bbb6e9fe45	881761ba-b522-40a0-9965-29cf58722a3a	{"sk-live-abc123xyz":…}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 18:37:49.427876+00
e7940c34-e5f4-4489-80e3-02c7c36f2529	881761ba-b522-40a0-9965-29cf58722a3a	https://api.example.com/…	url	[{"kind": "url", "transformId": "url.split_query"}, {"kind": "json", "transformId": null}]	2026-07-19 18:37:49.955888+00
aa7743ed-df3a-4fd5-a2d8-5de7cff2659a	881761ba-b522-40a0-9965-29cf58722a3a	https://example.com/…	url	[{"kind": "url", "transformId": null}]	2026-07-19 18:37:50.496341+00
1e519e8e-c8b3-4c55-8d1a-ea7f38ee436c	881761ba-b522-40a0-9965-29cf58722a3a	https://example.com/…	url	[{"kind": "url", "transformId": null}]	2026-07-19 18:37:51.018543+00
c6f1f94f-6553-4bc2-8a72-494e5bed281d	881761ba-b522-40a0-9965-29cf58722a3a	a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90	hash	[{"kind": "hash", "transformId": "hash.identify"}, {"kind": "json", "transformId": null}]	2026-07-19 18:37:51.595684+00
5c6d9d50-5e79-4f73-b8fc-ca92cf9abe13	881761ba-b522-40a0-9965-29cf58722a3a	550e8400-e29b-41d4-a716-446655440000	uuid	[{"kind": "uuid", "transformId": "uuid.describe"}, {"kind": "json", "transformId": null}]	2026-07-19 18:37:52.127086+00
ff506105-6934-4176-9689-504c0eb73aa6	881761ba-b522-40a0-9965-29cf58722a3a	my password is hunter2pass	text	[{"kind": "text", "transformId": null}]	2026-07-19 18:37:52.631946+00
a9f3eeb4-69fd-4963-a16c-e488c271b2cb	6c32275f-e47b-4842-9b85-f8c70423e2e8	… (24 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 19:03:37.281595+00
5a2a5699-faa0-4937-8704-ac4a4e915cbf	6c32275f-e47b-4842-9b85-f8c70423e2e8	{"db_pass":…,"retries":…,"tls":…,"tag":…}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:03:40.391194+00
3d633572-e6e5-46ae-aad1-901af6030182	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:03:43.56228+00
e857ab5b-043a-40e4-9ee3-7d4a5b91ca06	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:03:46.668032+00
3b333fb8-821c-4901-a1cd-afc02d02ac5e	6c32275f-e47b-4842-9b85-f8c70423e2e8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:03:49.823266+00
8632cb3c-8f8e-4330-9e3e-14903c2dad7b	6c32275f-e47b-4842-9b85-f8c70423e2e8	… (27 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 19:04:54.333139+00
7ca04112-32ed-403e-a65d-5e7926fecbcf	6c32275f-e47b-4842-9b85-f8c70423e2e8	… (27 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 19:04:54.883158+00
5f2f18ab-2ce5-4c7d-bb18-248439b4c5b8	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:04:55.41635+00
e1b3110c-6fd8-4a07-ac37-cb6e618e8d2c	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:04:55.966938+00
307a2232-549c-40bb-a710-cb7be99713d7	6c32275f-e47b-4842-9b85-f8c70423e2e8	{"a":{"b":{"c":…}}}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:04:56.546196+00
05c98b8e-088c-4d69-a93b-ab0ca9f25940	6c32275f-e47b-4842-9b85-f8c70423e2e8	[…,…,…]	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:04:57.105683+00
32eedea1-76da-4ca9-a6e5-8b4ede5451ab	6c32275f-e47b-4842-9b85-f8c70423e2e8	{"sk-live-abc123xyz":…}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:04:57.689246+00
23cf6cc7-17cc-4b71-82e8-ae066b745c0c	6c32275f-e47b-4842-9b85-f8c70423e2e8	https://api.example.com/…	url	[{"kind": "url", "transformId": "url.split_query"}, {"kind": "json", "transformId": null}]	2026-07-19 19:04:58.252706+00
c85b2020-0e07-4d09-a91b-e226e3459131	6c32275f-e47b-4842-9b85-f8c70423e2e8	https://example.com/…	url	[{"kind": "url", "transformId": null}]	2026-07-19 19:04:58.801367+00
2cbf9c9a-af3f-4f1f-8295-89fa520da105	6c32275f-e47b-4842-9b85-f8c70423e2e8	https://example.com/…	url	[{"kind": "url", "transformId": null}]	2026-07-19 19:04:59.320468+00
8d21f347-6ead-4c78-80cd-1aa7596a96a2	6c32275f-e47b-4842-9b85-f8c70423e2e8	a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90	hash	[{"kind": "hash", "transformId": "hash.identify"}, {"kind": "json", "transformId": null}]	2026-07-19 19:04:59.909687+00
efb07e3b-807a-4b31-9490-97da5783d526	6c32275f-e47b-4842-9b85-f8c70423e2e8	550e8400-e29b-41d4-a716-446655440000	uuid	[{"kind": "uuid", "transformId": "uuid.describe"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:00.512709+00
91ff380c-da0d-473f-8cda-1664e206760f	6c32275f-e47b-4842-9b85-f8c70423e2e8	my password is hunter2pass	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:05:01.108037+00
15262cef-65d5-4678-b6a5-8f430077242b	6c32275f-e47b-4842-9b85-f8c70423e2e8	eyJhbGciOiJIUzI1NiJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:02.025623+00
d0008851-f376-482e-a6af-c839fbd08f8d	6c32275f-e47b-4842-9b85-f8c70423e2e8	Bearer eyJhbGciOiJIUzI1NiJ9.….…	jwt	[{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:02.899042+00
28f9771b-2b11-4de8-ab8d-540a21c8ce62	6c32275f-e47b-4842-9b85-f8c70423e2e8	… (20 caracteres)	base64	[{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]	2026-07-19 19:05:03.7557+00
b97b4ca2-2854-4ecf-84dc-282076e58fc5	6c32275f-e47b-4842-9b85-f8c70423e2e8	https://example.com/…	url	[{"kind": "url", "transformId": "url.split_query"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:04.421879+00
30b90b38-aa62-48f0-b998-acd1c79d3081	6c32275f-e47b-4842-9b85-f8c70423e2e8	f47ac10b-58cc-4372-a567-0e02b2c3d479	uuid	[{"kind": "uuid", "transformId": "uuid.describe"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:05.086779+00
ca165bc8-1d25-402e-937c-38ff801e7999	6c32275f-e47b-4842-9b85-f8c70423e2e8	1752624000	unix_timestamp	[{"kind": "unix_timestamp", "transformId": "timestamp.to_iso"}, {"kind": "text", "transformId": null}]	2026-07-19 19:05:05.853439+00
daf7bd2c-93b7-43b5-ac42-6a16899c510c	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:05:06.491808+00
0a6723c9-9a81-42be-9baa-7338075a5bd9	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:05:07.14597+00
444c2d4f-893c-4101-8a73-4b414daa6b01	6c32275f-e47b-4842-9b85-f8c70423e2e8	…	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:05:07.739537+00
441f31ef-81b4-4a9b-b4e6-fa29072a8255	6c32275f-e47b-4842-9b85-f8c70423e2e8	{"pw":…}	json	[{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:08.356185+00
f4c786bf-3af4-488f-bfe8-a3dd60e11c57	6c32275f-e47b-4842-9b85-f8c70423e2e8	callback({"pw":"jsonpsecret"})	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:05:08.92467+00
1ff41b17-75a0-41f3-adbd-ede12b6513b9	6c32275f-e47b-4842-9b85-f8c70423e2e8	config x{"pw":"midsecret"}	text	[{"kind": "text", "transformId": null}]	2026-07-19 19:05:09.559973+00
3fe19e57-a98f-4176-b466-4de940331e48	6c32275f-e47b-4842-9b85-f8c70423e2e8	http://[::1]:8080/…	url	[{"kind": "url", "transformId": "url.split_query"}, {"kind": "json", "transformId": null}]	2026-07-19 19:05:10.185686+00
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: devtools
--

COPY public.session (id, user_id, expires_at, created_at) FROM stdin;
74d34628-f30b-4f8f-af5f-ff5433710f75	4ed5eae0-7cf6-4679-80ba-f033f7fa1936	2026-07-26 07:33:31.055+00	2026-07-19 07:33:31.056605+00
1c9c4c95-c9ff-4049-a86a-0ad9c9109bc6	be38ac4e-d01b-466d-a2cb-d2f780fa6748	2026-07-26 07:48:11.629+00	2026-07-19 07:48:11.631824+00
0fd47b57-2dc2-4114-88c4-df2cf4c18e62	5884d494-a421-4a00-8cdd-3032e2f561da	2026-07-26 08:07:18.985+00	2026-07-19 08:07:18.987447+00
96e19e6a-57a1-4dae-8b94-539f828e3276	b7557b06-971e-44d4-a68d-6654c58912a5	2026-07-26 10:00:18.311+00	2026-07-19 10:00:18.315444+00
a8527a80-f541-436d-b466-c4ff061f74fa	564ed890-7445-4755-99ba-a734dc4d85fe	2026-07-26 10:01:35.955+00	2026-07-19 10:01:35.963861+00
4da0744e-ce22-4e9e-b6cc-fd78d1de548b	564ed890-7445-4755-99ba-a734dc4d85fe	2026-07-26 10:37:10.065+00	2026-07-19 10:37:10.073089+00
e583cc5d-02ff-4f78-a22d-daa33a74b83f	b7557b06-971e-44d4-a68d-6654c58912a5	2026-07-26 10:37:10.224+00	2026-07-19 10:37:10.227548+00
f924cb12-d75b-4eee-9bd2-3a695970054e	564ed890-7445-4755-99ba-a734dc4d85fe	2026-07-26 10:39:07.868+00	2026-07-19 10:39:07.871864+00
2065b847-c443-4035-befb-7c86142d032c	881761ba-b522-40a0-9965-29cf58722a3a	2026-07-26 18:31:24.357+00	2026-07-19 18:31:24.359323+00
b9daf8f5-96ee-4d48-bd9c-329dc0a373c3	6c32275f-e47b-4842-9b85-f8c70423e2e8	2026-07-26 19:03:06.568+00	2026-07-19 19:03:06.570064+00
41602d58-e9ea-48c9-aa0a-b4f8716d6060	6331be67-230f-4757-bdf0-8cfff1ea555c	2026-07-28 09:45:16.268+00	2026-07-21 09:45:16.274945+00
9b3a8445-ab63-47d6-89fd-0993e391d085	aac77aa2-f68d-40b2-a5ff-fdb5af841ccf	2026-07-28 11:37:46.582+00	2026-07-21 11:37:46.585558+00
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: devtools
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 0gMfNc4dOa14yAXIgg4IIzAg8j5Ao3j42vdDGfMdvOU0BrFkMTLvnTM4y0eONxr

