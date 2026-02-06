import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pm.local' },
    update: {},
    create: {
      email: 'admin@pm.local',
      passwordHash,
      displayName: 'System Admin',
      systemRole: 'SYS_ADMIN',
    },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
