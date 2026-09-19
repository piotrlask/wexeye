# Kwarantanna mediów — wdrożenie i eksploatacja

Dokument opisuje, jak skonfigurować i sprawdzać kwarantannę mediów używaną przy
awaryjnym ukryciu treści (ETAP 13.3C / 13.3C.2). **Nie zawiera sekretów ani
rzeczywistych ścieżek produkcyjnych** — wszystkie ścieżki poniżej to
przykłady/placeholdery. Sam dokument nie wykonuje żadnego wdrożenia.

## 1. Co robi kwarantanna

Pliki mediów artykułów leżą w `public/uploads/` i są serwowane bezpośrednio pod
`/uploads/<plik>` (na produkcji — według stanu z audytu 13.3C.1 — przez Apache,
z pominięciem Next.js). Zmiana statusu artykułu w bazie **nie** odcina tego
adresu. Dlatego przy awaryjnym ukryciu (`Article.status = TAKEN_DOWN`) pliki
artykułu są **przenoszone** (nigdy kasowane) do prywatnego katalogu
kwarantanny poza `public/`. Adres URL w bazie (`Media.url`) się nie zmienia,
więc plik można później przywrócić.

Kolejność jest celowa: **najpierw** commit w bazie (artykuł znika z widoku
publicznego — 404, listy, mapa, wyszukiwarka), **potem** przeniesienie plików.
Problem z plikami **nigdy nie cofa** ukrycia; jest widoczny jako alert i można go
naprawić ponowieniem.

## 2. Wymagania dla `QUARANTINE_DIR`

Zmienna środowiskowa `QUARANTINE_DIR` wskazuje katalog kwarantanny.

1. **Ścieżka bezwzględna** (np. `/ścieżka/do/wexeye-quarantine/uploads`).
   Ścieżka względna jest odrzucana (`NOT_ABSOLUTE`) i **nie** jest poprawiana
   automatycznie.
2. **Poza publicznym webrootem.** Katalog nie może być: `public/`, `public/uploads/`,
   podkatalogiem `public/` ani katalogiem, który `public/` zawiera. Sprawdzana jest
   rzeczywista lokalizacja (symlinki/junctiony są rozwiązywane), więc symlink do
   `public/` też zostanie odrzucony. Uwaga: **dotyczy to także DocumentRoot serwera
   WWW** — jeżeli DocumentRoot jest inny niż `<aplikacja>/public`, katalog kwarantanny
   nie może leżeć w nim. Kod zna tylko `public/` aplikacji, więc DocumentRoot musi
   zweryfikować osoba wdrażająca.
3. **Trwały** — musi przetrwać wdrożenia (git pull, rozpakowanie archiwum,
   wymiana katalogu wydania). Najlepiej katalog **obok**, a nie wewnątrz katalogu
   aplikacji.
4. **Zapisywalny przez proces aplikacji** (ten sam użytkownik co Node/Passenger):
   tworzenie katalogu, zapis pliku, zmiana nazwy, usunięcie.
5. Najlepiej **na tym samym systemie plików** co `public/uploads` (wtedy
   przeniesienie jest atomowe). Jeżeli nie — kod używa kopiowania z wyłącznością i
   usuwa oryginał dopiero po pełnej kopii.
6. Uprawnienia: katalog tworzony przez aplikację ma tryb `0700`, pliki tymczasowe testu `0600`
   (na systemach POSIX). Jeżeli katalog tworzysz samodzielnie, nadaj mu ograniczone
   uprawnienia (tylko użytkownik aplikacji) — przeniesione pliki zachowują swój tryb.
7. Ograniczenie kontroli ścieżki: kod rozwiązuje symlinki i junctiony, ale **nie wykryje
   punktu montowania (bind mount)** ani innych mechanizmów systemu plików, które
   „podłączają” `public/` w inne miejsce — to musi sprawdzić osoba wdrażająca.

