async function testSearchApi() {
  const urls = [
    'http://localhost:4000/api/v1/directory/users/search?q=claudia%20flores',
    'http://localhost:4000/api/v1/directory/users/search?q=claudia',
    'http://localhost:4000/api/v1/directory/users/search?q=jose%20miguel%20ruiz',
    'http://localhost:4000/api/v1/directory/users/search?q=ruiz'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u);
      const data = await res.json();
      console.log(`\nURL: ${u}`);
      console.log(`Results (${data.length}):`);
      data.slice(0, 5).forEach((item: any) => {
        console.log(` - ${item.fullName} | ${item.email} | RUT: ${item.rut}`);
      });
    } catch (e: any) {
      console.error(`Error fetching ${u}:`, e.message);
    }
  }
}

testSearchApi();
