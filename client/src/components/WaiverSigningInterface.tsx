import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, PenTool, Type, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InitialSection {
  id: string;
  label: string;
  description: string;
}

interface WaiverSigningInterfaceProps {
  waiverContent: string;
  waiverTitle: string;
  enrollmentId: string;
  instanceId: string;
  initialFields?: InitialSection[];
  onComplete: () => void;
  onCancel: () => void;
}

export function WaiverSigningInterface({
  waiverContent,
  waiverTitle,
  enrollmentId,
  instanceId,
  initialFields = [],
  onComplete,
  onCancel,
}: WaiverSigningInterfaceProps) {
  const { toast } = useToast();
  const [initials, setInitials] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Signature state
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Use initialFields from template props (or parse from HTML as fallback)
  const initialSections: InitialSection[] = initialFields.length > 0 
    ? initialFields 
    : (() => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(waiverContent, 'text/html');
        const sections = doc.querySelectorAll('.initial-section');
        
        const parsedSections: InitialSection[] = [];
        sections.forEach((section) => {
          const id = section.getAttribute('data-section-id') || `section-${parsedSections.length + 1}`;
          const label = section.getAttribute('data-label') || `Section ${parsedSections.length + 1}`;
          const description = section.textContent || '';
          parsedSections.push({ id, label, description: description.trim() });
        });
        
        return parsedSections;
      })();

  // Initialize signature canvas
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Higher resolution
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleInitialChange = (sectionId: string, value: string) => {
    // Limit to 4 characters for initials
    const trimmedValue = value.slice(0, 4).toUpperCase();
    setInitials(prev => ({ ...prev, [sectionId]: trimmedValue }));
  };

  const validateForm = () => {
    // Check all initials are provided
    for (const section of initialSections) {
      if (!initials[section.id] || initials[section.id].length < 2) {
        toast({
          variant: 'destructive',
          title: 'Missing Initials',
          description: 'Please provide your initials for all required sections.',
        });
        return false;
      }
    }

    // Check full name
    if (!fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Name',
        description: 'Please enter your full name.',
      });
      return false;
    }

    // Check address
    if (!address.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Address',
        description: 'Please enter your address.',
      });
      return false;
    }

    // Check signature based on type
    if (signatureType === 'draw' && !hasSignature) {
      toast({
        variant: 'destructive',
        title: 'Missing Signature',
        description: 'Please draw your signature.',
      });
      return false;
    }

    if (signatureType === 'type' && !typedSignature.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Signature',
        description: 'Please type your signature.',
      });
      return false;
    }

    // Check electronic consent (ESIGN Act compliance)
    if (!electronicConsent) {
      toast({
        variant: 'destructive',
        title: 'Electronic Consent Required',
        description: 'You must consent to sign this document electronically.',
      });
      return false;
    }

    // Check agreement checkbox
    if (!agreedToTerms) {
      toast({
        variant: 'destructive',
        title: 'Agreement Required',
        description: 'Please check the box to confirm you have read and understood the waiver.',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let signatureData = '';
      
      if (signatureType === 'draw') {
        const canvas = signatureCanvasRef.current;
        if (!canvas) throw new Error('Signature canvas not found');
        signatureData = canvas.toDataURL('image/png');
      }

      const response = await fetch(`/api/waiver-instances/${instanceId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signerName: fullName,
          signatureData: signatureType === 'draw' ? signatureData : null,
          typedSignature: signatureType === 'type' ? typedSignature : null,
          signatureMethod: signatureType === 'draw' ? 'canvas' : 'typed',
          consentCheckboxes: initialSections.map(section => ({
            sectionId: section.id,
            initial: initials[section.id],
            timestamp: new Date().toISOString(),
          })),
          acknowledgementsCompleted: true,
          electronicConsent: electronicConsent,
          metadata: {
            address,
            agreedToTerms,
            electronicConsent,
            signatureType,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit waiver');
      }

      toast({
        title: 'Waiver Signed',
        description: 'Your waiver has been successfully submitted. A confirmation email will be sent to you.',
      });

      onComplete();
    } catch (error) {
      console.error('Error signing waiver:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit waiver. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Waiver Content */}
      <ScrollArea className="h-[400px] border rounded-lg p-6 bg-muted/30">
        <div dangerouslySetInnerHTML={{ __html: waiverContent }} />
      </ScrollArea>

      {/* Initial Sections */}
      {initialSections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Required Initials</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Please initial each section below to acknowledge that you have read and understood it.
          </p>
          {initialSections.map((section, index) => (
            <Card key={section.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm">Section {index + 1}: {section.label}</span>
                  </div>
                  {section.description && (
                    <p className="text-sm text-muted-foreground">
                      {section.description.length > 200 
                        ? `${section.description.substring(0, 200)}...` 
                        : section.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <Label htmlFor={`initial-${section.id}`} className="min-w-[100px]">
                      Your Initials:
                    </Label>
                    <Input
                      id={`initial-${section.id}`}
                      value={initials[section.id] || ''}
                      onChange={(e) => handleInitialChange(section.id, e.target.value)}
                      placeholder="AB"
                      className="w-24 text-center font-semibold uppercase"
                      maxLength={4}
                      data-testid={`input-initial-${section.id}`}
                    />
                    {initials[section.id] && initials[section.id].length >= 2 && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="font-semibold">Your Information</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              data-testid="input-full-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State ZIP"
              data-testid="input-address"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Signature */}
      <div className="space-y-4">
        <h3 className="font-semibold">Your Signature *</h3>
        
        <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'draw' | 'type')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="flex items-center gap-2" data-testid="tab-draw-signature">
              <PenTool className="h-4 w-4" />
              Draw Signature
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2" data-testid="tab-type-signature">
              <Type className="h-4 w-4" />
              Type Signature
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="draw" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    data-testid="button-clear-signature"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
                <canvas
                  ref={signatureCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg w-full cursor-crosshair bg-white dark:bg-gray-900"
                  style={{ height: '150px', touchAction: 'none' }}
                  data-testid="canvas-signature"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Sign above using your mouse or touch screen
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="type" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="typedSignature">Type your full legal name as your signature</Label>
                    <Input
                      id="typedSignature"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Your Full Legal Name"
                      className="text-xl"
                      style={{ fontFamily: 'cursive' }}
                      data-testid="input-typed-signature"
                    />
                  </div>
                  {typedSignature && (
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm text-muted-foreground mb-2">Signature Preview:</p>
                      <p className="text-2xl" style={{ fontFamily: 'cursive' }}>{typedSignature}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      {/* Electronic Consent (ESIGN Act Compliance) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Electronic Signature Consent</h3>
        </div>
        
        <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Checkbox
            id="electronicConsent"
            checked={electronicConsent}
            onCheckedChange={(checked) => setElectronicConsent(checked as boolean)}
            data-testid="checkbox-electronic-consent"
          />
          <Label htmlFor="electronicConsent" className="text-sm leading-tight cursor-pointer">
            <strong>I consent to sign this document electronically.</strong> I understand that my electronic signature has the same legal effect as a handwritten signature. I acknowledge that I can request a paper copy of this document at any time.
          </Label>
        </div>
      </div>

      {/* Agreement Checkbox */}
      <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <Checkbox
          id="agreedToTerms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          data-testid="checkbox-agree-terms"
        />
        <Label htmlFor="agreedToTerms" className="text-sm leading-tight cursor-pointer">
          <strong>I acknowledge</strong> that I have read and understood all terms of this waiver and that I am voluntarily giving up substantial legal rights, including the right to sue.
        </Label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="button-cancel-waiver"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          data-testid="button-submit-waiver"
        >
          {isSubmitting ? 'Submitting...' : 'Sign and Submit Waiver'}
        </Button>
      </div>
    </div>
  );
}
