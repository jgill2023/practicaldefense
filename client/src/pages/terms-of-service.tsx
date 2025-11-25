
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8" data-testid="text-page-title">
          Terms of Service
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
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              By accessing or using <a href="https://www.tacticaladv.com" className="text-accent hover:underline">www.tacticaladv.com</a> (the "Site") or registering for any training, course, or service provided by Tactical Advantage, LLC ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms").
            </p>
            <p className="text-muted-foreground mt-4">
              If you do not agree, do not use our website or services. These Terms apply to all users, including students, visitors, and account holders.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To register for a firearms course or related training, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Be at least 18 years old, or attend with a parent or legal guardian</li>
              <li>Be legally permitted to possess, handle, and/or use firearms in your jurisdiction</li>
              <li>Provide accurate and complete registration information, including identification if required</li>
            </ul>
            <p className="text-muted-foreground">
              We reserve the right to verify your eligibility and deny service to anyone at our discretion for safety, legal, or behavioral reasons.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Course Registration and Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To enroll in a class, users must create an account on our custom web application. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Maintain the confidentiality of your login credentials</li>
              <li>Be responsible for all activity under your account</li>
              <li>Provide truthful, accurate, and current information</li>
            </ul>
            <p className="text-muted-foreground">
              If you suspect unauthorized use of your account, notify us immediately at <a href="mailto:info@tacticaladv.com" className="text-accent hover:underline">info@tacticaladv.com</a>.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Payment and Refund Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>All payments are processed securely through Stripe</li>
              <li>Full payment is required to confirm registration</li>
              <li>Refunds or rescheduling requests must comply with our <a href="/refund-policy" className="text-accent hover:underline">Refund & Cancellation Policy</a></li>
              <li>Refund eligibility may vary based on notice provided prior to the scheduled course date</li>
              <li>We do not store or directly process credit card details</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Safety and Conduct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your safety and the safety of all participants are our top priorities.
            </p>
            <p className="text-muted-foreground">
              By registering, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Follow all instructor directions at all times</li>
              <li>Handle firearms responsibly and in compliance with all laws and range rules</li>
              <li>Abstain from alcohol, illegal substances, or impairing medications before and during instruction</li>
              <li>Conduct yourself with respect toward all staff, students, and facilities</li>
            </ul>
            <p className="text-muted-foreground">
              Violation of safety rules may result in immediate removal from the course without refund.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Assumption of Risk and Waiver of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By participating in firearms training or related activities provided by Tactical Advantage, LLC, you acknowledge and accept the inherent risks associated with handling firearms, live ammunition, and range activities.
            </p>
            <p className="text-muted-foreground">
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Assume all risks, known and unknown, associated with training and related activities</li>
              <li>Waive and release Tactical Advantage, LLC, its owners, instructors, and affiliates from any and all claims of injury, loss, or damage arising out of participation</li>
              <li>Indemnify and hold harmless Tactical Advantage, LLC for any claims brought by third parties resulting from your actions</li>
            </ul>
            <p className="text-muted-foreground">
              You further understand that safety protocols are strictly enforced and noncompliance may result in removal.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Identification and Legal Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              As part of course registration, you may be required to provide:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>A valid driver's license; and</li>
              <li>A concealed carry license number (if applicable)</li>
            </ul>
            <p className="text-muted-foreground">
              These details are collected solely for identity verification and compliance with state and federal training requirements. Information is stored securely and handled according to our <a href="/privacy-policy" className="text-accent hover:underline">Privacy Policy</a>.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All content on the Site—including text, logos, videos, graphics, and course materials—is the property of Tactical Advantage, LLC and is protected by copyright and trademark laws.
            </p>
            <p className="text-muted-foreground mt-4">
              You may not copy, reproduce, distribute, or modify any materials without prior written consent.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Communications and Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By creating an account or registering for a course, you consent to receive:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Transactional emails (confirmation, updates, receipts)</li>
              <li>SMS or email reminders for class dates</li>
              <li>Optional marketing communications, from which you can unsubscribe at any time</li>
            </ul>
            <p className="text-muted-foreground">
              Some messages may be automated through integrated systems such as Twilio or Firebase.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Termination of Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate any user account, registration, or access to our Site for violation of these Terms, unsafe behavior, or other conduct deemed inappropriate or unlawful.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>11. Disclaimer of Warranties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All services are provided "as is" and "as available." We make no warranties or representations regarding the completeness, reliability, or accuracy of information on the Site or in training content.
            </p>
            <p className="text-muted-foreground mt-4">
              We disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>12. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, Practical Defense Training, LLC shall not be liable for any indirect, incidental, or consequential damages, including but not limited to personal injury, property damage, or data loss, arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Use or inability to use the Site</li>
              <li>Participation in training activities</li>
              <li>Acts of other participants or third parties</li>
            </ul>
            <p className="text-muted-foreground">
              Total liability for any claim shall not exceed the amount paid for the specific course or service giving rise to the claim.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>13. Indemnification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You agree to defend, indemnify, and hold harmless Practical Defense Training, LLC, its owners, employees, and affiliates from any claims, damages, or expenses resulting from your use of the Site or participation in our courses.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>14. Governing Law and Jurisdiction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the State of New Mexico, without regard to conflict-of-law principles. Any disputes shall be resolved exclusively in the state or federal courts located in Bernalillo County, New Mexico.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>15. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We may update these Terms periodically. The updated version will be posted on this page with the revised effective date. Continued use of the Site after changes constitutes your acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>16. Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For questions or concerns regarding these Terms, please contact:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Tactical Advantage, LLC</strong></p>
              <p><strong>Email:</strong> <a href="mailto:info@tacticaladv.com" className="hover:underline text-[#000000]">info@tacticaladv.com</a></p>
              <p><strong>Website:</strong> <a href="https://www.tacticaladv.com" className="hover:underline text-[#000000]">www.tacticaladv.com</a></p>
              <p><strong>Location:</strong> Georgia, USA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
