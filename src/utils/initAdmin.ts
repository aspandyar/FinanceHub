import { UserModel } from '../models/models.js';
import { hashPassword } from './password.js';

// Initialize admin user if admin email doesn't exist
export const initializeAdmin = async (): Promise<void> => {
  try {
    // Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn(
        'ADMIN_EMAIL and ADMIN_PASSWORD not set. Skipping admin user creation.'
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      console.error('Invalid ADMIN_EMAIL format. Skipping admin user creation.');
      return;
    }

    // Check if admin email already exists
    const existingUser = await UserModel.getUserByEmail(adminEmail.toLowerCase().trim());
    
    if (existingUser) {
      console.log(`Admin user with email ${adminEmail} already exists, skipping admin initialization`);
      return;
    }

    // Hash the password
    const passwordHash = await hashPassword(adminPassword);

    // Create admin user
    const adminUser = await UserModel.createUser({
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      fullName: 'Admin User',
      currency: 'USD',
      role: 'admin',
    });

    console.log(`Admin user created successfully: ${adminUser.email}`);
  } catch (error: any) {
    // Handle unique constraint violation (email already exists)
    // Prisma error code P2002 for unique constraint violation
    if (error.code === 'P2002' || error.code === '23505') {
      console.log('Admin user already exists');
      return;
    }
    console.error('Error initializing admin user:', error);
    // Don't throw - allow server to start even if admin creation fails
  }
};

