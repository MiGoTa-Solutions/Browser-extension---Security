import 'dotenv/config';
import request from 'supertest';
import app from '../app';
import { ensureSchema, pool } from '../config/database';

const TEST_USER = {
  name: 'MIRIN MANO M',
  email: 'mirinmano@gmail.com',
  password: 'Followsrules1!',
  pin: '1234',
};

async function run() {
  await ensureSchema();

  const agent = request(app);

  const registerResponse = await agent.post('/api/auth/register').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
    pin: TEST_USER.pin,
  });

  if (registerResponse.status === 201) {
    console.log('✅ Registered user', registerResponse.body.user);
  } else if (registerResponse.status === 409) {
    console.log('ℹ️  User already registered, continuing to login test');
  } else {
    console.error('❌ Registration failed', registerResponse.status, registerResponse.body);
    process.exit(1);
  }

  const loginResponse = await agent.post('/api/auth/login').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (loginResponse.status !== 200) {
    console.error('❌ Login failed', loginResponse.status, loginResponse.body);
    process.exit(1);
  }

  const { token, user } = loginResponse.body as { token?: string; user?: unknown };

  console.log('✅ Login succeeded');
  console.log('Token prefix:', token?.slice(0, 16), '...');
  console.log('User payload:', user);
}

run()
  .catch((error) => {
    console.error('Auth smoke test failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
