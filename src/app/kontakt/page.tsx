import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, Para, Bullets, MailLink } from "@/components/LegalPage";
import { OPERATOR, CONTACT_EMAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Kontakt i dane operatora — WexEye",
  description:
    "Dane operatora serwisu WexEye (APIL Sp. z o.o.) oraz adresy kontaktowe w sprawach ogólnych, prywatności, prawnych, praw autorskich i bezpieczeństwa.",
};

export default function KontaktPage() {
  return (
    <LegalPage title="Kontakt i dane operatora" showUpdated={false}>
      <LegalSection title="Operator serwisu">
        <Para>WexEye jest prowadzone przez:</Para>
        <address className="mb-3 text-sm not-italic leading-relaxed">
          <strong>{OPERATOR.name}</strong>
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.postalCode} {OPERATOR.city}
          <br />
          {OPERATOR.country}
        </address>
        <Bullets>
          <li>NIP: {OPERATOR.nip}</li>
          <li>REGON: {OPERATOR.regon}</li>
          <li>KRS: {OPERATOR.krs}</li>
        </Bullets>
      </LegalSection>

      <LegalSection title="Adresy kontaktowe">
        <Para>Wybierz adres najlepiej pasujący do sprawy.</Para>
        <dl className="mb-3 space-y-4 text-sm leading-relaxed">
          <div>
            <dt className="font-medium">Kontakt ogólny</dt>
            <dd>
              <MailLink email={CONTACT_EMAILS.general} />
            </dd>
          </div>
          <div>
            <dt className="font-medium">Prywatność i dane osobowe</dt>
            <dd>
              <MailLink email={CONTACT_EMAILS.privacy} />
            </dd>
          </div>
          <div>
            <dt className="font-medium">Sprawy prawne i zgłoszenia nielegalnych treści</dt>
            <dd>
              <MailLink email={CONTACT_EMAILS.legal} />
            </dd>
          </div>
          <div>
            <dt className="font-medium">Prawa autorskie</dt>
            <dd>
              <MailLink email={CONTACT_EMAILS.copyright} />
            </dd>
          </div>
          <div>
            <dt className="font-medium">Bezpieczeństwo, materiały intymne (NCII) i bezpieczeństwo dzieci</dt>
            <dd>
              <MailLink email={CONTACT_EMAILS.safety} />
            </dd>
          </div>
        </dl>
        <Para>
          Nie przesyłaj w wiadomościach haseł ani danych karty płatniczej. Szczegółowe instrukcje dotyczące
          zgłaszania naruszeń znajdziesz na stronie{" "}
          <Link href="/zglos-naruszenie" className="underline">
            Zgłoś naruszenie
          </Link>
          .
        </Para>
      </LegalSection>

      <LegalSection title="Dokumenty i zasady">
        <Bullets>
          <li>
            <Link href="/regulamin" className="underline">
              Regulamin
            </Link>
          </li>
          <li>
            <Link href="/prywatnosc" className="underline">
              Polityka prywatności
            </Link>
          </li>
          <li>
            <Link href="/cookies" className="underline">
              Informacja o plikach cookies
            </Link>
          </li>
          <li>
            <Link href="/zasady-spolecznosci" className="underline">
              Zasady społeczności
            </Link>
          </li>
        </Bullets>
      </LegalSection>
    </LegalPage>
  );
}
