
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
            <p className="text-muted-foreground">Last Updated: January 2024</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              By accessing or using Practical Defense Training's services, including our website, 
              training programs, and related services, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Course Registration and Enrollment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              When you register for a course or training program:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>You must provide accurate and complete information</li>
              <li>You must be at least 18 years of age or have parental/guardian consent</li>
              <li>You agree to pay all applicable fees and charges</li>
              <li>You understand that course availability is subject to minimum enrollment requirements</li>
              <li>You acknowledge that courses may be cancelled or rescheduled due to unforeseen circumstances</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Payment terms for our services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Deposits may be required to secure your course registration</li>
              <li>Full payment is due by the course start date unless otherwise specified</li>
              <li>We accept various payment methods as indicated during checkout</li>
              <li>All prices are in US Dollars unless otherwise stated</li>
              <li>Prices are subject to change without notice</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Cancellation and Refund Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground"><strong>Student Cancellations:</strong></p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Cancellations made 7+ days before the course date: Full refund minus processing fees</li>
              <li>Cancellations made 3-6 days before: 50% refund</li>
              <li>Cancellations made less than 3 days before: No refund (credit toward future course may be offered)</li>
            </ul>
            <p className="text-muted-foreground mt-4"><strong>Instructor Cancellations:</strong></p>
            <p className="text-muted-foreground">
              If we cancel a course, you will receive a full refund or the option to transfer to another scheduled course.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Safety and Conduct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By participating in our training programs, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Follow all safety protocols and instructor directions</li>
              <li>Handle all firearms safely and responsibly</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Behave professionally and respectfully toward instructors and other students</li>
              <li>Not participate under the influence of alcohol or drugs</li>
              <li>Bring only authorized equipment and firearms as specified</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We reserve the right to remove any participant who violates safety protocols or 
              engages in inappropriate conduct, without refund.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Assumption of Risk and Liability Waiver</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Firearms training involves inherent risks. By participating in our courses, you 
              acknowledge and accept these risks. You agree to release, indemnify, and hold harmless 
              Practical Defense Training, its instructors, and affiliates from any claims, damages, 
              or injuries arising from your participation in our training programs, except in cases 
              of gross negligence or willful misconduct.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All course materials, content, trademarks, and intellectual property provided by 
              Practical Defense Training remain our exclusive property. You may not reproduce, 
              distribute, or create derivative works without our written permission.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your use of our services is also governed by our Privacy Policy. We collect and use 
              your personal information as described in our Privacy Policy, including for course 
              administration, communications, and compliance with legal requirements.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Disclaimer of Warranties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our services are provided "as is" without warranties of any kind, either express or 
              implied. We do not guarantee that our training will result in licensing approval or 
              any specific outcome. Students are responsible for meeting all legal requirements for 
              concealed carry licensing in their jurisdiction.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Practical Defense Training shall not be liable 
              for any indirect, incidental, special, consequential, or punitive damages arising from 
              your use of our services.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>11. Modifications to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms of Service at any time. Changes will be 
              effective immediately upon posting to our website. Your continued use of our services 
              after changes constitutes acceptance of the modified terms.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>12. Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              These Terms of Service shall be governed by and construed in accordance with the laws 
              of the State of New Mexico, without regard to its conflict of law provisions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Email:</strong> jeremy@abqconcealedcarry.com</p>
              <p><strong>Phone:</strong> (505) 944-5247</p>
              <p><strong>Address:</strong> Albuquerque, New Mexico</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
