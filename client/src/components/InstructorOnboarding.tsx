
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, ExternalLink, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function InstructorOnboarding() {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string>("");
  
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "stripe",
      title: "Set up Stripe",
      description: "Create a Stripe account and get your API keys",
      completed: false,
    },
    {
      id: "twilio",
      title: "Set up Twilio (Optional)",
      description: "Create a Twilio account for SMS notifications",
      completed: false,
    },
    {
      id: "sendgrid",
      title: "Set up SendGrid (Optional)",
      description: "Create a SendGrid account for email notifications",
      completed: false,
    },
  ]);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(""), 2000);
    toast({
      title: "Copied!",
      description: `${keyName} copied to clipboard`,
    });
  };

  const toggleStep = (stepId: string) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, completed: !step.completed } : step
    ));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Instructor Onboarding</h1>
        <p className="text-muted-foreground">
          Welcome! Follow these steps to set up your firearms training platform.
        </p>
      </div>

      <Alert>
        <AlertDescription>
          All secret keys should be added to the <strong>Secrets</strong> tool in Replit. 
          Never commit secrets to your code or share them publicly.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="stripe" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stripe">
            {steps[0].completed ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
            Stripe
          </TabsTrigger>
          <TabsTrigger value="twilio">
            {steps[1].completed ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
            Twilio
          </TabsTrigger>
          <TabsTrigger value="sendgrid">
            {steps[2].completed ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
            SendGrid
          </TabsTrigger>
        </TabsList>

        {/* Stripe Setup */}
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Payment Processing (Required)</CardTitle>
              <CardDescription>
                Stripe handles all payment processing for course enrollments and merchandise sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Step 1: Create a Stripe Account</h3>
                <Button variant="outline" asChild>
                  <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
                    Sign up for Stripe <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 2: Get Your API Keys</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Log into your Stripe Dashboard</li>
                  <li>Click on "Developers" in the left sidebar</li>
                  <li>Click on "API keys"</li>
                  <li>Copy your "Secret key" (starts with sk_)</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 3: Add Environment Variable</h3>
                <div className="space-y-3 bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label>Secret Key Name</Label>
                    <div className="flex items-center gap-2">
                      <Input value="STRIPE_SECRET_KEY" readOnly className="bg-background" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("STRIPE_SECRET_KEY", "Key name")}
                      >
                        {copiedKey === "Key name" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Your Stripe Secret Key</Label>
                    <Input placeholder="sk_test_..." className="bg-background" />
                    <p className="text-xs text-muted-foreground">
                      Add this environment variable to your hosting platform's secrets/environment variables configuration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 4: Configure Tax Settings</h3>
                <p className="text-sm text-muted-foreground">
                  In your Stripe Dashboard, navigate to Settings → Tax to configure automatic tax calculation for your location.
                </p>
              </div>

              <Button onClick={() => toggleStep("stripe")} className="w-full">
                {steps[0].completed ? "Mark as Incomplete" : "Mark as Complete"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Twilio Setup */}
        <TabsContent value="twilio">
          <Card>
            <CardHeader>
              <CardTitle>Twilio SMS Service (Optional)</CardTitle>
              <CardDescription>
                Enable SMS notifications for course reminders and communications with students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Step 1: Create a Twilio Account</h3>
                <Button variant="outline" asChild>
                  <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">
                    Sign up for Twilio <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 2: Get Your Credentials</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Log into your Twilio Console</li>
                  <li>Find your Account SID and Auth Token</li>
                  <li>Get or purchase a phone number</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 3: Add Environment Variables</h3>
                <div className="space-y-3 bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label>Account SID</Label>
                    <div className="flex items-center gap-2">
                      <Input value="TWILIO_ACCOUNT_SID" readOnly className="bg-background" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("TWILIO_ACCOUNT_SID", "Twilio Account SID")}
                      >
                        {copiedKey === "Twilio Account SID" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Token</Label>
                    <div className="flex items-center gap-2">
                      <Input value="TWILIO_AUTH_TOKEN" readOnly className="bg-background" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("TWILIO_AUTH_TOKEN", "Twilio Auth Token")}
                      >
                        {copiedKey === "Twilio Auth Token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Input value="TWILIO_PHONE_NUMBER" readOnly className="bg-background" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("TWILIO_PHONE_NUMBER", "Twilio Phone Number")}
                      >
                        {copiedKey === "Twilio Phone Number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={() => toggleStep("twilio")} className="w-full">
                {steps[1].completed ? "Mark as Incomplete" : "Mark as Complete"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SendGrid Setup */}
        <TabsContent value="sendgrid">
          <Card>
            <CardHeader>
              <CardTitle>SendGrid Email Service (Optional)</CardTitle>
              <CardDescription>
                Enable professional email notifications for course communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Step 1: Create a SendGrid Account</h3>
                <Button variant="outline" asChild>
                  <a href="https://signup.sendgrid.com/" target="_blank" rel="noopener noreferrer">
                    Sign up for SendGrid <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 2: Create an API Key</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li>Go to Settings → API Keys</li>
                  <li>Click "Create API Key"</li>
                  <li>Choose "Full Access" for permissions</li>
                  <li>Copy the generated API key</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Step 3: Add Environment Variable</h3>
                <div className="space-y-3 bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label>SendGrid API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input value="SENDGRID_API_KEY" readOnly className="bg-background" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard("SENDGRID_API_KEY", "SendGrid API Key")}
                      >
                        {copiedKey === "SendGrid API Key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={() => toggleStep("sendgrid")} className="w-full">
                {steps[2].completed ? "Mark as Incomplete" : "Mark as Complete"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>How to Add Secrets in Replit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>In your Replit workspace, click the <strong>Tools</strong> icon in the left sidebar</li>
            <li>Select <strong>Secrets</strong> from the menu</li>
            <li>Click <strong>+ New Secret</strong></li>
            <li>Enter the key name (e.g., STRIPE_SECRET_KEY)</li>
            <li>Paste the secret value</li>
            <li>Click <strong>Add Secret</strong></li>
          </ol>
          <Alert>
            <AlertDescription>
              After adding all required secrets, restart your application for the changes to take effect.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
