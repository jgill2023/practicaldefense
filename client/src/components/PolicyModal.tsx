
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'refund';
}

export function PolicyModal({ isOpen, onClose, type }: PolicyModalProps) {
  const renderTermsOfService = () => (
    <ScrollArea className="h-[70vh] pr-4">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Effective Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Effective Date: January 12, 2025</p>
            <p className="text-muted-foreground">Last Updated: January 12, 2025</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              By accessing or using www.abqconcealedcarry.com (the "Site") or registering for any training, course, or service provided by Apache Solutions, LLC ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms").
            </p>
            <p className="text-muted-foreground mt-4">
              If you do not agree, do not use our website or services. These Terms apply to all users, including students, visitors, and account holders.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">2. Eligibility</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">3. Course Registration and Accounts</CardTitle>
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
              If you suspect unauthorized use of your account, notify us immediately at info@abqconcealedcarry.com.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">4. Payment and Refund Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>All payments are processed securely through Stripe</li>
              <li>Full payment is required to confirm registration</li>
              <li>Refunds or rescheduling requests must comply with our Refund & Cancellation Policy</li>
              <li>Refund eligibility may vary based on notice provided prior to the scheduled course date</li>
              <li>We do not store or directly process credit card details</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">5. Safety and Conduct</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">6. Assumption of Risk and Waiver of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By participating in firearms training or related activities provided by Apache Solutions, LLC, you acknowledge and accept the inherent risks associated with handling firearms, live ammunition, and range activities.
            </p>
            <p className="text-muted-foreground">
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Assume all risks, known and unknown, associated with training and related activities</li>
              <li>Waive and release Apache Solutions, LLC, its owners, instructors, and affiliates from any and all claims of injury, loss, or damage arising out of participation</li>
              <li>Indemnify and hold harmless Apache Solutions, LLC for any claims brought by third parties resulting from your actions</li>
            </ul>
            <p className="text-muted-foreground">
              You further understand that safety protocols are strictly enforced and noncompliance may result in removal.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">7. Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For questions or concerns regarding these Terms, please contact:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Apache Solutions, LLC</strong></p>
              <p><strong>Email:</strong> info@abqconcealedcarry.com</p>
              <p><strong>Website:</strong> www.abqconcealedcarry.com</p>
              <p><strong>Location:</strong> New Mexico, USA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );

  const renderPrivacyPolicy = () => (
    <ScrollArea className="h-[70vh] pr-4">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Effective Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Effective Date: January 12, 2025</p>
            <p className="text-muted-foreground">Last Updated: January 12, 2025</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">1. Introduction</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">2. Information We Collect</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">3. How We Use Your Information</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">4. Legal Basis for Processing (GDPR Users)</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">5. Data Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We retain your records—including account information, registration data, and uploaded identification—indefinitely, unless you request deletion or your account is terminated. You may request permanent deletion of your personal information at any time (see Section 10).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">6. Sharing of Information</CardTitle>
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
            
            <p className="text-muted-foreground mt-4 font-semibold">SMS Communications and Data Protection</p>
            <p className="text-muted-foreground">
              All of the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties. We will not share your opt-in to an SMS campaign with any third party for purposes unrelated to providing you with the services of that campaign.
            </p>
            <p className="text-muted-foreground mt-3">
              We may share your Personal Data, including your SMS opt-in or consent status, with third parties that help us provide our messaging services, including but not limited to platform providers, phone companies, and any other vendors who assist us in the delivery of text messages. These service providers are strictly limited to using your information solely for the purpose of providing messaging services on our behalf and are contractually prohibited from using your information for any other purpose, including sharing your SMS opt-in data with their own customers or business partners.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">7. Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our website uses cookies, web beacons, and similar technologies for site functionality, analytics, and targeted advertising. You can manage or delete cookies through your browser settings or decline optional cookies when prompted.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">8. Security of Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We implement appropriate administrative, technical, and physical safeguards to protect your data from unauthorized access, alteration, or disclosure. While no system is completely secure, we continuously monitor and improve our security practices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">9. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our services are intended for adults aged 18 and older. Minors under 18 may only participate in training programs with a parent or legal guardian's consent and supervision. We do not knowingly collect personal information from children under 13.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">10. Your Rights and Choices</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">11. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              If you are accessing our website from outside the United States, please note that your data may be processed and stored in the U.S., where data protection laws may differ. We take appropriate steps to ensure that your data remains secure and protected under applicable law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">12. Liability and Firearm-Related Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We collect identification data solely to verify eligibility for firearms instruction. We do not share or report firearm-related information to government agencies unless legally required. Apache Solutions assumes no liability for misuse or unauthorized disclosure of data by users or third-party platforms beyond our control.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">13. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We may update this Privacy Policy periodically. Updates will be posted on this page with the revised "Last Updated" date. Material changes will be communicated through the email address associated with your account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">14. Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For privacy inquiries or to exercise your data rights, please contact:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Apache Solutions</strong></p>
              <p><strong>Email:</strong> Info@ApacheNC.com</p>
              <p><strong>Website:</strong> www.apachenc.com</p>
              <p><strong>Location:</strong> North Carolina, USA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );

  const renderRefundPolicy = () => (
    <ScrollArea className="h-[70vh] pr-4">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Effective Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Effective Date: January 12, 2025</p>
            <p className="text-muted-foreground">Last Updated: January 12, 2025</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">1. Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              At Apache Solutions, LLC ("we," "us," or "our"), we understand that plans can change. Because class sizes are limited and range time is reserved in advance, we have established the following refund and cancellation policy to ensure fairness to all students and instructors.
            </p>
            <p className="text-muted-foreground mt-4">
              By registering for a course on www.abqconcealedcarry.com, you acknowledge and agree to the terms below.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">2. Student Cancellations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground font-semibold mb-2">Cancellations More Than 21 Days Before Class Start</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Students who cancel more than 21 calendar days prior to the first day of class are eligible for a full refund</li>
                <li>Refunds will be processed to the original payment method, and any Stripe processing fees will be covered by us</li>
              </ul>
            </div>

            <div>
              <p className="text-muted-foreground font-semibold mb-2">Cancellations Within 14–21 Days of Class Start</p>
              <p className="text-muted-foreground">
                Students who cancel within 14 to 21 calendar days of the first day of class are not eligible for a refund, but may apply 100% of the payment toward a future course within 12 calendar months of the original class date.
              </p>
            </div>

            <div>
              <p className="text-muted-foreground font-semibold mb-2">Cancellations With Less Than 14 Days' Notice</p>
              <p className="text-muted-foreground mb-2">
                Cancellations made less than 14 calendar days before the first day of class will forfeit the deposit but may apply any payment made beyond the deposit toward a future course within 12 calendar months.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">3. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For questions or cancellation requests, please contact:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Apache Solutions, LLC</strong></p>
              <p><strong>Email:</strong> info@abqconcealedcarry.com</p>
              <p><strong>Website:</strong> www.abqconcealedcarry.com</p>
              <p><strong>Location:</strong> New Mexico, USA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );

  const getTitle = () => {
    switch (type) {
      case 'terms':
        return 'Terms of Service';
      case 'privacy':
        return 'Privacy Policy';
      case 'refund':
        return 'Refund & Cancellation Policy';
    }
  };

  const getContent = () => {
    switch (type) {
      case 'terms':
        return renderTermsOfService();
      case 'privacy':
        return renderPrivacyPolicy();
      case 'refund':
        return renderRefundPolicy();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{getTitle()}</DialogTitle>
        </DialogHeader>
        {getContent()}
      </DialogContent>
    </Dialog>
  );
}
