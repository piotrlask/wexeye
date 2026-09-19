import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, Para, Bullets, MailLink } from "@/components/LegalPage";
import { CONTACT_EMAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookies — WexEye",
  description:
    "Informacja o plikach cookies stosowanych w serwisie WexEye: sesja i bezpieczeństwo logowania oraz licznik wyświetleń artykułu.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Informacja o plikach cookies"
      interimNote="To jest wersja tymczasowa. Opisuje pliki cookies stosowane w Serwisie na dzień ostatniej aktualizacji."
    >
      <LegalSection title="1. Czym są pliki cookies">
        <Para>
          Pliki cookies to niewielkie pliki zapisywane w przeglądarce. W WexEye służą do utrzymania zalogowanej sesji,
          ochrony procesu logowania oraz zliczania wyświetleń artykułów.
        </Para>
      </LegalSection>

      <LegalSection title="2. Jakie pliki cookies stosujemy">
        <h3 className="mb-1 text-sm font-semibold">Cookies sesji i bezpieczeństwa logowania</h3>
        <Para>
          Są niezbędne do zalogowania się i utrzymania sesji oraz do ochrony formularzy logowania. Ustawiane są przez
          bibliotekę uwierzytelniania (Auth.js) i mają nazwy zaczynające się od <code>authjs.</code> (w połączeniach
          szyfrowanych mogą występować z przedrostkiem <code>__Secure-</code> lub <code>__Host-</code>):
        </Para>
        <Bullets>
          <li>
            <code>authjs.session-token</code> — utrzymuje zalogowaną sesję,
          </li>
          <li>
            <code>authjs.csrf-token</code> — zabezpiecza formularz logowania przed sfałszowanymi żądaniami,
          </li>
          <li>
            <code>authjs.callback-url</code> — zapamiętuje adres, do którego użytkownik wraca po zalogowaniu.
          </li>
        </Bullets>
        <h3 className="mb-1 mt-4 text-sm font-semibold">Licznik wyświetleń artykułu</h3>
        <Para>
          Cookie o nazwie <code>wxv_&lt;identyfikator artykułu&gt;</code> jest ustawiane po wyświetleniu artykułu, aby
          to samo wyświetlenie nie było liczone wielokrotnie w krótkim czasie. Ma charakter techniczny (statystyka
          wyświetleń artykułu), jest niedostępne dla skryptów przeglądarki i wygasa po około 4 godzinach.
        </Para>
      </LegalSection>

      <LegalSection title="3. Czego nie stosujemy">
        <Para>
          Na dzień ostatniej aktualizacji Serwis nie stosuje własnych plików cookies reklamowych, narzędzi
          analitycznych ani mechanizmów śledzenia zachowania użytkowników między stronami.
        </Para>
      </LegalSection>

      <LegalSection title="4. Usługi zewnętrzne">
        <Para>
          Mapa w Serwisie korzysta z kafelków dostarczanych przez OpenStreetMap: podczas wyświetlania mapy przeglądarka
          łączy się z ich serwerami, którym przekazywany jest m.in. adres IP. Płatności są realizowane na stronie
          operatora płatności (Stripe), który stosuje własne zasady dotyczące plików cookies na swoich stronach.
          Szczegóły dotyczące danych przekazywanych usługom zewnętrznym opisuje{" "}
          <Link href="/prywatnosc" className="underline">
            Polityka prywatności
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="5. Zarządzanie plikami cookies">
        <Para>
          Możesz usunąć pliki cookies lub zablokować ich zapisywanie w ustawieniach przeglądarki. Zablokowanie cookies
          sesji uniemożliwi logowanie się do Serwisu.
        </Para>
      </LegalSection>

      <LegalSection title="6. Zmiany i kontakt">
        <Para>
          Zestaw stosowanych plików cookies może się zmienić; aktualna informacja będzie publikowana na tej stronie. W
          sprawach dotyczących prywatności napisz na adres <MailLink email={CONTACT_EMAILS.privacy} />.
        </Para>
      </LegalSection>
    </LegalPage>
  );
}
