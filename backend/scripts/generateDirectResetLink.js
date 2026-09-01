import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDirectLink() {
  const token = 'demo-token-' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de vigencia para pruebas cómodas

  const user = await prisma.platformUser.findFirst({
    where: { isActive: true }
  });

  if (!user) {
    console.error('No se encontró ningún usuario activo en la BD.');
    return;
  }

  await prisma.platformUser.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExpires: expiresAt
    }
  });

  const directUrl = `http://localhost:4000/?token=${token}`;

  console.log('=== ENLACE DIRECTO DE RESTABLECIMIENTO GENERADO ===\n');
  console.log(`Usuario Asignado: ${user.fullName} (${user.username})`);
  console.log(`Correo Asociado:  ${user.email}`);
  console.log(`Vigencia:         24 horas (hasta ${expiresAt.toLocaleString('es-CL')})`);
  console.log('\nEnlace Directo para el Navegador:');
  console.log(directUrl);
  console.log('\n==================================================');
}

generateDirectLink().catch(console.error).finally(() => prisma.$disconnect());
