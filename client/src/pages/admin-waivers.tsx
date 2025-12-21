import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
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
    <Layout>
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
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Initials</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-xs text-yellow-800 font-medium">Risk Assumption</p>
                        <p className="text-lg font-bold">{selectedWaiver.initialRiskAssumption}</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <p className="text-xs text-orange-800 font-medium">Release of Liability</p>
                        <p className="text-lg font-bold">{selectedWaiver.initialReleaseOfLiability}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-xs text-red-800 font-medium">Jury Trial Waiver</p>
                        <p className="text-lg font-bold">{selectedWaiver.initialJuryTrialWaiver}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Signature</p>
                    {selectedWaiver.signatureType === 'typed' ? (
                      <div className="border rounded p-4 bg-gray-50">
                        <p className="text-sm text-muted-foreground mb-1">Typed Signature</p>
                        <p className="text-2xl font-script italic">{selectedWaiver.typedSignature}</p>
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
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Electronic Consent</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Consent provided: {selectedWaiver.electronicConsent ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold">Technical Details</p>
                    <div className="bg-gray-100 rounded p-4 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IP Address:</span>
                        <span className="font-mono">{selectedWaiver.ipAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Browser Agent:</span>
                        <span className="font-mono text-xs break-all">{selectedWaiver.browserAgent?.substring(0, 80)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Waiver Version:</span>
                        <span className="font-mono">{selectedWaiver.waiverVersion}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
