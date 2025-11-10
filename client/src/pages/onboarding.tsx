
import { Layout } from "@/components/Layout";
import { InstructorOnboarding } from "@/components/InstructorOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { hasInstructorPrivileges } from "@/lib/authUtils";

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || !hasInstructorPrivileges(user))) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <InstructorOnboarding />
      </div>
    </Layout>
  );
}
