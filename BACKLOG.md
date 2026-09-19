# BACKLOG

## Deferred findings after ETAP 12.4

Findings znalezione podczas weryfikacji ETAP 12.4 (usuwanie konta / anonimizacja),
świadomie NIE naprawione w ETAP 12.5. Nie zawierają danych użytkowników ani sekretów.

| ID | Severity | Opis | Decyzja | Planowany etap |
|---|---|---|---|---|
| F-12.4-06 | MEDIUM | Stripe Checkout rozpoczęty przed usunięciem konta może zakończyć się po usunięciu i utworzyć zakup/subskrypcję na zanonimizowanym koncie (webhook nie zna `deletedAt`). | Nie naprawiamy w ETAP 12.5. Do rozwiązania razem z płatnościami/subskrypcjami po stronie Stripe. | Payments / Subscriptions / Stripe |
| F-12.4-07 | MEDIUM | Soft-deleted użytkownik nadal istnieje w historycznej strukturze sponsorów/prowizji (sponsorowani pozostają przypięci, usunięci zajmują slot limitu 5, prowizje nadal mogą się naliczać). | Usunięte konto NIE powinno zajmować aktywnego slotu w limicie 5 osób. Historyczne `Commission`/`AdRevenueShare` pozostają, już naliczone prowizje nie są kasowane, nowe prowizje nie powinny być naliczane usuniętemu użytkownikowi. Sposób przebudowy struktury zostanie zaprojektowany osobno. | ETAP 19 |
| F-12.4-08 | LOW | Reklama może być kupowana przy artykule usuniętego autora (udział AUTHOR trafia do konta usuniętego). | Artykuł może pozostać publiczny, reklamy mogą nadal być przy nim wyświetlane/sprzedawane. Konto usunięte nie powinno otrzymywać nowych należności; dokładne rozliczenie w systemie reklam/prowizji. | System reklam / prowizji (etap do przypisania) |
| F-12.4-09 | LOW | Moderacja artykułu usuniętego autora może utworzyć `Notification` na zanonimizowanym koncie. | Docelowo: `deletedAt != null` → nie tworzyć nowych `Notification`. | Do przypisania (powiadomienia) |
| F-12.4-10 | INFO | Brak indeksu na `User.role` zwiększa zakres blokowania podczas transakcji "ostatni admin". | Rozważyć przy późniejszej optymalizacji bazy danych. | Optymalizacja DB (do przypisania) |
| F-12.4-11 | INFO | Minimalne TOCTOU istniejącej sesji w momencie równoległego usuwania konta. | ACCEPTED / BY DESIGN. | Brak |
