import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { DndContext, useDraggable, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { 
  Gift, 
  Search, 
  Plus, 
  Eye, 
  Ban, 
  DollarSign, 
  Loader2, 
  Copy, 
  Palette,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Move
} from "lucide-react";
import type { GiftCard, GiftCardTheme, GiftCardRedemption, GiftCardBalanceAdjustment, TextPosition } from "@shared/schema";
import { textPositionSchema } from "@shared/schema";

type GiftCardWithDetails = GiftCard & {
  theme?: GiftCardTheme;
  redemptionHistory?: GiftCardRedemption[];
  adjustmentHistory?: GiftCardBalanceAdjustment[];
};

const createGiftCardSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be at least $1").max(10000, "Maximum amount is $10,000"),
  themeId: z.string().uuid("Please select a theme"),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  personalMessage: z.string().max(500).optional(),
  expirationMonths: z.coerce.number().min(1).max(60).default(12),
});

const adjustBalanceSchema = z.object({
  adjustmentAmount: z.coerce.number().refine(val => val !== 0, "Amount cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
});

const voidCardSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

const defaultTextPosition: TextPosition = {
  x: 50,
  y: 50,
  fontSize: 16,
  fontColor: "#000000",
  fontWeight: "normal",
  textAlign: "center",
};

const createThemeSchema = z.object({
  name: z.string().min(1, "Theme name is required"),
  description: z.string().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").default("#3b82f6"),
  previewImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
  recipientNamePosition: textPositionSchema.optional(),
  senderNamePosition: textPositionSchema.optional(),
  amountPosition: textPositionSchema.optional(),
  codePosition: textPositionSchema.optional(),
  messagePosition: textPositionSchema.optional(),
});

type CreateGiftCardData = z.infer<typeof createGiftCardSchema>;
type AdjustBalanceData = z.infer<typeof adjustBalanceSchema>;
type VoidCardData = z.infer<typeof voidCardSchema>;
type CreateThemeData = z.infer<typeof createThemeSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    case "fully_redeemed":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"><CheckCircle className="w-3 h-3 mr-1" />Fully Redeemed</Badge>;
    case "expired":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    case "voided":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"><XCircle className="w-3 h-3 mr-1" />Voided</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(date: string | Date | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function maskCode(codeLast4: string): string {
  return `GC-XXXX-XXXX-${codeLast4}`;
}

