
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8" data-testid="text-page-title">
          Privacy Policy
        </h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Effective Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Effective Date: January 12, 2025</p>
            <p className="text-muted-foreground">Last Updated: January 12, 2025</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Introduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Apache Solutions ("we," "our," or "us") respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website www.apachenc.com, register for courses, or otherwise interact with our services.
            </p>
            <p className="text-muted-foreground mt-4">
              By using our website or submitting your information, you agree to the terms of this Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We collect personal and technical information to facilitate course registration, communication, and compliance with legal requirements related to firearms training.
            </p>
            <div>
              <p className="text-muted-foreground font-semibold mb-2">Information You Provide</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Mailing address</li>
                <li>Payment information (processed securely through Stripe; we do not store full credit card details)</li>
                <li>Driver's license number and/or concealed carry permit number (for verification of course eligibility)</li>
                <li>Reviews, comments, or other user-generated content submitted through our platform</li>
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground font-semibold mb-2">Information Collected Automatically</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>IP address, browser type, device information, and access times</li>
                <li>Cookies and similar technologies for analytics, marketing, and retargeting</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">We may use collected information to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Create and manage your account and course registrations</li>
              <li>Communicate with you about classes, updates, and account notices</li>
              <li>Send email, SMS, or marketing messages (some automated)</li>
              <li>Process payments securely through our third-party provider (Stripe)</li>
              <li>Maintain safety, legal compliance, and operational integrity</li>
              <li>Improve our services, user experience, and marketing effectiveness</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Legal Basis for Processing (GDPR Users)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you are located in the European Economic Area (EEA), we process your data under one or more of the following legal bases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Contract performance:</strong> to fulfill course registration and service delivery</li>
              <li><strong>Legal obligation:</strong> to meet applicable firearm training and record-keeping laws</li>
              <li><strong>Legitimate interest:</strong> for business operations and marketing improvements</li>
              <li><strong>Consent:</strong> for optional marketing or cookie tracking activities</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Data Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We retain your records—including account information, registration data, and uploaded identification—indefinitely, unless you request deletion or your account is terminated. You may request permanent deletion of your personal information at any time (see Section 10).
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Sharing of Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We do not sell, rent, or trade personal data. We may share limited information with trusted third parties who assist us in operating the website and delivering services, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Stripe (payment processing)</li>
              <li>Email and SMS providers (for notifications and reminders)</li>
              <li>Analytics and marketing partners (for cookie-based retargeting)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              All third-party processors are contractually bound to keep your data secure and use it only for authorized purposes.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our website uses cookies, web beacons, and similar technologies for site functionality, analytics, and targeted advertising. You can manage or delete cookies through your browser settings or decline optional cookies when prompted.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Security of Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We implement appropriate administrative, technical, and physical safeguards to protect your data from unauthorized access, alteration, or disclosure. While no system is completely secure, we continuously monitor and improve our security practices.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our services are intended for adults aged 18 and older. Minors under 18 may only participate in training programs with a parent or legal guardian's consent and supervision. We do not knowingly collect personal information from children under 13.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Your Rights and Choices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Depending on your jurisdiction, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Access and obtain a copy of your data</li>
              <li>Request correction or deletion of your personal information</li>
              <li>Withdraw consent for marketing communications</li>
              <li>Object to or restrict certain data processing</li>
              <li>Request data portability (GDPR only)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at info@apachenc.com. We will respond within applicable legal timeframes.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>11. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              If you are accessing our website from outside the United States, please note that your data may be processed and stored in the U.S., where data protection laws may differ. We take appropriate steps to ensure that your data remains secure and protected under applicable law.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>12. Liability and Firearm-Related Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We collect identification data solely to verify eligibility for firearms instruction. We do not share or report firearm-related information to government agencies unless legally required. Apache Solutions assumes no liability for misuse or unauthorized disclosure of data by users or third-party platforms beyond our control.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>13. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We may update this Privacy Policy periodically. Updates will be posted on this page with the revised "Last Updated" date. Material changes will be communicated through the email address associated with your account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14. Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For privacy inquiries or to exercise your data rights, please contact:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Apache Solutions</strong></p>
              <p><strong>Email:</strong> Info@ApacheNC.com</p>
              <p><strong>Website:</strong> www.apachenc.com</p>
              <p><strong>Location:</strong> New Mexico, USA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
