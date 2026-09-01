import xlsx from 'xlsx';
import { prisma } from '../src/config/db.js';

async function importUsers() {
  console.log('⏳ Cargando archivo Excel...');
  const workbook = xlsx.readFile('Funcionarios_IPS_ChileAtiende.xlsx');
  const sheet = workbook.Sheets['Consolidado Funcionarios'];
  const data: any[] = xlsx.utils.sheet_to_json(sheet);
  
  console.log(`📊 Se encontraron ${data.length} filas. Filtrando usuarios habilitados...`);

  // Filtrar usuarios que tengan RUT o SAM, y preferiblemente que estén habilitados
  // Pero para estar seguros, cargaremos todos los que tengan RUT válido o nombre completo
  let count = 0;
  
  for (const row of data) {
    const rut = row['RUT']?.trim();
    let sam = row['Usuario SAM']?.trim();
    const fullName = row['Nombre Completo']?.trim();
    const estadoGeneral = row['Estado General']?.trim();
    
    // Ignorar si no tiene nombre o si el estado es explícitamente deshabilitado
    // (Opcional, pero recomendado para no llenar de basura la DB. Si quieres todos, quita esta línea)
    if (!fullName || estadoGeneral === 'Deshabilitado') {
      continue;
    }

    if (!sam) {
      if (rut) sam = rut.split('-')[0];
      else sam = `user.${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    }

    const email = row['Correo IPS'] || row['Correo ChileAtiende (CHA)'] || `${sam}@chileatiende.cl`;
    
    // Preparar el RUT (si no hay, creamos uno falso temporal para que no falle)
    const finalRut = rut || `SR-${Math.floor(Math.random() * 9999999)}-K`;

    try {
      await prisma.userADCache.upsert({
        where: { samAccountName: sam },
        update: {
          rut: finalRut,
          firstName: row['Nombres']?.trim() || fullName.split(' ')[0],
          lastName: row['Apellidos']?.trim() || fullName.split(' ').slice(1).join(' '),
          fullName: fullName,
          email: email.trim(),
          jobTitle: row['Cargo / Función']?.trim() || 'Funcionario',
          department: row['Departamento / Unidad']?.trim() || 'IPS / ChileAtiende',
          isActive: true,
          domain: row['Tipo Origen'] || 'EXCEL'
        },
        create: {
          id: `usr-excel-${Date.now()}-${count}`,
          adGuid: `guid-excel-${Date.now()}-${count}`,
          samAccountName: sam,
          rut: finalRut,
          firstName: row['Nombres']?.trim() || fullName.split(' ')[0],
          lastName: row['Apellidos']?.trim() || fullName.split(' ').slice(1).join(' '),
          fullName: fullName,
          email: email.trim(),
          jobTitle: row['Cargo / Función']?.trim() || 'Funcionario',
          department: row['Departamento / Unidad']?.trim() || 'IPS / ChileAtiende',
          isActive: true,
          domain: row['Tipo Origen'] || 'EXCEL'
        }
      });
      count++;
      if (count % 500 === 0) console.log(`✅ ${count} usuarios procesados...`);
    } catch (e: any) {
      console.log(`⚠️ Error al guardar a ${fullName}: ${e.message}`);
    }
  }

  console.log(`🎉 Importación finalizada. Total importados: ${count}`);
}

importUsers()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error fatal:', e);
    process.exit(1);
  });
