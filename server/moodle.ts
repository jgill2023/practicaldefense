import crypto from 'crypto';

interface MoodleConfig {
  baseUrl: string;
  token: string;
  courseId: number;
  roleId?: number;
}

interface MoodleUser {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
}

interface MoodleCreateUserResponse {
  id: number;
  username: string;
}

interface MoodleEnrollmentResult {
  success: boolean;
  moodleUserId?: number;
  moodleUsername?: string;
  moodlePassword?: string;
  error?: string;
}

function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

function generateUsername(email: string, firstName: string, lastName: string): string {
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now().toString(36).slice(-4);
  return `${emailPrefix.slice(0, 12)}${timestamp}`;
}

async function moodleApiCall<T>(
  config: MoodleConfig,
  wsFunction: string,
  params: Record<string, any>
): Promise<T> {
  const url = new URL(`${config.baseUrl}/webservice/rest/server.php`);
  url.searchParams.set('wstoken', config.token);
  url.searchParams.set('wsfunction', wsFunction);
  url.searchParams.set('moodlewsrestformat', 'json');
  
  const formData = new URLSearchParams();
  
  function flattenParams(obj: Record<string, any>, prefix: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            flattenParams(item, `${fullKey}[${index}]`);
          } else {
            formData.append(`${fullKey}[${index}]`, String(item));
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        flattenParams(value, fullKey);
      } else if (value !== undefined && value !== null) {
        formData.append(fullKey, String(value));
      }
    }
  }
  
  flattenParams(params);
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  if (!response.ok) {
    throw new Error(`Moodle API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.exception) {
    throw new Error(`Moodle error: ${data.message || data.exception}`);
  }
  
  return data as T;
}

async function getUserByEmail(config: MoodleConfig, email: string): Promise<MoodleUser | null> {
  try {
    const users = await moodleApiCall<MoodleUser[]>(config, 'core_user_get_users_by_field', {
      field: 'email',
      values: [email],
    });
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error fetching Moodle user by email:', error);
    return null;
  }
}

async function createUser(
  config: MoodleConfig,
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }
): Promise<{ userId: number; username: string; password: string }> {
  const username = generateUsername(userData.email, userData.firstName, userData.lastName);
  const password = generateSecurePassword(14);
  
  const result = await moodleApiCall<MoodleCreateUserResponse[]>(config, 'core_user_create_users', {
    users: [{
      username,
      password,
      firstname: userData.firstName,
      lastname: userData.lastName,
      email: userData.email,
      auth: 'manual',
      phone1: userData.phone || '',
      maildisplay: 0,
    }],
  });
  
  if (!result || result.length === 0) {
    throw new Error('Failed to create Moodle user');
  }
  
  return {
    userId: result[0].id,
    username: result[0].username,
    password,
  };
}

async function enrollUserInCourse(
  config: MoodleConfig,
  userId: number,
  courseId?: number
): Promise<void> {
  const targetCourseId = courseId || config.courseId;
  const roleId = config.roleId || 5;
  
  await moodleApiCall<void>(config, 'enrol_manual_enrol_users', {
    enrolments: [{
      roleid: roleId,
      userid: userId,
      courseid: targetCourseId,
    }],
  });
}

export async function enrollStudentInMoodle(
  config: MoodleConfig,
  studentData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }
): Promise<MoodleEnrollmentResult> {
  try {
    let existingUser = await getUserByEmail(config, studentData.email);
    let moodleUserId: number;
    let moodleUsername: string;
    let moodlePassword: string | undefined;
    
    if (existingUser) {
      moodleUserId = existingUser.id;
      moodleUsername = existingUser.username;
      console.log(`Existing Moodle user found: ${moodleUsername} (ID: ${moodleUserId})`);
    } else {
      const newUser = await createUser(config, studentData);
      moodleUserId = newUser.userId;
      moodleUsername = newUser.username;
      moodlePassword = newUser.password;
      console.log(`New Moodle user created: ${moodleUsername} (ID: ${moodleUserId})`);
    }
    
    await enrollUserInCourse(config, moodleUserId);
    console.log(`User ${moodleUsername} enrolled in course ${config.courseId}`);
    
    return {
      success: true,
      moodleUserId,
      moodleUsername,
      moodlePassword,
    };
  } catch (error) {
    console.error('Moodle enrollment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function getMoodleConfig(): MoodleConfig | null {
  const baseUrl = process.env.MOODLE_URL;
  const token = process.env.MOODLE_TOKEN;
  const courseId = process.env.MOODLE_COURSE_ID;
  
  if (!baseUrl || !token || !courseId) {
    console.warn('Moodle configuration incomplete. Required: MOODLE_URL, MOODLE_TOKEN, MOODLE_COURSE_ID');
    return null;
  }
  
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    token,
    courseId: parseInt(courseId, 10),
    roleId: process.env.MOODLE_ROLE_ID ? parseInt(process.env.MOODLE_ROLE_ID, 10) : 5,
  };
}

export async function testMoodleConnection(): Promise<{ success: boolean; message: string }> {
  const config = getMoodleConfig();
  
  if (!config) {
    return { success: false, message: 'Moodle configuration is incomplete' };
  }
  
  try {
    const siteInfo = await moodleApiCall<{ sitename: string; username: string }>(
      config,
      'core_webservice_get_site_info',
      {}
    );
    return {
      success: true,
      message: `Connected to ${siteInfo.sitename} as ${siteInfo.username}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
