
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RefundPolicyPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8" data-testid="text-page-title">
          Refund & Cancellation Policy
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
            <CardTitle>1. Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              At Tactical Advantage, LLC ("we," "us," or "our"), we understand that plans can change. Because class sizes are limited and range time is reserved in advance, we have established the following refund and cancellation policy to ensure fairness to all students and instructors.
            </p>
            <p className="text-muted-foreground mt-4">
              By registering for a course on <a href="https://www.tacticaladv.com" className="text-accent hover:underline">www.tacticaladv.com</a>, you acknowledge and agree to the terms below.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Student Cancellations</CardTitle>
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
              <p className="text-muted-foreground italic">
                Example: If a course has a $165 enrollment fee and a $50 deposit, and a student cancels within 14 days of the class after paying in full, the $50 deposit will be forfeited, but the $115 remaining balance may be applied to a future class within 12 months.
              </p>
            </div>

            <div>
              <p className="text-muted-foreground font-semibold mb-2">Emergency Cancellations</p>
              <p className="text-muted-foreground">
                Emergencies and exceptional circumstances (e.g., illness, family emergency, military deployment) will be considered on a case-by-case basis. Supporting documentation may be requested.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. No-Shows, Late Arrivals, and Removals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground"><strong>No-Shows:</strong> Students who fail to attend their scheduled course without prior notice are not eligible for a refund or credit.</p>
            </div>
            <div>
              <p className="text-muted-foreground"><strong>Late Arrivals:</strong> Students arriving more than 30 minutes late to class will forfeit their deposit but may re-enroll in a future class within 12 calendar months of the original date.</p>
            </div>
            <div>
              <p className="text-muted-foreground"><strong>Removals:</strong> Refunds will not be offered to students removed from class for violating safety rules or instructor directions.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Cancellations by Practical Defense Training, LLC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              While rare, we reserve the right to reschedule or cancel classes at our discretion due to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Low enrollment</li>
              <li>Instructor unavailability</li>
              <li>Range closures, or</li>
              <li>Weather and safety concerns</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              If a class is cancelled by us:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Students may choose to receive a full refund, or</li>
              <li>Transfer their registration to the next available class date</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We are not responsible for additional costs (e.g., travel, lodging) incurred due to class rescheduling or cancellation.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Refund Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Refunds are issued to the original payment method used at registration</li>
              <li>Stripe processing fees are covered by Practical Defense Training, LLC</li>
              <li>Refunds typically appear within 5–10 business days, depending on your financial institution</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Minimum Enrollment Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Certain classes may require a minimum number of students to run. If enrollment minimums are not met:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>The course will be rescheduled, and</li>
              <li>Students may choose between a full refund or transfer to the new date</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We reserve the right to reschedule or modify courses as needed to ensure a quality training experience.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Electronic Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All students must acknowledge this Refund & Cancellation Policy electronically during the online registration process. Enrollment is not complete until acknowledgment has been received.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              For questions or cancellation requests, please contact:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Tactical Advantage, LLC</strong></p>
              <p><strong>Email:</strong> <a href="mailto:info@tacticaladv.com" className="text-accent hover:underline">info@tacticaladv.com</a></p>
              <p><strong>Website:</strong> <a href="https://www.tacticaladv.com" className="text-accent hover:underline">www.tacticaladv.com</a></p>
              <p><strong>Location:</strong> New Mexico, USA</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
