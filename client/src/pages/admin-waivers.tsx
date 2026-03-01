import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Eye, CheckCircle, Calendar, Mail, User } from "lucide-react";
import { useState } from "react";
import type { FtaWaiverSubmission } from "@shared/schema";

export default function AdminWaiversPage() {
  const [selectedWaiver, setSelectedWaiver] = useState<FtaWaiverSubmission | null>(null);

  const { data: waivers = [], isLoading } = useQuery<FtaWaiverSubmission[]>({
    queryKey: ['/api/waivers'],
  });

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6" data-testid="admin-waivers-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">Waiver Submissions</h1>
            <p className="text-muted-foreground">View all submitted FTA Release and Waiver forms</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <FileText className="w-4 h-4 mr-2" />
            {waivers.length} Total
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>Click on a row to view the full waiver details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading waivers...</div>
            ) : waivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No waivers submitted yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Initials</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waivers.map((waiver) => (
                    <TableRow 
                      key={waiver.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedWaiver(waiver)}
                      data-testid={`waiver-row-${waiver.id}`}
                    >
                      <TableCell className="font-medium">
                        {formatDate(waiver.submittedAt)}
                      </TableCell>
                      <TableCell>{waiver.studentName}</TableCell>
                      <TableCell>{waiver.studentEmail}</TableCell>
                      <TableCell>{waiver.activityName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">{waiver.initialRiskAssumption}</Badge>
                          <Badge variant="outline" className="text-xs">{waiver.initialReleaseOfLiability}</Badge>
                          <Badge variant="outline" className="text-xs">{waiver.initialJuryTrialWaiver}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={waiver.signatureType === 'typed' ? 'secondary' : 'default'}>
                          {waiver.signatureType === 'typed' ? 'Typed' : 'Drawn'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWaiver(waiver);
                          }}
                          data-testid={`button-view-waiver-${waiver.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedWaiver} onOpenChange={() => setSelectedWaiver(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Waiver Details
              </DialogTitle>
              <DialogDescription>
                Submitted on {selectedWaiver && formatDate(selectedWaiver.submittedAt)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedWaiver && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> Student Name
                      </p>
                      <p className="font-medium">{selectedWaiver.studentName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </p>
                      <p className="font-medium">{selectedWaiver.studentEmail}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Activity</p>
                      <p className="font-medium">{selectedWaiver.activityName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Printed Name</p>
                      <p className="font-medium">{selectedWaiver.printedName}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{selectedWaiver.address}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Submitted
                      </p>
                      <p className="font-medium">{formatDate(selectedWaiver.submittedAt)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold text-lg">Complete Waiver Agreement</p>
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-center font-bold text-xl mb-4">FTA RELEASE AND WAIVER</h3>
                      
                      <p className="text-sm text-gray-700 leading-relaxed mb-4">
                        The individual named below (referred to as "I" or "me") desires to participate in <span className="font-medium underline">{selectedWaiver.activityName}</span> ("Activity" or "Activities") provided by the FTA member (the "Member"). As lawful consideration for being permitted by the Member to participate in the Activity, and the intangible value that I will gain by participating in the Activity, I agree to all the terms and conditions set forth in this agreement (this "Agreement").
                      </p>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
                        <p className="font-bold text-yellow-800 uppercase text-sm mb-2">Section 1: Risk Assumption</p>
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          I AM AWARE AND UNDERSTAND THAT THE ACTIVITIES ARE DANGEROUS ACTIVITIES AND INVOLVE THE RISK OF SERIOUS INJURY, DEATH, AND/OR PROPERTY DAMAGE. I ACKNOWLEDGE THAT ANY INJURIES THAT I SUSTAIN MAY BE COMPOUNDED BY NEGLIGENT EMERGENCY RESPONSE OR RESCUE OPERATIONS OF THE MEMBER. I ACKNOWLEDGE THAT I AM VOLUNTARILY PARTICIPATING IN THE ACTIVITIES WITH KNOWLEDGE OF THE DANGER INVOLVED AND HEREBY AGREE TO <strong>ACCEPT AND ASSUME ANY AND ALL RISKS OF INJURY, DEATH, OR PROPERTY DAMAGE, WHETHER CAUSED BY THE NEGLIGENCE OF THE MEMBER OR OTHERWISE.</strong>
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-yellow-200">
                          <span className="text-sm font-medium">Initialed:</span>
                          <Badge variant="outline" className="font-bold">{selectedWaiver.initialRiskAssumption}</Badge>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-4">
                        <p className="font-bold text-orange-800 uppercase text-sm mb-2">Section 2: Release of Liability</p>
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          I hereby expressly waive and release any and all claims, now known or hereafter known in any jurisdiction throughout the world, against the Member, its officers, directors, employees, agents, affiliates, members, successors, and assigns (collectively, "Releasees"), on account of injury, death, or property damage arising out of or attributable to my participation in the Activities, whether arising out of the negligence of the Member or any Releasees or otherwise. <strong>I covenant not to make or bring any such claim against the Member or any other Releasee, and forever release and discharge the Member and all other Releasees from liability under such claims.</strong>
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-orange-200">
                          <span className="text-sm font-medium">Initialed:</span>
                          <Badge variant="outline" className="font-bold">{selectedWaiver.initialReleaseOfLiability}</Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed my-4">
                        I shall defend, indemnify, and hold harmless the Member and all other Releasees against any and all losses, damages, liabilities, deficiencies, claims, actions, judgments, settlements, interest, awards, penalties, fines, costs, or expenses of whatever kind, including reasonable attorney fees, that are incurred by the indemnified party arising out of or related to any third-party claim alleging any bodily injury to or death of any person, or damage to real or tangible personal property caused by my negligence or other more culpable act or omission (including any reckless or willful misconduct) in connection with my participation in the Activities.
                      </p>

                      <p className="text-sm text-gray-700 leading-relaxed my-4">
                        Any controversy or claim arising out of or relating to this Agreement, or the breach thereof, shall be determined by final and binding arbitration administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules and Mediation Procedures ("Commercial Rules"). There shall be one arbitrator agreed to by the parties within twenty (20) days of receipt by respondent of the request for arbitration, or in default thereof appointed by the AAA in accordance with its Commercial Rules. The award rendered by the arbitrator shall be final, non-reviewable, and non-appealable and binding on the parties and may be entered and enforced in any court having jurisdiction. The place of arbitration shall be Los Angeles, California.
                      </p>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
                        <p className="font-bold text-red-800 uppercase text-sm mb-2">Section 3: Waiver of Jury Trial</p>
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          I IRREVOCABLY AND UNCONDITIONALLY WAIVE, TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, ANY RIGHT I MAY HAVE TO A TRIAL BY JURY IN ANY LEGAL ACTION, PROCEEDING, CAUSE OF ACTION, OR COUNTERCLAIM ARISING OUT OF OR RELATING TO MY PARTICIPATION IN THE ACTIVITIES. <strong>I CERTIFY AND ACKNOWLEDGE THAT I MAKE THIS WAIVER KNOWINGLY AND VOLUNTARILY.</strong>
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-200">
                          <span className="text-sm font-medium">Initialed:</span>
                          <Badge variant="outline" className="font-bold">{selectedWaiver.initialJuryTrialWaiver}</Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed my-4">
                        This Agreement constitutes the sole and entire agreement of the Member and me with respect to the subject matter contained herein and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter. If any term or provision of this Agreement is invalid, illegal, or unenforceable in any jurisdiction, such invalidity, illegality, or unenforceability shall not affect any other term or provision of this Agreement or invalidate or render unenforceable such term or provision in any other jurisdiction.
                      </p>

                      <div className="bg-gray-900 text-white rounded-lg p-4 my-4">
                        <p className="text-sm font-bold leading-relaxed">
                          BY SIGNING, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD ALL OF THE TERMS OF THIS AGREEMENT AND THAT I AM VOLUNTARILY GIVING UP SUBSTANTIAL LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE THE MEMBER.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Signature</p>
                    {selectedWaiver.signatureType === 'typed' ? (
                      <div className="border rounded p-4 bg-gray-50">
                        <p className="text-sm text-muted-foreground mb-1">Typed Signature</p>
                        <p className="text-2xl italic" style={{ fontFamily: 'cursive' }}>{selectedWaiver.typedSignature}</p>
                      </div>
                    ) : (
                      <div className="border rounded p-4 bg-white">
                        <p className="text-sm text-muted-foreground mb-2">Drawn Signature</p>
                        <img 
                          src={selectedWaiver.signatureData} 
                          alt="Signature" 
                          className="max-w-full h-auto border rounded"
                        />
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Date: {formatDate(selectedWaiver.submittedAt)}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Electronic Consent</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Electronic signature consent provided: {selectedWaiver.electronicConsent ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Technical Details (Legal Record)</p>
                    <div className="bg-gray-100 rounded p-4 text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">IP Address:</span>
                        <span className="font-mono">{selectedWaiver.ipAddress}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Browser Agent:</span>
                        <span className="font-mono text-xs break-all">{selectedWaiver.browserAgent}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Waiver Version:</span>
                        <span className="font-mono">{selectedWaiver.waiverVersion}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Submission ID:</span>
                        <span className="font-mono">{selectedWaiver.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
