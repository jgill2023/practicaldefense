import { Layout } from "@/components/Layout";
import { ComicPanel, TitleCard } from "@/components/RACTheme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Building2, Home, Star, Users } from "lucide-react";

export default function StudentResources() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <TitleCard as="h1" variant="accent" className="text-3xl lg:text-4xl">
              Student Resources
            </TitleCard>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Everything you need to prepare for your training at Apache Solutions.
            </p>
          </div>

          <ComicPanel shadow="lg" className="mb-8" data-testid="resource-where-to-stay">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)] flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-heading text-2xl uppercase tracking-wide">Where to Stay</h2>
                  <p className="text-muted-foreground">Guests at Apache in 2026</p>
                </div>
              </div>

              <div className="bg-[hsl(209,90%,38%)]/10 rounded-lg p-4 border border-[hsl(209,90%,38%)]/20">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[hsl(209,90%,38%)]" />
                  Our Facility Address
                </h3>
                <p className="text-foreground font-medium">5239 U.S. 601 HWY</p>
                <p className="text-foreground font-medium">Yadkinville, NC 27055</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[hsl(209,90%,38%)]" />
                    Local Hotels
                  </h3>
                  <div className="space-y-3">
                    <Card className="border-l-4 border-l-[hsl(209,90%,38%)]">
                      <CardContent className="py-3 px-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Best Western Plus Yadkin Valley Inn & Suites</p>
                            <p className="text-sm text-muted-foreground">9.3 mi (16 min)</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">Hampton Inn Jonesville/Elkin</p>
                        <p className="text-sm text-muted-foreground">12 mi (17 min)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">Quality Inn Jonesville I-77</p>
                        <p className="text-sm text-muted-foreground">12 mi (17 min)</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500">
                      <CardContent className="py-3 px-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Days Inn Yadkinville</p>
                            <p className="text-sm text-muted-foreground">3.9 mi (8 min)</p>
                          </div>
                          <Badge variant="outline" className="text-xs">Closest & Budget</Badge>
                        </div>
                        <p className="text-xs text-amber-600 mt-1">Note: Closest and most affordable, but lower quality based on our experience.</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-xl uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-[hsl(190,65%,47%)]" />
                    Local B&Bs & Vacation Rentals
                  </h3>
                  <div className="space-y-3">
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">Modest Cottage in Yadkinville</p>
                        <p className="text-sm text-muted-foreground">2.9 mi (5 min)</p>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-[hsl(190,65%,47%)]">
                      <CardContent className="py-3 px-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Yadkin Creekside Getaway</p>
                            <p className="text-sm text-muted-foreground">12 mi (16 min)</p>
                          </div>
                          <Badge className="bg-[hsl(190,65%,47%)] text-white text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> Great for Groups
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-[hsl(190,65%,47%)]">
                      <CardContent className="py-3 px-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Legacy Acres Farmhouse</p>
                            <p className="text-sm text-muted-foreground">7.4 mi (11 min)</p>
                          </div>
                          <Badge className="bg-[hsl(190,65%,47%)] text-white text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> Large Groups
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">Onyx Cabin On its Creek</p>
                        <p className="text-sm text-muted-foreground">9 mi (15 min)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">Yadkin Valley Vineyard Cabin</p>
                        <p className="text-sm text-muted-foreground">4.3 mi (8 min) - Cozy & Private</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">The Rockford Inn</p>
                        <p className="text-sm text-muted-foreground">9.9 mi (17 min)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">New Charming Yadkin Valley Cottage</p>
                        <p className="text-sm text-muted-foreground">9.3 mi (15 min)</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium">Private Vineyard Cabin</p>
                        <p className="text-sm text-muted-foreground">3.7 mi (7 min)</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="bg-[hsl(204,27%,16%)] text-white rounded-lg p-6 mt-6">
                <h3 className="font-heading text-xl uppercase tracking-wide mb-4">Host Contact Information</h3>
                <div className="flex flex-wrap gap-6">
                  <a href="mailto:info@apachenc.com" className="flex items-center gap-2 hover:text-[#FD66C5] transition-colors" data-testid="link-contact-email">
                    <Mail className="w-5 h-5" />
                    <span>info@apachenc.com</span>
                  </a>
                  <a href="tel:336-422-6859" className="flex items-center gap-2 hover:text-[#FD66C5] transition-colors" data-testid="link-contact-phone">
                    <Phone className="w-5 h-5" />
                    <span>336-422-6859</span>
                  </a>
                </div>
                <div className="mt-6 pt-4 border-t border-white/20">
                  <p className="text-lg font-medium">WE LOOK FORWARD TO SEEING YOU OUT HERE!</p>
                  <p className="text-white/80 mt-1">— Tim Kelly / Owner & Chief Instructor</p>
                </div>
              </div>
            </div>
          </ComicPanel>
        </div>
      </div>
    </Layout>
  );
}
