
import axios from 'axios';

interface MoodleConfig {
  url: string;
  token: string;
}

interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface MoodleCourse {
  id: number;
  fullname: string;
  shortname: string;
}

interface MoodleEnrollment {
  roleid: number;
  userid: number;
  courseid: number;
}

class MoodleService {
  private config: MoodleConfig;

  constructor() {
    const url = process.env.MOODLE_URL;
    const token = process.env.MOODLE_TOKEN;

    if (!url || !token) {
      throw new Error('Moodle configuration missing. Please set MOODLE_URL and MOODLE_TOKEN environment variables.');
    }

    this.config = {
      url: url.replace(/\/$/, ''), // Remove trailing slash
      token,
    };
  }

  private async callMoodleAPI(functionName: string, params: any = {}): Promise<any> {
    const url = `${this.config.url}/webservice/rest/server.php`;
    
    const requestParams = {
      wstoken: this.config.token,
      wsfunction: functionName,
      moodlewsrestformat: 'json',
      ...params,
    };

    try {
      const response = await axios.post(url, null, { params: requestParams });
      
      if (response.data.exception) {
        throw new Error(`Moodle API Error: ${response.data.message}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Moodle API call failed:', error);
      throw new Error(`Failed to call Moodle API: ${error.message}`);
    }
  }

  // Check if user exists in Moodle by email
  async getUserByEmail(email: string): Promise<MoodleUser | null> {
    const response = await this.callMoodleAPI('core_user_get_users', {
      'criteria[0][key]': 'email',
      'criteria[0][value]': email,
    });

    if (response.users && response.users.length > 0) {
      return response.users[0];
    }

    return null;
  }

  // Create a new user in Moodle
  async createUser(userData: {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
  }): Promise<MoodleUser> {
    const response = await this.callMoodleAPI('core_user_create_users', {
      'users[0][username]': userData.username,
      'users[0][password]': userData.password,
      'users[0][firstname]': userData.firstname,
      'users[0][lastname]': userData.lastname,
      'users[0][email]': userData.email,
      'users[0][auth]': 'manual',
    });

    if (response[0] && response[0].id) {
      return {
        id: response[0].id,
        username: userData.username,
        firstname: userData.firstname,
        lastname: userData.lastname,
        email: userData.email,
      };
    }

    throw new Error('Failed to create Moodle user');
  }

  // Get or create user in Moodle
  async getOrCreateUser(userData: {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
  }): Promise<MoodleUser> {
    const existingUser = await this.getUserByEmail(userData.email);
    
    if (existingUser) {
      return existingUser;
    }

    return await this.createUser(userData);
  }

  // Enroll user in a Moodle course
  async enrollUser(userId: number, courseId: number, roleId: number = 5): Promise<void> {
    // roleId 5 is typically the "Student" role in Moodle
    await this.callMoodleAPI('enrol_manual_enrol_users', {
      'enrolments[0][roleid]': roleId,
      'enrolments[0][userid]': userId,
      'enrolments[0][courseid]': courseId,
    });
  }

  // Get course information
  async getCourse(courseId: number): Promise<MoodleCourse | null> {
    const response = await this.callMoodleAPI('core_course_get_courses', {
      'options[ids][0]': courseId,
    });

    if (response && response.length > 0) {
      return response[0];
    }

    return null;
  }

  // Check if user is enrolled in course
  async isUserEnrolled(userId: number, courseId: number): Promise<boolean> {
    const response = await this.callMoodleAPI('core_enrol_get_enrolled_users', {
      courseid: courseId,
    });

    if (response && Array.isArray(response)) {
      return response.some((user: any) => user.id === userId);
    }

    return false;
  }

  // Unenroll user from course
  async unenrollUser(userId: number, courseId: number): Promise<void> {
    // First, get the enrolment instances for the course
    const enrolments = await this.callMoodleAPI('core_enrol_get_course_enrolment_methods', {
      courseid: courseId,
    });

    // Find manual enrolment instance
    const manualEnrol = enrolments.find((e: any) => e.type === 'manual');
    
    if (manualEnrol) {
      await this.callMoodleAPI('enrol_manual_unenrol_users', {
        'enrolments[0][userid]': userId,
        'enrolments[0][courseid]': courseId,
      });
    }
  }
}

export const moodleService = new MoodleService();
