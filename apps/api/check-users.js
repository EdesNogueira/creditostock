const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, name: true, role: true, companyId: true, isActive: true },
  });
  console.log('Users:', JSON.stringify(users, null, 2));

  if (users.length === 0) {
    console.log('\nNo users found! Recreating...');
    const companies = await p.company.findMany({ select: { id: true, name: true } });
    console.log('Companies:', JSON.stringify(companies));

    if (companies.length > 0) {
      const hash = await bcrypt.hash('edes123456', 12);
      await p.user.create({
        data: { companyId: companies[0].id, email: 'admin@lastro.com.br', name: 'Administrador Lastro', passwordHash: hash, role: 'ADMIN' },
      });
      const hash2 = await bcrypt.hash('gabriel12345', 12);
      await p.user.create({
        data: { companyId: companies[0].id, email: 'gabrielteste@lastro.com.br', name: 'Gabriel Teste', passwordHash: hash2, role: 'ANALYST' },
      });
      console.log('Users recreated!');
    }
  } else {
    // Reset password for admin
    const admin = users.find(u => u.email === 'admin@lastro.com.br');
    if (admin) {
      const hash = await bcrypt.hash('edes123456', 12);
      await p.user.update({ where: { id: admin.id }, data: { passwordHash: hash } });
      console.log('Password reset for admin@lastro.com.br');
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
