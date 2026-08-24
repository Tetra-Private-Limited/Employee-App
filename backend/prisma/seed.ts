import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_ADMIN_EMAIL = 'admin@example.com';
const SEED_ADMIN_PASSWORD = 'Admin@12345';

async function main() {
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

  await prisma.employee.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {},
    create: {
      employeeCode: 'ADM001',
      name: 'Admin User',
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      department: 'Management',
      designation: 'System Administrator',
    },
  });

  console.log(`Seed complete. Admin login: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
  console.log('Change this password after first login.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
