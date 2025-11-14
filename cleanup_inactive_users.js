
import { db } from './server/db.js';
import { users, enrollments, courses } from './shared/schema.js';
import { eq, and, notInArray, sql } from 'drizzle-orm';

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
    
    // Find a super admin to reassign courses to
    const superAdmin = allUsers.find(u => u.role === 'superadmin');
    if (!superAdmin) {
      console.error('❌ No super admin found. Cannot reassign courses.');
      process.exit(1);
    }
    console.log(`\n✅ Found super admin: ${superAdmin.firstName} ${superAdmin.lastName} (${superAdmin.email})`);
    
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
    
    const userIdsToDelete = usersToDelete.map(u => u.id);
    
    // Check if any users have courses assigned
    const coursesForDeletedUsers = await db.query.courses.findMany({
      where: sql`${courses.instructorId} = ANY(ARRAY[${userIdsToDelete.map(id => `'${id}'`).join(',')}]::text[])`,
    });
    
    if (coursesForDeletedUsers.length > 0) {
      console.log(`\n📚 Found ${coursesForDeletedUsers.length} course(s) that need to be reassigned:`);
      coursesForDeletedUsers.forEach(course => {
        console.log(`  - ${course.title} (ID: ${course.id})`);
      });
      
      console.log(`\n🔄 Reassigning courses to super admin: ${superAdmin.email}...`);
      
      // Reassign each course individually
      for (const course of coursesForDeletedUsers) {
        await db.update(courses)
          .set({ instructorId: superAdmin.id })
          .where(eq(courses.id, course.id));
      }
      
      console.log(`✅ Courses reassigned successfully`);
    }
    
    // Now delete users one by one
    console.log('\n🗑️  Deleting users without enrollments...');
    
    for (const userId of userIdsToDelete) {
      await db
        .delete(users)
        .where(eq(users.id, userId));
    }
    
    console.log(`✅ Successfully deleted ${usersToDelete.length} user(s)`);
    
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
