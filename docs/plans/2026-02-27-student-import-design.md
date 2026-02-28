# Student Import & Magic Link Welcome Email

## Overview

Import ~1,650 previous students from a CSV file into the system, including their enrollment history. Provide a magic link welcome email mechanism so imported students can access their accounts without needing a pre-set password.

## CSV Format

```
name,email,phone,class,date,dob,occl
"John Smith",john@email.com,505-555-1234,"NM Concealed Carry",2024-01-15,1985-03-22,
"Jane Doe",jane@email.com,505-555-5678,"NM Concealed Carry",2024-02-10,1990-07-14,yes
```

- **name**: Full name, split into firstName/lastName (last space-delimited token = lastName)
- **email**: Required, validated for format, deduplicated
- **phone**: Optional
- **class**: Course title — matched against existing courses in DB
- **date**: Date the class was attended — used to find or create a historical schedule
- **dob**: Date of birth, optional
- **occl**: If "yes", also creates an `onlineCourseEnrollments` record for "Online NM Concealed Carry Course"
- Students with multiple classes appear as multiple CSV rows with the same email

## Schema Changes

### Users Table — New Fields

```sql
magic_link_token VARCHAR(255)
magic_link_expiry TIMESTAMP
```

Used for passwordless first login. Token is single-use, 7-day expiry.

## Server Changes

### 1. Import Preview Endpoint

`POST /api/admin/import-students` — admin-only, multipart CSV upload

- Parses CSV, validates all rows
- Returns preview: valid rows, warning rows (duplicate emails, unmatched courses), error rows
- Does NOT write to DB

### 2. Import Confirm Endpoint

`POST /api/admin/import-students/confirm` — admin-only, accepts the validated data

Processing per row:
1. **Create user** (or find existing by email): no password, `role: 'student'`, `userStatus: 'active'`, `isEmailVerified: true`
2. **Find or create schedule**: match course title to existing course, find schedule by date. If no schedule exists for that date, create a historical schedule (past date, 0 spots)
3. **Create enrollment**: `status: 'completed'`, `paymentStatus: 'paid'`, `paymentOption: 'full'`, `completionDate` = class date
4. **OCCL flag**: if "yes", create `onlineCourseEnrollments` record with `status: 'completed'`, `courseName: 'Online NM Concealed Carry Course'`

Returns: `{ created: N, skipped: N, errors: [...], enrollmentsCreated: N }`

### 3. Magic Link Login

`GET /auth/magic-login?token=xxx`

- Validates token exists and hasn't expired
- Creates session (logs user in)
- Clears token (single-use)
- Redirects to `/student-portal` — frontend prompts user to set a password

### 4. Send Welcome Email Endpoint

`POST /api/admin/users/:userId/send-welcome-email` — admin-only

- Generates magic link token (crypto.randomBytes(32), 7-day expiry)
- Stores token + expiry on user record
- Sends email via SendGrid with magic link button
- Logs communication in communications table

### 5. Bulk Welcome Email Endpoint

`POST /api/admin/users/send-welcome-emails` — admin-only

- Accepts `{ userIds: string[] }`
- Generates tokens and sends emails for each user
- Returns summary of sent/failed

## Client Changes

### User Management Page (`/admin/users`)

1. **"Import Students" button** — opens dialog with:
   - File upload (CSV) using existing upload patterns
   - Preview table showing parsed data with validation status per row
   - Error/warning indicators
   - "Confirm Import" button

2. **Row action: "Send Welcome Email"** — per-student action in the existing actions dropdown

3. **Bulk action: "Send Welcome Emails"** — for selected students or all recently imported students

### Magic Link Landing

- `GET /auth/magic-login?token=xxx` handled server-side, creates session, redirects to student portal
- Student portal shows a prompt/banner to set a password on first visit (user has no passwordHash)

## Data Flow

```
CSV Upload → Parse & Validate → Preview Table → Confirm Import
                                                       ↓
                                             Create Users (no password)
                                             Find/Create Historical Schedules
                                             Create Enrollments (completed)
                                             Create Online Enrollments (OCCL)
                                                       ↓
                                             Admin clicks "Send Welcome Emails"
                                                       ↓
                                             Generate magic link tokens
                                             Send emails via SendGrid
                                             Log in communications table
                                                       ↓
                                             Student clicks magic link
                                             Session created, redirected to portal
                                             Prompted to set password
```

## Edge Cases

- **Duplicate emails in CSV**: Deduplicate — create user once, create multiple enrollments
- **Email already exists in DB**: Skip user creation, still create enrollments
- **Course name doesn't match any existing course**: Flag as warning in preview, skip enrollment
- **No schedule found for date**: Create a historical schedule with 0 available spots
- **Magic link expired**: Show friendly error page with link to request password reset
- **Student clicks magic link twice**: Second click shows "already used" message, suggests login
