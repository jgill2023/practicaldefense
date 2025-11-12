
import { db } from './server/db.js';
import { users, enrollments } from './shared/schema.js';
import { eq, notInArray, sql } from 'drizzle-orm';

async function cleanupInactiveUsers() {
  try {
    console.log('🔍 Finding users without enrollments...');
    
    // Get all users who have at least one enrollment
    const usersWithEnrollments = await db
      .selectDistinct({ userId: enrollments.studentId })
      .from(enrollments)
      .where(sql`${enrollments.studentId} IS NOT NULL`);
    
    const enrolledUserIds = usersWithEnrollments.map(u => u.userId);
    
    console.log(`📊 Found ${enrolledUserIds.length} users with enrollments`);
    
    // Get all users
    const allUsers = await db.query.users.findMany();
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    // Filter users to delete: no enrollments AND not super admin
    const usersToDelete = allUsers.filter(user => 
      !enrolledUserIds.includes(user.id) && 
      user.role !== 'superadmin'
    );
    
    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. All users either have enrollments or are super admins.');
      process.exit(0);
    }
    
    console.log(`\n📋 Found ${usersToDelete.length} user(s) to delete:`);
    usersToDelete.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });
    
    // Delete users
    console.log('\n🗑️  Deleting users without enrollments...');
    
    const userIdsToDelete = usersToDelete.map(u => u.id);
    
    if (userIdsToDelete.length > 0) {
      await db
        .delete(users)
        .where(notInArray(users.id, [...enrolledUserIds, ...allUsers.filter(u => u.role === 'superadmin').map(u => u.id)]));
      
      console.log(`✅ Successfully deleted ${usersToDelete.length} user(s)`);
    }
    
    // Verify super admins are still present
    const remainingSuperAdmins = await db.query.users.findMany({
      where: eq(users.role, 'superadmin')
    });
    
    console.log(`\n✅ Super admin accounts preserved: ${remainingSuperAdmins.length}`);
    remainingSuperAdmins.forEach(admin => {
      console.log(`  - ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupInactiveUsers();
