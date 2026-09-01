import { prisma } from '../src/config/db.js';

async function testNewAuthFlow() {
  console.log('🧪 Iniciando prueba del nuevo flujo de autenticación con contraseñas personalizadas...\n');

  const API_URL = 'http://localhost:4000/api/v1';

  // 1. Login como Administrador (admin / admin123)
  console.log('1️⃣ Probando login del Administrador (admin / admin123)...');
  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  if (!adminRes.ok || !adminData.success) {
    throw new Error(`Fallo login de admin: ${JSON.stringify(adminData)}`);
  }
  console.log(`   ✅ Login Admin exitoso: ${adminData.user.fullName} (Rol: ${adminData.user.role})\n`);

  // 2. Verificar que cfloresc existe en userADCache
  console.log('2️⃣ Verificando funcionario cfloresc en userADCache...');
  const cfloresAD = await prisma.userADCache.findFirst({
    where: { samAccountName: 'cfloresc' }
  });
  if (!cfloresAD) {
    throw new Error('cfloresc no se encuentra en userADCache.');
  }
  console.log(`   ✅ Encontrado en catálogo local: ${cfloresAD.fullName} (${cfloresAD.email})\n`);

  // 3. Intentar login de cfloresc ANTES de ser activado por el mantenedor
  console.log('3️⃣ Probando login de cfloresc SIN haber sido activado...');
  const pendingLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'cfloresc', password: 'password123' })
  });
  const pendingData = await pendingLoginRes.json();
  if (pendingLoginRes.status === 403) {
    console.log(`   ✅ Acceso denegado correctamente (HTTP 403): "${pendingData.error}"\n`);
  } else {
    throw new Error(`Se esperaba HTTP 403 para usuario no activado pero se obtuvo ${pendingLoginRes.status}: ${JSON.stringify(pendingData)}`);
  }

  // 4. Mantenedor activa la cuenta de cfloresc y le asigna clave personalizada 'Carolina.2026!'
  console.log('4️⃣ Mantenedor activa a cfloresc con contraseña personalizada: Carolina.2026! y rol TECNICO_SOPORTE...');
  const branches = await prisma.branch.findMany({ select: { id: true } });
  const branchIds = branches.map(b => b.id);

  const activateRes = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rut: cfloresAD.rut,
      username: cfloresAD.samAccountName,
      fullName: cfloresAD.fullName,
      email: cfloresAD.email,
      password: 'Carolina.2026!',
      role: 'TECNICO_SOPORTE',
      jobTitle: cfloresAD.jobTitle,
      department: cfloresAD.department,
      assignedBranchIds: [branchIds[0]]
    })
  });
  const activateData = await activateRes.json();
  if (!activateRes.ok || !activateData.success) {
    throw new Error(`Error al activar cuenta: ${JSON.stringify(activateData)}`);
  }
  console.log(`   ✅ ${activateData.message}\n`);

  // 5. Probar login de cfloresc con clave errónea
  console.log('5️⃣ Probando login de cfloresc con contraseña incorrecta (clave123)...');
  const badLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'cfloresc', password: 'claveIncorrecta' })
  });
  const badData = await badLoginRes.json();
  if (badLoginRes.status === 401) {
    console.log(`   ✅ Contraseña errónea rechazada correctamente (HTTP 401): "${badData.error}"\n`);
  } else {
    throw new Error(`Se esperaba 401 pero se obtuvo ${badLoginRes.status}`);
  }

  // 6. Probar login de cfloresc con su contraseña personalizada 'Carolina.2026!'
  console.log('6️⃣ Probando login de cfloresc con su clave personalizada (Carolina.2026!)...');
  const successLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'cfloresc', password: 'Carolina.2026!' })
  });
  const successData = await successLoginRes.json();
  if (!successLoginRes.ok || !successData.success) {
    throw new Error(`Fallo login de cfloresc: ${JSON.stringify(successData)}`);
  }
  console.log(`   ✅ ¡Login exitoso!: ${successData.user.fullName}`);
  console.log(`   👤 Username: ${successData.user.username}`);
  console.log(`   📧 Correo: ${successData.user.email}`);
  console.log(`   🛡️ Rol: ${successData.user.role}`);
  console.log(`   🏢 Bodega: ${successData.user.branchName}`);
  console.log(`   🔑 Origen Autenticación: ${successData.user.authSource}\n`);

  console.log('🎉 ¡Todas las pruebas del nuevo sistema de autenticación pasaron al 100%!');
}

testNewAuthFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
