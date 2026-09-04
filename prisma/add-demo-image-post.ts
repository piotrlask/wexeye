import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const author = await prisma.user.findUnique({ where: { email: "redaktor@wexeye.com" } });
  if (!author) throw new Error("Brak użytkownika redaktor@wexeye.com — uruchom najpierw seed.");

  const article = await prisma.article.create({
    data: {
      title: "Zachód słońca nad miastem",
      body: "Dziś wieczorem niebo nad miastem zabarwiło się na pomarańczowo — piękny koniec dnia. Dzielimy się tym widokiem ze wszystkimi w okolicy.",
      category: "Stories",
      postType: "PHOTO",
      status: "PUBLISHED",
      publishedAt: new Date(),
      eventAt: new Date(),
      sourceType: "WITNESSED",
      hashtags: "#zachodslonca #miasto",
      authorId: author.id,
      media: { create: [{ type: "PHOTO", url: "/uploads/demo-photo.svg" }] },
    },
  });

  console.log("Dodano publikację z obrazem:", article.id, "-", article.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
