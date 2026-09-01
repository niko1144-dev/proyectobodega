import { prisma } from '../src/config/db.js';

async function testHttpFetch() {
  console.time('fetch_http_directory');
  const res = await fetch('http://localhost:4000/api/v1/directory/users/search');
  const data: any = await res.json();
  console.timeEnd('fetch_http_directory');
  console.log(`✅ Respuesta HTTP: ${data.length} funcionarios recibidos`);
}

testHttpFetch().finally(() => prisma.$disconnect());