Jeżeli `QUARANTINE_DIR` jest puste — używany jest lokalny katalog domyślny
`./private/quarantine/uploads` (względem katalogu roboczego procesu). To jest
dopuszczalne wyłącznie dla developmentu i testów. **Produkcja powinna używać jawnego
`QUARANTINE_DIR`** (panel pokaże wtedy OSTRZEŻENIE).

Błędny `QUARANTINE_DIR` **nie zatrzymuje aplikacji** i **nie blokuje** awaryjnego
ukrycia w bazie — powoduje tylko stan BŁĄD/KRYTYCZNE kwarantanny.

## 3. Preflight — jak sprawdzić

Preflight uruchamia się automatycznie przy wejściu w **Panel administracyjny →
Zarządzanie** (sekcja „Kwarantanna mediów”) oraz przy „Sprawdź i napraw
kwarantannę”. Sprawdza po kolei: poprawność ścieżki, położenie poza `public/`
(z rozwiązaniem symlinków), istnienie/utworzenie katalogu, zapis małego
losowo nazwanego pliku, zmianę jego nazwy, usunięcie i brak pozostałości. Nie
używa `public/uploads` i nie tworzy niczego publicznego.

Panel nigdy nie pokazuje pełnej ścieżki — tylko „QUARANTINE_DIR ustawiony” lub
„lokalny katalog domyślny” oraz kod błędu (np. `EACCES`).

## 4. Znaczenie statusów

| Status | Znaczenie |
|---|---|
| **OK** | Konfiguracja jawna (`QUARANTINE_DIR`), katalog poza webrootem, zapis/zmiana nazwy/usunięcie działają, nie wykryto publicznych kopii zdjętych mediów. |
| **OSTRZEŻENIE** | Działa, ale: używany jest katalog domyślny (brak `QUARANTINE_DIR`), albo plik zdjętego artykułu jest współdzielony z inną aktywną treścią (zostaje publiczny celowo). |
| **BŁĄD** | Kwarantanna nie działa (zła/niebezpieczna ścieżka, brak uprawnień, błąd zapisu/zmiany nazwy/usunięcia) albo oznaczony jako przeniesiony plik nie ma kopii w kwarantannie (utracony dowód). |
| **KRYTYCZNE** | Plik zdjętego artykułu **może być nadal publicznie dostępny** w `public/uploads` (nie udało się przenieść albo kopia wróciła po backupie/wdrożeniu), albo kopia publiczna różni się od kopii w kwarantannie. |

## 5. Co zrobić przy błędzie kwarantanny

1. Artykuł jest już ukryty (404) — nie trzeba go ukrywać ponownie.
2. Odczytaj kod w panelu (np. `NOT_ABSOLUTE`, `INSIDE_PUBLIC`, `MKDIR_FAILED`,
   `WRITE_FAILED`/`EACCES`, `CLEANUP_FAILED`) i popraw konfigurację/uprawnienia na serwerze.
3. Uruchom **„Sprawdź i napraw kwarantannę”** (sekcja 6). Operacja jest idempotentna —
   można ją powtarzać.
4. Jeżeli plik nadal jest publiczny, a naprawa nie działa: **usuń dostęp do pliku
   na poziomie serwera** (np. przeniesienie ręczne poza webroot) — ale patrz punkt 7.
5. Sprawdź publiczny adres pliku (`/uploads/<plik>`) — powinien dawać 404 (lub 500 z
   Next.js dla pliku znanego procesowi od startu; bez treści pliku).

## 6. Sprawdzenie i naprawa (reconciliation)

Przycisk **„Sprawdź i napraw kwarantannę”** (tylko administrator) wykonuje
preflight i **jedną ograniczoną partię** (do 50 mediów) rekonsyliacji. Źródłem
prawdy jest baza: rozpatrywane są wyłącznie media artykułów o statusie
`TAKEN_DOWN` — nie awatary, reklamy ani aktywne artykuły. Dla każdego pliku
sprawdzany jest **stan faktyczny na dysku**, także gdy `Media.quarantinedAt` jest
ustawione (backup/wdrożenie może przywrócić plik do `public/uploads`).

