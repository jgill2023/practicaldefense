
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function updateReminderDefaults() {
  try {
    console.log('Updating existing users to have license renewal reminders enabled by default...');
    
    const result = await db
      .update(users)
      .set({
        enableLicenseExpirationReminder: true,
        enableRefresherReminder: true,
      })
      .where(sql`${users.enableLicenseExpirationReminder} IS NULL OR ${users.enableRefresherReminder} IS NULL`);
    
    console.log('Successfully updated user reminder defaults');
    process.exit(0);
  } catch (error) {
    console.error('Error updating reminder defaults:', error);
    process.exit(1);
  }
}

updateReminderDefaults();
