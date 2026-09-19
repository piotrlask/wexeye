import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, Para, Bullets, MailLink } from "@/components/LegalPage";
import { OPERATOR, CONTACT_EMAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Polityka prywatności WexEye — wersja tymczasowa",
  description:
    "Tymczasowa polityka prywatności serwisu WexEye: administrator danych (APIL Sp. z o.o.), kategorie danych, odbiorcy, prawa użytkownika i skutki usunięcia konta.",
};

export default function PrywatnoscPage() {
  return (
    <LegalPage
      title="Polityka prywatności WexEye — wersja tymczasowa"
      interimNote="To jest wersja tymczasowa. Opisuje dane faktycznie przetwarzane w Serwisie na dzień ostatniej aktualizacji i będzie uzupełniana, w szczególności o szczegóły dotyczące infrastruktury, lokalizacji przetwarzania i okresów przechowywania."
    >
      <LegalSection title="1. Administrator danych">
        <address className="mb-3 text-sm not-italic leading-relaxed">
          <strong>{OPERATOR.name}</strong>
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.postalCode} {OPERATOR.city}, {OPERATOR.country}
        </address>
        <Para>
          W sprawach dotyczących danych osobowych: <MailLink email={CONTACT_EMAILS.privacy} />. Pozostałe dane
          kontaktowe znajdziesz na stronie{" "}
          <Link href="/kontakt" className="underline">
            Kontakt
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="2. Jakie dane przetwarzamy i w jakim celu">
        <h3 className="mb-1 text-sm font-semibold">Dane konta</h3>
        <Para>
          Adres e-mail, imię i nazwisko (nazwa wyświetlana), rola konta, identyfikatory techniczne, kod polecający oraz
          data założenia konta. Cel: założenie i prowadzenie konta, logowanie, komunikacja związana z kontem.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Dane profilu</h3>
        <Para>
          Zdjęcie profilowe, miejscowość, płeć i wiek (dane opcjonalne). Nazwa wyświetlana, zdjęcie profilowe i rola są
          widoczne publicznie na profilu; miejscowość, płeć i wiek są widoczne dla właściciela konta i jego znajomych.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Dane uwierzytelniania i bezpieczeństwa</h3>
        <Para>
          Hasło przechowywane w postaci skrótu (nie w postaci jawnej), znacznik zmiany hasła, tokeny resetu hasła
          przechowywane w postaci skrótu, zapisy prób logowania i innych chronionych operacji wraz z adresem IP i
          adresem e-mail (w celu ograniczania nadużyć i ochrony kont) oraz pliki cookie sesji. Cel: bezpieczeństwo
          kont i Serwisu.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Publikowane treści</h3>
        <Para>
          Artykuły, teksty, zdjęcia, nagrania, tytuły, hashtagi, informacje o źródle i dacie zdarzenia oraz status
          publikacji. Cel: publikowanie i udostępnianie treści w Serwisie. Opublikowane treści są widoczne dla
          odwiedzających zgodnie z zasadami danej publikacji.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Komentarze, reakcje, relacje społeczne</h3>
        <Para>
          Komentarze, reakcje, oznaczenia „świadek”, udostępnienia treści znajomym oraz zaproszenia i znajomości. Cel:
          funkcje społecznościowe Serwisu.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Lokalizacja związana z publikacją</h3>
        <Para>
          Miejscowość, region, kraj i kontynent podawane przy publikacji oraz — opcjonalnie — współrzędne geograficzne
          (pobrane z urządzenia autora za zgodą wyrażoną w przeglądarce). Służą do wyświetlania informacji o miejscu
          zdarzenia, mapy i funkcji „w pobliżu”.
        </Para>
        <Para>
          Autor może oznaczyć lokalizację publikacji jako ukrytą. Wtedy miejscowość, region, kraj i współrzędne tej
          publikacji nie są pokazywane innym użytkownikom, publikacja nie jest umieszczana na mapie, nie uczestniczy w
          funkcji „w pobliżu” (nie jest z niej zwracana i nie jest przy niej podawana odległość) i nie jest znajdowana
          przez wyszukiwanie po nazwie miejscowości lub kraju. Ukryta lokalizacja nadal jest zapisana w bazie danych i
          może być dostępna dla administratorów w celach bezpieczeństwa, moderacji i wypełnienia obowiązków prawnych.
        </Para>
        <Para>
          Ukrycie lokalizacji dotyczy pól lokalizacji zapisanych w Serwisie. Nie usuwa informacji, które autor sam
          umieścił w tytule, treści lub przesłanych plikach (na przykład metadanych zdjęć i nagrań albo miejsc widocznych
          na nich).
        </Para>
        <Para>
          Funkcja „w pobliżu” może korzystać z lokalizacji przeglądarki odwiedzającego (za zgodą w przeglądarce).
          Współrzędne są przekazywane w adresie strony i nie są zapisywane przez aplikację w bazie danych WexEye.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Dane transakcyjne</h3>
        <Para>
          Zakupy dostępu do treści, subskrypcje (rodzaj, status, okres, wykorzystanie limitu), kwoty, identyfikatory
          płatności i klienta u operatora płatności oraz dane o prowizjach w programie redaktorskim. Dane karty
          płatniczej są wprowadzane na stronie operatora płatności i nie są przetwarzane ani przechowywane przez WexEye.
          Cel: realizacja zamówień, rozliczenia, obowiązki prawne i księgowe.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Reklamy</h3>
        <Para>
          Zamówienia reklam, materiał reklamowy, adres docelowy reklamy oraz dane o rozliczeniach związanych z
          reklamami. Reklamy są wyświetlane w kontekście publikacji wybranego autora; Serwis nie prowadzi profilowania
          behawioralnego użytkowników do celów reklamowych.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Powiadomienia</h3>
        <Para>Treść powiadomień w Serwisie i informacja o ich przeczytaniu.</Para>
        <h3 className="mb-1 text-sm font-semibold">Dane techniczne</h3>
        <Para>
          Adres IP i dane żądania przetwarzane w związku z bezpieczeństwem i limitami nadużyć; licznik wyświetleń
          artykułu (patrz{" "}
          <Link href="/cookies" className="underline">
            informacja o plikach cookies
          </Link>
          ). Infrastruktura hostingowa może rejestrować standardowe dane techniczne żądań; szczegóły zależą od
          dostawcy infrastruktury.
        </Para>
      </LegalSection>

      <LegalSection title="3. Podstawy prawne">
        <Para>
          Podstawy prawne przetwarzania zależą od celu i obejmują w szczególności: wykonanie umowy i świadczenie usługi,
          prawnie uzasadniony interes administratora (np. bezpieczeństwo, ochrona przed nadużyciami), wypełnienie
          obowiązków prawnych oraz — tam, gdzie jest to wymagane — zgodę. Szczegółowe przypisanie podstaw prawnych do
          poszczególnych celów zostanie uzupełnione w kolejnych wersjach tej polityki.
        </Para>
      </LegalSection>

      <LegalSection title="4. Odbiorcy danych i usługi zewnętrzne">
        <Bullets>
          <li>
            <strong>Stripe</strong> — obsługa płatności i subskrypcji. Do operatora płatności przekazywane są m.in.
            adres e-mail, imię i nazwisko oraz dane potrzebne do realizacji zakupu.
          </li>
          <li>
            <strong>Resend</strong> — wysyłka wiadomości e-mail dotyczących konta (np. reset hasła). Dostawca
            przetwarza adres e-mail odbiorcy i treść wiadomości.
          </li>
          <li>
            <strong>OpenStreetMap (dostawca kafelków mapy)</strong> — wyświetlanie mapy powoduje, że przeglądarka
            użytkownika łączy się z serwerami kafelków mapy, którym przekazywany jest m.in. adres IP i informacja o
            wyświetlanym obszarze.
          </li>
          <li>
            <strong>Dostawcy infrastruktury</strong> — hosting, baza danych, przechowywanie plików i kopie zapasowe.
            Dostawcy ci nie są tu jeszcze wskazani; informacja zostanie uzupełniona.
          </li>
          <li>Organy publiczne — gdy obowiązek udostępnienia danych wynika z przepisów prawa.</li>
        </Bullets>
        <Para>Treści publikowane w Serwisie są widoczne dla innych użytkowników i odwiedzających.</Para>
      </LegalSection>

      <LegalSection title="5. Przekazywanie danych poza Europejski Obszar Gospodarczy">
        <Para>
          Niektórzy z powyższych dostawców mogą przetwarzać dane poza Europejskim Obszarem Gospodarczym. Informacje o
          lokalizacji przetwarzania i zastosowanych zabezpieczeniach prawnych zostaną uzupełnione po zakończeniu
          weryfikacji infrastruktury i usług zewnętrznych.
        </Para>
      </LegalSection>

      <LegalSection title="6. Okres przechowywania">
        <Para>
          Okresy przechowywania zależą od rodzaju danych, celu przetwarzania, względów bezpieczeństwa, rozliczeń oraz
          wymogów prawnych. Szczegółowe okresy nie zostały jeszcze określone w tej wersji polityki.
        </Para>
      </LegalSection>

      <LegalSection title="7. Prawa użytkownika">
        <Para>Zgodnie z właściwym prawem przysługuje Ci w szczególności prawo do:</Para>
        <Bullets>
          <li>dostępu do swoich danych,</li>
          <li>sprostowania danych,</li>
          <li>usunięcia danych,</li>
          <li>ograniczenia przetwarzania,</li>
          <li>sprzeciwu wobec przetwarzania,</li>
          <li>innych praw wynikających z właściwego prawa.</li>
        </Bullets>
        <Para>
          Aby skorzystać z praw, napisz na adres <MailLink email={CONTACT_EMAILS.privacy} />. Zgłoszenia są obecnie
          obsługiwane ręcznie; w celu ochrony Twoich danych możemy poprosić o potwierdzenie tożsamości. Przysługuje Ci
          również prawo wniesienia skargi do organu nadzorczego (w Polsce: Prezes Urzędu Ochrony Danych Osobowych).
        </Para>
      </LegalSection>

      <LegalSection title="8. Usunięcie konta">
        <Para>Usunięcie konta w panelu konta powoduje, że:</Para>
        <Bullets>
          <li>dane identyfikujące konto (adres e-mail, nazwa, dane profilu) są anonimizowane, a hasło jest zastępowane
            wartością uniemożliwiającą logowanie,</li>
          <li>zdjęcie profilowe jest co do zasady usuwane,</li>
          <li>istniejące sesje tracą ważność, a logowanie na to konto nie jest już możliwe,</li>
          <li>znajomości, zaproszenia, własne powiadomienia oraz tokeny resetu hasła są usuwane.</li>
        </Bullets>
        <Para>Jednocześnie:</Para>
        <Bullets>
          <li>
            opublikowane artykuły (wraz z mediami) i komentarze mogą pozostać w Serwisie, bez wskazania tożsamości
            autora,
          </li>
          <li>
            rekordy transakcyjne i rozliczeniowe (zakupy, subskrypcje, prowizje, reklamy) mogą być przechowywane w
            zakresie potrzebnym do zachowania integralności rozliczeń lub obowiązków prawnych,
          </li>
          <li>zapisy techniczne dotyczące prób logowania mogą być przechowywane przez ograniczony czas dla bezpieczeństwa,</li>
          <li>
            powiadomienia wcześniej wysłane innym użytkownikom mogą nadal zawierać dawną nazwę wyświetlaną
            użytkownika.
          </li>
        </Bullets>
        <Para>Usunięcie konta nie oznacza fizycznego skasowania wszystkich danych.</Para>
      </LegalSection>

      <LegalSection title="9. Bezpieczeństwo">
        <Para>
          Stosujemy środki techniczne i organizacyjne mające chronić dane, m.in. przechowywanie haseł w postaci
          skrótu oraz ograniczanie liczby prób logowania. Żaden system nie zapewnia absolutnego bezpieczeństwa.
        </Para>
      </LegalSection>

      <LegalSection title="10. Wiek użytkowników">
        <Para>
          Zasady dotyczące wieku użytkowników są obecnie aktualizowane. Jeżeli uważasz, że w Serwisie znajdują się dane
          osoby, która nie powinna z niego korzystać, napisz na adres <MailLink email={CONTACT_EMAILS.privacy} />.
        </Para>
      </LegalSection>

      <LegalSection title="11. Pliki cookies">
        <Para>
          Informacje o stosowanych plikach cookies znajdziesz na stronie{" "}
          <Link href="/cookies" className="underline">
            Cookies
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="12. Zmiany polityki">
        <Para>
          Polityka może być zmieniana. Aktualna wersja i data ostatniej aktualizacji są podane na początku tej strony.
        </Para>
      </LegalSection>
    </LegalPage>
  );
}
