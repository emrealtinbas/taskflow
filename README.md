# TaskFlow - Release Stabilization

TaskFlow, kucuk ekipler icin proje ve gorev takibini sade bir arayuzle sunan Next.js tabanli uygulamadir.

## Stack

- Next.js 16 (App Router)
- TypeScript
- PostgreSQL + Prisma
- TailwindCSS v4
- Vitest (unit/integration + smoke e2e)

## Hizli Baslangic

```bash
npm install
npm run db:up
npm run db:migrate
npm run db:generate
npm run db:seed
npm run dev
```

Uygulama: `http://localhost:3000`

## DB Migration ve Dogrulama Akisi

Tek kaynak akis: `db:up -> db:migrate -> db:generate -> db:seed`

1. PostgreSQL konteynerini ac:

```bash
npm run db:up
```

2. Servisin ayakta oldugunu dogrula:

```bash
docker compose ps
```

3. Migrationlari uygula:

```bash
npm run db:migrate
```

4. Prisma client uret:

```bash
npm run db:generate
```

5. Seed ile demo veri yukle:

```bash
npm run db:seed
```

6. DB tarafini hizli kontrol et:

```bash
npx prisma migrate status
```

Beklenen: migration durumunun up-to-date olmasi.

Troubleshooting:

- `docker compose ps` ciktisinda postgres `Up` degilse Docker Desktop'i acip `npm run db:up` komutunu tekrar calistir.
- `npx prisma migrate status` baglanti hatasi verirse `.env` icindeki `DATABASE_URL` degerinin calisan PostgreSQL'e isaret ettigini kontrol et.
- Hizli kurulum icin tek komut: `npm run db:setup`.

## DB Access

Prisma Studio (gecici, terminal acik kaldigi surece aktif):

```bash
npm run db:studio
```

Tek komut akisi (DB up + migrate + studio):

```bash
npm run db:open
```

Dev + DB + Studio tek komut:

```bash
npm run dev:full
```

Kalici web panel (Adminer):

1. `npm run db:up`
2. `http://localhost:8080`
3. Login bilgileri:
   - System: `PostgreSQL`
   - Server: `postgres`
   - Username/Password/Database: `.env` ile uyumlu degerler

Sik sorunlar:

- Docker kapaliysa `npm run db:up` ve dolayisiyla Adminer/Studio baglantisi basarisiz olur.
- Prisma Studio terminale baglidir; terminal kapaninca Studio da kapanir.
- `5555` (Studio) veya `8080` (Adminer) portu doluysa ilgili sureci kapat veya farkli portla calistir.

## Test ve Release Dogrulama

Unit/Integration:

```bash
npm run test:unit
```

Smoke e2e (register/login + project create + task create/status update):

Manuel yontem (uygulamayi ayri terminalde baslat):

```bash
npm run start -- --port 3210
```

PowerShell'de E2E_BASE_URL vererek testi calistir:

```powershell
$env:E2E_BASE_URL="http://127.0.0.1:3210"; npm run test:e2e
```

Otomatik yontem (build + server start + test + server stop):

```bash
npm run test:e2e:with-server
```

PowerShell'de farkli portla otomatik e2e calistirmak icin:

```powershell
$env:E2E_PORT="3310"; npm run test:e2e:with-server
```

### Troubleshooting

- `npm run test:e2e` komutu bilerek `E2E_BASE_URL` zorunlu ister; degisken yoksa test fail olur.
- `npm run test:e2e:with-server` ve `npm run test:e2e:ci` komutlari `E2E_PORT` (default `3210`) ile server baslatir ve `E2E_BASE_URL` degerini bu porta gore otomatik uretir.
- Port cakismasi varsa `E2E_PORT` degerini degistirip `test:e2e:with-server` veya `test:e2e:ci` tekrar calistir.

Tam kalite kapisi:

```bash
npm run lint
npm run test
npm run test:e2e:with-server
npm run build
```

## Scriptler

- `npm run db:up`: PostgreSQL docker compose up
- `npm run db:setup`: db:up + db:migrate + db:generate + db:seed
- `npm run db:down`: PostgreSQL docker compose down
- `npm run db:studio`: Prisma Studio (`http://localhost:5555`)
- `npm run db:open`: db:up + db:migrate + db:studio
- `npm run dev:full`: db:up + app dev + prisma studio
- `npm run db:migrate`: Prisma migrate dev
- `npm run db:migrate:deploy`: Prisma migrate deploy
- `npm run db:generate`: Prisma generate
- `npm run db:seed`: Prisma db seed
- `npm run db:reset`: Prisma migrate reset --force
- `npm run test`: Unit + integration Vitest (e2e haric)
- `npm run test:unit`: Unit + service integration testleri
- `npm run test:e2e`: E2E_BASE_URL ile smoke e2e testleri
- `npm run test:e2e:with-server`: Build + server + smoke e2e (otomatik kapanis)
- `npm run test:e2e:ci`: CI icin deterministic build + server + smoke e2e

## Demo Kullanici (Seed)

- E-posta: `demo@taskflow.local`
- Sifre: `DemoPass123`
- Proje: `Demo Product Launch`

Seed sonrasi hizli deneme:

1. `npm run dev`
2. `http://localhost:3000/login` adresine git
3. Demo kullanici ile giris yapip proje/gorev akisini kontrol et

## API Response Standardi

Tum API endpointleri ortak bir sekil dondurur:

Basarili yanit:

```json
{ "ok": true, "data": { "...": "..." } }
```

Hatali yanit:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Kullaniciya uygun hata mesaji",
    "details": []
  }
}
```

## Ortam Degiskenleri

`.env.example` dosyasini baz alin:

```env
DATABASE_URL="postgresql://taskflow:taskflow@localhost:5432/taskflow?schema=public"
SESSION_COOKIE_NAME="taskflow_session"
SESSION_TTL_DAYS="7"
```
