// Test API endpoints
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjksImlhdCI6MTc2MzYxNDcyOSwiZXhwIjoxNzY0MjE5NTI5fQ.i4V3EAv3_pnha2foOtRDfyADzdUrzEvQobU3a4sKiHs';

async function testCreateLock() {
  try {
    const response = await fetch('http://localhost:4000/api/locks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test YouTube Lock',
        isGroup: false,
        tabs: [{
          title: 'YouTube',
          url: 'https://www.youtube.com/'
        }],
        pin: '1234'
      })
    });

    const data = await response.json();
    console.log('✅ Lock creation response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.lock) {
      console.log('\n✅ Lock created successfully!');
      console.log(`Lock ID: ${data.lock.id}`);
      console.log(`Lock Name: ${data.lock.name}`);
      console.log(`Tabs: ${data.lock.tabs.length}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCreateLock();
