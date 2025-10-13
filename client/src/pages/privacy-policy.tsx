
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
            <p className="text-muted-foreground">Last Updated: January 2024</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We collect information you provide directly to us when you:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Register for a course or training program</li>
              <li>Create an account on our platform</li>
              <li>Contact us through our contact form</li>
              <li>Subscribe to notifications or communications</li>
              <li>Make a purchase through our store</li>
            </ul>
            <p className="text-muted-foreground">
              This information may include: name, email address, phone number, date of birth, 
              address, payment information, and firearms licensing information.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Process your course registrations and payments</li>
              <li>Communicate with you about your training and schedules</li>
              <li>Send you important updates and notifications</li>
              <li>Maintain accurate records for licensing compliance</li>
              <li>Improve our services and customer experience</li>
              <li>Send you marketing communications (with your consent)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Information Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We do not sell, trade, or rent your personal information to third parties. 
              We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or law enforcement requests</li>
              <li>With service providers who assist us in operating our business (payment processors, email services)</li>
              <li>To protect the rights, property, or safety of our business and users</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Data Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational security measures to protect 
              your personal information against unauthorized access, alteration, disclosure, or 
              destruction. However, no method of transmission over the Internet or electronic 
              storage is 100% secure.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Your Rights and Choices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Access and review your personal information</li>
              <li>Request corrections to your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt-out of marketing communications</li>
              <li>Manage your notification preferences</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We use cookies and similar tracking technologies to enhance your experience on our 
              website. You can control cookie settings through your browser preferences.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our services are not directed to individuals under the age of 18. We do not knowingly 
              collect personal information from children. Parents or guardians must provide consent 
              for minors participating in our training programs.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by posting the new Privacy Policy on this page and updating the 
              "Last Updated" date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy or our privacy practices, 
              please contact us:
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
