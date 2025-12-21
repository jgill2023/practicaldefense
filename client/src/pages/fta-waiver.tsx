import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";

const FTA_WAIVER_VERSION = "2021-v1";

const FTA_WAIVER_TEXT = `FTA RELEASE AND WAIVER

The individual named below (referred to as "I" or "me") desires to participate in _____________________ ("Activity" or "Activities") provided by the FTA member (the "Member"). As lawful consideration for being permitted by the Member to participate in the Activity, and the intangible value that I will gain by participating in the Activity, I agree to all the terms and conditions set forth in this agreement (this "Agreement").

I AM AWARE AND UNDERSTAND THAT THE ACTIVITIES ARE DANGEROUS ACTIVITIES AND INVOLVE THE RISK OF SERIOUS INJURY, DEATH, AND/OR PROPERTY DAMAGE. I ACKNOWLEDGE THAT ANY INJURIES THAT I SUSTAIN MAY BE COMPOUNDED BY NEGLIGENT EMERGENCY RESPONSE OR RESCUE OPERATIONS OF THE MEMBER. I ACKNOWLEDGE THAT I AM VOLUNTARILY PARTICIPATING IN THE ACTIVITIES WITH KNOWLEDGE OF THE DANGER INVOLVED AND HEREBY AGREE TO ACCEPT AND ASSUME ANY AND ALL RISKS OF INJURY, DEATH, OR PROPERTY DAMAGE, WHETHER CAUSED BY THE NEGLIGENCE OF THE MEMBER OR OTHERWISE.

I hereby expressly waive and release any and all claims, now known or hereafter known in any jurisdiction throughout the world, against the Member, its officers, directors, employees, agents, affiliates, members, successors, and assigns (collectively, "Releasees"), on account of injury, death, or property damage arising out of or attributable to my participation in the Activities, whether arising out of the negligence of the Member or any Releasees or otherwise. I covenant not to make or bring any such claim against the Member or any other Releasee, and forever release and discharge the Member and all other Releasees from liability under such claims.

I shall defend, indemnify, and hold harmless the Member and all other Releasees against any and all losses, damages, liabilities, deficiencies, claims, actions, judgments, settlements, interest, awards, penalties, fines, costs, or expenses of whatever kind, including reasonable attorney fees, that are incurred by the indemnified party arising out of or related to any third-party claim alleging any bodily injury to or death of any person, or damage to real or tangible personal property caused by my negligence or other more culpable act or omission (including any reckless or willful misconduct) in connection with my participation in the Activities.

Any controversy or claim arising out of or relating to this Agreement, or the breach thereof, shall be determined by final and binding arbitration administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules and Mediation Procedures ("Commercial Rules"). There shall be one arbitrator agreed to by the parties within twenty (20) days of receipt by respondent of the request for arbitration, or in default thereof appointed by the AAA in accordance with its Commercial Rules. The award rendered by the arbitrator shall be final, non-reviewable, and non-appealable and binding on the parties and may be entered and enforced in any court having jurisdiction. The place of arbitration shall be Los Angeles, California. Except as may be required by law, neither a party nor the arbitrator may disclose the existence, content, or results of any arbitration without the prior written consent of both parties, unless to protect or pursue a legal right. The arbitrator will have no authority to award punitive damages or consequential damages.

I IRREVOCABLY AND UNCONDITIONALLY WAIVE, TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, ANY RIGHT I MAY HAVE TO A TRIAL BY JURY IN ANY LEGAL ACTION, PROCEEDING, CAUSE OF ACTION, OR COUNTERCLAIM ARISING OUT OF OR RELATING TO MY PARTICIPATION IN THE ACTIVITIES. I CERTIFY AND ACKNOWLEDGE THAT I MAKE THIS WAIVER KNOWINGLY AND VOLUNTARILY.

This Agreement constitutes the sole and entire agreement of the Member and me with respect to the subject matter contained herein and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter. If any term or provision of this Agreement is invalid, illegal, or unenforceable in any jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other term or provision of this Agreement or invalidate or render unenforceable such term or provision in any other jurisdiction. This Agreement is binding on and shall inure to the benefit of the Member and me and their respective successors and assigns.

BY SIGNING, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD ALL OF THE TERMS OF THIS AGREEMENT AND THAT I AM VOLUNTARILY GIVING UP SUBSTANTIAL LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE THE MEMBER.`;

