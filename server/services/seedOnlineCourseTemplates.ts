import { storage } from '../storage';
import { db } from '../db';
import { notificationTemplates } from '@shared/schema';

const APP_URL = process.env.APP_URL || 'https://abqconcealedcarry.com';

interface TemplateSeed {
  name: string;
  type: 'email' | 'sms';
  category: string;
  subject?: string;
  content: string;
}

const TEMPLATES: TemplateSeed[] = [
  {
    name: 'Online Course Enrollment - Credentials',
    type: 'email',
    category: 'online_enrollment',
    subject: 'Your {{courseName}} Course Access',
    content: `<p>Dear {{firstName}},</p>
<p>Thank you for enrolling in <strong>{{courseName}}</strong>!</p>
<p>You can now access your course at: <a href="{{moodleUrl}}">{{moodleUrl}}</a></p>
{{moodleLoginDetails}}
<p>If you have any questions, please don't hesitate to contact us at <a href="mailto:{{companyEmail}}">{{companyEmail}}</a>.</p>
<p>Best regards,<br>
{{companyName}}</p>`,
  },
  {
    name: 'Online Course Enrollment - Credentials SMS',
    type: 'sms',
    category: 'online_enrollment',
    content: `Welcome to {{courseName}}! {{moodleLoginDetails}} Login at {{moodleUrl}}`,
  },
];

/**
 * Seed online course enrollment notification templates if they don't already exist.
 * Safe to call multiple times — skips templates that already exist by name+type.
 */
export async function seedOnlineCourseTemplates(): Promise<void> {
  try {
    const existingTemplates = await storage.getNotificationTemplates();

    let created = 0;
    let skipped = 0;

    for (const seed of TEMPLATES) {
      const exists = existingTemplates.some(t => t.name === seed.name && t.type === seed.type);
      if (exists) {
        skipped++;
        continue;
      }

      const createdBy = existingTemplates.length > 0 ? existingTemplates[0].createdBy : null;
      if (!createdBy) {
        console.warn('[SeedTemplates] No existing templates found to derive createdBy. Skipping online course seed.');
        return;
      }

      await db.insert(notificationTemplates).values({
        name: seed.name,
        type: seed.type,
        category: seed.category,
        subject: seed.subject || null,
        content: seed.content,
        isActive: true,
        sortOrder: 0,
        createdBy,
        variables: ['firstName', 'lastName', 'courseName', 'moodleUrl', 'moodleUsername', 'moodlePassword', 'moodleLoginDetails', 'companyName', 'companyEmail'],
      });
      created++;
    }

    console.log(`[SeedTemplates] Online course enrollment templates: ${created} created, ${skipped} already existed`);
  } catch (error) {
    console.error('[SeedTemplates] Error seeding online course enrollment templates:', error);
  }
}
