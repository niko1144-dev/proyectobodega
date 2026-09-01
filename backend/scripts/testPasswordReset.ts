import { prisma } from '../src/config/db.js';
import { EmailService } from '../src/services/emailService.js';

async function main() {
  console.log('=== TEST SISTEMA DE RECUPERACIÓN DE CONTRASEÑA ===\n');

  // 1. Consultar usuario admin
  const admin = await prisma.platformUser.findUnique({
    where: { username: 'admin' }
  });

  if (!admin) {
    console.error('Usuario admin no encontrado en la BD.');
    return;
  }

  console.log('1. Usuario detectado:');
  console.log(`   - ID: ${admin.id}`);
  console.log(`   - Username: ${admin.username}`);
  console.log(`   - Nombre: ${admin.fullName}`);
  console.log(`   - Email: ${admin.email}`);
  console.log(`   - Hash Clave Actual: ${admin.passwordHash}`);

  // 2. Probar generación de token simulando forgot-password
  const token = 'test-token-' + Date.now();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.platformUser.update({
    where: { id: admin.id },
    data: { resetToken: token, resetTokenExpires: expiresAt }
  });
  console.log('\n2. Token asignado en BD exitosamente:', token);

  // 3. Probar verificación de token
  const verifiedUser = await prisma.platformUser.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: { gt: new Date() }
    }
  });

  if (!verifiedUser) {
    console.error('ERROR: No se pudo verificar el token.');
    return;
  }
  console.log('3. Token verificado exitosamente para:', verifiedUser.fullName);

  // 4. Limpiar token de prueba
  await prisma.platformUser.update({
    where: { id: admin.id },
    data: { resetToken: null, resetTokenExpires: null }
  });
  console.log('4. Token de prueba limpiado correctamente.');

  console.log('\n✓ Todos los tests unitarios de BD para Password Reset pasaron exitosamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
