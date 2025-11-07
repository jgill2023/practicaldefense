
# Firearms Instructor Platform Setup Guide

Welcome! This guide will help you set up your own firearms training platform using this template.

## Prerequisites

- A Replit account
- Basic understanding of web applications

## Quick Start

1. **Fork this Repl** to create your own copy
2. **Log in as an instructor** (you'll be assigned the instructor role automatically on first login)
3. **Click the "Onboarding" button** on your instructor dashboard
4. **Follow the onboarding wizard** to set up your integrations

## Required Setup

### 1. Stripe (Required)

Stripe handles all payment processing for course enrollments and merchandise.

**Steps:**
1. Sign up at [https://stripe.com](https://stripe.com)
2. Get your API keys from Dashboard → Developers → API keys
3. Add to Replit Secrets:
   - Key: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key (starts with `sk_`)

**Important:** Configure tax settings in your Stripe dashboard for automatic tax calculation.

## Optional Integrations

### 2. Twilio (Optional - SMS Notifications)

Enable SMS notifications for course reminders and student communications.

**Steps:**
1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Get your credentials from the Twilio Console
3. Add to Replit Secrets:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

### 3. SendGrid (Optional - Email Notifications)

Professional email notifications for course communications.

**Steps:**
1. Sign up at [https://sendgrid.com](https://sendgrid.com)
2. Create an API key with Full Access
3. Add to Replit Secrets:
   - Key: `SENDGRID_API_KEY`
   - Value: Your SendGrid API key

### 4. Moodle (Optional - LMS Integration)

Integrate with Moodle for online course delivery.

**Steps:**
1. Set up a Moodle instance (MoodleCloud or self-hosted)
2. Enable web services and create an API token
3. Add to Replit Secrets:
   - `MOODLE_URL` - Your Moodle site URL
   - `MOODLE_TOKEN` - Your API token

### 5. Printful (Optional - Merchandise)

Print-on-demand merchandise fulfillment.

**Steps:**
1. Sign up at [https://www.printful.com](https://www.printful.com)
2. Create a manual order platform/API integration
3. Add to Replit Secrets:
   - Key: `PRINTFUL_API_KEY`
   - Value: Your Printful API key

## How to Add Secrets in Replit

1. In your Replit workspace, click **Tools** in the left sidebar
2. Select **Secrets**
3. Click **+ New Secret**
4. Enter the key name (exactly as shown above)
5. Paste the secret value
6. Click **Add Secret**
7. **Restart your application** after adding all secrets

## Database Setup

The database is automatically configured using Neon PostgreSQL. No additional setup is required.

## Session Secret

A session secret is automatically generated. If you need to customize it:

1. Add to Replit Secrets:
   - Key: `SESSION_SECRET`
   - Value: A random string (at least 32 characters)

## Deployment

Once your secrets are configured:

1. Your application will automatically restart
2. Test locally to ensure everything works
3. Use Replit's deployment features to publish your site

## Customization

After setup, you can customize:

- Course categories and offerings
- Branding and colors (via Tailwind CSS)
- Email and SMS templates
- Notification schedules
- Waiver templates

## Support

For issues or questions:
- Check the onboarding guide in your dashboard
- Review the code documentation
- Contact Replit support for platform issues

## Security Notes

- **Never commit secrets to code**
- Use Replit Secrets for all sensitive data
- Secrets are encrypted and only accessible to collaborators
- Regularly rotate your API keys
- Enable two-factor authentication on all service accounts

## Next Steps

1. Complete the onboarding process
2. Add your first course category
3. Create your first course
4. Set up your notification templates
5. Test the registration flow
6. Go live!

---

**Important:** This is a template. Make sure to customize it for your specific business needs and comply with all local regulations for firearms training.
