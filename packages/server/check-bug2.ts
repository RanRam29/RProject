import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://pm_user:pm_password@localhost:5433/pm_dev?schema=public"
        }
    }
});

async function main() {
    const email = 'ranramidf@gmail.com';
    console.log(`Checking notifications for ${email}...`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error('User not found');
        return;
    }

    const unreadCount = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
    });
    console.log('Backend Count query returned:', unreadCount);

    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    console.log(`Backend List query returned ${notifications.length} items`);
    if (notifications.length > 0) {
        console.log('Sample item:', notifications[0]);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
