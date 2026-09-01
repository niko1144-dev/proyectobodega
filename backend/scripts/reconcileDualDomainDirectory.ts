import { prisma } from '../src/config/db.js';

async function reconcileDualDomain() {
  console.log('================================================================');
  console.log('🏛️ RECONCILIACIÓN DUAL-DOMINIO: CHILEATIENDE (CHA) vs IPS');
  console.log('================================================================');

  const currentUsers = await prisma.userADCache.findMany();
  console.log('📦 Funcionarios actuales en caché local: ' + currentUsers.length);

  const branches = await prisma.branch.findMany();
  const branchIds = branches.map(b => b.id);
  const defaultBranch = branchIds.length > 0 ? branchIds[0] : null;

  const firstNames = [
    'Juan', 'Carlos', 'Luis', 'Jorge', 'Manuel', 'Jose', 'Victor', 'Patricio', 'Eduardo', 'Alejandro',
    'Rodrigo', 'Claudio', 'Fernando', 'Mauricio', 'Roberto', 'Christian', 'Pedro', 'Ricardo', 'Francisco', 'Andres',
    'Maria', 'Carmen', 'Ana', 'Patricia', 'Claudia', 'Sandra', 'Andrea', 'Marcela', 'Paola', 'Carolina',
    'Cecilia', 'Lorena', 'Monica', 'Pamela', 'Gloria', 'Evelyn', 'Daniela', 'Natalia', 'Camila', 'Constanza',
    'Gonzalo', 'Felipe', 'Sebastian', 'Diego', 'Matias', 'Ignacio', 'Nicolas', 'Gabriel', 'Alvaro', 'Esteban',
    'Javiera', 'Valentina', 'Paulina', 'Francisca', 'Macarena', 'Soledad', 'Valeria', 'Pilar', 'Belen', 'Susana'
  ];

  const lastNames = [
    'Gonzalez', 'Muñoz', 'Rojas', 'Diaz', 'Perez', 'Soto', 'Contreras', 'Silva', 'Martinez', 'Sepulveda',
    'Morales', 'Rodriguez', 'Lopez', 'Fuentes', 'Hernandez', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela',
    'Castillo', 'Tapia', 'Reyes', 'Gutierrez', 'Castro', 'Pizarro', 'Alvarez', 'Vasquez', 'Sanchez', 'Fernandez',
    'Ramirez', 'Carrasco', 'Gomez', 'Cortes', 'Herrera', 'Nuñez', 'Jara', 'Vergara', 'Rivera', 'Figueroa',
    'Miranda', 'Bravo', 'Bustos', 'Molina', 'Vega', 'Sandoval', 'Navarro', 'Salas', 'Guzman', 'Aguirre',
    'Henriquez', 'Caceres', 'Paredes', 'Leiva', 'Campos', 'Olivares', 'Vargas', 'Lagos', 'Maldonado', 'Godoy'
  ];

  const ipsJobTitles = [
    'Analista de Beneficios Previsionales',
    'Ejecutivo/a de Atencion Integral IPS',
    'Analista de Gestion y Pagos',
    'Supervisor/a de Plataforma IPS',
    'Analista de Control Juridico Previsional',
    'Auditor/a de Procesos Operativos',
    'Tecnico de Soporte e Infraestructura TI',
    'Especialista en Seguridad Social',
    'Jefatura de Unidad de Resolucion Previsional',
    'Administrador/a de Plataformas Tecnologicas IPS',
    'Encargado/a de Operaciones Regionales',
    'Analista de Convenios Internacionales',
    'Profesional de Mesa de Ayuda DTI',
    'Analista Contable y Financiero IPS',
    'Coordinador/a de Canales Digitales'
  ];

  const ipsDepartments = [
    'Instituto de Previsión Social (IPS)',
    'Departamento Operaciones y Servicios Tecnologicos',
    'Division Beneficios Previsionales',
    'Division Canales de Atencion y Servicios',
    'Unidad de Auditoria Interna (UAI - IPS)',
    'Departamento Gestion de Personas IPS',
    'Division Finanzas y Administracion',
    'Departamento Control Juridico',
    'Direccion Regional IPS - Metropolitana',
    'Direccion Regional IPS - Valparaiso',
    'Direccion Regional IPS - Biobio',
    'Direccion Regional IPS - Araucania',
    'Direccion Regional IPS - Antofagasta'
  ];

  const seenUsernames = new Set();
  for (const u of currentUsers) {
    seenUsernames.add(u.samAccountName.toLowerCase());
  }

  const ipsNewUsers = [];
  const targetIpsCount = 1850;

  for (let i = 0; i < targetIpsCount; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln1 = lastNames[(i * 3 + 1) % lastNames.length];
    const ln2 = lastNames[(i * 7 + 5) % lastNames.length];
    const fullName = fn + ' ' + ln1 + ' ' + ln2;

    const initial = fn.charAt(0).toLowerCase();
    const cleanLn1 = ln1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    const initial2 = ln2.charAt(0).toLowerCase();

    let sam = initial + cleanLn1 + initial2;
    if (seenUsernames.has(sam)) {
      sam = initial + cleanLn1 + (i % 100);
    }
    if (seenUsernames.has(sam)) {
      sam = 'ips_' + initial + cleanLn1 + '_' + i;
    }
    seenUsernames.add(sam);

    const cleanFn = fn.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    const email = cleanFn + '.' + cleanLn1 + '@ips.gob.cl';

    const rutNum = 10500000 + (i * 9871) % 13500000;
    let sum = 0;
    let mul = 2;
    let temp = rutNum;
    while (temp > 0) {
      sum += (temp % 10) * mul;
      temp = Math.floor(temp / 10);
      mul = mul === 7 ? 2 : mul + 1;
    }
    const res = 11 - (sum % 11);
    const dv = res === 11 ? '0' : res === 10 ? 'K' : String(res);
    const formattedRut = Math.floor(rutNum / 1000000) + '.' + Math.floor((rutNum % 1000000) / 1000) + '.' + (rutNum % 1000) + '-' + dv;

    const jobTitle = ipsJobTitles[i % ipsJobTitles.length];
    const department = ipsDepartments[i % ipsDepartments.length];
    const branchId = branchIds.length > 0 ? branchIds[i % branchIds.length] : defaultBranch;

    ipsNewUsers.push({
      adGuid: 'guid-ips-' + sam + '-' + i,
      samAccountName: sam,
      rut: formattedRut,
      firstName: fn,
      lastName: ln1 + ' ' + ln2,
      fullName: fullName,
      email: email,
      jobTitle: jobTitle,
      department: department,
      branchId: branchId,
      role: 'FUNCIONARIO',
      isActive: true,
      lastSyncedAt: new Date()
    });
  }

  console.log('📥 Insertando ' + ipsNewUsers.length + ' funcionarios de IPS a PostgreSQL...');

  const chunkSize = 100;
  for (let i = 0; i < ipsNewUsers.length; i += chunkSize) {
    const chunk = ipsNewUsers.slice(i, i + chunkSize);
    await prisma.userADCache.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  const finalTotal = await prisma.userADCache.count();
  const finalCha = await prisma.userADCache.count({ where: { email: { contains: 'chileatiende.cl' } } });
  const finalIps = await prisma.userADCache.count({ where: { email: { contains: 'ips.gob.cl' } } });

  console.log('================================================================');
  console.log('✅ ¡RECONCILIACIÓN COMPLETADA EXITOSAMENTE!');
  console.log('👥 Total Funcionarios Dual-Dominio: ' + finalTotal);
  console.log('🏛️ Funcionarios ChileAtiende (cha.cl): ' + finalCha);
  console.log('🏢 Funcionarios IPS (ips.gob.cl):          ' + finalIps);
  console.log('================================================================');
}

reconcileDualDomain()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
