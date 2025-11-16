# Authentication Migration Guide

This guide explains how to migrate existing users from Replit Auth to the new custom email/password authentication system.

## Overview

The application has been migrated from Replit Auth to a custom email/password authentication system. This change removes all Replit branding and provides a fully customized authentication experience.

## For New Instructors

New instructors can simply:
1. Visit the signup page at `/signup`
2. Create an account with email and password
3. Verify their email address
4. Wait for admin approval (if required)

## For Existing Users

Existing users who registered with Replit Auth need to set up a password for their account.

### Migration Strategy

There are two approaches for migrating existing users:

#### Option 1: Self-Service Password Setup (Recommended)

1. **Generate Password Reset Tokens for All Existing Users**
   ```sql
   -- This should be run by the super admin via the database tool
   UPDATE users 
   SET 
     password_reset_token = gen_random_uuid()::text,
     password_reset_expiry = NOW() + INTERVAL '7 days',
     updated_at = NOW()
   WHERE password_hash IS NULL;
   ```

2. **Send Migration Emails**
   Create a one-time admin script or function to send password setup emails to all users with null `passwordHash`:
   
   ```typescript
   // Example: server/migrations/sendPasswordSetupEmails.ts
   import { db } from '../db';
   import { users } from '@shared/schema';
   import { isNull } from 'drizzle-orm';
   import { sendPasswordResetEmail } from '../emailService';
   
   async function sendPasswordSetupEmails() {
     const usersWithoutPassword = await db.query.users.findMany({
       where: isNull(users.passwordHash),
     });
     
     for (const user of usersWithoutPassword) {
       if (user.passwordResetToken) {
         await sendPasswordResetEmail(
           user.email,
           user.firstName || 'User',
           user.passwordResetToken
         );
       }
     }
     
     console.log(`Sent password setup emails to ${usersWithoutPassword.length} users`);
   }
   
   sendPasswordSetupEmails();
   ```

3. **Users receive email with link to set password**
   - Email includes a link to `/reset-password?token=<token>`
   - Users create a password (minimum 8 characters, with at least one number and one letter)
   - Password is hashed and stored in the database

#### Option 2: Admin-Managed Password Creation

Admins can manually create accounts for existing users through the User Management page (`/admin/users`).

1. Navigate to User Management
2. Click "Create Account"
3. Enter user's email and basic information
4. User receives a welcome email with password setup instructions

## Technical Details

### Database Changes

The following fields have been added to the `users` table:

- `password_hash` (varchar, 255): Bcrypt hash of the user's password
- `is_email_verified` (boolean): Email verification status
- `email_verification_token` (varchar, 255): Token for email verification
- `email_verification_expiry` (timestamp): Expiration time for verification token
- `password_reset_token` (varchar, 255): Token for password reset
- `password_reset_expiry` (timestamp): Expiration time for reset token

### Session Management

- Sessions are stored in PostgreSQL using the existing `sessions` table
- Session duration: 7 days
- Sessions are destroyed on logout
- Requires `SESSION_SECRET` environment variable to be set

### Environment Variables

Required environment variables:
- `SESSION_SECRET`: Secret key for session encryption (should be set by Replit automatically)
- `DATABASE_URL`: PostgreSQL connection string (already configured)
- `SENDGRID_API_KEY`: For sending verification and password reset emails (optional but recommended)

### Email Templates

The following email templates are used:
1. **Verification Email**: Sent when a new user signs up
2. **Welcome Email**: Sent after email verification is complete
3. **Password Reset Email**: Sent when a user requests a password reset

## Security Features

- **Password Requirements**: Minimum 8 characters with at least one number and one letter
- **Email Verification**: Required before users can log in
- **Token Expiry**: 
  - Email verification tokens expire after 24 hours
  - Password reset tokens expire after 1 hour
- **Bcrypt Hashing**: Passwords are hashed with bcrypt (12 rounds)
- **Session Security**: 
  - HTTP-only cookies
  - Secure flag in production
  - SameSite: Lax

## Testing the Migration

1. **Test New User Registration**:
   - Visit `/signup`
   - Create a new account
   - Verify email
   - Log in

2. **Test Password Reset**:
   - Visit `/reset-password`
   - Enter email
   - Check email for reset link
   - Set new password
   - Log in with new password

3. **Test Existing User Migration** (if using Option 1):
   - Run migration script
   - Check that users without passwords receive emails
   - Verify users can set passwords and log in

## Rollback Plan

If issues arise, the original `replitAuth.ts` file has been backed up as `server/replitAuth.ts.backup`. To rollback:

1. Restore `replitAuth.ts` from backup
2. Update `server/routes.ts` to import from `./replitAuth` instead of `./customAuth`
3. Revert changes to `server/index.ts`, `client/src/App.tsx`, and `client/src/components/Layout.tsx`
4. Remove the new auth pages from `client/src/pages/`
5. Restart the application

## Support

For issues or questions during migration, contact the development team or refer to the project documentation.
