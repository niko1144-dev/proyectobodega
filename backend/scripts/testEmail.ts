import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/config/db.js';
import { EmailService } from '../src/services/emailService.js';

async function sendActualTestToMarco() {
  console.log('Generando PDF simulado y enviando acta oficial a Marco Flores...');

  // Simple minimal PDF content in base64
  const minimalPdfBase64 = 'data:application/pdf;filename=generated.pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQVQKL0YxIDEyIFRmCjcyIDcyMCBUZApbKElUQU0gQ2hpbGVBdGllbmRlIC0gQWN0YSBPZmljaWFsKV0gVEoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTggMDAwMDAgbiAKMDAwMDAwMDA3NyAwMDAwMCBuIAowMDAwMDAwMTM2IDAwMDAwIG4gCjAwMDAwMDAyMjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozMTgKJSVFT0YK';

  const result = await EmailService.sendAssignmentActEmail({
    recipientEmail: 'marco.flores@chileatiende.cl',
    recipientName: 'Marco Antonio Flores Calderon',
    recipientRut: '14.471.020-7',
    recipientJobTitle: 'Funcionario Institucional',
    recipientDepartment: 'ChileAtiende',
    actNumber: 'ACT-2026-00032',
    assignmentType: 'ENTREGA_INICIAL',
    branchName: 'Bodega Central Alameda (Santiago Centro)',
    technicianName: 'Nicolas Galarce Gonzalez',
    technicianRut: 'DTI',
    createdAt: new Date(),
    items: [
      {
        name: 'Monitor Dell Professional P2422H 24" IPS',
        brand: 'Dell',
        model: 'Professional P2422H 24"',
        serialNumber: 'CN4982310B',
        category: 'Monitor 24" IPS FHD',
        quantity: 1,
        itemType: 'HARDWARE'
      }
    ],
    observations: 'Entrega conforme de equipamiento tecnológico para puesto de trabajo.',
    pdfBase64: minimalPdfBase64
  });

  console.log('Resultado del envío con PDF:', result);
}

sendActualTestToMarco()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
