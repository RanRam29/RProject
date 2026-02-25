import { PrismaClient } from '@prisma/client';
import { notificationsService } from './src/modules/notifications/notifications.service.js';

const prisma = new PrismaClient();

async function main() {
    const email = 'ranramidf@gmail.com';
    console.log(`Looking up user by email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        return;
    }

    console.log(`Found user: ${user.id} (${user.displayName})`);

    console.log('Dispatching test notification...');

    const notif = await notificationsService.create({
        userId: user.id,
        type: 'SYSTEM' as any, // Or whatever types exist, e.g. MENTION or PERMISSION_CHANGED
        title: 'Test Notification: Cyber-Glass Redesign',
        body: 'This is a test notification to verify delivery after the recent UI fixes.',
    });

    console.log('Notification created successfully:', notif.id);
}

main()
    .catch((e) => {
        console.error('Script failed:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        // Force exit to ensure fire-and-forget promises don't hang the script indefinitely
        setTimeout(() => process.exit(0), 1000);
    });
