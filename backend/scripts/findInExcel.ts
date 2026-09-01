import xlsx from 'xlsx';

function findUser() {
  const workbook = xlsx.readFile('Inventario_General_TI_optimizado.xlsx');
  console.log('Sheets:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    const results = data.filter((row: any) => {
      const rowStr = JSON.stringify(row).toLowerCase();
      return rowStr.includes('william') && rowStr.includes('franco');
    });
    
    if (results.length > 0) {
      console.log(`Found in sheet ${sheetName}:`, results);
    }
  }
}

findUser();
