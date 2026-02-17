import { connectDatabase, initializeDatabase, disconnectDatabase } from '../db';
import { seedDatabase } from './seed';

async function migrate() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDatabase();
    
    console.log('🔄 Running migrations...');
    await initializeDatabase();
    console.log('✅ Migrations complete');
    
    console.log('🌱 Seeding database...');
    await seedDatabase();
    console.log('✅ Seeding complete');
    
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

migrate();
