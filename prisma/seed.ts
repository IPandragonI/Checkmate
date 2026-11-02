import {PrismaClient} from '@prisma/client';
import {BOT_DEFINITIONS} from '../src/lib/bots-data';
const prisma = new PrismaClient();
const p = prisma as any;

async function seedBots() {
    if (await p.bot.count() > 0) {
        console.log("Bots already seeded");
        return;
    }
    const bots = BOT_DEFINITIONS;

    for (const bot of bots) {
        await p.bot.upsert({
            where: {username: bot.username},
            update: bot,
            create: bot
        });
    }
    console.log(`Seeded ${bots.length} bots`);
}

async function main() {
    await seedBots();
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
