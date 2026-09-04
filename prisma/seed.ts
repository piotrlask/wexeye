import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}. Ustaw ją przed uruchomieniem seeda.`);
  }
  return value;
}

async function main() {
  // Fail fast, before creating anything, if any required password is missing.
  const adminPassword = requireEnv("SEED_ADMIN_PASSWORD");
  const editorPassword = requireEnv("SEED_EDITOR_PASSWORD");
  const readerPassword = requireEnv("SEED_READER_PASSWORD");

  const adminEmail = "admin@wexeye.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log("Dane już istnieją, pomijam seed.");
    return;
  }

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.create({
    data: { email: adminEmail, passwordHash: adminHash, name: "Administrator", role: "ADMIN" },
  });

  const editorHash = await bcrypt.hash(editorPassword, 10);
  const rootEditor = await prisma.user.create({
    data: {
      email: "redaktor@wexeye.com",
      passwordHash: editorHash,
      name: "Ala Redaktor",
      role: "EDITOR",
    },
  });

  const subEditor = await prisma.user.create({
    data: {
      email: "podredaktor@wexeye.com",
      passwordHash: editorHash,
      name: "Bartek Podredaktor",
      role: "EDITOR",
      sponsorId: rootEditor.id,
    },
  });

  const now = new Date();

  await prisma.article.create({
    data: {
      title: "Witamy na wexeye.com",
      body: "To jest przykładowy, opublikowany artykuł widoczny dla wszystkich odwiedzających. Pierwsza połowa tego tekstu jest zawsze darmowa. Druga połowa oraz drugie zdjęcie są dostępne wyłącznie po wykupieniu dostępu — pojedynczego artykułu za 2 dolary, subskrypcji 20 artykułów miesięcznie za 20 dolarów, albo pełnego dostępu bez limitu za 30 dolarów miesięcznie. Dziękujemy za odwiedziny i zapraszamy do zapoznania się z resztą treści po zalogowaniu i wykupieniu dostępu.",
      category: "Stories",
      postType: "STORY",
      status: "PUBLISHED",
      publishedAt: now,
      eventAt: now,
      sourceType: "UNKNOWN",
      hashtags: "#wexeye #welcome",
      authorId: admin.id,
    },
  });

  await prisma.article.create({
    data: {
      title: "Jak działa nasz zespół redakcyjny",
      body: "Każdy redaktor może zaprosić do pięciu osób do swojego zespołu. Rejestracja jako redaktor jest bezpłatna — zarabia się na udziale w przychodach z płatnego dostępu do treści napisanych przez zespół, a nie na samym dołączeniu do struktury. To ważna różnica względem piramid finansowych, w których zarabia się na opłatach wpisowych nowych uczestników. Tutaj jedynym źródłem pieniędzy są realne wpłaty czytelników za dostęp do treści.",
      category: "Stories",
      postType: "OPINION",
      status: "PUBLISHED",
      publishedAt: now,
      eventAt: now,
      sourceType: "UNKNOWN",
      hashtags: "#redakcja #wexeye",
      authorId: subEditor.id,
    },
  });

  await prisma.article.create({
    data: {
      title: "Pożar magazynu w centrum Warszawy",
      body: "Strażacy walczą z pożarem hali magazynowej niedaleko centrum miasta. Droga jest zablokowana, służby proszą o unikanie okolicy. Na miejscu kilka zastępów straży pożarnej. Nikt na razie nie zgłosił poszkodowanych, trwa dogaszanie pożaru i wentylacja budynku.",
      category: "Alerts",
      postType: "ALERT",
      status: "PUBLISHED",
      publishedAt: now,
      eventAt: now,
      city: "Warszawa",
      region: "Mazowieckie",
      country: "Polska",
      continent: "Europa",
      latitude: 52.2297,
      longitude: 21.0122,
      sourceType: "WITNESSED",
      hashtags: "#pożar #warszawa #alert",
      authorId: rootEditor.id,
    },
  });

  await prisma.article.create({
    data: {
      title: "Wypadek na autostradzie A2 pod Poznaniem",
      body: "Zderzenie trzech samochodów spowodowało duże utrudnienia na autostradzie A2. Tworzą się kilkukilometrowe korki, zalecany objazd przez drogę krajową. Służby ratunkowe są już na miejscu.",
      category: "Traffic",
      postType: "ALERT",
      status: "PUBLISHED",
      publishedAt: now,
      eventAt: now,
      city: "Poznań",
      region: "Wielkopolskie",
      country: "Polska",
      continent: "Europa",
      latitude: 52.4064,
      longitude: 16.9252,
      sourceType: "TOLD",
      hashtags: "#wypadek #a2 #poznan",
      authorId: subEditor.id,
    },
  });

  await prisma.article.create({
    data: {
      title: "Festiwal muzyczny w parku miejskim",
      body: "W ten weekend w parku miejskim odbędzie się festiwal muzyki niezależnej. Wstęp wolny, na scenie kilkanaście lokalnych zespołów, food trucki i strefa dla dzieci.",
      category: "Events",
      postType: "EVENT",
      status: "PUBLISHED",
      publishedAt: now,
      eventAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      city: "Berlin",
      region: "Berlin",
      country: "Niemcy",
      continent: "Europa",
      latitude: 52.52,
      longitude: 13.405,
      sourceType: "TOLD",
      hashtags: "#festiwal #muzyka #berlin",
      authorId: rootEditor.id,
    },
  });

  await prisma.article.create({
    data: {
      title: "Lokalny bohater uratował psa z zamarzniętego stawu",
      body: "Mieszkaniec osiedla zauważył tonącego psa i bez wahania wskoczył do lodowatej wody, by go uratować. Zwierzę trafiło pod opiekę weterynarza i czuje się dobrze. Sąsiedzi zbierają się, by podziękować bohaterowi.",
      category: "People",
      postType: "STORY",
      status: "PUBLISHED",
      publishedAt: now,
      eventAt: now,
      city: "Kraków",
      region: "Małopolskie",
      country: "Polska",
      continent: "Europa",
      latitude: 50.0647,
      longitude: 19.945,
      sourceType: "WITNESSED",
      hashtags: "#bohater #krakow #zwierzeta",
      authorId: subEditor.id,
    },
  });

  const readerHash = await bcrypt.hash(readerPassword, 10);
  const reader = await prisma.user.create({
    data: {
      email: "czytelnik@wexeye.com",
      passwordHash: readerHash,
      name: "Czesiek Czytelnik",
      role: "READER",
    },
  });

  // Demo subscription so the unlock flow can be tested without a real Stripe account.
  await prisma.subscription.create({
    data: {
      userId: reader.id,
      tier: "SUB20",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      articlesUsedInPeriod: 0,
    },
  });

  // Hasła celowo nie są tu wypisywane — pochodzą ze zmiennych środowiskowych
  // podanych przez tego, kto uruchamia seed, więc już je zna.
  console.log("Utworzono konta:");
  console.log("  admin:", adminEmail);
  console.log("  redaktor (root):", rootEditor.email);
  console.log("  redaktor (pod redaktor@wexeye.com):", subEditor.email);
  console.log("  czytelnik (z aktywną subskrypcją SUB20):", reader.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
