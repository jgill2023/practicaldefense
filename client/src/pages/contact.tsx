import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  GraduationCap, 
  Users, 
  Shield,
  HelpCircle
} from "lucide-react";

const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  inquiryType: z.string().min(1, "Please select an inquiry type"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  preferredContact: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      inquiryType: "",
      subject: "",
      message: "",
      preferredContact: "email",
    },
  });

  const submitContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
      toast({
        title: "Message Sent Successfully",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Message",
        description: error.message || "Failed to send your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    submitContactMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Thank You!</CardTitle>
              <CardDescription className="text-lg">
                Your message has been sent successfully. We'll get back to you within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsSubmitted(false)}
                data-testid="button-send-another"
              >
                Send Another Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="Contact Us"
        description="Get in touch with Apache Solutions for firearms training inquiries, course registration help, or private instruction scheduling. We respond within 24 hours."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-page-title">
            Contact Apache Solutions
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Have questions about our firearms training programs? Need help with registration? 
            We're here to help you get the professional training you need.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="mr-2 h-5 w-5" />
                  Quick Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium" data-testid="text-email">Info@ApacheNC.com</p>
                    <p className="text-sm text-muted-foreground">Email us anytime</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium" data-testid="text-location">Yadkinville, NC</p>
                    <p className="text-sm text-muted-foreground">Contact us for specific range locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Quick Help Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-4">
                <GraduationCap className="mx-auto h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-sm">Course Info</h3>
                <p className="text-xs text-muted-foreground">Training programs & schedules</p>
              </Card>
              <Card className="text-center p-4">
                <Users className="mx-auto h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-sm">Registration</h3>
                <p className="text-xs text-muted-foreground">Enrollment assistance</p>
              </Card>
              <Card className="text-center p-4">
                <Shield className="mx-auto h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-sm">Private Training</h3>
                <p className="text-xs text-muted-foreground">Custom instruction</p>
              </Card>
              <Card className="text-center p-4">
                <HelpCircle className="mx-auto h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-sm">Support</h3>
                <p className="text-xs text-muted-foreground">Technical help</p>
              </Card>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Name Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Contact Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Inquiry Type */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="inquiryType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>What can we help you with? *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-inquiry-type">
                                  <SelectValue placeholder="Select inquiry type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="course-info">Course Information</SelectItem>
                                <SelectItem value="registration">Registration Questions</SelectItem>
                                <SelectItem value="private-training">Private Training Request</SelectItem>
                                <SelectItem value="scheduling">Scheduling Questions</SelectItem>
                                <SelectItem value="technical">Technical Support</SelectItem>
                                <SelectItem value="general">General Inquiry</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="preferredContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Contact Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-contact-method">
                                  <SelectValue placeholder="Select contact method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone Call</SelectItem>
                                <SelectItem value="text">Text Message</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Subject */}
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-subject" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Message */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message *</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={5}
                              placeholder="Tell us about your training needs, questions, or how we can help you..."
                              data-testid="textarea-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={submitContactMutation.isPending}
                      data-testid="button-submit-contact"
                    >
                      {submitContactMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What training programs do you offer?</h4>
                  <p className="text-sm text-muted-foreground">
                    We offer a variety of specialized firearms training. We have scheduled courses, workshops, private sessions and we can even customize a course to fit your needs. If you don't see what you are looking for, send us an email and we will be happy to help you out!
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How do I register for a course?</h4>
                  <p className="text-sm text-muted-foreground">
                    You can register online through our website or contact us directly.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Do you offer private training?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, we offer customized private training sessions for individuals or small groups. Contact us to discuss your specific needs and schedule.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">What should I bring to training?</h4>
                  <p className="text-sm text-muted-foreground">
                    Specific requirements vary by course. Our course descriptions should provide you with all of that information. If you have any questions on gear, send us an email or text message!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}