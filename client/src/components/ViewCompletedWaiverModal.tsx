import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, Calendar, User, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ViewCompletedWaiverModalProps {
  enrollmentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewCompletedWaiverModal({ enrollmentId, studentName, isOpen, onClose }: ViewCompletedWaiverModalProps) {
  const { toast } = useToast();

  const { data: waiverInstances, isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/enrollments', enrollmentId, 'waiver-instances'],
    enabled: isOpen && !!enrollmentId,
  });

  const signedWaivers = waiverInstances?.filter((w: any) => w.status === 'signed') || [];

  const getMergedContent = (content: string, waiver: any) => {
    return content
      .replace(/\{\{courseName\}\}/g, waiver.enrollment?.course?.title || '')
      .replace(/\{\{courseDate\}\}/g, waiver.enrollment?.schedule?.startDate ? format(new Date(waiver.enrollment.schedule.startDate), 'MMMM d, yyyy') : '')
      .replace(/\{\{studentName\}\}/g, studentName);
  };

  const getSignature = (waiver: any) => {
    return waiver.signatures && waiver.signatures.length > 0 ? waiver.signatures[0] : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-green-600" />
            Signed Waivers - {studentName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading waivers...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Waivers</h3>
              <p className="text-muted-foreground">Unable to retrieve waiver data. Please try again.</p>
            </div>
          </div>
        ) : signedWaivers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No signed waivers found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {signedWaivers.map((waiver: any, index: number) => (
              <Card key={waiver.id} className="border-2 border-green-200">
                <CardHeader className="bg-green-50 dark:bg-green-900/20">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    {waiver.template?.title || `Waiver ${index + 1}`}
                  </CardTitle>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Signed: {waiver.signedAt ? format(new Date(waiver.signedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                    </div>
                    {(() => {
                      const signature = getSignature(waiver);
                      return signature && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Signer: {signature.signerName || 'N/A'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Waiver Content */}
                  <div className="prose dark:prose-invert max-w-none mb-6">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: waiver.template?.content ? getMergedContent(waiver.template.content, waiver) : 'No content available'
                      }} 
                    />
                  </div>

                  {/* Signature Information */}
                  {(() => {
                    const signature = getSignature(waiver);
                    if (!signature) {
                      return (
                        <div className="border-t pt-4 mt-6">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm">Signature data not available for this waiver</p>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4 border-t pt-4 mt-6">
                        <h4 className="font-semibold">Signature Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Signer Name</label>
                            <p className="text-sm font-medium">{signature.signerName || 'N/A'}</p>
                          </div>
                          {signature.signerAddress && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Address</label>
                              <p className="text-sm font-medium">{signature.signerAddress}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Signature Method</label>
                            <p className="text-sm font-medium capitalize">{signature.signatureMethod || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                            <p className="text-sm font-medium">{signature.ipAddress || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Signature Image */}
                        {signature.signatureData ? (
                          <div className="mt-6">
                            <label className="text-sm font-medium text-muted-foreground block mb-2">Digital Signature</label>
                            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900 inline-block">
                              <img 
                                src={signature.signatureData} 
                                alt="Digital Signature" 
                                className="max-w-md h-24 object-contain"
                                data-testid="signature-image"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm">Signature image not available</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} data-testid="button-close-waiver">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
