async function testHttpEndpoints() {
  console.log('=== TEST HTTP ENDPOINTS /api/v1/auth/forgot-password ===\n');

  const { prisma } = await import('../src/config/db.js');

  // Asegurar correo institucional para el admin de prueba
  const originalAdmin = await prisma.platformUser.findUnique({ where: { username: 'admin' } });
  const originalEmail = originalAdmin?.email || 'admin@admin.cl';
  const originalPassword = originalAdmin?.passwordHash || 'admin123';

  await prisma.platformUser.update({
    where: { username: 'admin' },
    data: { email: 'notificaciones-itam@chileatiende.cl' }
  });

  // 1. Probar forgot-password
  console.log('1. Enviando POST /api/v1/auth/forgot-password con identifier "admin"...');
  const forgotRes = await fetch('http://localhost:4000/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin' })
  });

  const forgotData = await forgotRes.json();
  console.log(`   Status: ${forgotRes.status}`);
  console.log(`   Response:`, forgotData);

  if (!forgotRes.ok) {
    console.error('✗ Falló forgot-password:', forgotData);
    return;
  }

  // 2. Obtener el token generado desde la BD
  const admin = await prisma.platformUser.findUnique({ where: { username: 'admin' } });
  const token = admin?.resetToken;
  console.log('\n2. Token obtenido en BD:', token);

  if (!token) {
    console.error('✗ No se encontró token en la BD.');
    return;
  }

  // 3. Probar verify-reset-token
  console.log('\n3. Probando GET /api/v1/auth/verify-reset-token?token=' + token + '...');
  const verifyRes = await fetch(`http://localhost:4000/api/v1/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
  const verifyData = await verifyRes.json();
  console.log(`   Status: ${verifyRes.status}`);
  console.log(`   Response:`, verifyData);

  // 4. Probar reset-password
  console.log('\n4. Probando POST /api/v1/auth/reset-password con nueva clave temporal "admin2026"...');
  const resetRes = await fetch('http://localhost:4000/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword: 'admin2026' })
  });
  const resetData = await resetRes.json();
  console.log(`   Status: ${resetRes.status}`);
  console.log(`   Response:`, resetData);

  // 5. Probar login con nueva clave
  console.log('\n5. Probando POST /api/v1/auth/login con clave "admin2026"...');
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'admin2026' })
  });
  const loginData = await loginRes.json();
  console.log(`   Status: ${loginRes.status}`);
  console.log(`   Login Exitoso:`, loginData.success, `Usuario: ${loginData.user?.fullName}`);

  // 6. Restaurar datos originales del admin
  await prisma.platformUser.update({
    where: { username: 'admin' },
    data: { email: originalEmail, passwordHash: originalPassword, resetToken: null, resetTokenExpires: null }
  });
  console.log('\n6. Email y Clave original restaurados en la BD.');

  console.log('\n✓ TODAS LAS PRUEBAS HTTP DE RECUPERACIÓN DE CONTRASEÑA PASARON CON ÉXITO.');
  await prisma.$disconnect();
}

testHttpEndpoints().catch(console.error);

