import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.faction.createMany({
    data: [
      { factionName: 'RED', factionColor: '#EF4444' },
      { factionName: 'BLUE', factionColor: '#3B82F6' },
      { factionName: 'GREEN', factionColor: '#22C55E' },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
