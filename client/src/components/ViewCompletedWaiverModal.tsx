import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileSignature, Calendar, User, CheckCircle, AlertCircle, Shield, Scale, Gavel, Globe, Monitor } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ViewCompletedWaiverModalProps {
  enrollmentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ConsentCheckbox {
  sectionId: string;
  initial: string;
  timestamp: string;
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

  const getSectionConfig = (sectionId: string) => {
    const configs: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string; icon: typeof Shield }> = {
      'riskAssumption': {
        label: 'Assumption of Risk',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-800 dark:text-blue-200',
        icon: Shield,
      },
      'risk-assumption': {
        label: 'Assumption of Risk',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-800 dark:text-blue-200',
        icon: Shield,
      },
      'releaseOfLiability': {
        label: 'Release of Liability',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        textColor: 'text-amber-800 dark:text-amber-200',
        icon: Scale,
      },
      'release-of-liability': {
        label: 'Release of Liability',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        textColor: 'text-amber-800 dark:text-amber-200',
        icon: Scale,
      },
      'juryTrialWaiver': {
        label: 'Jury Trial Waiver',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-200',
        icon: Gavel,
      },
      'jury-trial-waiver': {
        label: 'Jury Trial Waiver',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-800 dark:text-red-200',
        icon: Gavel,
      },
    };
    return configs[sectionId] || {
      label: sectionId,
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      textColor: 'text-gray-800 dark:text-gray-200',
      icon: CheckCircle,
    };
  };

  const isFtaWaiver = (waiver: any) => {
    return waiver.template?.type === 'fta' || 
           waiver.template?.name?.toLowerCase().includes('fta') ||
           waiver.template?.title?.toLowerCase().includes('fta') ||
           waiver.template?.title?.toLowerCase().includes('release and waiver');
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
            {signedWaivers.map((waiver: any, index: number) => {
              const signature = getSignature(waiver);
              const consentCheckboxes = signature?.consentCheckboxes as ConsentCheckbox[] | null;
              const showFtaDetails = isFtaWaiver(waiver) && consentCheckboxes && consentCheckboxes.length > 0;

              return (
                <Card key={waiver.id} className="border-2 border-green-200">
                  <CardHeader className="bg-green-50 dark:bg-green-900/20">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      {waiver.template?.title || waiver.template?.name || `Waiver ${index + 1}`}
                      {showFtaDetails && (
                        <Badge variant="outline" className="ml-2 text-green-700 border-green-300">
                          FTA Compliant
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Signed: {waiver.signedAt ? format(new Date(waiver.signedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                      </div>
                      {signature && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Signer: {signature.signerName || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* FTA Initialed Sections */}
                    {showFtaDetails && (
                      <div className="mb-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          Required Initialed Sections
                        </h4>
                        <div className="space-y-3">
                          {consentCheckboxes.map((consent) => {
                            const config = getSectionConfig(consent.sectionId);
                            const IconComponent = config.icon;
                            return (
                              <div
                                key={consent.sectionId}
                                className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                                data-testid={`initial-section-${consent.sectionId}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <IconComponent className={`h-5 w-5 ${config.textColor}`} />
                                    <div>
                                      <p className={`font-medium ${config.textColor}`}>{config.label}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Initialed at: {format(new Date(consent.timestamp), 'MMM d, yyyy h:mm:ss a')}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-lg font-bold px-4 py-1 ${config.textColor} ${config.borderColor}`}
                                    data-testid={`initial-value-${consent.sectionId}`}
                                  >
                                    {consent.initial}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Separator className="my-6" />
                      </div>
                    )}

                    {/* Waiver Content */}
                    {waiver.template?.content && (
                      <details className="mb-6" open={!showFtaDetails}>
                        <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground mb-2">
                          {showFtaDetails ? 'View Full Waiver Document' : 'Waiver Content'}
                        </summary>
                        <div className="prose dark:prose-invert max-w-none mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: getMergedContent(waiver.template.content, waiver)
                            }} 
                          />
                        </div>
                      </details>
                    )}

                    {/* Signature Information */}
                    {!signature ? (
                      <div className="border-t pt-4 mt-6">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4" />
                          <p className="text-sm">Signature data not available for this waiver</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          Signature & Verification Details
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> Signer Name
                            </label>
                            <p className="text-sm font-medium" data-testid="signer-name">{signature.signerName || 'N/A'}</p>
                          </div>
                          {signature.signerAddress && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Address</label>
                              <p className="text-sm font-medium">{signature.signerAddress}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Signature Method</label>
                            <p className="text-sm font-medium capitalize" data-testid="signature-method">
                              {signature.signatureMethod === 'typed' ? 'Typed Signature' : 
                               signature.signatureMethod === 'canvas' ? 'Hand-drawn Signature' : 
                               signature.signatureMethod || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" /> IP Address
                            </label>
                            <p className="text-sm font-medium font-mono" data-testid="ip-address">{signature.ipAddress || 'N/A'}</p>
                          </div>
                          {signature.userAgent && (
                            <div className="col-span-2">
                              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                <Monitor className="h-3 w-3" /> Browser / Device
                              </label>
                              <p className="text-xs font-mono text-muted-foreground break-all" data-testid="user-agent">
                                {signature.userAgent}
                              </p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Signed At
                            </label>
                            <p className="text-sm font-medium" data-testid="signed-timestamp">
                              {signature.signedAt ? format(new Date(signature.signedAt), 'MMMM d, yyyy h:mm:ss a') : 
                               waiver.signedAt ? format(new Date(waiver.signedAt), 'MMMM d, yyyy h:mm:ss a') : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Signature Image */}
                        {signature.signatureData ? (
                          <div className="mt-4">
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
                          <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm">Signature image not available</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} data-testid="button-close-waiver">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
