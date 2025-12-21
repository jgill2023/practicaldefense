import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { FtaWaiverForm, FtaWaiverSuccessCard } from "@/components/FtaWaiverForm";

export default function FtaWaiverPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const handleComplete = (data: any) => {
    setIsSubmitted(true);
    setSubmittedData(data);
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <FtaWaiverSuccessCard submittedData={submittedData} />
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
            <FtaWaiverForm onComplete={handleComplete} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
