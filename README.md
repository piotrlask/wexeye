# wexeye

Strona internetowa z trzema podstronami:

1. **Strona główna** (`/`, `/artykul/[id]`) — publiczny widok, każdy odwiedzający czyta opublikowane treści.
2. **Dodaj treść** (`/panel/dodaj`) — dla zalogowanych (rola `EDITOR`/`ADMIN`): dodawanie tekstu, zdjęć, filmów/rolek. Nowa treść trafia do kolejki `PENDING` i czeka na zatwierdzenie.
3. **Panel admina** (`/panel/admin`) — tylko dla roli `ADMIN`: zarządzanie zespołem redakcyjnym (dodawanie kont), płatności (rejestr/oznaczanie jako opłacone) i kontrola treści (zatwierdzanie/odrzucanie zgłoszeń).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma + MySQL, NextAuth (Auth.js v5, logowanie e-mail/hasło, sesja JWT).

`prisma/schema.prisma` ma `provider = "mysql"` — to jedyne wspierane środowisko, również lokalnie. Potrzebny jest realny serwer MySQL (lokalnie np. przez Docker: `docker run -e MYSQL_ROOT_PASSWORD=dev -e MYSQL_DATABASE=wexeye -p 3306:3306 mysql:8`) wskazany w `DATABASE_URL`.

## Uruchomienie

```bash
npm install
cp .env.example .env
# ustaw DATABASE_URL w .env na realny MySQL, np.:
# DATABASE_URL="mysql://root:dev@localhost:3306/wexeye"
npx prisma migrate dev

# seed wymaga haseł podanych przez zmienne środowiskowe (bez wartości domyślnych):
SEED_ADMIN_PASSWORD="..." SEED_EDITOR_PASSWORD="..." SEED_READER_PASSWORD="..." npm run db:seed
# tworzy konto admina (admin@wexeye.com), dwóch redaktorów i czytelnika demo —
# każde z hasłem z odpowiedniej zmiennej powyżej

npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

## Struktura

```
prisma/schema.prisma      # modele: User, Article, Media, Payment
src/auth.ts                # konfiguracja NextAuth
src/middleware.ts          # ochrona /panel/* (login) i /panel/admin (rola ADMIN)
src/app/page.tsx           # strona główna (subpage 1)
src/app/artykul/[id]/      # widok pojedynczego artykułu
src/app/panel/dodaj/       # dodawanie treści (subpage 2)
src/app/panel/admin/       # zespół / płatności / kontrola (subpage 3)
```

## Uwagi

- Pliki (zdjęcia/filmy) trafiają do `public/uploads/` — do produkcji warto przenieść na zewnętrzny storage (S3-kompatybilny), bo lokalny dysk nie przetrwa redeployu na hostingu bezstanowym.
- Baza to MySQL zarówno lokalnie, jak i na produkcji — ten sam `schema.prisma`, tylko inny `DATABASE_URL`. Nie ma trybu SQLite; przełączanie providera w schemacie tworzy niezgodne migracje.
- Płatności obsługuje Stripe (`src/lib/stripe.ts`, `src/app/api/checkout/`, `src/app/api/webhooks/stripe/`) — jednorazowe zakupy artykułów, subskrypcje SUB20/SUB30 i sloty reklamowe. Model `Payment` to osobny, ręczny rejestr księgowań admina, niepowiązany z Purchase.
