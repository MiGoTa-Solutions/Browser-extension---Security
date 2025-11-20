import 'dotenv/config';
import app from './app';
import { ensureSchema } from './config/database';

const port = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  try {
    await ensureSchema();
    app.listen(port, () => {
      console.log(`SecureShield server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