| Stan | Działanie |
|---|---|
| plik tylko w `public/uploads` | przeniesienie do kwarantanny (bez nadpisywania) |
| plik tylko w kwarantannie, brak flagi | ustawienie `quarantinedAt` |
| plik w obu miejscach, **identyczny** (SHA-256) | usunięcie kopii publicznej |
| plik w obu miejscach, **różny** | **nic nie jest usuwane**, alert KRYTYCZNE |
| brak pliku wszędzie | raport (brak publicznej kopii); jeśli był oznaczony jako przeniesiony — BŁĄD (utracony dowód) |
| plik współdzielony z aktywną treścią | bez zmian, OSTRZEŻENIE |
| `Media.url` spoza wzorca `/uploads/<nazwa>` | bez operacji na plikach |

Jeżeli jest więcej niż 50 mediów, wynik zawiera informację o kolejnej partii —
kolejne naciśnięcie kontynuuje. Przeniesienie ponawia się do 3 razy tylko przy błędach
przejściowych (`EBUSY`, `EIO`, …); błędów trwałych (zła konfiguracja, brak uprawnień)
się nie ponawia.

## 7. Nie kasuj dowodów ręcznie

Zawartość kwarantanny to potencjalne dowody i materiał do przeglądu/odwołań. **Nie
usuwaj jej ręcznie i nie czyść katalogu.** Kod nigdy nie kasuje jedynej kopii pliku
ani żadnej kopii, która różni się od pozostałej. Zasady przechowywania (retencja) i
ewentualnego usuwania wymagają osobnej decyzji (w tym prawnej) — patrz punkt 9.

## 8. Czego ten mechanizm NIE robi (jeszcze)

- **Nie usuwa metadanych EXIF/GPS** z przesłanych plików (osobny etap; pliki są
  zapisywane w oryginale).
- Nie ma automatycznego crona/endpointu — naprawa jest ręczna (przycisk) oraz
  jednorazowo po każdym awaryjnym ukryciu.
- Nie ma retencji, limitów ani monitoringu miejsca w kwarantannie.

## 9. Backup i retencja

Polityka backupu i retencji kwarantanny **wymaga osobnego ustalenia**. Do
rozstrzygnięcia przed wdrożeniem: czy katalog kwarantanny jest objęty kopiami
zapasowymi hostingu, czy przywrócenie `public/uploads` z backupu może przywrócić
pliki (wtedy „Sprawdź i napraw kwarantannę” je wykryje i usunie kopię publiczną
tylko jeśli jest identyczna z kwarantanną), oraz jak długo przechowywać materiały.

## 10. Lista kontrolna przed wdrożeniem (nie jest wykonywana przez kod)

- [ ] Ustaw `QUARANTINE_DIR` na jawną ścieżkę bezwzględną poza webrootem i poza katalogiem wydania.
- [ ] Zweryfikuj DocumentRoot serwera WWW (katalog kwarantanny nie może w nim leżeć).
- [ ] Upewnij się, że proces aplikacji może w niej tworzyć, zapisywać, zmieniać nazwy i usuwać pliki.
- [ ] Sprawdź trwałość katalogu między wdrożeniami.
- [ ] Po wdrożeniu wejdź w panel: status kwarantanny musi być **OK** (nie OSTRZEŻENIE/BŁĄD).
- [ ] Zaplanuj kontrolowany test na produkcji (wymaga świadomej zgody właściciela): mały nieszkodliwy plik → 200 → awaryjne ukrycie → 404 pod URL → brak publicznej ścieżki do kwarantanny.
- [ ] Ustal stan migracji produkcyjnej bazy i kolejność wdrożenia (migracje przed kodem).
- [ ] Ustal politykę backupu i retencji.