function GiftCardDetailsDialog({ 
  giftCardId, 
  onClose 
}: { 
  giftCardId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);

  const { data: giftCard, isLoading } = useQuery<GiftCardWithDetails>({
    queryKey: ["/api/gift-cards/admin", giftCardId],
    queryFn: async () => {
      const res = await fetch(`/api/gift-cards/admin/${giftCardId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gift card details");
      return res.json();
    },
  });

  const voidForm = useForm<VoidCardData>({
    resolver: zodResolver(voidCardSchema),
    defaultValues: { reason: "" },
  });

  const adjustForm = useForm<AdjustBalanceData>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: { adjustmentAmount: 0, reason: "" },
  });

  const voidMutation = useMutation({
    mutationFn: async (data: VoidCardData) => {
      return await apiRequest("POST", `/api/gift-cards/admin/${giftCardId}/void`, data);
    },
    onSuccess: () => {
      toast({ title: "Gift card voided successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards/admin"] });
      setShowVoidDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: AdjustBalanceData) => {
      return await apiRequest("POST", `/api/gift-cards/admin/${giftCardId}/adjust-balance`, data);
    },
    onSuccess: () => {
      toast({ title: "Balance adjusted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards/admin"] });
      setShowAdjustDialog(false);
      adjustForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!giftCard) {
    return <div className="text-center py-8 text-muted-foreground">Gift card not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground text-xs">Code (Masked)</Label>
          <p className="font-mono text-lg">{maskCode(giftCard.codeLast4)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Status</Label>
          <div className="mt-1">{getStatusBadge(giftCard.status)}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Original Amount</Label>
          <p className="font-semibold">{formatCurrency(giftCard.originalAmount)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Remaining Balance</Label>
          <p className="font-semibold text-green-600">{formatCurrency(giftCard.remainingBalance)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Created</Label>
          <p>{formatDate(giftCard.createdAt)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Expires</Label>
          <p>{formatDate(giftCard.expiresAt)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Purchaser</Label>
          <p>{giftCard.purchaserName || "N/A"}</p>
          <p className="text-sm text-muted-foreground">{giftCard.purchaserEmail}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Recipient</Label>
          <p>{giftCard.recipientName || "N/A"}</p>
          <p className="text-sm text-muted-foreground">{giftCard.recipientEmail || "N/A"}</p>
        </div>
      </div>

      {giftCard.personalMessage && (
        <div>
          <Label className="text-muted-foreground text-xs">Personal Message</Label>
          <p className="p-2 bg-muted rounded text-sm">{giftCard.personalMessage}</p>
        </div>
      )}

      <Separator />

      {giftCard.status === "active" && (
        <div className="flex gap-2">
          <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-adjust-balance">
                <DollarSign className="w-4 h-4 mr-1" />
                Adjust Balance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Balance</DialogTitle>
                <DialogDescription>
                  Add or subtract from the current balance. Use negative numbers to subtract.
                </DialogDescription>
              </DialogHeader>
              <Form {...adjustForm}>
                <form onSubmit={adjustForm.handleSubmit((data) => adjustMutation.mutate(data))} className="space-y-4">
                  <div className="text-center p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(giftCard.remainingBalance)}</p>
                  </div>
                  <FormField
                    control={adjustForm.control}
                    name="adjustmentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adjustment Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g., 25 or -10" {...field} data-testid="input-adjustment-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={adjustForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Explain the reason for this adjustment..." {...field} data-testid="input-adjustment-reason" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={adjustMutation.isPending} data-testid="button-submit-adjustment">
                      {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Apply Adjustment
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" data-testid="button-void-card">
                <Ban className="w-4 h-4 mr-1" />
                Void Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Void Gift Card</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The gift card will be permanently disabled.
                </DialogDescription>
              </DialogHeader>
              <Form {...voidForm}>
                <form onSubmit={voidForm.handleSubmit((data) => voidMutation.mutate(data))} className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="font-medium">Warning</p>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      This will void the gift card with {formatCurrency(giftCard.remainingBalance)} remaining balance.
                    </p>
                  </div>
                  <FormField
                    control={voidForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for voiding</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Explain why this card is being voided..." {...field} data-testid="input-void-reason" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
                    <Button type="submit" variant="destructive" disabled={voidMutation.isPending} data-testid="button-confirm-void">
                      {voidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Void Card
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Redemption History */}
      {giftCard.redemptionHistory && giftCard.redemptionHistory.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Redemption History</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCard.redemptionHistory.map((redemption) => (
                <TableRow key={redemption.id}>
                  <TableCell>{formatDate(redemption.createdAt)}</TableCell>
                  <TableCell className="text-red-600">-{formatCurrency(redemption.amount)}</TableCell>
                  <TableCell>
                    {redemption.enrollmentId ? "Course Enrollment" : 
                     redemption.appointmentId ? "Appointment" : 
                     redemption.orderId ? "Order" : "Other"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjustment History */}
      {giftCard.adjustmentHistory && giftCard.adjustmentHistory.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Balance Adjustments</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCard.adjustmentHistory.map((adjustment) => (
                <TableRow key={adjustment.id}>
                  <TableCell>{formatDate(adjustment.createdAt)}</TableCell>
                  <TableCell className={Number(adjustment.adjustmentAmount) >= 0 ? "text-green-600" : "text-red-600"}>
                    {Number(adjustment.adjustmentAmount) >= 0 ? "+" : ""}{formatCurrency(adjustment.adjustmentAmount)}
                  </TableCell>
                  <TableCell>{adjustment.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CreateGiftCardDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const { data: themes = [] } = useQuery<GiftCardTheme[]>({
    queryKey: ["/api/gift-cards/admin/themes/all"],
  });

  const form = useForm<CreateGiftCardData>({
    resolver: zodResolver(createGiftCardSchema),
    defaultValues: {
      amount: 50,
      themeId: "",
      recipientName: "",
      recipientEmail: "",
      personalMessage: "",
      expirationMonths: 12,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateGiftCardData) => {
      return await apiRequest("POST", "/api/gift-cards/admin/create", data);
    },
    onSuccess: (data) => {
      setCreatedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards/admin"] });
      toast({ title: "Gift card created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setCreatedCode(null);
    form.reset();
    onSuccess();
  };

  const copyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      toast({ title: "Code copied to clipboard" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button className="bg-[#5170FF] hover:bg-[#5170FF]/90" data-testid="button-create-gift-card">
          <Plus className="w-4 h-4 mr-2" />
          Create Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Gift Card</DialogTitle>
          <DialogDescription>
            Create a new gift card for promotions, replacements, or special occasions.
          </DialogDescription>
        </DialogHeader>
        
        {createdCode ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">Gift Card Created!</h3>
              <p className="text-sm text-muted-foreground">Save this code - it will only be shown once.</p>
            </div>
            <div className="bg-muted p-4 rounded-lg font-mono text-center text-lg tracking-wider">
              {createdCode}
            </div>
            <Button className="w-full" variant="outline" onClick={copyCode} data-testid="button-copy-created-code">
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
            <Button className="w-full" onClick={handleClose} data-testid="button-close-create-dialog">
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10000} {...field} data-testid="input-create-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="themeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-create-theme">
                          <SelectValue placeholder="Select a theme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme.id} value={theme.id}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expirationMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires In (months)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={60} {...field} data-testid="input-create-expiration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-create-recipient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-create-recipient-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personalMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea maxLength={500} {...field} data-testid="input-create-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Gift Card
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DraggableTextBox({ 
  id, 
  label, 
  position,
  onSelect,
  isSelected,
}: { 
  id: string; 
  label: string; 
  position: TextPosition;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    cursor: 'grab',
    userSelect: 'none',
    fontSize: `${Math.min(position.fontSize, 24)}px`,
    fontWeight: position.fontWeight,
    color: position.fontColor,
    textAlign: position.textAlign,
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: isSelected ? '2px solid #5170FF' : '2px dashed #5170FF',
    borderRadius: '4px',
    padding: '4px 8px',
    whiteSpace: 'nowrap',
    zIndex: isSelected ? 20 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      data-testid={`draggable-${id}`}
    >
      <div className="flex items-center gap-1">
        <Move className="w-3 h-3 text-[#5170FF]" />
        <span>{label}</span>
      </div>
    </div>
  );
}

type FieldType = 'recipient' | 'sender' | 'amount' | 'code' | 'message';

function DraggablePositionEditor({
  recipientPosition,
  senderPosition,
  amountPosition,
  codePosition,
  messagePosition,
  onRecipientChange,
  onSenderChange,
  onAmountChange,
  onCodeChange,
  onMessageChange,
  previewImageUrl,
  accentColor,
}: {
  recipientPosition: TextPosition | undefined;
  senderPosition: TextPosition | undefined;
  amountPosition: TextPosition | undefined;
  codePosition: TextPosition | undefined;
  messagePosition: TextPosition | undefined;
  onRecipientChange: (pos: TextPosition) => void;
  onSenderChange: (pos: TextPosition) => void;
  onAmountChange: (pos: TextPosition) => void;
  onCodeChange: (pos: TextPosition) => void;
  onMessageChange: (pos: TextPosition) => void;
  previewImageUrl?: string;
  accentColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedField, setSelectedField] = useState<FieldType | null>(null);

  const recipient = recipientPosition || { ...defaultTextPosition, x: 10, y: 15 };
  const sender = senderPosition || { ...defaultTextPosition, x: 10, y: 30 };
  const amount = amountPosition || { ...defaultTextPosition, x: 50, y: 50, fontSize: 32 };
  const code = codePosition || { ...defaultTextPosition, x: 50, y: 70, fontSize: 12 };
  const message = messagePosition || { ...defaultTextPosition, x: 50, y: 85, fontSize: 14 };

  const positions: Record<FieldType, TextPosition> = { recipient, sender, amount, code, message };
  const handlers: Record<FieldType, (pos: TextPosition) => void> = {
    recipient: onRecipientChange,
    sender: onSenderChange,
    amount: onAmountChange,
    code: onCodeChange,
    message: onMessageChange,
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const deltaXPercent = (delta.x / rect.width) * 100;
    const deltaYPercent = (delta.y / rect.height) * 100;

    const id = active.id as FieldType;
    const pos = positions[id];
    const handler = handlers[id];
    
    if (pos && handler) {
      const newX = Math.max(0, Math.min(100, pos.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, pos.y + deltaYPercent));
      handler({ ...pos, x: Math.round(newX), y: Math.round(newY) });
    }
  }, [positions, handlers]);

  const updateStyle = (field: FieldType, key: keyof TextPosition, value: any) => {
    const pos = positions[field];
    const handler = handlers[field];
    if (pos && handler) {
      handler({ ...pos, [key]: value });
    }
  };

  const selectedPos = selectedField ? positions[selectedField] : null;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center gap-2">
          <Move className="w-4 h-4" />
          Drag text boxes to position them on the gift card
        </div>
        <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
          <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
            <div
              ref={containerRef}
              className="absolute inset-0"
              style={{
                backgroundColor: accentColor || '#3b82f6',
                backgroundImage: previewImageUrl ? `url(${previewImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              data-testid="drag-canvas"
            >
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: previewImageUrl ? 0 : 0.3 }}
              >
                <Gift className="w-16 h-16 text-white" />
              </div>
              
              <DraggableTextBox
                id="recipient"
                label="To: Recipient Name"
                position={recipient}
                onSelect={() => setSelectedField('recipient')}
                isSelected={selectedField === 'recipient'}
              />
              <DraggableTextBox
                id="sender"
                label="From: Sender Name"
                position={sender}
                onSelect={() => setSelectedField('sender')}
                isSelected={selectedField === 'sender'}
              />
              <DraggableTextBox
                id="amount"
                label="$Amount"
                position={amount}
                onSelect={() => setSelectedField('amount')}
                isSelected={selectedField === 'amount'}
              />
              <DraggableTextBox
                id="code"
                label="Gift Card Code"
                position={code}
                onSelect={() => setSelectedField('code')}
                isSelected={selectedField === 'code'}
              />
              <DraggableTextBox
                id="message"
                label="Custom Message"
                position={message}
                onSelect={() => setSelectedField('message')}
                isSelected={selectedField === 'message'}
              />
            </div>
          </div>
        </DndContext>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Click a text box to edit its style, then drag to reposition
      </div>

      <div className="grid grid-cols-5 gap-1">
        <Button
          type="button"
          variant={selectedField === 'recipient' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedField('recipient')}
          data-testid="button-select-recipient"
          className="text-xs px-2"
        >
          To
        </Button>
        <Button
          type="button"
          variant={selectedField === 'sender' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedField('sender')}
          data-testid="button-select-sender"
          className="text-xs px-2"
        >
          From
        </Button>
        <Button
          type="button"
          variant={selectedField === 'amount' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedField('amount')}
          data-testid="button-select-amount"
          className="text-xs px-2"
        >
          Amount
        </Button>
        <Button
          type="button"
          variant={selectedField === 'code' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedField('code')}
          data-testid="button-select-code"
          className="text-xs px-2"
        >
          Code
        </Button>
        <Button
          type="button"
          variant={selectedField === 'message' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedField('message')}
          data-testid="button-select-message"
          className="text-xs px-2"
        >
          Message
        </Button>
      </div>

      {selectedField && selectedPos && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
          <Label className="font-medium capitalize">{selectedField} Style</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Position: {selectedPos.x}% x {selectedPos.y}%</Label>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
              <Input
                type="number"
                min={8}
                max={72}
                value={selectedPos.fontSize}
                onChange={(e) => updateStyle(selectedField, 'fontSize', Number(e.target.value))}
                data-testid={`input-${selectedField}-size`}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Font Color</Label>
              <div className="flex gap-1">
                <Input
                  type="color"
                  className="w-10 h-9 p-1"
                  value={selectedPos.fontColor}
                  onChange={(e) => updateStyle(selectedField, 'fontColor', e.target.value)}
                  data-testid={`input-${selectedField}-color`}
                />
                <Input
                  value={selectedPos.fontColor}
                  onChange={(e) => updateStyle(selectedField, 'fontColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Font Weight</Label>
              <Select value={selectedPos.fontWeight} onValueChange={(v) => updateStyle(selectedField, 'fontWeight', v)}>
                <SelectTrigger data-testid={`select-${selectedField}-weight`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Text Align</Label>
              <Select value={selectedPos.textAlign} onValueChange={(v) => updateStyle(selectedField, 'textAlign', v as 'left' | 'center' | 'right')}>
                <SelectTrigger data-testid={`select-${selectedField}-align`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<GiftCardTheme | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: themes = [], isLoading } = useQuery<GiftCardTheme[]>({
    queryKey: ["/api/gift-cards/admin/themes/all"],
  });

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/gift-cards/admin/themes/upload-image', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to upload image';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Upload failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    if (!data.url) {
      throw new Error('No URL returned from upload');
    }
    return data.url;
  };

  const createForm = useForm<CreateThemeData>({
    resolver: zodResolver(createThemeSchema),
    defaultValues: {
      name: "",
      description: "",
      accentColor: "#3b82f6",
      previewImageUrl: "",
      isActive: true,
      sortOrder: 0,
      recipientNamePosition: { x: 10, y: 15, fontSize: 18, fontColor: "#000000", fontWeight: "bold", textAlign: "left" },
      senderNamePosition: { x: 10, y: 30, fontSize: 14, fontColor: "#666666", fontWeight: "normal", textAlign: "left" },
      amountPosition: { x: 50, y: 50, fontSize: 32, fontColor: "#000000", fontWeight: "bold", textAlign: "center" },
      codePosition: { x: 50, y: 70, fontSize: 12, fontColor: "#333333", fontWeight: "normal", textAlign: "center" },
      messagePosition: { x: 50, y: 85, fontSize: 14, fontColor: "#666666", fontWeight: "normal", textAlign: "center" },
    },
  });

  const editForm = useForm<CreateThemeData>({
    resolver: zodResolver(createThemeSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateThemeData) => {
      let imageUrl = "";
      
      // Upload image first if selected
      if (selectedFile) {
        setIsUploading(true);
        try {
          imageUrl = await uploadImage(selectedFile);
        } catch (uploadError: any) {
          setIsUploading(false);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
        setIsUploading(false);
      }
      
      // Create the theme with the image URL
      return await apiRequest("POST", "/api/gift-cards/admin/themes", {
        ...data,
        previewImageUrl: imageUrl || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Theme created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards/admin/themes/all"] });
      setIsCreateOpen(false);
      createForm.reset();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateThemeData> }) => {
      // Keep existing image URL unless a new file is uploaded
      let imageUrl = editingTheme?.previewImageUrl || data.previewImageUrl;
      
      // Upload new image if selected
      if (editSelectedFile) {
        setIsUploading(true);
        try {
          imageUrl = await uploadImage(editSelectedFile);
        } catch (uploadError: any) {
          setIsUploading(false);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
        setIsUploading(false);
      }
      
      const result = await apiRequest("PATCH", `/api/gift-cards/admin/themes/${id}`, {
        ...data,
        previewImageUrl: imageUrl || undefined,
      });
      return result;
    },
    onSuccess: () => {
      toast({ title: "Theme updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards/admin/themes/all"] });
      setEditingTheme(null);
      setEditSelectedFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/gift-cards/admin/themes/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Theme deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards/admin/themes/all"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditClick = (theme: GiftCardTheme) => {
    setEditingTheme(theme);
    editForm.reset({
      name: theme.name,
      description: theme.description || "",
      accentColor: theme.accentColor || "#3b82f6",
      previewImageUrl: theme.previewImageUrl || "",
      isActive: theme.isActive ?? true,
      sortOrder: theme.sortOrder ?? 0,
      recipientNamePosition: theme.recipientNamePosition || { x: 10, y: 15, fontSize: 18, fontColor: "#000000", fontWeight: "bold", textAlign: "left" },
      senderNamePosition: theme.senderNamePosition || { x: 10, y: 30, fontSize: 14, fontColor: "#666666", fontWeight: "normal", textAlign: "left" },
      amountPosition: theme.amountPosition || { x: 50, y: 50, fontSize: 32, fontColor: "#000000", fontWeight: "bold", textAlign: "center" },
      codePosition: theme.codePosition || { x: 50, y: 70, fontSize: 12, fontColor: "#333333", fontWeight: "normal", textAlign: "center" },
      messagePosition: theme.messagePosition || { x: 50, y: 85, fontSize: 14, fontColor: "#666666", fontWeight: "normal", textAlign: "center" },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gift Card Themes</h3>
          <p className="text-sm text-muted-foreground">Manage the visual themes for gift cards</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-theme">
              <Plus className="w-4 h-4 mr-2" />
              Add Theme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Theme</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-theme-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-theme-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 items-center">
                          <Input type="color" className="w-12 h-10 p-1" {...field} data-testid="input-theme-color" />
                          <Input value={field.value} onChange={field.onChange} className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label>Preview Image (Optional)</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      data-testid="input-theme-image"
                    />
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="w-16 h-12 object-cover rounded"
                        />
                        <span>{selectedFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <FormField
                  control={createForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-theme-sort" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                <h4 className="font-medium text-sm">Text Position Mapping</h4>
                <p className="text-xs text-muted-foreground mb-3">Drag text boxes to position them on the gift card</p>
                
                <DraggablePositionEditor
                  recipientPosition={createForm.watch('recipientNamePosition')}
                  senderPosition={createForm.watch('senderNamePosition')}
                  amountPosition={createForm.watch('amountPosition')}
                  codePosition={createForm.watch('codePosition')}
                  messagePosition={createForm.watch('messagePosition')}
                  onRecipientChange={(pos) => createForm.setValue('recipientNamePosition', pos)}
                  onSenderChange={(pos) => createForm.setValue('senderNamePosition', pos)}
                  onAmountChange={(pos) => createForm.setValue('amountPosition', pos)}
                  onCodeChange={(pos) => createForm.setValue('codePosition', pos)}
                  onMessageChange={(pos) => createForm.setValue('messagePosition', pos)}
                  previewImageUrl={selectedFile ? URL.createObjectURL(selectedFile) : undefined}
                  accentColor={createForm.watch('accentColor')}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || isUploading} data-testid="button-submit-theme">
                    {(createMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isUploading ? "Uploading..." : "Create Theme"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <Card key={theme.id} className={!theme.isActive ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div 
                className="aspect-[3/2] rounded-lg mb-3 flex items-center justify-center overflow-hidden"
                style={{ 
                  backgroundColor: theme.accentColor || '#3b82f6',
                  backgroundImage: theme.previewImageUrl ? `url(${theme.previewImageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!theme.previewImageUrl && (
                  <Gift className="w-12 h-12 text-white/80" />
                )}
              </div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{theme.name}</h4>
                {!theme.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              {theme.description && (
                <p className="text-sm text-muted-foreground mb-3">{theme.description}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditClick(theme)} data-testid={`button-edit-theme-${theme.id}`}>
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this theme?")) {
                      deleteMutation.mutate(theme.id);
                    }
                  }}
                  data-testid={`button-delete-theme-${theme.id}`}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Theme Dialog */}
      <Dialog open={!!editingTheme} onOpenChange={(open) => !open && setEditingTheme(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => editingTheme && updateMutation.mutate({ id: editingTheme.id, data }))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-theme-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-theme-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input type="color" className="w-12 h-10 p-1" {...field} data-testid="input-edit-theme-color" />
                        <Input value={field.value} onChange={field.onChange} className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <Label>Preview Image (Optional)</Label>
                <div className="mt-2 space-y-2">
                  {(editingTheme?.previewImageUrl || editSelectedFile) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <img
                        src={editSelectedFile ? URL.createObjectURL(editSelectedFile) : (editingTheme?.previewImageUrl || "")}
                        alt="Current preview"
                        className="w-16 h-12 object-cover rounded"
                      />
                      <span>{editSelectedFile ? editSelectedFile.name : "Current image"}</span>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditSelectedFile(e.target.files?.[0] || null)}
                    data-testid="input-edit-theme-image"
                  />
                  <p className="text-xs text-muted-foreground">Upload a new image to replace the current one</p>
                </div>
              </div>
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input 
                        type="checkbox" 
                        checked={field.value} 
                        onChange={field.onChange} 
                        className="w-4 h-4"
                        data-testid="input-edit-theme-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-edit-theme-sort" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator className="my-4" />
              <h4 className="font-medium text-sm">Text Position Mapping</h4>
              <p className="text-xs text-muted-foreground mb-3">Drag text boxes to position them on the gift card</p>
              
              <DraggablePositionEditor
                recipientPosition={editForm.watch('recipientNamePosition')}
                senderPosition={editForm.watch('senderNamePosition')}
                amountPosition={editForm.watch('amountPosition')}
                codePosition={editForm.watch('codePosition')}
                messagePosition={editForm.watch('messagePosition')}
                onRecipientChange={(pos) => editForm.setValue('recipientNamePosition', pos)}
                onSenderChange={(pos) => editForm.setValue('senderNamePosition', pos)}
                onAmountChange={(pos) => editForm.setValue('amountPosition', pos)}
                onCodeChange={(pos) => editForm.setValue('codePosition', pos)}
                onMessageChange={(pos) => editForm.setValue('messagePosition', pos)}
                previewImageUrl={editSelectedFile ? URL.createObjectURL(editSelectedFile) : editingTheme?.previewImageUrl}
                accentColor={editForm.watch('accentColor')}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditingTheme(null); setEditSelectedFile(null); }}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending || isUploading} data-testid="button-submit-edit-theme">
                  {(updateMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? "Uploading..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GiftCardManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGiftCard, setSelectedGiftCard] = useState<string | null>(null);

  const { data: giftCards = [], isLoading, refetch } = useQuery<GiftCard[]>({
    queryKey: ["/api/gift-cards/admin/list", statusFilter],
    queryFn: async () => {
      const url = statusFilter !== "all" 
        ? `/api/gift-cards/admin/list?status=${statusFilter}`
        : "/api/gift-cards/admin/list";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gift cards");
      return res.json();
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (last4: string) => {
      const res = await fetch(`/api/gift-cards/admin/search/${last4}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    onError: (error: any) => {
      toast({ title: "Search Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSearch = () => {
    if (searchQuery.length === 4) {
      searchMutation.mutate(searchQuery.toUpperCase());
    } else {
      toast({ title: "Invalid Search", description: "Please enter the last 4 characters of the gift card code", variant: "destructive" });
    }
  };

  const displayedCards = searchMutation.data || giftCards;

  const stats = {
    total: giftCards.length,
    active: giftCards.filter(gc => gc.status === "active").length,
    totalValue: giftCards.reduce((sum, gc) => sum + Number(gc.originalAmount), 0),
    outstandingBalance: giftCards
      .filter(gc => gc.status === "active")
      .reduce((sum, gc) => sum + Number(gc.remainingBalance), 0),
  };

  if (!user || !["admin", "superadmin", "instructor"].includes(user.role || "")) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gift className="w-8 h-8 text-[#5170FF]" />
              Gift Card Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage gift cards, themes, and balances</p>
          </div>
          <CreateGiftCardDialog onSuccess={() => refetch()} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Gift className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cards</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-cards">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Cards</p>
                  <p className="text-2xl font-bold" data-testid="stat-active-cards">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value Issued</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-value">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-bold" data-testid="stat-outstanding">{formatCurrency(stats.outstandingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cards" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cards" data-testid="tab-cards">Gift Cards</TabsTrigger>
            <TabsTrigger value="themes" data-testid="tab-themes">Themes</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-4">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Enter last 4 characters of code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="max-w-xs font-mono"
                      data-testid="input-search-code"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSearch}
                      disabled={searchMutation.isPending}
                      data-testid="button-search"
                    >
                      {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                    {searchMutation.data && (
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setSearchQuery("");
                          searchMutation.reset();
                        }}
                        data-testid="button-clear-search"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="fully_redeemed">Fully Redeemed</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Gift Cards Table */}
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : displayedCards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No gift cards found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Original</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedCards.map((gc) => (
                          <TableRow key={gc.id} data-testid={`row-gift-card-${gc.id}`}>
                            <TableCell className="font-mono">{maskCode(gc.codeLast4)}</TableCell>
                            <TableCell>{getStatusBadge(gc.status)}</TableCell>
                            <TableCell>{formatCurrency(gc.originalAmount)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(gc.remainingBalance)}</TableCell>
                            <TableCell>{formatDate(gc.createdAt)}</TableCell>
                            <TableCell>{formatDate(gc.expiresAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedGiftCard(gc.id)}
                                data-testid={`button-view-${gc.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card>
              <CardContent className="pt-6">
                <ThemeManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Gift Card Details Dialog */}
        <Dialog open={!!selectedGiftCard} onOpenChange={(open) => !open && setSelectedGiftCard(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gift Card Details</DialogTitle>
            </DialogHeader>
            {selectedGiftCard && (
              <GiftCardDetailsDialog 
                giftCardId={selectedGiftCard} 
                onClose={() => {
                  setSelectedGiftCard(null);
                  refetch();
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
