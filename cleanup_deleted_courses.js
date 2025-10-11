
import { db } from './server/db.js';
import { courses } from './shared/schema.js';
import { isNotNull } from 'drizzle-orm';

async function cleanupDeletedCourses() {
  try {
    console.log('🔍 Finding deleted courses...');
    
    // Find all soft-deleted courses
    const deletedCourses = await db.query.courses.findMany({
      where: isNotNull(courses.deletedAt),
    });
    
    if (deletedCourses.length === 0) {
      console.log('✅ No deleted courses found. Database is clean!');
      process.exit(0);
    }
    
    console.log(`📋 Found ${deletedCourses.length} deleted course(s):`);
    deletedCourses.forEach(course => {
      console.log(`  - ${course.title} (deleted: ${course.deletedAt})`);
    });
    
    console.log('\n🗑️  Permanently deleting courses...');
    
    for (const course of deletedCourses) {
      try {
        // Delete course information forms
        await db.execute(`
          DELETE FROM course_information_forms 
          WHERE course_id = '${course.id}'
        `);
        
        // Delete enrollments
        await db.execute(`
          DELETE FROM enrollments 
          WHERE course_id = '${course.id}'
        `);
        
        // Delete course schedules
        await db.execute(`
          DELETE FROM course_schedules 
          WHERE course_id = '${course.id}'
        `);
        
        // Delete the course
        await db.execute(`
          DELETE FROM courses 
          WHERE id = '${course.id}'
        `);
        
        console.log(`  ✅ Deleted: ${course.title}`);
      } catch (error) {
        console.error(`  ❌ Error deleting ${course.title}:`, error.message);
      }
    }
    
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupDeletedCourses();
