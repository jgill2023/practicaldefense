
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
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="stripe">
            {steps[0].completed ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Circle className="h-4 w-4 mr-2" />}
            Stripe Payment Processing
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
      </Tabs>

      
    </div>
  );
}
