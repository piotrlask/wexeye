import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, Para, Bullets, MailLink } from "@/components/LegalPage";
import { OPERATOR, CONTACT_EMAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Regulamin WexEye — wersja tymczasowa",
  description:
    "Tymczasowy regulamin serwisu WexEye prowadzonego przez APIL Sp. z o.o.: konta, treści użytkowników, treści zabronione, moderacja, płatności i usuwanie konta.",
};

export default function RegulaminPage() {
  return (
    <LegalPage
      title="Regulamin WexEye — wersja tymczasowa"
      interimNote="To jest wersja tymczasowa regulaminu. Będzie uzupełniana i aktualizowana. Aktualna wersja i data ostatniej zmiany są zawsze podane na tej stronie."
    >
      <LegalSection title="1. Operator i postanowienia ogólne">
        <Para>
          Serwis WexEye (dalej: „WexEye” lub „Serwis”) jest prowadzony przez {OPERATOR.name} z siedzibą pod adresem{" "}
          {OPERATOR.street}, {OPERATOR.postalCode} {OPERATOR.city}, {OPERATOR.country}, NIP {OPERATOR.nip}, REGON{" "}
          {OPERATOR.regon}, KRS {OPERATOR.krs} (dalej: „Operator”).
        </Para>
        <Para>
          Regulamin określa zasady korzystania z Serwisu. Korzystając z Serwisu, użytkownik potwierdza, że zapoznał
          się z jego treścią. Regulamin nie ogranicza praw wynikających z przepisów prawa, których nie można wyłączyć
          umownie, w szczególności praw konsumentów.
        </Para>
      </LegalSection>

      <LegalSection title="2. Charakter platformy">
        <Para>
          WexEye jest platformą internetową do publikowania i udostępniania treści przez użytkowników, w tym w formie
          dziennikarstwa obywatelskiego i publikacji społecznościowych. W zależności od uprawnień konta i dostępnych
          funkcji użytkownicy mogą między innymi przeglądać treści, zakładać konta i profile, komentować, reagować na
          treści, udostępniać je znajomym, nawiązywać relacje z innymi użytkownikami oraz otrzymywać powiadomienia.
          Publikowanie artykułów jest dostępne dla kont z rolą redaktora. Nowe artykuły mogą podlegać weryfikacji
          przed publikacją.
        </Para>
      </LegalSection>

      <LegalSection title="3. Konta użytkowników">
        <Bullets>
          <li>Użytkownik podaje prawdziwe dane i odpowiada za ich aktualność.</li>
          <li>
            Użytkownik odpowiada za bezpieczeństwo swojego konta, w tym za zachowanie hasła w tajemnicy. O podejrzeniu
            nieuprawnionego dostępu do konta należy niezwłocznie poinformować Operatora pod adresem{" "}
            <MailLink email={CONTACT_EMAILS.general} />.
          </li>
          <li>
            Zabronione jest nadużywanie kont, w tym podszywanie się pod inne osoby lub podmioty oraz zakładanie kont w
            celu obchodzenia zasad Serwisu.
          </li>
        </Bullets>
        <Para>
          Korzystanie z WexEye podlega wymaganiom wieku określonym dla danej usługi i właściwego prawa. Szczegółowe
          zasady wieku są obecnie aktualizowane.
        </Para>
      </LegalSection>

      <LegalSection title="4. Treści użytkowników">
        <Bullets>
          <li>Użytkownik zachowuje prawa do treści, które publikuje w Serwisie.</li>
          <li>
            Użytkownik odpowiada za to, że ma prawo opublikować daną treść, w tym za posiadanie praw autorskich do
            tekstów, zdjęć i nagrań oraz — w zakresie wymaganym przez prawo — zgód osób w nich przedstawionych.
          </li>
          <li>Nie wolno publikować treści naruszających prawa innych osób.</li>
        </Bullets>
        <Para>
          Publikując treść w Serwisie, użytkownik udziela Operatorowi niewyłącznego uprawnienia w zakresie niezbędnym
          technicznie do prowadzenia Serwisu, to jest do hostowania, przechowywania, wyświetlania i udostępniania tej
          treści w ramach funkcjonowania usługi. Uprawnienie to nie oznacza przeniesienia praw autorskich ani nie
          obejmuje wykorzystywania treści poza Serwisem lub do celów niezwiązanych z jego funkcjonowaniem.
        </Para>
        <Para>
          To, że użytkownik odpowiada za publikowane treści, nie wyłącza ani nie ogranicza obowiązków Operatora
          wynikających z obowiązujących przepisów, w tym obowiązków związanych z reagowaniem na zgłoszenia dotyczące
          treści niezgodnych z prawem.
        </Para>
      </LegalSection>

      <LegalSection title="5. Treści zabronione">
        <Para>W Serwisie zabronione jest publikowanie w szczególności:</Para>
        <Bullets>
          <li>materiałów przedstawiających seksualne wykorzystywanie dzieci (CSAM) oraz treści związanych z groomingiem,</li>
          <li>pornografii i innych treści seksualnych o charakterze NSFW,</li>
          <li>intymnych materiałów opublikowanych bez zgody osoby przedstawionej (NCII),</li>
          <li>gróźb, nawoływania do przemocy oraz przemocy publikowanej w sposób niezgodny z zasadami Serwisu,</li>
          <li>nękania i stalkingu,</li>
          <li>treści nawołujących do nienawiści,</li>
          <li>ujawniania cudzych danych osobowych w celu wyrządzenia szkody (doxxing) i innych naruszeń prywatności,</li>
          <li>podszywania się pod inne osoby lub podmioty,</li>
          <li>oszustw, w tym phishingu, oraz złośliwego oprogramowania,</li>
          <li>handlu nielegalnymi towarami lub usługami,</li>
          <li>treści naruszających prawa autorskie lub inne prawa osób trzecich,</li>
          <li>innych treści bezprawnych.</li>
        </Bullets>
        <Para>
          Szczegółowe wyjaśnienia znajdują się w{" "}
          <Link href="/zasady-spolecznosci" className="underline">
            Zasadach społeczności
          </Link>
          . Ocena treści zależy od kontekstu i od prawa właściwego w danym przypadku; Regulamin nie zawiera
          jednolitej definicji prawnej każdej z powyższych kategorii dla wszystkich państw.
        </Para>
      </LegalSection>

      <LegalSection title="6. Treści polityczne i reklamy polityczne">
        <Para>
          Artykuły, reportaże, opinie i dyskusje dotyczące polityki są dopuszczalne i nie są automatycznie zabronione;
          podlegają tym samym zasadom co pozostałe treści. Płatne reklamy polityczne są w WexEye zabronione.
        </Para>
      </LegalSection>

      <LegalSection title="7. Moderacja">
        <Para>
          Operator może ograniczyć widoczność treści, odmówić jej publikacji, usunąć ją lub ograniczyć konto
          użytkownika, gdy jest to potrzebne dla bezpieczeństwa, egzekwowania zasad Serwisu lub wypełnienia obowiązków
          prawnych. Ten zapis opisuje uprawnienia Operatora; nie oznacza, że w Serwisie jest dostępna odrębna funkcja
          dla każdej z tych czynności.
        </Para>
      </LegalSection>

      <LegalSection title="8. Zgłaszanie naruszeń">
        <Para>
          Treści niezgodne z prawem lub z zasadami Serwisu można zgłaszać na stronie{" "}
          <Link href="/zglos-naruszenie" className="underline">
            Zgłoś naruszenie
          </Link>
          . Zgłoszenie nie wymaga konta w WexEye.
        </Para>
      </LegalSection>

      <LegalSection title="9. Prawa autorskie">
        <Para>
          Zgłoszenia dotyczące naruszenia praw autorskich należy kierować na adres{" "}
          <MailLink email={CONTACT_EMAILS.copyright} />, zgodnie z instrukcją na stronie{" "}
          <Link href="/zglos-naruszenie#prawa-autorskie" className="underline">
            Zgłoś naruszenie
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="10. Płatności, subskrypcje i reklamy">
        <Para>
          W Serwisie mogą występować płatne treści, subskrypcje oraz reklamy. Płatności są obsługiwane za pośrednictwem
          zewnętrznego operatora płatności. Reklamy polityczne są zabronione.
        </Para>
        <Para>
          Szczegółowe warunki transakcji oraz prawa konsumenta zależą od rodzaju produktu i właściwego prawa oraz są
          przedstawiane w procesie zakupu. Niniejszy regulamin nie zawiera jeszcze odrębnego opisu zasad zwrotów,
          anulowania subskrypcji i odstąpienia od umowy i nie ogranicza bezwzględnie obowiązujących praw konsumenta.
          W sprawach dotyczących płatności można pisać na adres <MailLink email={CONTACT_EMAILS.general} />.
        </Para>
      </LegalSection>

      <LegalSection title="11. Usunięcie konta">
        <Para>
          Użytkownik może usunąć swoje konto w panelu konta. Wymaga to podania aktualnego hasła i potwierdzenia
          operacji. Konto z aktywną subskrypcją nie może zostać usunięte, dopóki subskrypcja jest aktywna — w takiej
          sytuacji należy skontaktować się z Operatorem pod adresem <MailLink email={CONTACT_EMAILS.general} />.
        </Para>
        <Para>
          Usunięcie konta oznacza zanonimizowanie danych identyfikujących użytkownika, a konto nie może być
          już używane do logowania. Znajomości oraz powiadomienia należące do użytkownika są usuwane. Opublikowane
          artykuły i komentarze mogą pozostać w Serwisie bez wskazania tożsamości autora, a rekordy transakcyjne i
          rozliczeniowe mogą być przechowywane w zakresie potrzebnym do zachowania integralności publikacji,
          rozliczeń lub wypełnienia obowiązków prawnych. Usunięcie konta nie oznacza fizycznego skasowania
          wszystkich danych. Szczegóły opisuje{" "}
          <Link href="/prywatnosc" className="underline">
            Polityka prywatności
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="12. Zmiany i postanowienia końcowe">
        <Para>
          Regulamin może być zmieniany. Aktualna wersja jest dostępna na tej stronie wraz z datą ostatniej
          aktualizacji. W zależności od kraju zamieszkania użytkownika mogą mieć zastosowanie dodatkowe przepisy, w
          tym przepisy chroniące konsumentów, których nie można wyłączyć umownie; uzupełnienia regionalne mogą być
          dodawane w miarę potrzeb.
        </Para>
      </LegalSection>

      <LegalSection title="13. Kontakt">
        <Para>
          {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.postalCode} {OPERATOR.city}, {OPERATOR.country}. Kontakt ogólny:{" "}
          <MailLink email={CONTACT_EMAILS.general} />. Pozostałe adresy znajdziesz na stronie{" "}
          <Link href="/kontakt" className="underline">
            Kontakt
          </Link>
          .
        </Para>
      </LegalSection>
    </LegalPage>
  );
}
