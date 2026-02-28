import { storage } from '../storage';

const APP_URL = process.env.APP_URL || 'https://abqconcealedcarry.com';

interface TemplateSeed {
  name: string;
  type: 'email' | 'sms';
  category: string;
  subject?: string;
  content: string;
}

const TEMPLATES: TemplateSeed[] = [
  // --- RENEWAL REMINDERS ---
  {
    name: 'License Renewal - 45 Day Warning',
    type: 'email',
    category: 'reminder',
    subject: '{{firstName}}, Your NM Concealed Carry License Expires Soon',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expires on <strong>{{licenseExpiration}}</strong> — that's just 45 days away.</p>
<p>To keep your license current, you'll need to complete a renewal course before it expires.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">View All Upcoming Courses &amp; Register</a></p>
<p>Don't wait — spots fill up fast!</p>
<p>— Practical Defense Training<br>
${APP_URL}<br>
Info@abqconcealedcarry.com</p>`,
  },
  {
    name: 'License Renewal - 30 Day Warning',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, your NM CCL expires on {{licenseExpiration}} (30 days). Register for a renewal course: ${APP_URL}/schedule`,
  },
  {
    name: 'License Renewal - 14 Day Warning',
    type: 'email',
    category: 'reminder',
    subject: 'Urgent: Your NM CCL Expires in 14 Days',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expires on <strong>{{licenseExpiration}}</strong> — only 14 days from now.</p>
<p>If you haven't already registered for a renewal course, now is the time.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">Register Now</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Renewal - Expiration Day',
    type: 'email',
    category: 'reminder',
    subject: 'Your NM Concealed Carry License Has Expired',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expired today (<strong>{{licenseExpiration}}</strong>).</p>
<p><strong>Important:</strong> You have a <strong>69-day grace period</strong> to complete a renewal course. After that, you'll need to take the full initial CCL course again.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">Register for a Renewal Course</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Renewal - Expiration Day',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, your NM CCL expired today. You have 69 days to renew before needing the full initial course. Register: ${APP_URL}/schedule`,
  },
  {
    name: 'License Renewal - 30 Days Past Expiration',
    type: 'email',
    category: 'reminder',
    subject: 'Your NM CCL Grace Period Is Running Out',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expired 30 days ago. You have <strong>39 days remaining</strong> in your grace period to complete a renewal course.</p>
<p>After the grace period ends, you'll need to take the full initial CCL course again, which is longer and more expensive.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">Register Now — Don't Miss Your Window</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Renewal - 45 Days Past Expiration',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, only 24 days left in your CCL grace period! After that you'll need the full initial course. Register now: ${APP_URL}/schedule`,
  },
  // --- REFRESHER REMINDERS ---
  {
    name: 'License Refresher - 60 Day Reminder',
    type: 'email',
    category: 'reminder',
    subject: '{{firstName}}, Your 2-Year CCL Refresher Is Coming Up',
    content: `<p>Hi {{firstName}},</p>
<p>It's been almost 2 years since your NM Concealed Carry License was issued. New Mexico requires a refresher course between months 22-26 of your license.</p>
<p>Your refresher window opens soon — now is a great time to get it scheduled.</p>
<p><strong>Next Available Refresher Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">View Refresher Courses</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Refresher - 30 Day Reminder',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, your NM CCL 2-year refresher is due in 30 days. Register for a refresher course: ${APP_URL}/schedule`,
  },
  // --- POST-COURSE NUDGE ---
  {
    name: 'License Reminder - Update CCL Expiration',
    type: 'email',
    category: 'reminder',
    subject: 'Update Your CCL Expiration Date in Your Dashboard',
    content: `<p>Hi {{firstName}},</p>
<p>Congratulations on completing your renewal course! By now you should have received your updated license from the state.</p>
<p>Please take a moment to <strong>update your CCL expiration date</strong> in your student dashboard so we can continue to send you timely reminders.</p>
<p><a href="${APP_URL}/student-portal">Update Your Dashboard</a></p>
<p>If you haven't received your updated license yet, no worries — you can update it when it arrives.</p>
<p>— Practical Defense Training</p>`,
  },
];

/**
 * Seed license reminder notification templates if they don't already exist.
 * Safe to call multiple times — skips templates that already exist by name+type.
 */
export async function seedLicenseReminderTemplates(): Promise<void> {
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

      // We need a createdBy user ID — use the first existing template's creator
      const createdBy = existingTemplates.length > 0 ? existingTemplates[0].createdBy : null;
      if (!createdBy) {
        console.warn('[SeedTemplates] No existing templates found to derive createdBy. Skipping seed.');
        return;
      }

      await storage.createNotificationTemplate({
        name: seed.name,
        type: seed.type,
        category: seed.category,
        subject: seed.subject || null,
        content: seed.content,
        isActive: true,
        sortOrder: 0,
        createdBy,
        variables: ['firstName', 'lastName', 'licenseExpiration', 'courseName', 'startDate', 'startTime', 'location'],
      });
      created++;
    }

    console.log(`[SeedTemplates] License reminder templates: ${created} created, ${skipped} already existed`);
  } catch (error) {
    console.error('[SeedTemplates] Error seeding license reminder templates:', error);
  }
}
