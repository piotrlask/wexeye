import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, Para, Bullets, MailLink } from "@/components/LegalPage";
import { CONTACT_EMAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Zasady społeczności — WexEye",
  description:
    "Zasady społeczności WexEye: jakie treści są dozwolone, co jest zabronione (m.in. CSAM, NCII, nękanie, doxxing, oszustwa), treści polityczne i reklamy polityczne oraz jak zgłaszać naruszenia.",
};

export default function ZasadySpolecznosciPage() {
  return (
    <LegalPage
      title="Zasady społeczności"
      interimNote="To jest wersja tymczasowa zasad. Będzie uzupełniana o dalsze wyjaśnienia i przykłady."
    >
      <LegalSection title="1. Cel zasad">
        <Para>
          WexEye jest miejscem do publikowania i czytania relacji o wydarzeniach. Zasady poniżej mają chronić
          użytkowników i osoby, których treści dotyczą. Uzupełniają{" "}
          <Link href="/regulamin" className="underline">
            Regulamin
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="2. Co jest dozwolone">
        <Bullets>
          <li>relacje z wydarzeń, reportaże i opinie, w tym dotyczące spraw publicznych i polityki,</li>
          <li>publikowanie własnych zdjęć i nagrań oraz materiałów, do których masz prawa,</li>
          <li>komentowanie i dyskusja z poszanowaniem innych osób.</li>
        </Bullets>
      </LegalSection>

      <LegalSection title="3. Co jest zabronione">
        <h3 className="mb-1 text-sm font-semibold">Bezpieczeństwo dzieci</h3>
        <Para>
          Zabronione są materiały przedstawiające seksualne wykorzystywanie dzieci (CSAM), treści seksualizujące
          małoletnich oraz grooming. Takie treści są zgłaszane właściwym organom w zakresie wymaganym prawem.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Treści seksualne i NCII</h3>
        <Para>
          Zabroniona jest pornografia i inne treści seksualne o charakterze NSFW. Zabronione jest też publikowanie
          intymnych zdjęć lub nagrań osoby bez jej zgody (NCII), w tym materiałów o charakterze intymnym
          przetworzonych lub wygenerowanych tak, by przedstawiały prawdziwą osobę. Zgłoszenia NCII traktujemy
          priorytetowo.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Przemoc, groźby, nękanie</h3>
        <Bullets>
          <li>groźby i nawoływanie do przemocy,</li>
          <li>nękanie, stalking i celowe zastraszanie,</li>
          <li>przemoc publikowana w celu poniżenia, szokowania lub gloryfikowania jej,</li>
          <li>treści nawołujące do nienawiści wobec osób lub grup.</li>
        </Bullets>
        <Para>
          Materiały pokazujące przemoc mogą być dopuszczalne, gdy mają wyraźny charakter informacyjny (relacja z
          wydarzenia), ale mogą zostać ograniczone lub usunięte zależnie od kontekstu.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Prywatność i doxxing</h3>
        <Para>
          Zabronione jest publikowanie cudzych danych osobowych (np. adresu zamieszkania, numeru telefonu, dokumentów)
          w celu zaszkodzenia osobie lub jej narażenia oraz naruszanie prywatności osób trzecich.
        </Para>
        <h3 className="mb-1 text-sm font-semibold">Podszywanie się, oszustwa, spam</h3>
        <Bullets>
          <li>podszywanie się pod inne osoby, redakcje lub organizacje,</li>
          <li>oszustwa i wyłudzenia, w tym phishing,</li>
          <li>złośliwe oprogramowanie,</li>
          <li>spam i wprowadzające w błąd masowe publikowanie.</li>
        </Bullets>
        <h3 className="mb-1 text-sm font-semibold">Nielegalne towary i usługi oraz prawa autorskie</h3>
        <Bullets>
          <li>handel nielegalnymi towarami lub usługami,</li>
          <li>treści naruszające prawa autorskie lub inne prawa osób trzecich,</li>
          <li>inne treści niezgodne z prawem.</li>
        </Bullets>
      </LegalSection>

      <LegalSection title="4. Treści polityczne i reklamy polityczne">
        <Para>
          Treści polityczne, takie jak artykuły, reportaże, opinie i dyskusje o polityce, są dozwolone i podlegają
          tym samym zasadom co inne treści. Nie są automatycznie uznawane za reklamę polityczną.
        </Para>
        <Para>
          Płatne reklamy polityczne (opłacone materiały promujące partię, kandydata, kampanię lub sprawę polityczną) są
          w WexEye zabronione.
        </Para>
      </LegalSection>

      <LegalSection title="5. Moderacja i konsekwencje naruszeń">
        <Para>
          Operator może ograniczyć widoczność treści, odmówić jej publikacji, usunąć ją lub ograniczyć konto
          użytkownika, jeżeli narusza ona zasady albo prawo. Ocena zależy od kontekstu, wagi naruszenia i
          obowiązujących przepisów. W szczególnie poważnych przypadkach Operator może przekazać informacje organom
          ścigania, jeżeli wymaga tego prawo.
        </Para>
      </LegalSection>

      <LegalSection title="6. Jak zgłaszać naruszenia">
        <Para>
          Naruszenia zgłosisz na stronie{" "}
          <Link href="/zglos-naruszenie" className="underline">
            Zgłoś naruszenie
          </Link>
          . Zgłoszenie nie wymaga konta. Pilne sprawy dotyczące materiałów intymnych publikowanych bez zgody lub
          bezpieczeństwa dzieci kieruj na <MailLink email={CONTACT_EMAILS.safety} />; nie przesyłaj w nich kopii
          samego materiału.
        </Para>
      </LegalSection>

      <LegalSection title="7. Odwołania i pytania">
        <Para>
          Jeżeli uważasz, że treść lub konto zostały ograniczone niesłusznie, napisz na adres{" "}
          <MailLink email={CONTACT_EMAILS.general} />. Formalny, zautomatyzowany proces odwołań nie jest jeszcze
          dostępny.
        </Para>
      </LegalSection>
    </LegalPage>
  );
}
