import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, Award, Shield, Heart, MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import teresaKellyImage from "@assets/tk_1765820939527.png";

export default function AGirlAndAGun() {
  return (
    <Layout>
      {/* Hero Section */}
      <div className="text-white py-16 px-4 md:px-8" style={{ backgroundColor: '#69579e' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="heading-main">
            A Girl and a Gun
          </h1>
          <p className="text-xl md:text-2xl text-red-100 mb-4" data-testid="text-tagline">
            Empowering Women Through Responsible Firearm Training
          </p>
          <p className="text-lg text-red-100 max-w-2xl mx-auto" data-testid="text-description">
            A Girl and a Gun is a national movement dedicated to supporting women's participation in the shooting sports and Second Amendment culture. Through education, mentorship, and community, we promote confidence, safety, and camaraderie among female shooters.
          </p>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        {/* Program Overview */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center" data-testid="heading-mission">
            Program Overview
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2" data-testid="card-community">
              <CardHeader className="flex flex-col space-y-1.5 p-6">
                <Heart className="h-8 w-8 mb-2" style={{ color: '#6956A2' }} />
                <CardTitle className="text-lg">Community & Connection</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                Join a supportive community of women who share your passion for shooting sports and Second Amendment rights. Build lasting friendships with like-minded women.
              </CardContent>
            </Card>

            <Card className="border-2" data-testid="card-education">
              <CardHeader className="flex flex-col space-y-1.5 p-6">
                <Shield className="h-8 w-8 mb-2" style={{ color: '#6956A2' }} />
                <CardTitle className="text-lg">Expert Training</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                Receive quality instruction from experienced educators who prioritize safety, technique, and empowerment. Courses range from beginner to advanced.
              </CardContent>
            </Card>

            <Card className="border-2" data-testid="card-advocacy">
              <CardHeader className="flex flex-col space-y-1.5 p-6">
                <Award className="h-8 w-8 mb-2" style={{ color: '#6956A2' }} />
                <CardTitle className="text-lg">Advocacy & Support</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                We advocate for women's voices in the shooting sports community and provide resources to support your journey as a female shooter.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Teresa Kelly Section */}
        <section className="mb-12">
          <div className="rounded-lg p-8 md:p-12 border-2" style={{ backgroundColor: '#b6a8cc', borderColor: '#6956A2' }}>
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex-shrink-0">
                <img 
                  src={teresaKellyImage} 
                  alt="Teresa Kelly"
                  className="w-48 h-auto rounded-lg shadow-lg border-2"
                  style={{ borderColor: '#6956A2' }}
                  data-testid="image-teresa"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <Users className="h-8 w-8" style={{ color: '#6956A2' }} />
                  <h2 className="text-3xl font-bold" data-testid="heading-facilitator">
                    Meet Teresa Kelly
                  </h2>
                </div>
                <p className="text-lg text-gray-800 mb-4" data-testid="text-teresa-intro">
                  Our local NC Yadkin Valley chapter is facilitated by Teresa Kelly, a dedicated educator and passionate advocate for women's empowerment in the shooting sports community.
                </p>
                <p className="text-gray-700 mb-6" data-testid="text-teresa-bio">
                  Teresa brings years of experience, expertise, and a commitment to creating a welcoming environment for women of all experience levels. Whether you're picking up a firearm for the first time or you're an experienced shooter looking to refine your skills, Teresa is dedicated to supporting your journey with professionalism, patience, and encouragement.
                </p>
                <p className="text-gray-700" data-testid="text-teresa-mission">
                  She believes that education and community are the foundations of responsible firearm ownership and use, and she's passionate about building that culture here in the Yadkin Valley.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Local Chapter */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center" data-testid="heading-chapter">
            NC Yadkin Valley Chapter
          </h2>
          <Card className="border-2" style={{ borderColor: '#6956A2' }}>
            <CardHeader className="border-b" style={{ backgroundColor: '#b6a8cc', borderColor: '#6956A2' }}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-6 w-6" style={{ color: '#6956A2' }} />
                <CardTitle data-testid="text-chapter-name">North Carolina - Yadkin Valley</CardTitle>
              </div>
              <CardDescription className="text-base text-[#372b4a] font-semibold" data-testid="text-chapter-facilitator">
                Facilitated by Teresa Kelly
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2" data-testid="text-welcome-heading">
                    Welcome to Our Community
                  </h3>
                  <p className="text-gray-700" data-testid="text-welcome-message">
                    The NC Yadkin Valley chapter of A Girl and a Gun welcomes women of all backgrounds and experience levels. Whether you're a lifelong enthusiast or curious about learning more about firearm safety and shooting sports, you'll find a supportive, non-judgmental community here.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3" data-testid="text-what-we-offer">
                    What We Offer
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#846da8]">•</span>
                      <span data-testid="text-offer-training">Regular training sessions and workshops tailored to all skill levels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#846da8]">•</span>
                      <span data-testid="text-offer-events">Community events and social gatherings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#846da8]">•</span>
                      <span data-testid="text-offer-mentorship">Mentorship and guidance from experienced shooters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#846da8]">•</span>
                      <span data-testid="text-offer-resources">Resources on safety, technique, and responsible ownership</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span data-testid="text-offer-community">A welcoming community of like-minded women</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg border bg-[#b6a8cc]" style={{ borderColor: '#6956A2' }}>
                  <h3 className="font-semibold text-lg mb-3" data-testid="text-get-involved">
                    Get Involved
                  </h3>
                  <p className="text-gray-700 mb-4" data-testid="text-how-to-join">
                    Ready to join us or learn more about our chapter? Contact Teresa Kelly to learn about upcoming events, training sessions, and how you can become part of our community.
                  </p>
                  <div className="space-y-2">
                    <a 
                      href="https://www.agirlandagun.org/chapter/nc-yadkin-valley/" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-[#292240]"
                      style={{ color: '#6956A2' }}
                      data-testid="link-chapter-page"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visit Our Chapter Page
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action Section */}
        <section className="bg-gray-50 rounded-lg p-8 md:p-12 text-center border border-gray-200">
          <h2 className="text-3xl font-bold mb-4" data-testid="heading-ready">
            Ready to Join?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto" data-testid="text-join-message">
            Whether you're looking to develop your skills, build your confidence, or connect with an empowering community of women, we're here for you. Your journey starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://www.agirlandagun.org/" 
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="default" className="gap-2" data-testid="button-learn-more">
                <ExternalLink className="h-4 w-4" />
                Learn More About A Girl and a Gun
              </Button>
            </a>
            <Link href="/contact">
              <Button size="lg" variant="outline" data-testid="button-contact">
                Get in Touch with Us
              </Button>
            </Link>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6" data-testid="heading-resources">
            Additional Resources
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <p className="text-gray-800 mb-4" data-testid="text-resources-intro">
              For more information about A Girl and a Gun and our national movement, please visit:
            </p>
            <a 
              href="https://www.agirlandagun.org/" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-lg"
              style={{ color: '#6956A2' }}
              data-testid="link-national"
            >
              <ExternalLink className="h-4 w-4" />
              www.agirlandagun.org
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}
