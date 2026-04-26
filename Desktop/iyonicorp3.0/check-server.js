import http from 'http';

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/test-db',
  method: 'GET'
};

console.log('Checking if backend is reachable at http://127.0.0.1:5000/test-db...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('✅ Backend is reachable.');
  });
});

req.on('error', (e) => {
  console.error(`❌ Backend is NOT reachable: ${e.message}`);
  console.log('\nPossible reasons:');
  console.log('1. The backend server is not running. Run "npm run server" in a separate terminal.');
  console.log('2. The backend failed to start (check server logs for database connection errors).');
  console.log('3. A firewall or antivirus is blocking port 5000.');
});

req.end();
