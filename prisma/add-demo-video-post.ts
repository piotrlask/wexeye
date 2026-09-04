import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const author = await prisma.user.findUnique({ where: { email: "podredaktor@wexeye.com" } });
  if (!author) throw new Error("Brak użytkownika podredaktor@wexeye.com — uruchom najpierw seed.");

  const article = await prisma.article.create({
    data: {
      title: "Krótki materiał testowy",
      body: "Prosty, kilkusekundowy klip wideo dodany jako test obsługi materiałów wideo na wexeye. Wzorzec testowy z dźwiękiem — dokładnie to, czego potrzeba, żeby sprawdzić odtwarzacz na stronie publikacji.",
      category: "Stories",
      postType: "VIDEO",
      status: "PUBLISHED",
      publishedAt: new Date(),
      eventAt: new Date(),
      sourceType: "WITNESSED",
      hashtags: "#test #wideo",
      authorId: author.id,
      media: { create: [{ type: "VIDEO", url: "/uploads/demo-video.mp4" }] },
    },
  });

  console.log("Dodano publikację z filmem:", article.id, "-", article.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
