import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, Para, Bullets, MailLink } from "@/components/LegalPage";
import { CONTACT_EMAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Zgłoś naruszenie — WexEye",
  description:
    "Jak zgłosić do WexEye treść nielegalną, naruszenie praw autorskich, materiał intymny opublikowany bez zgody (NCII), zagrożenie dla dzieci lub inne naruszenie zasad. Zgłoszenie nie wymaga konta.",
};

export default function ZglosNaruszeniePage() {
  return (
    <LegalPage
      title="Zgłoś naruszenie"
      interimNote="Zgłoszenia przyjmujemy obecnie pocztą elektroniczną. Nie musisz mieć konta w WexEye. Formularz zgłoszeniowy w serwisie nie jest jeszcze dostępny."
    >
      <LegalSection title="Pilne sprawy">
        <Bullets>
          <li>
            <a href="#ncii" className="underline">
              Intymny materiał opublikowany bez zgody (NCII)
            </a>
          </li>
          <li>
            <a href="#dzieci" className="underline">
              Bezpieczeństwo dzieci, podejrzenie CSAM lub groomingu
            </a>
          </li>
        </Bullets>
        <Para>
          W przypadku bezpośredniego zagrożenia życia lub zdrowia skontaktuj się z właściwymi lokalnymi służbami
          ratunkowymi lub organami ścigania. Nie czekaj na odpowiedź od nas.
        </Para>
      </LegalSection>

      <LegalSection title="Jak zgłaszać">
        <Para>
          Napisz na adres właściwy dla rodzaju sprawy (poniżej). W zgłoszeniu podaj adres URL treści w WexEye, krótki
          opis problemu oraz sposób kontaktu z Tobą. Nie podawaj haseł ani danych płatniczych.
        </Para>
      </LegalSection>

      <LegalSection id="nielegalne" title="A. Treść nielegalna i sprawy prawne">
        <Para>
          Adres: <MailLink email={CONTACT_EMAILS.legal} subject="Zgłoszenie treści nielegalnej" />
        </Para>
        <Para>Poproś o rozpatrzenie treści, którą uważasz za niezgodną z prawem. Podaj:</Para>
        <Bullets>
          <li>adres URL treści,</li>
          <li>rodzaj zgłaszanej treści,</li>
          <li>uzasadnienie zgłoszenia,</li>
          <li>kraj lub jurysdykcję, jeżeli ma to znaczenie dla oceny,</li>
          <li>dane kontaktowe do odpowiedzi.</li>
        </Bullets>
        <Para>Nie musisz mieć konta w WexEye.</Para>
      </LegalSection>

      <LegalSection id="prawa-autorskie" title="B. Prawa autorskie">
        <Para>
          Adres: <MailLink email={CONTACT_EMAILS.copyright} subject="Zgłoszenie naruszenia praw autorskich" />
        </Para>
        <Para>W zgłoszeniu podaj co najmniej:</Para>
        <Bullets>
          <li>identyfikację chronionego utworu,</li>
          <li>adres URL materiału w WexEye, który Twoim zdaniem narusza prawa,</li>
          <li>dane kontaktowe,</li>
          <li>opis podstawy zgłoszenia,</li>
          <li>oświadczenie, że zgłoszenie jest składane w dobrej wierze.</li>
        </Bullets>
      </LegalSection>

      <LegalSection id="ncii" title="C. Intymne materiały opublikowane bez zgody (NCII)">
        <Para>
          Dotyczy zdjęć lub nagrań o charakterze intymnym, opublikowanych bez zgody osoby przedstawionej. Takie
          zgłoszenia są traktowane priorytetowo.
        </Para>
        <Para>
          Adres: <MailLink email={CONTACT_EMAILS.safety} subject="Zgłoszenie NCII" />
        </Para>
        <p className="mb-3 rounded border border-black/20 p-3 text-sm font-semibold dark:border-white/20">
          Nie przesyłaj nam kopii intymnego materiału.
        </p>
        <Para>Wystarczy, że wskażesz:</Para>
        <Bullets>
          <li>adres URL treści w WexEye,</li>
          <li>krótki opis problemu,</li>
          <li>informację pozwalającą zidentyfikować materiał (np. tytuł publikacji, konto, które ją opublikowało),</li>
          <li>sposób kontaktu z Tobą.</li>
        </Bullets>
        <Para>
          Zgłoszenie możesz złożyć jako osoba przedstawiona na materiale albo jako jej przedstawiciel. Nie musisz mieć
          konta w WexEye.
        </Para>
      </LegalSection>

      <LegalSection id="dzieci" title="D. Bezpieczeństwo dzieci, CSAM, grooming">
        <Para>
          Dotyczy podejrzenia treści przedstawiających seksualne wykorzystywanie dzieci (CSAM), seksualnego
          wykorzystywania dziecka, groomingu lub innego bezpośredniego zagrożenia dziecka.
        </Para>
        <Para>
          Adres: <MailLink email={CONTACT_EMAILS.safety} subject="Zgłoszenie bezpieczeństwa dzieci" />
        </Para>
        <p className="mb-3 rounded border border-black/20 p-3 text-sm font-semibold dark:border-white/20">
          Nie przesyłaj kopii materiału przedstawiającego seksualne wykorzystywanie dzieci.
        </p>
        <Para>Wystarczy, że podasz:</Para>
        <Bullets>
          <li>adres URL lub identyfikator treści,</li>
          <li>opis sytuacji,</li>
          <li>dane kontaktowe.</li>
        </Bullets>
        <Para>
          W przypadku bezpośredniego zagrożenia życia lub zdrowia dziecka skontaktuj się niezwłocznie z właściwymi
          lokalnymi służbami ratunkowymi lub organami ścigania.
        </Para>
      </LegalSection>

      <LegalSection id="inne" title="E. Inne naruszenia zasad">
        <Para>
          Adres: <MailLink email={CONTACT_EMAILS.legal} subject="Zgłoszenie naruszenia zasad" />
        </Para>
        <Para>
          Dotyczy naruszeń{" "}
          <Link href="/zasady-spolecznosci" className="underline">
            Zasad społeczności
          </Link>{" "}
          lub{" "}
          <Link href="/regulamin" className="underline">
            Regulaminu
          </Link>
          , np. nękania, podszywania się, oszustw czy spamu. Podaj adres URL treści lub konta, opis problemu i dane
          kontaktowe.
        </Para>
      </LegalSection>

      <LegalSection title="Inne kontakty">
        <Para>
          Pozostałe sprawy oraz dane operatora znajdziesz na stronie{" "}
          <Link href="/kontakt" className="underline">
            Kontakt
          </Link>
          .
        </Para>
      </LegalSection>
    </LegalPage>
  );
}
