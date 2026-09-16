import app from './app.js';
import { env } from './config/environment.js';
import { connectDatabase } from './config/database.js';
import { ensureBootstrapAdminUsers } from './services/authService.js';
import { purgeExpiredBookingLocations } from './services/bookingService.js';

async function start() {
  const connected = await connectDatabase();
  if (connected) {
    await ensureBootstrapAdminUsers();
    const locationCleanup = setInterval(() => {
      purgeExpiredBookingLocations().catch((err) => console.error('Location cleanup failed:', err));
    }, 60 * 60 * 1000);
    locationCleanup.unref();
  }

  app.listen(env.port, () => {
    console.log(`\n✓ Haango API running on port ${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);
    console.log(`  Client URL: ${env.clientUrl}`);
    console.log(`  Razorpay: ${env.razorpayKeyId ? 'Configured' : 'Not configured'}`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('✗ Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('✗ Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('✗ Uncaught exception:', err);
  process.exit(1);
});
