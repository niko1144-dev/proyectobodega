import xlsx from 'xlsx';

function peekExcel() {
  const workbook = xlsx.readFile('Funcionarios_IPS_ChileAtiende.xlsx');
  console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);
  
  if (workbook.SheetNames.length > 1) {
    const sheetName = workbook.SheetNames[1]; // Probably the second sheet has the data
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Sheet name: ${sheetName}`);
    console.log(`Total rows: ${data.length}`);
    console.log('--- Headers ---');
    console.log(data[0]);
    console.log('--- First data row ---');
    console.log(data[1]);
  }
}

peekExcel();