const waiverFormSchema = z.object({
  studentName: z.string().min(1, "Full name is required"),
  studentEmail: z.string().email("Valid email is required"),
  activityName: z.string().min(1, "Activity name is required"),
  initialRiskAssumption: z.string().min(1, "Initials required").max(10, "Initials too long"),
  initialReleaseOfLiability: z.string().min(1, "Initials required").max(10, "Initials too long"),
  initialJuryTrialWaiver: z.string().min(1, "Initials required").max(10, "Initials too long"),
  printedName: z.string().min(1, "Printed name is required"),
  address: z.string().min(1, "Address is required"),
  electronicConsent: z.boolean().refine(val => val === true, {
    message: "You must consent to electronic records and signatures",
  }),
});

type WaiverFormData = z.infer<typeof waiverFormSchema>;

export default function FtaWaiverPage() {
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('drawn');
  const [typedSignature, setTypedSignature] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const form = useForm<WaiverFormData>({
    resolver: zodResolver(waiverFormSchema),
    defaultValues: {
      studentName: "",
      studentEmail: "",
      activityName: "",
      initialRiskAssumption: "",
      initialReleaseOfLiability: "",
      initialJuryTrialWaiver: "",
      printedName: "",
      address: "",
      electronicConsent: false,
    },
  });

  const submitWaiverMutation = useMutation({
    mutationFn: async (data: WaiverFormData & { signatureData: string; signatureType: string; typedSignature?: string }) => {
      const response = await apiRequest('POST', '/api/waivers/submit', {
        ...data,
        waiverTextVersion: FTA_WAIVER_TEXT,
        waiverVersion: FTA_WAIVER_VERSION,
      });
      return response;
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      setSubmittedData(data);
      toast({
        title: "Waiver Submitted Successfully",
        description: "A copy of your signed waiver has been sent to your email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit waiver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
    setHasSignature(false);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setHasSignature(true);
    }
  };

  const onSubmit = (data: WaiverFormData) => {
    let signatureData = '';
    
    if (signatureType === 'drawn') {
      if (!signatureRef.current || signatureRef.current.isEmpty()) {
        toast({
          title: "Signature Required",
          description: "Please provide your signature before submitting.",
          variant: "destructive",
        });
        return;
      }
      signatureData = signatureRef.current.toDataURL('image/png');
    } else {
      if (!typedSignature.trim()) {
        toast({
          title: "Signature Required",
          description: "Please type your signature before submitting.",
          variant: "destructive",
        });
        return;
      }
      signatureData = `TYPED:${typedSignature}`;
    }

    submitWaiverMutation.mutate({
      ...data,
      signatureData,
      signatureType,
      typedSignature: signatureType === 'typed' ? typedSignature : undefined,
    });
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiver Submitted Successfully</h2>
                <p className="text-gray-600 mb-4">
                  Your FTA Release and Waiver has been recorded. A confirmation email with a copy of your signed waiver has been sent to:
                </p>
                <p className="font-medium text-gray-900 mb-6" data-testid="text-confirmation-email">{submittedData?.studentEmail}</p>
                <div className="bg-gray-100 rounded-lg p-4 text-left text-sm">
                  <p className="font-medium mb-2">Submission Details:</p>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Time: {new Date().toLocaleTimeString()}</p>
                  <p>Activity: {submittedData?.activityName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontSize: '1.75rem' }}>
              FTA RELEASE AND WAIVER
            </CardTitle>
            <CardDescription>
              Please read carefully and complete all required fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="studentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            data-testid="input-student-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studentEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            {...field} 
                            data-testid="input-student-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="activityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the activity you are participating in" 
                          {...field} 
                          data-testid="input-activity-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="bg-white border rounded-lg p-6 space-y-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      The individual named below (referred to as "I" or "me") desires to participate in <span className="font-medium underline">{form.watch("activityName") || "___________________"}</span> ("Activity" or "Activities") provided by the FTA member (the "Member"). As lawful consideration for being permitted by the Member to participate in the Activity, and the intangible value that I will gain by participating in the Activity, I agree to all the terms and conditions set forth in this agreement (this "Agreement").
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="font-bold text-yellow-800 uppercase text-sm">Section 1: Risk Assumption</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      I AM AWARE AND UNDERSTAND THAT THE ACTIVITIES ARE DANGEROUS ACTIVITIES AND INVOLVE THE RISK OF SERIOUS INJURY, DEATH, AND/OR PROPERTY DAMAGE. I ACKNOWLEDGE THAT ANY INJURIES THAT I SUSTAIN MAY BE COMPOUNDED BY NEGLIGENT EMERGENCY RESPONSE OR RESCUE OPERATIONS OF THE MEMBER. I ACKNOWLEDGE THAT I AM VOLUNTARILY PARTICIPATING IN THE ACTIVITIES WITH KNOWLEDGE OF THE DANGER INVOLVED AND HEREBY AGREE TO <strong>ACCEPT AND ASSUME ANY AND ALL RISKS OF INJURY, DEATH, OR PROPERTY DAMAGE, WHETHER CAUSED BY THE NEGLIGENCE OF THE MEMBER OR OTHERWISE.</strong>
                    </p>
                    <FormField
                      control={form.control}
                      name="initialRiskAssumption"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="font-bold text-sm whitespace-nowrap mb-0">Initial:</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your initials" 
                              className="w-24 font-medium text-center uppercase"
                              maxLength={5}
                              {...field} 
                              data-testid="input-initial-risk"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="font-bold text-orange-800 uppercase text-sm">Section 2: Release of Liability</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      I hereby expressly waive and release any and all claims, now known or hereafter known in any jurisdiction throughout the world, against the Member, its officers, directors, employees, agents, affiliates, members, successors, and assigns (collectively, "Releasees"), on account of injury, death, or property damage arising out of or attributable to my participation in the Activities, whether arising out of the negligence of the Member or any Releasees or otherwise. <strong>I covenant not to make or bring any such claim against the Member or any other Releasee, and forever release and discharge the Member and all other Releasees from liability under such claims.</strong>
                    </p>
                    <FormField
                      control={form.control}
                      name="initialReleaseOfLiability"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="font-bold text-sm whitespace-nowrap mb-0">Initial:</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your initials" 
                              className="w-24 font-medium text-center uppercase"
                              maxLength={5}
                              {...field} 
                              data-testid="input-initial-liability"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      I shall defend, indemnify, and hold harmless the Member and all other Releasees against any and all losses, damages, liabilities, deficiencies, claims, actions, judgments, settlements, interest, awards, penalties, fines, costs, or expenses of whatever kind, including reasonable attorney fees, that are incurred by the indemnified party arising out of or related to any third-party claim alleging any bodily injury to or death of any person, or damage to real or tangible personal property caused by my negligence or other more culpable act or omission (including any reckless or willful misconduct) in connection with my participation in the Activities.
                    </p>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Any controversy or claim arising out of or relating to this Agreement, or the breach thereof, shall be determined by final and binding arbitration administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules and Mediation Procedures ("Commercial Rules"). There shall be one arbitrator agreed to by the parties within twenty (20) days of receipt by respondent of the request for arbitration, or in default thereof appointed by the AAA in accordance with its Commercial Rules. The award rendered by the arbitrator shall be final, non-reviewable, and non-appealable and binding on the parties and may be entered and enforced in any court having jurisdiction. The place of arbitration shall be Los Angeles, California. Except as may be required by law, neither a party nor the arbitrator may disclose the existence, content, or results of any arbitration without the prior written consent of both parties, unless to protect or pursue a legal right. The arbitrator will have no authority to award punitive damages or consequential damages.
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="font-bold text-red-800 uppercase text-sm">Section 3: Waiver of Jury Trial</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                      I IRREVOCABLY AND UNCONDITIONALLY WAIVE, TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, ANY RIGHT I MAY HAVE TO A TRIAL BY JURY IN ANY LEGAL ACTION, PROCEEDING, CAUSE OF ACTION, OR COUNTERCLAIM ARISING OUT OF OR RELATING TO MY PARTICIPATION IN THE ACTIVITIES. <strong>I CERTIFY AND ACKNOWLEDGE THAT I MAKE THIS WAIVER KNOWINGLY AND VOLUNTARILY.</strong>
                    </p>
                    <FormField
                      control={form.control}
                      name="initialJuryTrialWaiver"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="font-bold text-sm whitespace-nowrap mb-0">Initial:</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your initials" 
                              className="w-24 font-medium text-center uppercase"
                              maxLength={5}
                              {...field} 
                              data-testid="input-initial-jury"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      This Agreement constitutes the sole and entire agreement of the Member and me with respect to the subject matter contained herein and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter. If any term or provision of this Agreement is invalid, illegal, or unenforceable in any jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other term or provision of this Agreement or invalidate or render unenforceable such term or provision in any other jurisdiction. This Agreement is binding on and shall inure to the benefit of the Member and me and their respective successors and assigns.
                    </p>
                  </div>

                  <div className="bg-gray-900 text-white rounded-lg p-4">
                    <p className="text-sm font-bold leading-relaxed">
                      BY SIGNING, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD ALL OF THE TERMS OF THIS AGREEMENT AND THAT I AM VOLUNTARILY GIVING UP SUBSTANTIAL LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE THE MEMBER.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="printedName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Printed Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Print your full legal name" 
                              {...field} 
                              data-testid="input-printed-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your address" 
                              {...field} 
                              data-testid="input-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Signature *</Label>
                    <p className="text-sm text-gray-500 mb-3">Please sign below using your finger or stylus, or type your signature</p>
                    
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant={signatureType === 'drawn' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureType('drawn')}
                        data-testid="button-signature-drawn"
                      >
                        Draw Signature
                      </Button>
                      <Button
                        type="button"
                        variant={signatureType === 'typed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureType('typed')}
                        data-testid="button-signature-typed"
                      >
                        Type Signature
                      </Button>
                    </div>

                    {signatureType === 'drawn' ? (
                      <div className="border-2 border-gray-300 rounded-lg bg-white relative">
                        <SignatureCanvas
                          ref={signatureRef}
                          penColor="black"
                          canvasProps={{
                            className: 'w-full h-40 md:h-48 rounded-lg touch-none',
                            style: { touchAction: 'none' }
                          }}
                          onEnd={handleSignatureEnd}
                          data-testid="canvas-signature"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={clearSignature}
                          data-testid="button-clear-signature"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear
                        </Button>
                        {!hasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-gray-400 text-sm">Sign here</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder="Type your full legal name as signature"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        className="font-signature text-xl italic h-16"
                        data-testid="input-typed-signature"
                      />
                    )}
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <FormField
                    control={form.control}
                    name="electronicConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-consent"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium">
                            I consent to use electronic records and signatures for this agreement *
                          </FormLabel>
                          <p className="text-xs text-gray-500">
                            By checking this box, you agree that your electronic signature is the legal equivalent of your manual signature on this waiver.
                          </p>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-auto px-12"
                    disabled={submitWaiverMutation.isPending}
                    data-testid="button-submit-waiver"
                  >
                    {submitWaiverMutation.isPending ? "Submitting..." : "Submit Waiver"}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Date: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
