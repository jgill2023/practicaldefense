import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, Calendar, Award, X, CheckCircle, XCircle, Clock, RotateCcw, FileText, MessageSquare, Plus, Trash2, Edit2, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EnrollmentFeedbackModal } from "@/components/EnrollmentFeedbackModal";
import { EmailNotificationModal } from "@/components/EmailNotificationModal";
import { SmsNotificationModal } from "@/components/SmsNotificationModal";
import { getEnrollmentStatusClassName, getAppointmentStatusClassName } from "@/lib/statusColors";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StudentFeedback {
  id: string;
  studentId: string;
  instructorId: string;
  feedbackText: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  instructorFirstName?: string;
  instructorLastName?: string;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  onEmailClick: (name: string, email: string) => void;
  onSmsClick: (name: string, phone: string) => void;
}

interface EnrollmentHistory {
  id: string;
  courseTitle: string;
  courseAbbreviation?: string;
  scheduleDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  status: string;
  paymentStatus: string;
  completionDate?: string;
  certificateIssued: boolean;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  concealedCarryLicenseExpiration?: string;
  enrollmentHistory: EnrollmentHistory[];
}

interface StudentAppointment {
  id: string;
  appointmentTypeTitle: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  durationMinutes: number;
  price: number;
}

// Phone number formatting utility
function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function StudentProfileModal({
  isOpen,
  onClose,
  studentId,
  onEmailClick,
  onSmsClick
}: StudentProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; enrollmentId: string }>({
    isOpen: false,
    enrollmentId: ""
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedAppointmentForEmail, setSelectedAppointmentForEmail] = useState<any>(null);
  const [selectedAppointmentForSms, setSelectedAppointmentForSms] = useState<any>(null);
  
  // Student feedback state
  const [showAddFeedbackForm, setShowAddFeedbackForm] = useState(false);
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [newFeedbackPrivate, setNewFeedbackPrivate] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<StudentFeedback | null>(null);

  const { data: profile, isLoading, isError } = useQuery<StudentProfile>({
    queryKey: [`/api/students/${studentId}/profile`],
    enabled: isOpen && !!studentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const { data: upcomingAppointments = [], isLoading: appointmentsLoading, isError: appointmentsError } = useQuery<StudentAppointment[]>({
    queryKey: [`/api/students/${studentId}/upcoming-appointments`],
    enabled: isOpen && !!studentId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Student feedback query
  const { data: studentFeedback = [], isLoading: feedbackLoading } = useQuery<StudentFeedback[]>({
    queryKey: [`/api/students/${studentId}/feedback`],
    enabled: isOpen && !!studentId,
    staleTime: 2 * 60 * 1000,
  });

  // Add feedback mutation
  const addFeedbackMutation = useMutation({
    mutationFn: async (data: { feedbackText: string; isPrivate: boolean }) => {
      return await apiRequest("POST", `/api/students/${studentId}/feedback`, data);
    },
    onSuccess: () => {
      toast({ title: "Feedback added", description: "Your feedback has been saved." });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/feedback`] });
      setShowAddFeedbackForm(false);
      setNewFeedbackText("");
      setNewFeedbackPrivate(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add feedback.", variant: "destructive" });
    },
  });

  // Update feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async (data: { feedbackId: string; feedbackText: string; isPrivate: boolean }) => {
      return await apiRequest("PATCH", `/api/students/${studentId}/feedback/${data.feedbackId}`, {
        feedbackText: data.feedbackText,
        isPrivate: data.isPrivate,
      });
    },
    onSuccess: () => {
      toast({ title: "Feedback updated", description: "Your changes have been saved." });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/feedback`] });
      setEditingFeedback(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update feedback.", variant: "destructive" });
    },
  });

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      return await apiRequest("DELETE", `/api/students/${studentId}/feedback/${feedbackId}`);
    },
    onSuccess: () => {
      toast({ title: "Feedback deleted", description: "The feedback has been removed." });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/feedback`] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete feedback.", variant: "destructive" });
    },
  });

  const getCompletionStatus = (enrollment: EnrollmentHistory) => {
    if (enrollment.status === 'cancelled') {
      return { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50' };
    }
    if (enrollment.status === 'hold') {
      return { label: 'Rescheduled', icon: RotateCcw, color: 'text-orange-600 bg-orange-50' };
    }
    if (enrollment.status === 'completed' && enrollment.certificateIssued) {
      return { label: 'Attended + Certificate', icon: Award, color: 'text-green-600 bg-green-50' };
    }
    if (enrollment.status === 'completed' && !enrollment.certificateIssued) {
      return { label: 'Attended + Certificate Not Issued', icon: CheckCircle, color: 'text-blue-600 bg-blue-50' };
    }
    if (enrollment.status === 'confirmed') {
      return { label: 'Upcoming', icon: Clock, color: 'text-purple-600 bg-purple-50' };
    }
    return { label: enrollment.status, icon: Clock, color: 'text-gray-600 bg-gray-50' };
  };

  const handlePhoneClick = (phone: string) => {
    if (profile) {
      onSmsClick(`${profile.firstName} ${profile.lastName}`, phone);
    }
  };

  const handlePhoneLongPress = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmailClick = (email: string) => {
    if (profile) {
      onEmailClick(`${profile.firstName} ${profile.lastName}`, email);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">Student Profile</DialogTitle>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Loading profile...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <User className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Profile</h3>
              <p className="text-muted-foreground">Unable to retrieve student profile. Please try again.</p>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Student Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold" data-testid="text-student-name">
                      {profile.firstName} {profile.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                      onClick={() => handleEmailClick(profile.email)}
                      data-testid="button-email-contact"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {profile.email}
                    </Button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                    {profile.phone ? (
                      <div>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal text-green-600 hover:text-green-800"
                          onClick={() => handlePhoneClick(profile.phone!)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handlePhoneLongPress(profile.phone!);
                          }}
                          onTouchStart={(e) => {
                            const touchTimer = setTimeout(() => {
                              handlePhoneLongPress(profile.phone!);
                            }, 500);
                            e.currentTarget.addEventListener('touchend', () => clearTimeout(touchTimer), { once: true });
                          }}
                          data-testid="button-phone-contact"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          {formatPhoneNumber(profile.phone)}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click to SMS • Long press to call
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">License Expiration</label>
                    {profile.concealedCarryLicenseExpiration ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-license-expiration">
                          {format(new Date(profile.concealedCarryLicenseExpiration), "MMM d, yyyy")}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length !== 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : appointmentsError ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <p className="text-destructive font-semibold mb-2">Failed to load appointments</p>
                    <p className="text-muted-foreground text-sm">Unable to retrieve upcoming appointments. Please try again.</p>
                  </div>
                ) : upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950"
                        data-testid={`appointment-${appointment.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{appointment.appointmentTypeTitle}</h4>
                              <Badge className={getAppointmentStatusClassName(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(appointment.startTime), "MMM d, yyyy 'at' h:mm a")}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{appointment.durationMinutes} min</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointmentForEmail(appointment);
                                setShowEmailModal(true);
                              }}
                              className="h-8 w-8 p-0"
                              data-testid={`button-email-appointment-${appointment.id}`}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointmentForSms(appointment);
                                setShowSmsModal(true);
                              }}
                              className="h-8 w-8 p-0"
                              data-testid={`button-sms-appointment-${appointment.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Enrollment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {profile.enrollmentHistory.length} total enrollment{profile.enrollmentHistory.length !== 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                {profile.enrollmentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No course history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.enrollmentHistory.map((enrollment) => {
                      const status = getCompletionStatus(enrollment);
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={enrollment.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setFeedbackModal({ isOpen: true, enrollmentId: enrollment.id })}
                          data-testid={`enrollment-${enrollment.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">
                                  {enrollment.courseTitle}
                                  {enrollment.courseAbbreviation && (
                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                      ({enrollment.courseAbbreviation})
                                    </span>
                                  )}
                                </h4>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(enrollment.scheduleDate), "MMM d, yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{enrollment.scheduleStartTime}</span>
                                </div>
                              </div>
                              {enrollment.completionDate && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Completed: {format(new Date(enrollment.completionDate), "MMM d, yyyy")}
                                </div>
                              )}
                              <div className="text-xs text-blue-600 mt-2">
                                Click to view/add feedback & notes
                              </div>
                            </div>
                            <Badge className={`${status.color} flex items-center gap-1.5 px-3 py-1`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Student Feedback Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Instructor Notes</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {studentFeedback.length} note{studentFeedback.length !== 1 ? 's' : ''} from instructors
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFeedbackForm(true)}
                    data-testid="button-add-feedback"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Add Feedback Form */}
                {showAddFeedbackForm && (
                  <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                    <Textarea
                      placeholder="Enter your note about this student..."
                      value={newFeedbackText}
                      onChange={(e) => setNewFeedbackText(e.target.value)}
                      className="mb-3"
                      data-testid="textarea-new-feedback"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewFeedbackPrivate(!newFeedbackPrivate)}
                          data-testid="button-toggle-private"
                        >
                          {newFeedbackPrivate ? (
                            <>
                              <Lock className="h-4 w-4 mr-1" />
                              Private (instructors only)
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4 mr-1" />
                              Visible to student
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddFeedbackForm(false);
                            setNewFeedbackText("");
                            setNewFeedbackPrivate(false);
                          }}
                          data-testid="button-cancel-feedback"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addFeedbackMutation.mutate({ feedbackText: newFeedbackText, isPrivate: newFeedbackPrivate })}
                          disabled={!newFeedbackText.trim() || addFeedbackMutation.isPending}
                          data-testid="button-save-feedback"
                        >
                          {addFeedbackMutation.isPending ? "Saving..." : "Save Note"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {feedbackLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : studentFeedback.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No instructor notes yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentFeedback.map((feedback) => {
                      const isOwnFeedback = user?.id === feedback.instructorId;
                      const isEditing = editingFeedback?.id === feedback.id;

                      return (
                        <div
                          key={feedback.id}
                          className={`border rounded-lg p-4 ${feedback.isPrivate ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200' : 'bg-background'}`}
                          data-testid={`feedback-${feedback.id}`}
                        >
                          {isEditing ? (
                            <div>
                              <Textarea
                                value={editingFeedback.feedbackText}
                                onChange={(e) => setEditingFeedback({ ...editingFeedback, feedbackText: e.target.value })}
                                className="mb-3"
                                data-testid="textarea-edit-feedback"
                              />
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingFeedback({ ...editingFeedback, isPrivate: !editingFeedback.isPrivate })}
                                  data-testid="button-toggle-edit-private"
                                >
                                  {editingFeedback.isPrivate ? (
                                    <>
                                      <Lock className="h-4 w-4 mr-1" />
                                      Private
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 mr-1" />
                                      Public
                                    </>
                                  )}
                                </Button>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setEditingFeedback(null)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => updateFeedbackMutation.mutate({
                                      feedbackId: editingFeedback.id,
                                      feedbackText: editingFeedback.feedbackText,
                                      isPrivate: editingFeedback.isPrivate,
                                    })}
                                    disabled={updateFeedbackMutation.isPending}
                                  >
                                    {updateFeedbackMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="text-sm whitespace-pre-wrap">{feedback.feedbackText}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>
                                      {feedback.instructorFirstName} {feedback.instructorLastName}
                                    </span>
                                    <span>•</span>
                                    <span>{format(new Date(feedback.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                                    {feedback.isPrivate && (
                                      <>
                                        <span>•</span>
                                        <Badge variant="outline" className="text-xs py-0 px-1.5 text-amber-700 border-amber-300">
                                          <Lock className="h-3 w-3 mr-0.5" />
                                          Private
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {isOwnFeedback && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setEditingFeedback(feedback)}
                                      data-testid={`button-edit-feedback-${feedback.id}`}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => deleteFeedbackMutation.mutate(feedback.id)}
                                      disabled={deleteFeedbackMutation.isPending}
                                      data-testid={`button-delete-feedback-${feedback.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Enrollment Feedback Modal */}
        {feedbackModal.enrollmentId && (
          <EnrollmentFeedbackModal
            enrollmentId={feedbackModal.enrollmentId}
            isOpen={feedbackModal.isOpen}
            onClose={() => {
              setFeedbackModal({ ...feedbackModal, isOpen: false });
            }}
          />
        )}
      </DialogContent>

      {/* Email Notification Modal */}
      {selectedAppointmentForEmail && profile && (
        <EmailNotificationModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedAppointmentForEmail(null);
          }}
          studentName={`${profile.firstName} ${profile.lastName}`}
          emailAddress={profile.email}
          appointmentDetails={{
            title: selectedAppointmentForEmail.appointmentTypeTitle,
            startTime: selectedAppointmentForEmail.startTime,
            endTime: selectedAppointmentForEmail.endTime,
          }}
        />
      )}

      {/* SMS Notification Modal */}
      {selectedAppointmentForSms && profile && (
        <SmsNotificationModal
          isOpen={showSmsModal}
          onClose={() => {
            setShowSmsModal(false);
            setSelectedAppointmentForSms(null);
          }}
          studentName={`${profile.firstName} ${profile.lastName}`}
          phoneNumber={profile.phone || ''}
          appointmentDetails={{
            title: selectedAppointmentForSms.appointmentTypeTitle,
            startTime: selectedAppointmentForSms.startTime,
            endTime: selectedAppointmentForSms.endTime,
          }}
        />
      )}
    </Dialog>
  );
}