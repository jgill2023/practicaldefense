import {
  users,
  categories,
  courses,
  courseSchedules,
  enrollments,
  courseEnrollmentFeedback,
  appSettings,
  courseInformationForms,
  courseInformationFormFields,
  studentFormResponses,
  promoCodes,
  promoCodeRedemptions,
  prohibitedWords,
  messageAuditLog,
  communications,
  waitlist,
  // E-commerce tables
  productCategories,
  products,
  productVariants,
  cartItems,
  ecommerceOrders,
  ecommerceOrderItems,
  courseNotifications,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Course,
  type InsertCourse,
  type CourseSchedule,
  type InsertCourseSchedule,
  type Enrollment,
  type InsertEnrollment,
  type CourseEnrollmentFeedback,
  type InsertCourseEnrollmentFeedback,
  type AppSettings,
  type InsertAppSettings,
  type CourseWithSchedules,
  type EnrollmentWithDetails,
  type CourseInformationForm,
  type InsertCourseInformationForm,
  type CourseInformationFormField,
  type InsertCourseInformationFormField,
  type StudentFormResponse,
  type InsertStudentFormResponse,
  type CourseInformationFormWithFields,
  type PromoCode,
  type InsertPromoCode,
  type PromoCodeRedemption,
  type InsertPromoCodeRedemption,
  type PromoCodeWithDetails,
  type PromoCodeValidationResult,
  type WaitlistEntry,
  type InsertWaitlist,
  type WaitlistWithUser,
  type WaitlistStatus,
  type ProhibitedWord,
  type InsertProhibitedWord,
  type MessageAuditLog,
  type InsertMessageAuditLog,
  type Communication,
  type InsertCommunication,
  type CommunicationWithDetails,
  // E-commerce types
  type ProductCategory,
  type InsertProductCategory,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type CartItem,
  type InsertCartItem,
  type EcommerceOrder,
  type InsertEcommerceOrder,
  type EcommerceOrderItem,
  type InsertEcommerceOrderItem,
  type ProductWithDetails,
  type ProductCategoryWithProducts,
  type CartItemWithDetails,
  type EcommerceOrderWithDetails,
  type CourseNotification,
  type InsertCourseNotification,
  type CourseNotificationWithUser,
  notificationTemplates,
  notificationSchedules,
  notificationLogs,
  type NotificationTemplate,
  type InsertNotificationTemplate,
  type NotificationSchedule,
  type InsertNotificationSchedule,
  type NotificationLog,
  type InsertNotificationLog,
  type NotificationTemplateWithDetails,
  type NotificationScheduleWithDetails,
  type NotificationLogWithDetails,
  waiverTemplates,
  waiverInstances,
  waiverSignatures,
  type WaiverTemplate,
  type InsertWaiverTemplate,
  type WaiverInstance,
  type InsertWaiverInstance,
  type WaiverSignature,
  type InsertWaiverSignature,
  type WaiverTemplateWithDetails,
  type WaiverInstanceWithDetails,
  courseNotificationSignups,
  courseNotificationDeliveryLogs,
  type CourseNotificationSignup,
  type InsertCourseNotificationSignup,
  type CourseNotificationDeliveryLog,
  type InsertCourseNotificationDeliveryLog,
  type CourseNotificationSignupWithDetails,
  smsLists,
  smsListMembers,
  smsBroadcastMessages,
  smsBroadcastDeliveries,
  typeSmsList,
  type InsertSmsList,
  typeSmsListMember,
  type InsertSmsListMember,
  typeSmsBroadcastMessage,
  type InsertSmsBroadcastMessage,
  typeSmsBroadcastDelivery,
  type InsertSmsBroadcastDelivery,
  typeSmsListWithDetails,
  typeSmsListMemberWithUser,
  typeSmsBroadcastMessageWithDetails,
  typeSmsBroadcastDeliveryWithDetails,
  // Appointment system imports
  appointmentTypes,
  instructorWeeklyTemplates,
  instructorAvailabilityOverrides,
  instructorAppointments,
  appointmentNotificationTemplates,
  appointmentReminderSchedules,
  type AppointmentType,
  type InsertAppointmentType,
  type InstructorWeeklyTemplate,
  type InsertInstructorWeeklyTemplate,
  type InstructorAvailabilityOverride,
  type InsertInstructorAvailabilityOverride,
  type InstructorAppointment,
  type InsertInstructorAppointment,
  type AppointmentNotificationTemplate,
  type InsertAppointmentNotificationTemplate,
  type AppointmentReminderSchedule,
  type InsertAppointmentReminderSchedule,
  type AppointmentTypeWithDetails,
  type InstructorAppointmentWithDetails,
  // Credit system imports
  instructorCredits,
  creditPackages,
  creditTransactions,
  type InstructorCredits,
  type InsertInstructorCredits,
  type CreditPackage,
  type InsertCreditPackage,
  type CreditTransaction,
  type InsertCreditTransaction,
  type InstructorCreditsWithDetails,
  type CreditTransactionWithDetails,
  // Gift card system imports
  giftCardThemes,
  giftCards,
  giftCardRedemptions,
  giftCardBalanceAdjustments,
  giftCardValidationAttempts,
  type GiftCardTheme,
  type InsertGiftCardTheme,
  type GiftCard,
  type InsertGiftCard,
  type GiftCardRedemption,
  type InsertGiftCardRedemption,
  type GiftCardBalanceAdjustment,
  type InsertGiftCardBalanceAdjustment,
  type GiftCardValidationAttempt,
  type InsertGiftCardValidationAttempt,
  type GiftCardWithDetails,
  type GiftCardRedemptionWithDetails,
  type GiftCardValidationResult,
  // FTA Waiver Submission imports
  ftaWaiverSubmissions,
  type FtaWaiverSubmission,
  type InsertFtaWaiverSubmission,
  // Student Feedback imports
  studentFeedback,
  type StudentFeedback,
  type InsertStudentFeedback,
  type StudentFeedbackWithDetails,
  // Online Course Enrollment imports
  onlineCourseEnrollments,
  type OnlineCourseEnrollment,
  type InsertOnlineCourseEnrollment,
  type OnlineCourseEnrollmentWithUser,
  // License reminder imports
  licenseReminderLogs,
  type LicenseReminderLog,
  type InsertLicenseReminderLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, isNull, isNotNull, sql, gte, gt, lt, lte, ne, inArray, notInArray } from "drizzle-orm";
import Stripe from 'stripe';

/**
 * Normalizes a phone number to E.164 format for consistent storage and comparison
 * @param phone - Phone number in any format
 * @returns Normalized phone number in E.164 format (+1XXXXXXXXXX) or null if invalid
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Must have at least 10 digits for a valid US phone number
  if (digits.length < 10) return null;
  
  // If it's exactly 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits and starts with 1, format as +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already has a country code, ensure it starts with +
  if (digits.length > 10) {
    return `+${digits}`;
  }
  
  return null;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getAllStudents(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getPendingUsersCount(): Promise<number>;
  createUser(user: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User>;
  updateStudent(id: string, data: { email?: string; phone?: string; concealedCarryLicenseExpiration?: string; concealedCarryLicenseIssued?: string; licenseExpirationReminderDays?: number; enableLicenseExpirationReminder?: boolean; refresherReminderDays?: number; enableRefresherReminder?: boolean; enableSmsNotifications?: boolean; enableSmsReminders?: boolean; enableSmsPaymentNotices?: boolean; enableSmsAnnouncements?: boolean }): Promise<User>;

  // Category operations
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  reorderCategories(updates: {id: string; sortOrder: number}[]): Promise<void>;

  // Course operations
  createCourse(course: InsertCourse): Promise<Course>;
  duplicateCourse(courseId: string): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<Course>;
  restoreCourse(id: string): Promise<Course>;
  permanentlyDeleteCourse(id: string): Promise<void>;
  publishCourse(id: string): Promise<Course>;
  unpublishCourse(id: string): Promise<Course>;
  archiveCourse(id: string): Promise<Course>;
  reactivateCourse(id: string): Promise<Course>;
  getCourse(id: string): Promise<CourseWithSchedules | undefined>;
  getCourses(): Promise<CourseWithSchedules[]>;
  getCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]>;
  getDeletedCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]>;
  reorderCourses(updates: {id: string; sortOrder: number}[]): Promise<void>;

  // Course schedule operations
  createCourseSchedule(schedule: InsertCourseSchedule): Promise<CourseSchedule>;
  duplicateCourseSchedule(scheduleId: string): Promise<CourseSchedule>;
  updateCourseSchedule(id: string, schedule: Partial<InsertCourseSchedule>): Promise<CourseSchedule>;
  deleteCourseSchedule(id: string): Promise<CourseSchedule>;
  permanentlyDeleteCourseSchedule(id: string): Promise<void>;
  getCourseSchedule(id: string): Promise<CourseSchedule | undefined>;
  getCourseSchedules(courseId: string): Promise<CourseSchedule[]>;
  getDeletedSchedulesByInstructor(instructorId: string): Promise<any[]>;

  // Enrollment operations
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment>;
  getEnrollment(id: string): Promise<EnrollmentWithDetails | undefined>;
  getEnrollmentsByScheduleId(scheduleId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByInstructor(instructorId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]>;

  // Course Enrollment Feedback operations
  createOrUpdateEnrollmentFeedback(enrollmentId: string, feedback: Partial<InsertCourseEnrollmentFeedback>): Promise<CourseEnrollmentFeedback>;
  getEnrollmentFeedback(enrollmentId: string): Promise<CourseEnrollmentFeedback | undefined>;
  updateInstructorFeedback(enrollmentId: string, instructorId: string, feedback: { positive?: string; opportunities?: string; actionPlan?: string }): Promise<CourseEnrollmentFeedback>;
  updateStudentNotes(enrollmentId: string, notes: string): Promise<CourseEnrollmentFeedback>;
  getStudentsByInstructor(instructorId: string): Promise<{
    current: any[];
    former: any[];
    held: any[];
  }>;
  getStudentsBySchedule(scheduleId: string, instructorId: string): Promise<{
    current: any[];
    former: any[];
  }>;
  getScheduleEnrollmentCount(scheduleId: string): Promise<number>;
  getRosterExportData(instructorId: string, scheduleId?: string, courseId?: string, userRole?: string): Promise<{
    current: any[];
    former: any[];
    held: any[];
    formFields: Array<{ fieldId: string; formTitle: string; fieldLabel: string; sortOrder: number }>;
    summary: {
      totalCurrentStudents: number;
      totalFormerStudents: number;
      totalHeldStudents: number;
      totalCourses: number;
      exportDate: string;
    };
  }>;

  // Draft enrollment operations for single-page registration
  initiateRegistration(data: {
    courseId: string;
    scheduleId: string;
    paymentOption: 'full' | 'deposit';
    studentId?: string | null; // Optional studentId for authenticated users
    studentInfo?: { firstName: string; lastName: string; email: string } | null; // Store for guest enrollments
  }): Promise<Enrollment>;
  upsertPaymentIntent(enrollmentId: string, promoCode?: string, handgunRentalAdded?: boolean): Promise<{
    clientSecret: string;
    originalAmount: number;
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
    tax_included: boolean;
    promoCode?: string;
    handgunRentalFee?: number;
  }>;
  finalizeEnrollment(data: {
    enrollmentId: string;
    paymentIntentId: string;
    studentInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    accountCreation?: {
      password: string;
    };
  }): Promise<Enrollment>;

  // Payment balance and form completion tracking
  getPaymentBalance(enrollmentId: string): Promise<{
    remainingBalance: number;
    hasRemainingBalance: boolean;
    originalAmount: number;
    paidAmount: number;
  }>;
  getFormCompletionStatus(enrollmentId: string): Promise<{
    totalForms: number;
    completedForms: number;
    isComplete: boolean;
    missingForms: { id: string; title: string; isRequired: boolean }[];
  }>;

  // Course Information Forms operations
  createCourseInformationForm(form: InsertCourseInformationForm): Promise<CourseInformationForm>;
  updateCourseInformationForm(id: string, form: Partial<InsertCourseInformationForm>): Promise<CourseInformationForm>;
  deleteCourseInformationForm(id: string): Promise<void>;
  getCourseInformationForm(id: string): Promise<CourseInformationFormWithFields | undefined>;
  getCourseInformationForms(): Promise<CourseInformationFormWithFields[]>;
  getCourseInformationFormsByCourse(courseId: string): Promise<CourseInformationFormWithFields[]>;
  getCourseInformationFormsByAppointmentType(appointmentTypeId: string): Promise<CourseInformationFormWithFields[]>;

  // Course Information Form Fields operations
  createCourseInformationFormField(field: InsertCourseInformationFormField): Promise<CourseInformationFormField>;
  updateCourseInformationFormField(id: string, field: Partial<InsertCourseInformationFormField>): Promise<CourseInformationFormField>;
  deleteCourseInformationFormField(id: string): Promise<void>;
  getCourseInformationFormFields(formId: string): Promise<CourseInformationFormField[]>;
  reorderCourseInformationFormFields(updates: {id: string; sortOrder: number}[]): Promise<void>;

  // Student Form Response operations
  createStudentFormResponse(response: InsertStudentFormResponse): Promise<StudentFormResponse>;
  updateStudentFormResponse(id: string, response: Partial<InsertStudentFormResponse>): Promise<StudentFormResponse>;
  getStudentFormResponsesByEnrollment(enrollmentId: string): Promise<StudentFormResponse[]>;
  getStudentFormResponsesByForm(formId: string): Promise<StudentFormResponse[]>;
  getStudentFormResponsesWithDetails(enrollmentId: string): Promise<any[]>;

  // Waitlist operations
  joinWaitlist(data: { studentId: string; courseId: string; scheduleId: string; notes?: string }): Promise<WaitlistEntry>;
  getWaitlistEntry(waitlistId: string): Promise<WaitlistWithUser | undefined>;
  getWaitlistBySchedule(scheduleId: string): Promise<WaitlistWithUser[]>;
  getWaitlistByStudent(studentId: string): Promise<WaitlistWithUser[]>;
  getStudentWaitlistEntries(studentId: string): Promise<any[]>;
  inviteFromWaitlist(waitlistId: string): Promise<WaitlistEntry>;
  removeFromWaitlist(waitlistId: string): Promise<void>;
  updateWaitlistStatus(waitlistId: string, status: WaitlistStatus): Promise<WaitlistEntry>;

  // App settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(input: InsertAppSettings): Promise<AppSettings>;

  // Dashboard statistics
  getInstructorDashboardStats(instructorId: string): Promise<{
    upcomingCourses: number;
    onlineStudents: number;
    allStudents: number;
    totalRevenue: number;
    outstandingRevenue: number;
    refundRequests: number;
  }>;

  // Promo code operations
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: string, promoCode: Partial<InsertPromoCode>): Promise<PromoCode>;
  deletePromoCode(id: string): Promise<void>;
  getPromoCode(id: string): Promise<PromoCodeWithDetails | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getPromoCodes(): Promise<PromoCodeWithDetails[]>;
  getPromoCodesByCreator(createdBy: string): Promise<PromoCodeWithDetails[]>;

  // Promo code validation and redemption
  validatePromoCode(code: string, userId: string, courseId: string | null, amount: number, context?: 'course' | 'appointment'): Promise<PromoCodeValidationResult>;
  redeemPromoCode(redemption: InsertPromoCodeRedemption): Promise<PromoCodeRedemption>;
  getPromoCodeRedemptions(promoCodeId: string): Promise<PromoCodeRedemption[]>;
  getPromoCodeRedemptionsByUser(userId: string): Promise<PromoCodeRedemption[]>;
  getPromoCodeRedemptionByEnrollment(enrollmentId: string): Promise<PromoCodeRedemption | undefined>;

  // Promo code utility methods
  generatePromoCode(): Promise<string>;
  updatePromoCodeUsageCount(promoCodeId: string, increment: number): Promise<void>;

  // Notification Template operations
  createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate>;
  updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate>;
  deleteNotificationTemplate(id: string): Promise<void>;
  getNotificationTemplate(id: string): Promise<NotificationTemplateWithDetails | undefined>;
  getNotificationTemplates(courseId?: string): Promise<NotificationTemplateWithDetails[]>;
  getNotificationTemplatesByCategory(category: string): Promise<NotificationTemplateWithDetails[]>;
  reorderNotificationTemplates(updates: {id: string; sortOrder: number}[]): Promise<void>;

  // Notification Schedule operations
  createNotificationSchedule(schedule: InsertNotificationSchedule): Promise<NotificationSchedule>;
  updateNotificationSchedule(id: string, schedule: Partial<InsertNotificationSchedule>): Promise<NotificationSchedule>;
  deleteNotificationSchedule(id: string): Promise<void>;
  getNotificationSchedule(id: string): Promise<NotificationScheduleWithDetails | undefined>;
  getNotificationSchedules(courseId?: string, scheduleId?: string): Promise<NotificationScheduleWithDetails[]>;
  getActiveNotificationSchedulesByEvent(event: string): Promise<NotificationScheduleWithDetails[]>;

  // Notification Log operations
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  updateNotificationLog(id: string, log: Partial<InsertNotificationLog>): Promise<NotificationLog>;
  getNotificationLog(id: string): Promise<NotificationLogWithDetails | undefined>;
  getNotificationLogs(filters: {
    recipientId?: string;
    templateId?: string;
    courseId?: string;
    status?: string;
    type?: string;
    recipientEmail?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: NotificationLogWithDetails[]; total: number }>;
  getNotificationLogsByEnrollment(enrollmentId: string): Promise<NotificationLogWithDetails[]>;

  // Waiver Template operations
  createWaiverTemplate(template: InsertWaiverTemplate): Promise<WaiverTemplate>;
  updateWaiverTemplate(id: string, template: Partial<InsertWaiverTemplate>): Promise<WaiverTemplate>;
  deleteWaiverTemplate(id: string): Promise<void>;
  getWaiverTemplate(id: string): Promise<WaiverTemplateWithDetails | undefined>;
  getWaiverTemplates(filters?: { scope?: string; courseId?: string; isActive?: boolean }): Promise<WaiverTemplateWithDetails[]>;
  getWaiverTemplatesByCourse(courseId: string): Promise<WaiverTemplateWithDetails[]>;

  // Waiver Instance operations
  createWaiverInstance(instance: InsertWaiverInstance): Promise<WaiverInstance>;
  updateWaiverInstance(id: string, instance: Partial<InsertWaiverInstance>): Promise<WaiverInstance>;
  signWaiverInstance(instanceId: string, signatureData: {
    signerName: string;
    signatureData: string;
    signatureMethod: 'typed' | 'canvas';
    consentCheckboxes: Array<{ sectionId: string; initial: string; timestamp: string }>;
    acknowledgementsCompleted: boolean;
    metadata?: Record<string, any>;
  }): Promise<WaiverInstance>;
  getWaiverInstance(id: string): Promise<WaiverInstanceWithDetails | undefined>;
  getWaiverInstancesByEnrollment(enrollmentId: string): Promise<WaiverInstanceWithDetails[]>;
  getWaiverInstancesByTemplate(templateId: string): Promise<WaiverInstanceWithDetails[]>;
  getWaiverInstancesByStatus(status: string): Promise<WaiverInstanceWithDetails[]>;

  // Waiver Signature operations  
  createWaiverSignature(signature: InsertWaiverSignature): Promise<WaiverSignature>;
  getWaiverSignature(id: string): Promise<WaiverSignature | undefined>;
  getWaiverSignaturesByInstance(instanceId: string): Promise<WaiverSignature[]>;

  // Waiver utility methods
  generateWaiverContent(templateId: string, enrollmentId: string): Promise<{ content: string; mergedData: any }>;
  checkWaiverRequirements(enrollmentId: string): Promise<{
    required: WaiverInstanceWithDetails[];
    signed: WaiverInstanceWithDetails[];
    pending: WaiverInstanceWithDetails[];
    expired: WaiverInstanceWithDetails[];
  }>;
  getWaiverComplianceReport(courseId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalWaivers: number;
    signedWaivers: number;
    pendingWaivers: number;
    expiredWaivers: number;
    complianceRate: number;
  }>;

  // Content filtering and compliance operations
  batchInsertProhibitedWords(words: InsertProhibitedWord[]): Promise<void>;
  getActiveProhibitedWords(): Promise<ProhibitedWord[]>;
  insertProhibitedWord(word: InsertProhibitedWord): Promise<ProhibitedWord>;
  insertMessageAuditLog(log: InsertMessageAuditLog): Promise<MessageAuditLog>;
  getMessageComplianceReport(dateFrom: Date, dateTo: Date): Promise<{
    totalAttempts: number;
    blockedAttempts: number;
    sentMessages: number;
    topViolations: Array<{ word: string; count: number; category: string }>;
    instructorStats: Array<{ instructorId: string; attempts: number; blocked: number }>;
  }>;

  // Roster and scheduling operations
  getInstructorAvailableSchedules(instructorId: string, excludeEnrollmentId?: string): Promise<any[]>;
  getAllAvailableSchedules(excludeStudentId?: string): Promise<any[]>;

  // Course notification signup operations
  createCourseNotificationSignup(signup: InsertCourseNotificationSignup): Promise<CourseNotificationSignup>;
  getCourseNotificationSignups(courseId: string): Promise<CourseNotificationSignupWithDetails[]>;
  getCourseNotificationSignupsBySchedule(scheduleId: string): Promise<CourseNotificationSignupWithDetails[]>;
  deleteCourseNotificationSignup(id: string): Promise<void>;
  logNotificationDelivery(log: InsertCourseNotificationDeliveryLog): Promise<CourseNotificationDeliveryLog>;
  getNotificationDeliveryLogs(signupId: string): Promise<CourseNotificationDeliveryLog[]>;

  // Communications tracking operations
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  updateCommunication(id: string, communication: Partial<InsertCommunication>): Promise<Communication>;
  getCommunication(id: string): Promise<CommunicationWithDetails | undefined>;
  getCommunications(filters: {
    userId?: string;
    courseId?: string;
    enrollmentId?: string;
    type?: 'email' | 'sms';
    direction?: 'inbound' | 'outbound';
    isRead?: boolean;
    isFlagged?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ communications: CommunicationWithDetails[]; total: number }>;
  markCommunicationAsRead(id: string): Promise<Communication>;
  markCommunicationAsUnread(id: string): Promise<Communication>;
  flagCommunication(id: string, note?: string): Promise<Communication>;
  unflagCommunication(id: string): Promise<Communication>;

  // E-commerce operations
  // Product Categories
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  updateProductCategory(id: string, category: Partial<InsertProductCategory>): Promise<ProductCategory>;
  deleteProductCategory(id: string): Promise<void>;
  getProductCategory(id: string): Promise<ProductCategory | undefined>;
  getProductCategories(): Promise<ProductCategoryWithProducts[]>;

  // Products
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getProduct(id: string): Promise<ProductWithDetails | undefined>;
  getProducts(): Promise<ProductWithDetails[]>;
  getProductsByCategory(categoryId: string): Promise<ProductWithDetails[]>;

  // Product Variants
  createProductVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateProductVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant>;
  deleteProductVariant(id: string): Promise<void>;
  getProductVariant(id: string): Promise<ProductVariant | undefined>;
  getProductVariants(productId: string): Promise<ProductVariant[]>;

  // Shopping Cart
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem>;
  removeFromCart(id: string): Promise<void>;
  getCartItems(userId?: string, sessionId?: string): Promise<CartItemWithDetails[]>;
  clearCart(userId?: string, sessionId?: string): Promise<void>;

  // E-commerce Orders
  createEcommerceOrder(order: InsertEcommerceOrder): Promise< EcommerceOrder>;
  updateEcommerceOrder(id: string, order: Partial<InsertEcommerceOrder>): Promise< EcommerceOrder>;
  getEcommerceOrder(id: string): Promise< EcommerceOrderWithDetails | undefined>;
  getEcommerceOrders(userId?: string): Promise< EcommerceOrderWithDetails[]>;

  // E-commerce Order Items
  createEcommerceOrderItem(item: InsertEcommerceOrderItem): Promise< EcommerceOrderItem>;
  updateEcommerceOrderItem(id: string, item: Partial<InsertEcommerceOrderItem>): Promise< EcommerceOrderItem>;
  getEcommerceOrderItems(orderId: string): Promise< EcommerceOrderItem[]>;

  // Course Notifications
  createCourseNotification(notification: InsertCourseNotification): Promise<CourseNotification>;
  getCourseNotifications(courseType?: string): Promise<CourseNotificationWithUser[]>;
  updateCourseNotification(id: string, notification: Partial<InsertCourseNotification>): Promise<CourseNotification>;
  deleteCourseNotification(id: string): Promise<void>;

  // SMS Lists Methods
  createSmsList(data: InsertSmsList): Promise<SmsList>;
  getSmsList(id: string): Promise<SmsList | undefined>;
  getSmsListsByInstructor(instructorId: string): Promise<SmsList[]>;
  getSmsListBySchedule(scheduleId: string): Promise<SmsList | undefined>;
  updateSmsList(id: string, data: Partial<InsertSmsList>): Promise<SmsList>;
  deleteSmsList(id: string): Promise<void>;
  searchSmsLists(instructorId: string, query: string): Promise<SmsList[]>;

  // SMS List Members Methods
  addSmsListMember(data: InsertSmsListMember): Promise<SmsListMember>;
  addSmsListMembers(members: InsertSmsListMember[]): Promise<SmsListMember[]>;
  getSmsListMembers(listId: string): Promise<SmsListMemberWithUser[]>;
  getSmsListMembersByUser(userId: string): Promise<SmsListMemberWithUser[]>;
  removeSmsListMember(id: string): Promise<void>;
  removeSmsListMemberByUserAndList(listId: string, userId: string): Promise<void>;
  checkSmsListMembership(listId: string, userId: string): Promise<boolean>;

  // SMS Broadcast Messages Methods
  createSmsBroadcastMessage(data: InsertSmsBroadcastMessage): Promise<SmsBroadcastMessage>;
  getSmsBroadcastMessage(id: string): Promise<SmsBroadcastMessage | undefined>;
  getSmsBroadcastsByList(listId: string): Promise<SmsBroadcastMessage[]>;
  updateSmsBroadcastMessage(id: string, data: Partial<InsertSmsBroadcastMessage>): Promise<SmsBroadcastMessage>;
  deleteSmsBroadcastMessage(id: string): Promise<void>;

  // SMS Broadcast Deliveries Methods
  createSmsBroadcastDelivery(data: InsertSmsBroadcastDelivery): Promise<SmsBroadcastDelivery>;
  createSmsBroadcastDeliveries(deliveries: InsertSmsBroadcastDelivery[]): Promise<SmsBroadcastDelivery[]>;
  getSmsBroadcastDeliveries(broadcastId: string): Promise<SmsBroadcastDeliveryWithDetails[]>;
  getSmsBroadcastDelivery(id: string): Promise<SmsBroadcastDelivery | undefined>;
  updateSmsBroadcastDelivery(id: string, data: Partial<InsertSmsBroadcastDelivery>): Promise<SmsBroadcastDelivery>;
  getDeliveriesByUser(userId: string): Promise<SmsBroadcastDeliveryWithDetails[]>;

  // SMS Helper Methods
  getSmsListWithDetails(id: string): Promise<SmsListWithDetails | undefined>;
  getSmsBroadcastWithDeliveryStats(id: string): Promise<SmsBroadcastMessageWithDetails | undefined>;

  // ============================================
  // APPOINTMENT SYSTEM METHODS
  // ============================================

  // Appointment Type operations
  createAppointmentType(data: InsertAppointmentType): Promise<AppointmentType>;
  updateAppointmentType(id: string, data: Partial<InsertAppointmentType>): Promise<AppointmentType>;
  deleteAppointmentType(id: string): Promise<void>;
  getAppointmentType(id: string): Promise<AppointmentType | undefined>;
  getAppointmentTypes(instructorId: string): Promise<AppointmentType[]>;
  getActiveAppointmentTypes(instructorId: string): Promise<AppointmentType[]>;

  // Instructor Weekly Template operations
  createWeeklyTemplate(data: InsertInstructorWeeklyTemplate): Promise<InstructorWeeklyTemplate>;
  updateWeeklyTemplate(id: string, data: Partial<InsertInstructorWeeklyTemplate>): Promise<InstructorWeeklyTemplate>;
  deleteWeeklyTemplate(id: string): Promise<void>;
  getWeeklyTemplate(id: string): Promise<InstructorWeeklyTemplate | undefined>;
  getWeeklyTemplates(instructorId: string): Promise<InstructorWeeklyTemplate[]>;
  getWeeklyTemplatesByDay(instructorId: string, dayOfWeek: number): Promise<InstructorWeeklyTemplate[]>;

  // Instructor Availability Override operations
  createAvailabilityOverride(data: InsertInstructorAvailabilityOverride): Promise<InstructorAvailabilityOverride>;
  updateAvailabilityOverride(id: string, data: Partial<InsertInstructorAvailabilityOverride>): Promise<InstructorAvailabilityOverride>;
  deleteAvailabilityOverride(id: string): Promise<void>;
  getAvailabilityOverride(id: string): Promise<InstructorAvailabilityOverride | undefined>;
  getAvailabilityOverrides(instructorId: string): Promise<InstructorAvailabilityOverride[]>;
  getAvailabilityOverridesInRange(instructorId: string, startDate: Date, endDate: Date): Promise<InstructorAvailabilityOverride[]>;

  // Instructor Appointment operations
  createAppointment(data: InsertInstructorAppointment): Promise<InstructorAppointment>;
  updateAppointment(id: string, data: Partial<InsertInstructorAppointment>): Promise<InstructorAppointment>;
  cancelAppointment(id: string, cancelledBy: string, reason?: string): Promise<InstructorAppointment>;
  getAppointment(id: string): Promise<InstructorAppointmentWithDetails | undefined>;
  getAppointments(filters: {
    instructorId?: string;
    studentId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<InstructorAppointmentWithDetails[]>;
  getAllAppointments(): Promise<InstructorAppointmentWithDetails[]>;
  getAppointmentsByInstructor(instructorId: string): Promise<InstructorAppointmentWithDetails[]>;
  getAppointmentsByStudent(studentId: string): Promise<InstructorAppointmentWithDetails[]>;
  getPendingAppointments(instructorId: string): Promise<InstructorAppointmentWithDetails[]>;
  getAllPendingAppointments(): Promise<InstructorAppointmentWithDetails[]>;
  getUpcomingAppointments(instructorId: string, limit?: number): Promise<InstructorAppointmentWithDetails[]>;
  getAllUpcomingAppointments(limit?: number): Promise<InstructorAppointmentWithDetails[]>;
  approveAppointment(id: string): Promise<InstructorAppointment>;
  rejectAppointment(id: string, reason: string): Promise<InstructorAppointment>;

  // Appointment Notification Template operations
  createAppointmentNotificationTemplate(data: InsertAppointmentNotificationTemplate): Promise<AppointmentNotificationTemplate>;
  updateAppointmentNotificationTemplate(id: string, data: Partial<InsertAppointmentNotificationTemplate>): Promise<AppointmentNotificationTemplate>;
  deleteAppointmentNotificationTemplate(id: string): Promise<void>;
  getAppointmentNotificationTemplate(id: string): Promise<AppointmentNotificationTemplate | undefined>;
  getAppointmentNotificationTemplates(instructorId: string): Promise<AppointmentNotificationTemplate[]>;
  getAppointmentNotificationTemplateByEvent(instructorId: string, eventType: string, recipientType: string, channelType: string): Promise<AppointmentNotificationTemplate | undefined>;

  // Appointment Reminder Schedule operations
  createAppointmentReminderSchedule(data: InsertAppointmentReminderSchedule): Promise<AppointmentReminderSchedule>;
  updateAppointmentReminderSchedule(id: string, data: Partial<InsertAppointmentReminderSchedule>): Promise<AppointmentReminderSchedule>;
  deleteAppointmentReminderSchedule(id: string): Promise<void>;
  getAppointmentReminderSchedule(id: string): Promise<AppointmentReminderSchedule | undefined>;
  getAppointmentReminderSchedules(instructorId: string): Promise<AppointmentReminderSchedule[]>;
  getActiveAppointmentReminderSchedules(instructorId: string): Promise<AppointmentReminderSchedule[]>;

  // Appointment availability helper methods
  getInstructorCourseSchedules(instructorId: string, startDate: Date, endDate: Date): Promise<CourseSchedule[]>;
  checkAppointmentConflict(instructorId: string, startTime: Date, endTime: Date, excludeAppointmentId?: string): Promise<boolean>;

  // ============================================
  // CREDIT SYSTEM METHODS
  // ============================================

  // Credit balance operations
  getInstructorCredits(instructorId: string): Promise<InstructorCredits | undefined>;
  createInstructorCredits(instructorId: string): Promise<InstructorCredits>;
  ensureInstructorCredits(instructorId: string): Promise<InstructorCredits>;

  // Credit transaction operations
  addCredits(instructorId: string, smsCredits: number, emailCredits: number, data: {
    amount?: number;
    stripePaymentIntentId?: string;
    packageId?: string;
    description?: string;
    transactionType?: 'purchase' | 'admin_grant';
    grantedByUserId?: string;
  }): Promise<{ credits: InstructorCredits; transaction: CreditTransaction }>;
  
  getAllInstructorsWithCredits(): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    smsCredits: number;
    emailCredits: number;
  }>>;
  
  deductCredits(instructorId: string, smsCredits: number, emailCredits: number, data: {
    communicationId?: string;
    description?: string;
  }): Promise<{ credits: InstructorCredits; transaction: CreditTransaction }>;

  refundCredits(instructorId: string, transactionId: string, refundReason?: string): Promise<{ credits: InstructorCredits; transaction: CreditTransaction }>;
  updateCreditTransactionCommunication(transactionId: string, communicationId: string): Promise<void>;

  // Credit package operations
  getCreditPackages(): Promise<CreditPackage[]>;
  getActiveCreditPackages(): Promise<CreditPackage[]>;
  getCreditPackage(id: string): Promise<CreditPackage | undefined>;

  // Credit transaction history
  getCreditTransactions(instructorId: string, limit?: number): Promise<CreditTransactionWithDetails[]>;
  getCreditTransaction(id: string): Promise<CreditTransactionWithDetails | undefined>;

  // ============================================
  // GIFT CARD SYSTEM METHODS
  // ============================================

  // Gift card theme operations
  createGiftCardTheme(theme: InsertGiftCardTheme): Promise<GiftCardTheme>;
  updateGiftCardTheme(id: string, theme: Partial<InsertGiftCardTheme>): Promise<GiftCardTheme>;
  deleteGiftCardTheme(id: string): Promise<void>;
  getGiftCardTheme(id: string): Promise<GiftCardTheme | undefined>;
  getGiftCardThemes(): Promise<GiftCardTheme[]>;
  getActiveGiftCardThemes(): Promise<GiftCardTheme[]>;

  // Gift card operations
  createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard>;
  updateGiftCard(id: string, giftCard: Partial<InsertGiftCard>): Promise<GiftCard>;
  getGiftCard(id: string): Promise<GiftCardWithDetails | undefined>;
  getGiftCardByCodeHash(codeHash: string): Promise<GiftCard | undefined>;
  getGiftCardByLast4(last4: string): Promise<GiftCardWithDetails[]>;
  getGiftCards(filters?: { status?: string; issuedByUserId?: string }): Promise<GiftCardWithDetails[]>;
  voidGiftCard(id: string, voidedByUserId: string, reason: string): Promise<GiftCard>;

  // Gift card redemption operations
  createGiftCardRedemption(redemption: InsertGiftCardRedemption): Promise<GiftCardRedemption>;
  getGiftCardRedemptions(giftCardId: string): Promise<GiftCardRedemptionWithDetails[]>;
  getGiftCardRedemptionsByUser(userId: string): Promise<GiftCardRedemptionWithDetails[]>;

  // Gift card balance adjustment operations (admin audit trail)
  createGiftCardBalanceAdjustment(adjustment: InsertGiftCardBalanceAdjustment): Promise<GiftCardBalanceAdjustment>;
  getGiftCardBalanceAdjustments(giftCardId: string): Promise<GiftCardBalanceAdjustment[]>;

  // Gift card validation attempt operations (rate limiting/security)
  createGiftCardValidationAttempt(attempt: InsertGiftCardValidationAttempt): Promise<GiftCardValidationAttempt>;
  getRecentValidationAttempts(ipAddress: string, minutes: number): Promise<GiftCardValidationAttempt[]>;
  getRecentValidationAttemptsBySession(sessionId: string, minutes: number): Promise<GiftCardValidationAttempt[]>;

  // ============================================
  // FTA WAIVER SUBMISSION METHODS
  // ============================================
  createFtaWaiverSubmission(submission: InsertFtaWaiverSubmission): Promise<FtaWaiverSubmission>;
  getFtaWaiverSubmission(id: string): Promise<FtaWaiverSubmission | undefined>;
  getFtaWaiverSubmissionsByEmail(email: string): Promise<FtaWaiverSubmission[]>;
  getFtaWaiverSubmissions(): Promise<FtaWaiverSubmission[]>;
  updateFtaWaiverSubmissionEmailSent(id: string): Promise<FtaWaiverSubmission>;

  // ============================================
  // STUDENT FEEDBACK METHODS
  // ============================================
  createStudentFeedback(feedback: InsertStudentFeedback): Promise<StudentFeedback>;
  getStudentFeedback(id: string): Promise<StudentFeedbackWithDetails | undefined>;
  getStudentFeedbackByStudent(studentId: string): Promise<StudentFeedbackWithDetails[]>;
  getStudentFeedbackByInstructor(instructorId: string): Promise<StudentFeedbackWithDetails[]>;
  updateStudentFeedback(id: string, feedback: Partial<InsertStudentFeedback>): Promise<StudentFeedback>;
  deleteStudentFeedback(id: string): Promise<void>;

  // ============================================
  // ONLINE COURSE ENROLLMENT METHODS
  // ============================================
  createOnlineCourseEnrollment(enrollment: InsertOnlineCourseEnrollment): Promise<OnlineCourseEnrollment>;
  getOnlineCourseEnrollment(id: string): Promise<OnlineCourseEnrollmentWithUser | undefined>;
  getOnlineCourseEnrollmentByPaymentIntent(paymentIntentId: string): Promise<OnlineCourseEnrollment | undefined>;
  getOnlineCourseEnrollmentsByEmail(email: string): Promise<OnlineCourseEnrollment[]>;
  updateOnlineCourseEnrollment(id: string, data: Partial<InsertOnlineCourseEnrollment & { status?: string; moodleSyncAttempts?: number; moodleSyncError?: string | null; moodleSyncedAt?: Date | null; emailNotificationSent?: boolean; smsNotificationSent?: boolean }>): Promise<OnlineCourseEnrollment>;
  getOnlineCourseEnrollments(): Promise<OnlineCourseEnrollmentWithUser[]>;
  updateOnlineCourseEnrollmentStatus(id: string, status: string): Promise<OnlineCourseEnrollment>;
  updateOnlineCourseEnrollmentMoodleInfo(id: string, data: { moodleUserId: number; moodleUsername: string; moodlePassword?: string; moodleCourseId: number; moodleSyncedAt: Date }): Promise<OnlineCourseEnrollment>;
  updateOnlineCourseEnrollmentMoodleSyncError(id: string, error: string): Promise<OnlineCourseEnrollment>;
  updateOnlineCourseEnrollmentNotificationStatus(id: string, type: 'email' | 'sms', sent: boolean): Promise<OnlineCourseEnrollment>;

  // ============================================
  // LICENSE REMINDER METHODS
  // ============================================
  getStudentsWithLicenseData(): Promise<User[]>;
  getActiveEnrollmentsByStudentAndCourseType(studentId: string, courseType: string): Promise<any[]>;
  getCompletedEnrollmentsByCourseType(courseType: string, afterDate: Date): Promise<any[]>;
  getNextAvailableCourseByType(courseType: string): Promise<{ course: any; schedule: any } | null>;
  getLicenseReminderLog(userId: string, reminderType: string, snapshotDate: Date): Promise<LicenseReminderLog | null>;
  createLicenseReminderLog(log: InsertLicenseReminderLog): Promise<LicenseReminderLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const normalizedSearchPhone = normalizePhoneNumber(phone);
    if (!normalizedSearchPhone) return undefined;
    
    // Get all users and filter by normalized phone number
    // This handles cases where phone numbers are stored in different formats
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => {
      const normalizedStoredPhone = normalizePhoneNumber(u.phone);
      return normalizedStoredPhone === normalizedSearchPhone;
    });
    
    return user;
  }

  async getAllStudents(): Promise<User[]> {
    const students = await db.select().from(users).where(eq(users.role, 'student'));
    return students;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return allUsers;
  }

  async getPendingUsersCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.userStatus, 'pending'));
    return Number(result[0].count);
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: sql`gen_random_uuid()`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role, // Allow role updates for existing users
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateStudent(id: string, data: { 
    email?: string;
    phone?: string; 
    concealedCarryLicenseExpiration?: string;
    concealedCarryLicenseIssued?: string;
    licenseExpirationReminderDays?: number;
    enableLicenseExpirationReminder?: boolean;
    refresherReminderDays?: number;
    enableRefresherReminder?: boolean;
    enableSmsNotifications?: boolean;
    enableSmsReminders?: boolean;
    enableSmsPaymentNotices?: boolean;
    enableSmsAnnouncements?: boolean;
  }): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }

    if (data.concealedCarryLicenseExpiration !== undefined) {
      updateData.concealedCarryLicenseExpiration = data.concealedCarryLicenseExpiration 
        ? new Date(data.concealedCarryLicenseExpiration) 
        : null;
    }

    if (data.concealedCarryLicenseIssued !== undefined) {
      updateData.concealedCarryLicenseIssued = data.concealedCarryLicenseIssued 
        ? new Date(data.concealedCarryLicenseIssued) 
        : null;
    }

    if (data.licenseExpirationReminderDays !== undefined) {
      updateData.licenseExpirationReminderDays = data.licenseExpirationReminderDays;
    }

    if (data.enableLicenseExpirationReminder !== undefined) {
      updateData.enableLicenseExpirationReminder = data.enableLicenseExpirationReminder;
    }

    if (data.refresherReminderDays !== undefined) {
      updateData.refresherReminderDays = data.refresherReminderDays;
    }

    if (data.enableRefresherReminder !== undefined) {
      updateData.enableRefresherReminder = data.enableRefresherReminder;
    }

    if (data.enableSmsNotifications !== undefined) {
      updateData.enableSmsNotifications = data.enableSmsNotifications;
    }

    if (data.enableSmsReminders !== undefined) {
      updateData.enableSmsReminders = data.enableSmsReminders;
    }

    if (data.enableSmsPaymentNotices !== undefined) {
      updateData.enableSmsPaymentNotices = data.enableSmsPaymentNotices;
    }

    if (data.enableSmsAnnouncements !== undefined) {
      updateData.enableSmsAnnouncements = data.enableSmsAnnouncements;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    return user;
  }

  // Category operations
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!updatedCategory) {
      throw new Error('Category not found');
    }
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(
        sql`COALESCE(${categories.sortOrder}, 9999)`,
        asc(categories.name)
      );
  }

  async reorderCategories(updates: {id: string; sortOrder: number}[]): Promise<void> {
    // Perform batch update in a transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(categories)
          .set({ sortOrder: update.sortOrder })
          .where(eq(categories.id, update.id));
      }
    });
  }

  // Course operations
  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async duplicateCourse(courseId: string): Promise<Course> {
    // Get the original course
    const originalCourse = await this.getCourse(courseId);
    if (!originalCourse) {
      throw new Error('Course not found');
    }

    // Create a duplicate with a new title
    const duplicateData: InsertCourse = {
      title: `${originalCourse.title} (Copy)`,
      description: originalCourse.description,
      category: originalCourse.category,
      price: originalCourse.price,
      duration: originalCourse.duration,
      imageUrl: originalCourse.imageUrl,
      instructorId: originalCourse.instructorId,
      isActive: false, // Start as inactive/draft
    };

    const [newCourse] = await db
      .insert(courses)
      .values(duplicateData)
      .returning();
    return newCourse;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course> {
    // Get current course to check status
    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, id));
    if (!existingCourse) {
      throw new Error("Course not found");
    }

    // Maintain isActive/status relationship:
    // - published courses must have isActive: true
    // - all other statuses must have isActive: false
    const currentStatus = course.status || existingCourse.status;
    const isActive = currentStatus === "published";

    const [updatedCourse] = await db
      .update(courses)
      .set({ 
        ...course, 
        isActive, // Always sync isActive with status
        updatedAt: new Date() 
      })
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse;
  }

  async deleteCourse(id: string): Promise<Course> {
    // Soft delete - set deletedAt timestamp
    const [deletedCourse] = await db
      .update(courses)
      .set({ deletedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return deletedCourse;
  }

  async permanentlyDeleteCourse(id: string): Promise<void> {
    // Hard delete - permanently remove from database with cascade
    console.log(`Starting permanent deletion of course: ${id}`);

    try {
      // Get all schedule IDs for this course
      const courseScheduleList = await db
        .select({ id: courseSchedules.id })
        .from(courseSchedules)
        .where(eq(courseSchedules.courseId, id));
      
      const scheduleIds = courseScheduleList.map(s => s.id);

      // Get all enrollment IDs for this course
      const courseEnrollments = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(eq(enrollments.courseId, id));
      
      const enrollmentIds = courseEnrollments.map(e => e.id);

      // Delete in proper order to avoid foreign key constraint violations

      // 1. Delete waiver signatures (references waiver_instances)
      if (enrollmentIds.length > 0) {
        console.log(`Deleting waiver signatures for course: ${id}`);
        await db.execute(sql`
          DELETE FROM waiver_signatures 
          WHERE instance_id IN (
            SELECT id FROM waiver_instances 
            WHERE enrollment_id IN (${sql.join(enrollmentIds.map(id => sql`${id}`), sql`, `)})
          )
        `);

        // 2. Delete waiver instances (references enrollments)
        console.log(`Deleting waiver instances for course: ${id}`);
        await db
          .delete(waiverInstances)
          .where(inArray(waiverInstances.enrollmentId, enrollmentIds));

        // 3. Delete student form responses (references enrollments)
        console.log(`Deleting student form responses for course: ${id}`);
        await db
          .delete(studentFormResponses)
          .where(inArray(studentFormResponses.enrollmentId, enrollmentIds));

        // 4. Delete notification logs (references enrollments)
        console.log(`Deleting notification logs for course: ${id}`);
        await db
          .delete(notificationLogs)
          .where(inArray(notificationLogs.enrollmentId, enrollmentIds));

        // 5. Delete course enrollment feedback (references enrollments)
        console.log(`Deleting enrollment feedback for course: ${id}`);
        await db
          .delete(courseEnrollmentFeedback)
          .where(inArray(courseEnrollmentFeedback.enrollmentId, enrollmentIds));

        // 6. Delete promo code redemptions (references enrollments)
        console.log(`Deleting promo code redemptions for course: ${id}`);
        await db
          .delete(promoCodeRedemptions)
          .where(inArray(promoCodeRedemptions.enrollmentId, enrollmentIds));
      }

      // 7. Delete course notification delivery logs (references schedules)
      if (scheduleIds.length > 0) {
        console.log(`Deleting course notification delivery logs for course: ${id}`);
        await db
          .delete(courseNotificationDeliveryLogs)
          .where(inArray(courseNotificationDeliveryLogs.scheduleId, scheduleIds));
      }

      // 8. Delete course notification signups (references courses)
      console.log(`Deleting course notification signups for course: ${id}`);
      await db
        .delete(courseNotificationSignups)
        .where(eq(courseNotificationSignups.courseId, id));

      // 9. Delete SMS lists tied to schedules
      if (scheduleIds.length > 0) {
        console.log(`Deleting SMS lists for course schedules: ${id}`);
        const smsListsToDelete = await db
          .select({ id: smsLists.id })
          .from(smsLists)
          .where(inArray(smsLists.scheduleId, scheduleIds));
        
        const smsListIds = smsListsToDelete.map(l => l.id);
        
        if (smsListIds.length > 0) {
          // Delete SMS broadcast deliveries
          await db.execute(sql`
            DELETE FROM sms_broadcast_deliveries 
            WHERE broadcast_id IN (
              SELECT id FROM sms_broadcast_messages 
              WHERE list_id IN (${sql.join(smsListIds.map(id => sql`${id}`), sql`, `)})
            )
          `);
          
          // Delete SMS broadcast messages
          await db
            .delete(smsBroadcastMessages)
            .where(inArray(smsBroadcastMessages.listId, smsListIds));
          
          // Delete SMS list members
          await db
            .delete(smsListMembers)
            .where(inArray(smsListMembers.listId, smsListIds));
          
          // Delete SMS lists
          await db
            .delete(smsLists)
            .where(inArray(smsLists.id, smsListIds));
        }
      }

      // 10. Delete enrollments (references courseSchedules)
      console.log(`Deleting enrollments for course: ${id}`);
      await db
        .delete(enrollments)
        .where(eq(enrollments.courseId, id));

      // 11. Delete notification schedules (references courses)
      console.log(`Deleting notification schedules for course: ${id}`);
      await db
        .delete(notificationSchedules)
        .where(eq(notificationSchedules.courseId, id));

      // 12. Delete notification templates (references courses)
      console.log(`Deleting notification templates for course: ${id}`);
      await db
        .delete(notificationTemplates)
        .where(eq(notificationTemplates.courseId, id));

      // 13. Delete course information form fields (references forms)
      console.log(`Deleting course information form fields for course: ${id}`);
      await db.execute(sql`
        DELETE FROM course_information_form_fields 
        WHERE form_id IN (
          SELECT id FROM course_information_forms 
          WHERE course_id = ${id}
        )
      `);

      // 14. Delete course information forms (references courses)
      console.log(`Deleting course information forms for course: ${id}`);
      await db
        .delete(courseInformationForms)
        .where(eq(courseInformationForms.courseId, id));

      // 15. Delete course schedules (references courses)
      console.log(`Deleting course schedules for course: ${id}`);
      await db
        .delete(courseSchedules)
        .where(eq(courseSchedules.courseId, id));

      // 16. Finally delete the course itself
      console.log(`Deleting course record: ${id}`);
      await db
        .delete(courses)
        .where(eq(courses.id, id));

      console.log(`Successfully completed permanent deletion of course: ${id}`);
    } catch (error) {
      console.error(`Error during permanent deletion of course ${id}:`, error);
      throw error;
    }
  }

  async restoreCourse(id: string): Promise<Course> {
    // Restore course by clearing deletedAt timestamp
    const [restoredCourse] = await db
      .update(courses)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return restoredCourse;
  }

  async publishCourse(id: string): Promise<Course> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) {
      throw new Error("Course not found");
    }
    if (course.deletedAt) {
      throw new Error("Cannot publish a deleted course");
    }
    if (course.status === "archived") {
      throw new Error("Cannot publish an archived course. Please reactivate it first.");
    }
    if (course.status !== "draft" && course.status !== "unpublished") {
      throw new Error("Can only publish draft or unpublished courses");
    }

    const [publishedCourse] = await db
      .update(courses)
      .set({ 
        status: "published", 
        isActive: true, 
        archivedAt: null,
        updatedAt: new Date() 
      })
      .where(eq(courses.id, id))
      .returning();
    return publishedCourse;
  }

  async unpublishCourse(id: string): Promise<Course> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) {
      throw new Error("Course not found");
    }
    if (course.deletedAt) {
      throw new Error("Cannot unpublish a deleted course");
    }
    if (course.status !== "published") {
      throw new Error("Can only unpublish published courses");
    }

    const [unpublishedCourse] = await db
      .update(courses)
      .set({ 
        status: "unpublished", 
        isActive: false, 
        archivedAt: null,
        updatedAt: new Date() 
      })
      .where(eq(courses.id, id))
      .returning();
    return unpublishedCourse;
  }

  async archiveCourse(id: string): Promise<Course> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) {
      throw new Error("Course not found");
    }
    if (course.deletedAt) {
      throw new Error("Cannot archive a deleted course");
    }
    if (course.status === "archived") {
      throw new Error("Course is already archived");
    }

    const [archivedCourse] = await db
      .update(courses)
      .set({ 
        status: "archived", 
        isActive: false, 
        archivedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(courses.id, id))
      .returning();
    return archivedCourse;
  }

  async reactivateCourse(id: string): Promise<Course> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) {
      throw new Error("Course not found");
    }
    if (course.deletedAt) {
      throw new Error("Cannot reactivate a deleted course");
    }
    if (course.status !== "archived") {
      throw new Error("Can only reactivate archived courses");
    }

    const [reactivatedCourse] = await db
      .update(courses)
      .set({ 
        status: "unpublished", 
        isActive: false, 
        archivedAt: null,
        updatedAt: new Date() 
      })
      .where(eq(courses.id, id))
      .returning();
    return reactivatedCourse;
  }

  async getDeletedCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: and(eq(courses.instructorId, instructorId), isNotNull(courses.deletedAt)),
      with: {
        schedules: {
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
                course: true,
                schedule: true,
              },
            },
            waitlistEntries: {
              with: {
                student: true,
                schedule: true,
              },
            },
          },
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
        category: true,
      },
      orderBy: desc(courses.deletedAt),
    });
    return courseList;
  }

  async reorderCourses(updates: {id: string; sortOrder: number}[]): Promise<void> {
    // Perform batch update in a transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(courses)
          .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
          .where(eq(courses.id, update.id));
      }
    });
  }

  async getCourse(id: string): Promise<CourseWithSchedules | undefined> {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
      with: {
        schedules: {
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
                course: true,
                schedule: true,
              },
            },
            waitlistEntries: {
              with: {
                student: true,
                schedule: true,
              },
            },
          },
        },
        instructor: true,
        category: true,
      },
    });
    return course;
  }

  async getCourses(): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: and(
        eq(courses.isActive, true),
        isNull(courses.deletedAt)
      ),
      with: {
        schedules: {
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
                course: true,
                schedule: true,
              },
            },
            waitlistEntries: {
              with: {
                student: true,
                schedule: true,
              },
            },
          },
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
        category: true,
      },
      orderBy: [asc(courses.sortOrder), desc(courses.createdAt)],
    });
    return courseList;
  }

  async getCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: and(
        eq(courses.instructorId, instructorId), 
        isNull(courses.deletedAt)
      ),
      with: {
        schedules: {
          where: isNull(courseSchedules.deletedAt),
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
                course: true,
                schedule: true,
              },
            },
            waitlistEntries: {
              with: {
                student: true,
                schedule: true,
              },
            },
          },
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
        category: true,
      },
      orderBy: [asc(courses.sortOrder), desc(courses.createdAt)],
    });
    return courseList;
  }


  // Course schedule operations
  async createCourseSchedule(schedule: InsertCourseSchedule): Promise<CourseSchedule> {
    const [newSchedule] = await db
      .insert(courseSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async duplicateCourseSchedule(scheduleId: string): Promise<CourseSchedule> {
    const originalSchedule = await db.query.courseSchedules.findFirst({
      where: eq(courseSchedules.id, scheduleId),
    });

    if (!originalSchedule) {
      throw new Error("Schedule not found");
    }

    // Create a copy with a new ID and updated dates
    const [duplicatedSchedule] = await db.insert(courseSchedules).values({
      courseId: originalSchedule.courseId,
      startDate: originalSchedule.startDate,
      endDate: originalSchedule.endDate,
      startTime: originalSchedule.startTime,
      endTime: originalSchedule.endTime,
      location: originalSchedule.location,
      maxSpots: originalSchedule.maxSpots,
      availableSpots: originalSchedule.maxSpots, // Reset available spots
      isMultiDay: originalSchedule.isMultiDay,
      isRecurring: originalSchedule.isRecurring,
      recurrencePattern: originalSchedule.recurrencePattern,
      recurrenceInterval: originalSchedule.recurrenceInterval,
      recurrenceEndDate: originalSchedule.recurrenceEndDate,
      daysOfWeek: originalSchedule.daysOfWeek,
      registrationDeadline: originalSchedule.registrationDeadline,
      waitlistEnabled: originalSchedule.waitlistEnabled,
      autoConfirmRegistration: originalSchedule.autoConfirmRegistration,
      eventCategory: originalSchedule.eventCategory,
      notes: originalSchedule.notes,
      deletedAt: null,
    }).returning();

    return duplicatedSchedule;
  }

  async updateCourseSchedule(id: string, schedule: Partial<InsertCourseSchedule>): Promise<CourseSchedule> {
    const [updatedSchedule] = await db
      .update(courseSchedules)
      .set(schedule)
      .where(eq(courseSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async getCourseSchedule(id: string): Promise<CourseSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.id, id));
    return schedule;
  }

  async getCourseSchedules(courseId: string): Promise<CourseSchedule[]> {
    const schedules = await db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.courseId, courseId))
      .orderBy(asc(courseSchedules.startDate));
    return schedules;
  }

  async deleteCourseSchedule(id: string): Promise<CourseSchedule> {
    // Soft delete - set deletedAt timestamp
    const [deletedSchedule] = await db
      .update(courseSchedules)
      .set({ deletedAt: new Date() })
      .where(eq(courseSchedules.id, id))
      .returning();
    return deletedSchedule;
  }

  async permanentlyDeleteCourseSchedule(id: string): Promise<void> {
    // Hard delete - permanently remove from database
    await db
      .delete(courseSchedules)
      .where(eq(courseSchedules.id, id));
  }

  async getDeletedSchedulesByInstructor(instructorId: string): Promise<any[]> {
    const scheduleList = await db.query.courseSchedules.findMany({
      where: and(
        isNotNull(courseSchedules.deletedAt),
        eq(courseSchedules.courseId, 
          db.select({ id: courses.id })
            .from(courses)
            .where(eq(courses.instructorId, instructorId))
        )
      ),
      with: {
        course: true,
        enrollments: {
          with: {
            student: true,
          },
        },
        waitlistEntries: true,
      },
      orderBy: desc(courseSchedules.deletedAt),
    });
    return scheduleList.filter(schedule => schedule.course !== null);
  }

  // Enrollment operations
  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db
      .insert(enrollments)
      .values(enrollment)
      .returning();
    return newEnrollment;
  }

  async updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment> {
    const [updatedEnrollment] = await db
      .update(enrollments)
      .set({ ...enrollment, updatedAt: new Date() })
      .where(eq(enrollments.id, id))
      .returning();
    return updatedEnrollment;
  }

  async getEnrollment(id: string): Promise<EnrollmentWithDetails | undefined> {
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, id),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
    });
    return enrollment;
  }

  async getEnrollmentsByScheduleId(scheduleId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      where: eq(enrollments.scheduleId, scheduleId),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList;
  }

  async getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList;
  }

  async getEnrollmentsByInstructor(instructorId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList.filter(e => e.course && e.course.instructorId === instructorId);
  }

  async getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      where: eq(enrollments.courseId, courseId),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList;
  }

  // Course Enrollment Feedback operations
  async createOrUpdateEnrollmentFeedback(enrollmentId: string, feedback: Partial<InsertCourseEnrollmentFeedback>): Promise<CourseEnrollmentFeedback> {
    // Check if feedback already exists
    const existing = await db.query.courseEnrollmentFeedback.findFirst({
      where: eq(courseEnrollmentFeedback.enrollmentId, enrollmentId),
    });

    if (existing) {
      // Update existing feedback
      const [updated] = await db
        .update(courseEnrollmentFeedback)
        .set({ ...feedback, updatedAt: new Date() })
        .where(eq(courseEnrollmentFeedback.enrollmentId, enrollmentId))
        .returning();
      return updated;
    } else {
      // Create new feedback
      const [created] = await db
        .insert(courseEnrollmentFeedback)
        .values({ enrollmentId, ...feedback })
        .returning();
      return created;
    }
  }

  async getEnrollmentFeedback(enrollmentId: string): Promise<CourseEnrollmentFeedback | undefined> {
    const feedback = await db.query.courseEnrollmentFeedback.findFirst({
      where: eq(courseEnrollmentFeedback.enrollmentId, enrollmentId),
    });
    return feedback;
  }

  async updateInstructorFeedback(
    enrollmentId: string,
    instructorId: string,
    feedback: { positive?: string; opportunities?: string; actionPlan?: string }
  ): Promise<CourseEnrollmentFeedback> {
    const updateData: any = {
      instructorId,
      instructorFeedbackDate: new Date(),
      updatedAt: new Date(),
    };

    if (feedback.positive !== undefined) {
      updateData.instructorFeedbackPositive = feedback.positive;
    }
    if (feedback.opportunities !== undefined) {
      updateData.instructorFeedbackOpportunities = feedback.opportunities;
    }
    if (feedback.actionPlan !== undefined) {
      updateData.instructorFeedbackActionPlan = feedback.actionPlan;
    }

    return this.createOrUpdateEnrollmentFeedback(enrollmentId, updateData);
  }

  async updateStudentNotes(enrollmentId: string, notes: string): Promise<CourseEnrollmentFeedback> {
    return this.createOrUpdateEnrollmentFeedback(enrollmentId, {
      studentNotes: notes,
      studentNotesDate: new Date(),
    });
  }

  async getStudentsByInstructor(instructorId: string, restrictToInstructorCourses: boolean = false): Promise<{
    current: any[];
    former: any[];
    held: any[];
  }> {
    // For instructors/admins with global access, fetch all enrollments
    // For specific scoping needs (exports, etc.), use restrictToInstructorCourses=true
    let allEnrollments;
    
    if (restrictToInstructorCourses) {
      const courses = await this.getCoursesByInstructor(instructorId);
      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return { current: [], former: [], held: [] };
      }

      allEnrollments = await db.query.enrollments.findMany({
        where: inArray(enrollments.courseId, courseIds),
        with: {
          student: true,
          course: true,
          schedule: true,
        },
      });
    } else {
      // Fetch all enrollments system-wide for instructor/admin access
      allEnrollments = await db.query.enrollments.findMany({
        with: {
          student: true,
          course: true,
          schedule: true,
        },
      });
    }

    // Group enrollments by student
    const studentMap = new Map<string, {
      student: any;
      enrollments: Array<any>;
    }>();

    for (const enrollment of allEnrollments) {
      if (!enrollment.student) continue;

      const studentId = enrollment.student.id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: enrollment.student,
          enrollments: [],
        });
      }

      studentMap.get(studentId)!.enrollments.push({
        id: enrollment.id,
        courseId: enrollment.courseId,
        scheduleId: enrollment.scheduleId,
        courseTitle: enrollment.course.title,
        courseAbbreviation: enrollment.course.abbreviation,
        scheduleDate: enrollment.schedule.startDate,
        scheduleStartTime: enrollment.schedule.startTime,
        scheduleEndTime: enrollment.schedule.endTime,
        paymentStatus: enrollment.paymentStatus,
        status: enrollment.status,
      });
    }

    const now = new Date();
    // Get start of today to properly compare dates
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const current: Array<any> = [];
    const former: Array<any> = [];
    const held: Array<any> = [];

    for (const [_, data] of studentMap) {
      const { student, enrollments: studentEnrollments } = data;

      // Filter out cancelled enrollments for categorization
      const activeEnrollments = studentEnrollments.filter(e => e.status !== 'cancelled');

      // Check if student has any confirmed or pending current (future or today) enrollments
      const hasCurrentEnrollment = activeEnrollments.some(e => {
        if (!e.scheduleDate) return false;

        // Parse the schedule date string properly
        const scheduleDateStr = typeof e.scheduleDate === 'string' ? e.scheduleDate : e.scheduleDate.toISOString();
        const datePart = scheduleDateStr.split('T')[0]; // Get YYYY-MM-DD part
        const [year, month, day] = datePart.split('-').map(Number);

        // Create date at start of day in local timezone
        const scheduleStartOfDay = new Date(year, month - 1, day); // month is 0-indexed

        // Student is current if they have confirmed or pending enrollments for today or future
        const isFutureOrToday = scheduleStartOfDay >= startOfToday;
        const isActiveStatus = e.status === 'confirmed' || e.status === 'pending';

        console.log(`Checking enrollment ${e.id}: scheduleDate=${datePart}, startOfToday=${startOfToday.toISOString().split('T')[0]}, isFutureOrToday=${isFutureOrToday}, status=${e.status}, isActiveStatus=${isActiveStatus}`);

        return isFutureOrToday && isActiveStatus;
      });

      // Check if student is on hold - only for current/future enrollments
      const isOnHold = activeEnrollments.some(e => {
        if (e.status !== 'hold') return false;
        if (!e.scheduleDate) return false;

        // Parse the schedule date
        const scheduleDateStr = typeof e.scheduleDate === 'string' ? e.scheduleDate : e.scheduleDate.toISOString();
        const datePart = scheduleDateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const scheduleStartOfDay = new Date(year, month - 1, day);

        // Only consider as on hold if the hold enrollment is for today or future
        return scheduleStartOfDay >= startOfToday;
      });

      // Filter enrollments based on student category
      let filteredEnrollments = activeEnrollments;

      if (hasCurrentEnrollment) {
        // For current students, show all future/today enrollments (confirmed, pending, or hold)
        // This allows instructors to see if a current student also has any holds
        filteredEnrollments = activeEnrollments.filter(e => {
          if (!e.scheduleDate) return false;

          const scheduleDateStr = typeof e.scheduleDate === 'string' ? e.scheduleDate : e.scheduleDate.toISOString();
          const datePart = scheduleDateStr.split('T')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          const scheduleStartOfDay = new Date(year, month - 1, day);

          return scheduleStartOfDay >= startOfToday;
        });
      } else if (isOnHold) {
        // For held students (those with ONLY holds, no confirmed/pending), show only current/future hold enrollments
        filteredEnrollments = activeEnrollments.filter(e => {
          if (e.status !== 'hold') return false;
          if (!e.scheduleDate) return false;

          const scheduleDateStr = typeof e.scheduleDate === 'string' ? e.scheduleDate : e.scheduleDate.toISOString();
          const datePart = scheduleDateStr.split('T')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          const scheduleStartOfDay = new Date(year, month - 1, day);

          return scheduleStartOfDay >= startOfToday;
        });
      } else {
        // For former students, show only past enrollments (completed or past confirmed)
        filteredEnrollments = activeEnrollments.filter(e => {
          if (!e.scheduleDate) return false;

          const scheduleDateStr = typeof e.scheduleDate === 'string' ? e.scheduleDate : e.scheduleDate.toISOString();
          const datePart = scheduleDateStr.split('T')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          const scheduleStartOfDay = new Date(year, month - 1, day);

          return scheduleStartOfDay < startOfToday;
        });
      }

      const studentData = {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        concealedCarryLicenseExpiration: student.concealedCarryLicenseExpiration,
        enrollments: filteredEnrollments, // Only show category-relevant enrollments
      };

      console.log(`Student ${student.id} (${student.firstName} ${student.lastName}): isOnHold=${isOnHold}, hasCurrentEnrollment=${hasCurrentEnrollment}, activeEnrollments=${activeEnrollments.length}, filteredEnrollments=${filteredEnrollments.length}`);

      // Prioritize current enrollments over hold status
      // Students with confirmed/pending enrollments should be in "Current" even if they also have holds
      if (hasCurrentEnrollment) {
        console.log(`Adding ${student.firstName} ${student.lastName} to current students`);
        current.push(studentData);
      } else if (isOnHold) {
        // Only categorize as held if they have NO current confirmed/pending enrollments
        held.push(studentData);
      } else {
        // Former students - only include if they have any past enrollments
        if (filteredEnrollments.length > 0) {
          console.log(`Adding ${student.firstName} ${student.lastName} to former students`);
          former.push(studentData);
        }
      }
    }

    return { current, former, held };
  }

  async getStudentsBySchedule(scheduleId: string, instructorId: string): Promise<{
    current: any[];
    former: any[];
  }> {
    // Get enrollments for the specific schedule
    const scheduleEnrollments = await db
      .select({
        enrollment: enrollments,
        student: users,
        course: courses,
        schedule: courseSchedules,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(courseSchedules, eq(enrollments.scheduleId, courseSchedules.id))
      .where(
        and(
          eq(enrollments.scheduleId, scheduleId),
          eq(courses.instructorId, instructorId), // Ensure instructor owns the course
          isNotNull(enrollments.studentId), // Only enrolled students
          ne(enrollments.status, 'hold') // Exclude students on hold
        )
      );

    // Group students and their enrollments
    const studentMap = new Map();

    scheduleEnrollments.forEach(({ enrollment, student, course, schedule }) => {
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          ...student,
          enrollments: []
        });
      }

      studentMap.get(student.id).enrollments.push({
        ...enrollment,
        courseTitle: course.title,
        courseAbbreviation: course.abbreviation,
        scheduleDate: schedule.startDate,
        scheduleStartTime: schedule.startTime,
        scheduleEndTime: schedule.endTime,
        paymentStatus: enrollment.paymentStatus,
        status: enrollment.status,
        category: course.category
      });
    });

    const students = Array.from(studentMap.values());

    // For schedule-specific filtering, we consider all students as "current"
    // since they're all enrolled in the specific schedule
    return {
      current: students,
      former: [] // No former students for specific schedule exports
    };
  }

  async getScheduleEnrollmentCount(scheduleId: string): Promise<number> {
    // Count only confirmed enrollments that haven't been cancelled or moved
    const result = await db
      .select({
        count: sql<number>`CAST(COUNT(DISTINCT ${enrollments.studentId}) AS INTEGER)`
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.scheduleId, scheduleId),
          eq(enrollments.status, 'confirmed'),
          isNotNull(enrollments.studentId) // Only count enrollments with actual students
        )
      );

    const count = result[0]?.count || 0;
    console.log(`getScheduleEnrollmentCount for schedule ${scheduleId}: ${count} confirmed students`);
    return Number(count);
  }

  async getRosterExportData(instructorId: string, scheduleId?: string, courseId?: string, userRole?: string): Promise<{
    current: any[];
    former: any[];
    held: any[];
    summary: {
      totalCurrentStudents: number;
      totalFormerStudents: number;
      totalHeldStudents: number;
      totalCourses: number;
      exportDate: string;
    };
  }> {
    console.log(`getRosterExportData - Schedule filter: ${scheduleId || 'none'}, Course filter: ${courseId || 'none'}`);

    // Instructors, admins, and superadmins can see all courses
    const isInstructorOrHigher = ['instructor', 'admin', 'superadmin'].includes(userRole || '');
    
    let courseIds: string[];
    if (isInstructorOrHigher) {
      // Get all courses from all instructors
      const allCourses = await db.query.courses.findMany({
        where: isNull(courses.deletedAt),
        columns: { id: true }
      });
      courseIds = allCourses.map(c => c.id);
    } else {
      // Get only courses for this instructor
      const instructorCourses = await this.getCoursesByInstructor(instructorId);
      courseIds = instructorCourses.map(c => c.id);
    }

    if (courseIds.length === 0) {
      return {
        current: [],
        former: [],
        held: [],
        summary: {
          totalCurrentStudents: 0,
          totalFormerStudents: 0,
          totalHeldStudents: 0,
          totalCourses: 0,
          exportDate: new Date().toISOString()
        }
      };
    }

    // Build the where clause - MUST have a studentId to be a valid enrollment
    let whereClause: any = and(
      inArray(enrollments.courseId, courseIds),
      isNotNull(enrollments.studentId) // Exclude draft enrollments without students
    );

    if (scheduleId) {
      whereClause = and(whereClause, eq(enrollments.scheduleId, scheduleId));
    } else if (courseId) {
      whereClause = and(whereClause, eq(enrollments.courseId, courseId));
    }

    // Get all enrollments with full details - explicitly include student and course forms
    const allEnrollments = await db.query.enrollments.findMany({
      where: whereClause,
      with: {
        student: true, // This should load the student
        course: {
          with: {
            category: true,
            instructor: true,
            forms: {
              where: eq(courseInformationForms.isActive, true),
              with: {
                fields: true,
              }
            }
          }
        },
        schedule: true,
      },
    });

    console.log(`getRosterExportData - Total enrollments found: ${allEnrollments.length}`);
    console.log(`getRosterExportData - Instructor enrollments: ${allEnrollments.length}`);

    // Log enrollment details for debugging
    allEnrollments.forEach(e => {
      console.log(`Enrollment ${e.id}: status=${e.status}, studentId=${e.studentId}, hasStudent=${!!e.student}, hasSchedule=${!!e.schedule}, hasCourse=${!!e.course}`);
    });

    const now = new Date();

    // Categorize enrollments - include 'hold' status in held students
    const currentStudents = allEnrollments.filter(e => 
      e.status === 'confirmed' || e.status === 'pending'
    );

    const heldStudents = allEnrollments.filter(e =>
      e.status === 'hold' || (e.status === 'cancelled' && e.cancellationReason)
    );

    console.log(`getRosterExportData - Current students: ${currentStudents.length}`);
    console.log(`getRosterExportData - Held students: ${heldStudents.length}`);

    // Collect all form fields across all enrollments for consistent column structure
    const allFormFields = new Map<string, { formTitle: string; fieldLabel: string; sortOrder: number }>();
    
    console.log(`Collecting form fields from ${allEnrollments.length} enrollments...`);
    allEnrollments.forEach(enrollment => {
      console.log(`Enrollment ${enrollment.id}: hasCourse=${!!enrollment.course}, hasForms=${!!enrollment.course?.forms}, formsCount=${enrollment.course?.forms?.length || 0}`);
      if (enrollment.course?.forms) {
        enrollment.course.forms.forEach(form => {
          console.log(`  Form ${form.id} (${form.title}): hasFields=${!!form.fields}, fieldsCount=${form.fields?.length || 0}`);
          if (form.fields) {
            form.fields
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .forEach(field => {
                // Use field ID as key to ensure uniqueness
                if (!allFormFields.has(field.id)) {
                  allFormFields.set(field.id, {
                    formTitle: form.title,
                    fieldLabel: field.label,
                    sortOrder: field.sortOrder
                  });
                  console.log(`    Added field ${field.id}: ${field.label}`);
                }
              });
          }
        });
      }
    });
    
    console.log(`Total form fields collected: ${allFormFields.size}`);

    // Flatten the data for export - convert enrollments directly to roster format
    const flattenEnrollment = (enrollment: any, category: 'current' | 'former' | 'held') => {
      // Check if student data is available. If not, log an error and return null.
      if (!enrollment || !enrollment.student || !enrollment.student.id) {
        console.error("Invalid enrollment data for flattening: Missing student or student ID.", enrollment);
        return null;
      }
      // Also ensure course and schedule data are present for complete flattening
      if (!enrollment.course || !enrollment.schedule) {
        console.error("Invalid enrollment data for flattening: Missing course or schedule.", enrollment);
        return null;
      }

      // Parse form submission data
      let formResponses: Record<string, any> = {};
      if (enrollment.formSubmissionData) {
        try {
          formResponses = typeof enrollment.formSubmissionData === 'string' 
            ? JSON.parse(enrollment.formSubmissionData) 
            : enrollment.formSubmissionData;
        } catch (error) {
          console.error(`Failed to parse form submission data for enrollment ${enrollment.id}:`, error);
        }
      }

      // Build base student data
      const baseData = {
        studentId: enrollment.student.id,
        enrollmentId: enrollment.id,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        email: enrollment.student.email,
        phone: enrollment.student.phone || '',
        dateOfBirth: enrollment.student.dateOfBirth ? new Date(enrollment.student.dateOfBirth).toLocaleDateString() : '',
        licenseExpiration: enrollment.student.concealedCarryLicenseExpiration ? 
          new Date(enrollment.student.concealedCarryLicenseExpiration).toLocaleDateString() : '',
        courseTitle: enrollment.course.title,
        courseAbbreviation: enrollment.course.abbreviation || enrollment.course.title.split(' ').map(w => w[0]).join('').toUpperCase(),
        scheduleDate: enrollment.schedule.startDate ? new Date(enrollment.schedule.startDate).toLocaleDateString() : '',
        scheduleStartTime: enrollment.schedule.startTime,
        scheduleEndTime: enrollment.schedule.endTime,
        paymentStatus: enrollment.paymentStatus,
        enrollmentStatus: enrollment.status || 'confirmed',
        category: category,
        registrationDate: enrollment.createdAt ? 
          new Date(enrollment.createdAt).toLocaleDateString() : '',
        courseId: enrollment.course.id,
        location: enrollment.schedule.location || '',
        cancellationReason: enrollment.cancellationReason || ''
      };

      // Add form responses as individual fields
      const formResponseData: Record<string, string> = {};
      allFormFields.forEach((fieldInfo, fieldId) => {
        // Find the response for this field in the parsed form data
        formResponseData[fieldId] = formResponses[fieldId] || '';
      });

      return {
        ...baseData,
        formResponses: formResponseData
      };
    };

    const currentFlat = currentStudents.map(e => flattenEnrollment(e, 'current')).filter(Boolean);
    const heldFlat = heldStudents.map(e => flattenEnrollment(e, 'held')).filter(Boolean);

    // Former students are those with past course dates (only when not filtering by schedule)
    const formerFlat = scheduleId ? [] : allEnrollments.filter(e => {
      if (e.status === 'hold' || e.status === 'cancelled') return false; // Exclude held and cancelled students from former list
      return e.schedule && new Date(e.schedule.startDate) < now;
    }).map(e => flattenEnrollment(e, 'former')).filter(Boolean);

    const allCourses = new Set();
    [...currentFlat, ...formerFlat, ...heldFlat].forEach(row => {
      if (row && row.courseTitle) {
        allCourses.add(row.courseTitle);
      }
    });

    // Calculate summary statistics for the specific schedule or course
    const summary = {
      totalEnrolled: currentFlat.length, // Changed to currentFlat.length to reflect current students
      paidStudents: currentFlat.filter(s => s.paymentStatus === 'paid').length,
      pendingPayments: currentFlat.filter(s => s.paymentStatus === 'pending').length,
      totalRevenue: currentFlat
        .filter(s => s.paymentStatus === 'paid')
        .reduce((sum, s) => {
          // Extract revenue from the enrollment data - this may need adjustment based on your data structure
          // Assuming coursePrice is available in the flattened object, otherwise calculate it based on enrollment details.
          // For now, let's assume it's not directly available and use a placeholder or fetch it.
          // A more robust solution would involve passing the course price or calculating it based on enrollment details.
          // For this example, we'll return 0 and note that this needs proper implementation.
          console.warn("Total revenue calculation needs to be implemented based on actual price data.");
          return sum + 0; // Placeholder, needs proper calculation
        }, 0),
      courseTitle: courseId && !scheduleId ? 'All Schedules' : (currentFlat[0]?.courseTitle || 'Unknown Course'),
      scheduleDate: courseId && !scheduleId ? 'All Schedules' : (currentFlat[0]?.scheduleDate || 'Unknown Date'),
      scheduleTime: courseId && !scheduleId ? 'Various Times' : (currentFlat[0] ? `${currentFlat[0].scheduleStartTime} - ${currentFlat[0].scheduleEndTime}` : 'Unknown Time'),
      location: courseId && !scheduleId ? 'Various Locations' : (currentFlat[0]?.location || 'Unknown Location')
    };

    // Convert form fields map to array for export
    const formFieldsArray = Array.from(allFormFields.entries()).map(([fieldId, fieldInfo]) => ({
      fieldId,
      formTitle: fieldInfo.formTitle,
      fieldLabel: fieldInfo.fieldLabel,
      sortOrder: fieldInfo.sortOrder
    })).sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      current: currentFlat,
      former: formerFlat,
      held: heldFlat,
      formFields: formFieldsArray,
      summary: {
        totalCurrentStudents: currentStudents.length,
        totalFormerStudents: formerFlat.length,
        totalHeldStudents: heldStudents.length,
        totalCourses: allCourses.size,
        exportDate: new Date().toISOString()
      }
    };
  }

  async getInstructorAvailableSchedules(instructorId: string, excludeEnrollmentId?: string): Promise<any[]> {
    const now = new Date();
    // Get start of today to properly filter schedules (otherwise same-day future classes get excluded)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get the schedule ID to exclude if we have an enrollmentId
    let excludeScheduleId: string | undefined;

    if (excludeEnrollmentId) {
      // Get enrollment to determine which schedule to exclude
      const enrollment = await this.getEnrollment(excludeEnrollmentId);

      if (enrollment) {
        excludeScheduleId = enrollment.scheduleId;
      }
    }

    // Get all active course schedules for this instructor's courses that are in the future
    // Exclude only the specific schedule the student is currently enrolled in
    const whereConditions = [
      eq(courses.instructorId, instructorId),
      eq(courses.isActive, true),
      isNull(courses.deletedAt),
      isNull(courseSchedules.deletedAt),
      gte(courseSchedules.startDate, startOfToday), // Compare to start of today instead of current time
    ];

    // Exclude the current schedule if provided
    if (excludeScheduleId) {
      whereConditions.push(ne(courseSchedules.id, excludeScheduleId));
    }

    const availableSchedules = await db
      .select({
        id: courseSchedules.id,
        courseId: courseSchedules.courseId,
        courseTitle: courses.title,
        startDate: courseSchedules.startDate,
        endDate: courseSchedules.endDate,
        startTime: courseSchedules.startTime,
        endTime: courseSchedules.endTime,
        location: courseSchedules.location,
        maxSpots: courseSchedules.maxSpots,
        enrolledCount: sql<number>`CAST(COALESCE(COUNT(DISTINCT ${enrollments.id}), 0) AS INTEGER)`
      })
      .from(courseSchedules)
      .leftJoin(courses, eq(courseSchedules.courseId, courses.id))
      .leftJoin(enrollments, and(
        eq(enrollments.scheduleId, courseSchedules.id),
        eq(enrollments.status, 'confirmed')
      ))
      .where(and(...whereConditions))
      .groupBy(
        courseSchedules.id,
        courseSchedules.courseId,
        courses.title,
        courseSchedules.startDate,
        courseSchedules.endDate,
        courseSchedules.startTime,
        courseSchedules.endTime,
        courseSchedules.location,
        courseSchedules.maxSpots
      )
      .orderBy(courseSchedules.startDate, courseSchedules.startTime);

    console.log(`Found ${availableSchedules.length} available schedules for instructor ${instructorId}, excluding enrollment ${excludeEnrollmentId}`);

    // Calculate available spots and format response
    return availableSchedules.map(schedule => ({
      id: schedule.id,
      courseId: schedule.courseId,
      courseTitle: schedule.courseTitle,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location,
      maxSpots: schedule.maxSpots,
      availableSpots: Math.max(0, schedule.maxSpots - Number(schedule.enrolledCount))
    }));
  }

  async getAllAvailableSchedules(excludeStudentId?: string): Promise<any[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all schedules that the student is already enrolled in, so we can exclude them
    let excludeScheduleIds: string[] = [];

    if (excludeStudentId) {
      const studentEnrollments = await db.query.enrollments.findMany({
        where: and(
          eq(enrollments.studentId, excludeStudentId),
          eq(enrollments.status, 'confirmed')
        ),
        columns: {
          scheduleId: true,
        }
      });

      excludeScheduleIds = studentEnrollments.map(e => e.scheduleId);
    }

    // Get all active course schedules from any instructor that are in the future
    const whereConditions = [
      eq(courses.isActive, true),
      isNull(courses.deletedAt),
      isNull(courseSchedules.deletedAt),
      gte(courseSchedules.startDate, startOfToday),
    ];

    // Exclude schedules the student is already enrolled in
    if (excludeScheduleIds.length > 0) {
      whereConditions.push(notInArray(courseSchedules.id, excludeScheduleIds));
    }

    const availableSchedules = await db
      .select({
        id: courseSchedules.id,
        courseId: courseSchedules.courseId,
        courseTitle: courses.title,
        instructorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        startDate: courseSchedules.startDate,
        endDate: courseSchedules.endDate,
        startTime: courseSchedules.startTime,
        endTime: courseSchedules.endTime,
        location: courseSchedules.location,
        maxSpots: courseSchedules.maxSpots,
        enrolledCount: sql<number>`CAST(COALESCE(COUNT(DISTINCT ${enrollments.id}), 0) AS INTEGER)`
      })
      .from(courseSchedules)
      .leftJoin(courses, eq(courseSchedules.courseId, courses.id))
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(enrollments, and(
        eq(enrollments.scheduleId, courseSchedules.id),
        eq(enrollments.status, 'confirmed')
      ))
      .where(and(...whereConditions))
      .groupBy(
        courseSchedules.id,
        courseSchedules.courseId,
        courses.title,
        users.firstName,
        users.lastName,
        courseSchedules.startDate,
        courseSchedules.endDate,
        courseSchedules.startTime,
        courseSchedules.endTime,
        courseSchedules.location,
        courseSchedules.maxSpots
      )
      .orderBy(courseSchedules.startDate, courseSchedules.startTime);

    console.log(`Found ${availableSchedules.length} total available schedules (excluding student ${excludeStudentId})`);

    // Calculate available spots and filter out full schedules
    return availableSchedules
      .map(schedule => ({
        id: schedule.id,
        courseId: schedule.courseId,
        courseTitle: schedule.courseTitle,
        instructorName: schedule.instructorName,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        maxSpots: schedule.maxSpots,
        availableSpots: Math.max(0, schedule.maxSpots - Number(schedule.enrolledCount))
      }))
      .filter(schedule => schedule.availableSpots > 0);
  }

  // Course notification signup operations
  async createCourseNotificationSignup(signup: InsertCourseNotificationSignup): Promise<CourseNotificationSignup> {
    const [newSignup] = await db
      .insert(courseNotificationSignups)
      .values(signup)
      .returning();
    return newSignup;
  }

  async getCourseNotificationSignups(courseId: string): Promise<CourseNotificationSignupWithDetails[]> {
    const signups = await db.query.courseNotificationSignups.findMany({
      where: eq(courseNotificationSignups.courseId, courseId),
      with: {
        course: true,
        deliveryLogs: true,
      },
      orderBy: desc(courseNotificationSignups.createdAt),
    });
    return signups;
  }

  async getCourseNotificationSignupsBySchedule(scheduleId: string): Promise<CourseNotificationSignupWithDetails[]> {
    // Get the course ID from the schedule
    const schedule = await db.query.courseSchedules.findFirst({
      where: eq(courseSchedules.id, scheduleId),
    });

    if (!schedule) {
      return [];
    }

    // Get all signups for this course that haven't been notified about this schedule yet
    const signups = await db
      .select({
        id: courseNotificationSignups.id,
        courseId: courseNotificationSignups.courseId,
        firstName: courseNotificationSignups.firstName,
        lastName: courseNotificationSignups.lastName,
        email: courseNotificationSignups.email,
        phone: courseNotificationSignups.phone,
        preferredChannel: courseNotificationSignups.preferredChannel,
        createdAt: courseNotificationSignups.createdAt,
      })
      .from(courseNotificationSignups)
      .leftJoin(
        courseNotificationDeliveryLogs,
        and(
          eq(courseNotificationDeliveryLogs.signupId, courseNotificationSignups.id),
          eq(courseNotificationDeliveryLogs.scheduleId, scheduleId)
        )
      )
      .where(
        and(
          eq(courseNotificationSignups.courseId, schedule.courseId),
          isNull(courseNotificationDeliveryLogs.id) // Only get signups that haven't been notified for this schedule
        )
      );

    return signups as CourseNotificationSignupWithDetails[];
  }

  async deleteCourseNotificationSignup(id: string): Promise<void> {
    await db.delete(courseNotificationSignups).where(eq(courseNotificationSignups.id, id));
  }

  async logNotificationDelivery(log: InsertCourseNotificationDeliveryLog): Promise<CourseNotificationDeliveryLog> {
    const [newLog] = await db
      .insert(courseNotificationDeliveryLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getNotificationDeliveryLogs(signupId: string): Promise<CourseNotificationDeliveryLog[]> {
    return await db.query.courseNotificationDeliveryLogs.findMany({
      where: eq(courseNotificationDeliveryLogs.signupId, signupId),
      orderBy: desc(courseNotificationDeliveryLogs.sentAt),
    });
  }

  // Payment balance tracking
  async getPaymentBalance(enrollmentId: string): Promise<{
    remainingBalance: number;
    hasRemainingBalance: boolean;
    originalAmount: number;
    paidAmount: number;
  }> {
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        course: true,
      },
    });

    if (!enrollment || !enrollment.course) {
      throw new Error('Enrollment or course not found');
    }

    // Calculate original amount based on payment option
    const coursePrice = parseFloat(enrollment.course.price);
    let originalAmount = coursePrice;

    if (enrollment.paymentOption === 'deposit' && enrollment.course.depositAmount) {
      originalAmount = parseFloat(enrollment.course.depositAmount);
    }

    // Determine how much has been paid
    let paidAmount = 0;
    if (enrollment.paymentStatus === 'paid') {
      paidAmount = coursePrice;
    } else if (enrollment.paymentStatus === 'deposit') {
      paidAmount = originalAmount;
    }

    const remainingBalance = coursePrice - paidAmount;
    const hasRemainingBalance = remainingBalance > 0;

    return {
      remainingBalance,
      hasRemainingBalance,
      originalAmount,
      paidAmount,
    };
  }

  // Form completion status tracking
  async getFormCompletionStatus(enrollmentId: string): Promise<{
    totalForms: number;
    completedForms: number;
    isComplete: boolean;
    missingForms: { id: string; title: string; isRequired: boolean }[];
  }> {
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        course: {
          with: {
            forms: {
              where: eq(courseInformationForms.isActive, true),
            },
          },
        },
      },
    });

    if (!enrollment || !enrollment.course) {
      throw new Error('Enrollment or course not found');
    }

    const requiredForms = enrollment.course.forms.filter(f => f.isRequired);
    const totalForms = requiredForms.length;

    // Check if form has been submitted
    const completedForms = enrollment.formSubmittedAt ? totalForms : 0;
    const isComplete = completedForms === totalForms;

    const missingForms = isComplete ? [] : requiredForms.map(form => ({
      id: form.id,
      title: form.title,
      isRequired: form.isRequired,
    }));

    return {
      totalForms,
      completedForms,
      isComplete,
      missingForms,
    };
  }

  // Draft enrollment operations for single-page registration
  async initiateRegistration(data: {
    courseId: string;
    scheduleId: string;
    paymentOption: 'full' | 'deposit';
    studentId?: string | null; // Optional studentId for authenticated users
    studentInfo?: { firstName: string; lastName: string; email: string } | null; // Store for guest enrollments
  }): Promise<Enrollment> {
    const [draftEnrollment] = await db
      .insert(enrollments)
      .values({
        courseId: data.courseId,
        scheduleId: data.scheduleId,
        paymentOption: data.paymentOption,
        status: 'initiated',
        paymentStatus: 'pending',
        studentId: data.studentId || null, // Use provided studentId for authenticated users
        studentInfo: data.studentInfo || null, // Store studentInfo for guest enrollments
      })
      .returning();

    // Return enrollment with course and schedule data included
    const enrollmentWithDetails = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, draftEnrollment.id),
      with: {
        course: true,
        schedule: true,
      },
    });

    return enrollmentWithDetails || draftEnrollment;
  }

  async upsertPaymentIntent(enrollmentId: string, promoCode?: string, handgunRentalAdded?: boolean): Promise<{
    clientSecret: string;
    originalAmount: number;
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
    tax_included: boolean;
    promoCode?: string;
    handgunRentalFee?: number;
  }> {
    // Use the Stripe client from the Replit connector
    const { getStripeClient } = await import('./stripeClient');
    const stripe = await getStripeClient();

    // Get enrollment and course details
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        course: true,
        schedule: true,
      },
    });

    console.log('📋 Enrollment data:', {
      found: !!enrollment,
      courseFound: !!enrollment?.course,
      paymentOption: enrollment?.paymentOption,
      coursePrice: enrollment?.course?.price,
      depositAmount: enrollment?.course?.depositAmount,
      handgunRentalAdded
    });

    if (!enrollment || !enrollment.course) {
      throw new Error('Enrollment or course not found');
    }

    const course = enrollment.course;

    // Get handgun rental fee from course settings (with fallback to default)
    const courseHandgunRentalFee = course.handgunRentalEnabled && course.handgunRentalPrice 
      ? parseFloat(course.handgunRentalPrice) 
      : 25.00;

    // Calculate payment amount based on payment option
    let paymentAmount: number;
    const coursePrice = parseFloat(course.price);

    console.log('💰 Price calculations:', {
      rawCoursePrice: course.price,
      parsedCoursePrice: coursePrice,
      rawDepositAmount: course.depositAmount,
      parsedDepositAmount: course.depositAmount ? parseFloat(course.depositAmount) : null,
      paymentOption: enrollment.paymentOption
    });

    if (enrollment.paymentOption === 'deposit' && course.depositAmount) {
      paymentAmount = parseFloat(course.depositAmount);
    } else {
      paymentAmount = coursePrice;
    }

    // Add handgun rental fee if selected (use course-specific price)
    const handgunRentalFee = handgunRentalAdded && course.handgunRentalEnabled ? courseHandgunRentalFee : 0;
    paymentAmount += handgunRentalFee;

    // Update enrollment with handgun rental info
    if (handgunRentalAdded !== undefined) {
      await db
        .update(enrollments)
        .set({
          handgunRentalAdded: handgunRentalAdded || false,
          handgunRentalFee: handgunRentalAdded && course.handgunRentalEnabled ? courseHandgunRentalFee.toString() : null,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollmentId));
    }

    console.log('💵 Final payment amount:', paymentAmount, '(includes rental fee:', handgunRentalFee, ')');

    if (paymentAmount <= 0) {
      console.error('❌ Invalid payment amount:', paymentAmount);
      throw new Error('Invalid payment amount');
    }

    // Apply promo code discount if provided
    let discountAmount = 0;
    let finalPaymentAmount = paymentAmount;
    let promoCodeInfo = null;

    console.log('🎫 Promo code check:', {
      promoCode,
      type: typeof promoCode,
      length: promoCode?.length,
      trimmed: promoCode?.trim(),
      courseId: enrollment.courseId
    });

    if (promoCode && promoCode.trim()) {
      // For draft enrollments, we'll use a placeholder userId for promo validation
      // The actual user validation will happen during finalization
      try {
        console.log('🎫 Validating promo code:', promoCode.trim());
        const validation = await this.validatePromoCode(promoCode.trim(), 'draft-enrollment', enrollment.courseId, paymentAmount, 'course');
        console.log('🎫 Validation result:', validation);

        if (validation.isValid && validation.discountAmount !== undefined && validation.finalAmount !== undefined) {
          discountAmount = validation.discountAmount;
          finalPaymentAmount = validation.finalAmount;
          promoCodeInfo = {
            code: promoCode.trim(),
            discountAmount,
            type: validation.code?.type,
            value: validation.code?.value
          };
          console.log('✅ Promo code applied successfully:', promoCodeInfo);
        } else {
          console.error('❌ Promo code validation failed:', validation.error);
          throw new Error(validation.error || 'Invalid promo code');
        }
      } catch (error: any) {
        console.error('Promo code validation error:', error);
        throw new Error(error.message || 'Failed to validate promo code');
      }
    } else {
      console.log('⏭️ No promo code provided or empty, skipping validation');
    }

    // Handle free enrollments (100% discount) - no payment needed
    if (finalPaymentAmount <= 0) {
      console.log('💯 Free enrollment detected (100% discount) - skipping Stripe payment');

      // Update enrollment with promo code but no payment intent
      await db
        .update(enrollments)
        .set({
          promoCodeApplied: promoCode || null,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollmentId));

      return {
        clientSecret: null, // No payment needed
        originalAmount: paymentAmount,
        subtotal: 0,
        discountAmount,
        tax: 0,
        total: 0,
        tax_included: false,
        promoCode: promoCodeInfo?.code,
        handgunRentalFee: handgunRentalAdded && course.handgunRentalEnabled ? courseHandgunRentalFee : undefined,
        isFree: true, // Flag to indicate no payment is required
      };
    }

    // Calculate tax using Stripe Tax Calculation API
    let taxCalculation = null;
    let taxAmount = 0;
    let finalAmount = Math.round(finalPaymentAmount * 100);

    try {
      taxCalculation = await stripe.tax.calculations.create({
        currency: 'usd',
        line_items: [{
          amount: Math.round(finalPaymentAmount * 100),
          tax_code: 'txcd_10401000', // Online education services
          reference: `course-${enrollment.courseId}-${enrollment.paymentOption || 'full'}`,
        }],
        customer_details: {
          address: {
            country: 'US',
            state: 'NM',
            city: 'Albuquerque',
            postal_code: '87101',
          },
          address_source: 'billing',
        },
      });

      if (taxCalculation && taxCalculation.amount_total) {
        finalAmount = taxCalculation.amount_total;
        taxAmount = taxCalculation.tax_amount_exclusive || 0;
      }
    } catch (taxError: any) {
      console.error('Stripe Tax calculation failed:', taxError.message);
      // Continue without tax if calculation fails
    }

    // Build payment intent parameters - Direct payment to Practical Defense Training's Stripe account
    const paymentIntentParams: any = {
      amount: finalAmount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        enrollmentId,
        courseId: enrollment.courseId,
        scheduleId: enrollment.scheduleId,
        paymentOption: enrollment.paymentOption || 'full',
        tax_calculation_id: taxCalculation?.id || null,
        promo_code: promoCode || null,
        original_amount: paymentAmount.toString(),
        discount_amount: discountAmount.toString(),
        instructor_id: course.instructorId || null,
      },
    };

    // Create the Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Update enrollment with Stripe PaymentIntent ID and promo code
    await db
      .update(enrollments)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        promoCodeApplied: promoCode || null,
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, enrollmentId));

    return {
      clientSecret: paymentIntent.client_secret!,
      originalAmount: paymentAmount,
      subtotal: finalPaymentAmount,
      discountAmount,
      tax: taxAmount / 100,
      total: finalAmount / 100,
      tax_included: taxAmount > 0,
      promoCode: promoCodeInfo?.code,
      handgunRentalFee: handgunRentalAdded && course.handgunRentalEnabled ? courseHandgunRentalFee : undefined,
      isFree: false,
    };
  }

  async finalizeEnrollment(data: {
    enrollmentId: string;
    paymentIntentId: string;
    studentInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    accountCreation?: {
      password: string;
    };
  }): Promise<Enrollment> {
    // Get enrollment with related data first
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, data.enrollmentId),
      with: {
        course: true,
        schedule: true,
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'initiated') {
      throw new Error('Enrollment not in initiated state');
    }

    // Check if this is a free enrollment (100% discount)
    const isFreeEnrollment = data.paymentIntentId === 'free-enrollment';

    if (isFreeEnrollment) {
      // SECURITY: Server-side validation that enrollment actually qualifies as free
      if (!enrollment.promoCodeApplied) {
        throw new Error('Free enrollment claimed but no promo code applied');
      }

      // Re-validate the promo code to confirm it produces 100% discount
      const coursePrice = parseFloat(enrollment.course!.price);
      let verifyAmount = coursePrice;
      if (enrollment.paymentOption === 'deposit' && enrollment.course!.depositAmount) {
        const depositAmt = parseFloat(enrollment.course!.depositAmount);
        verifyAmount = depositAmt > 0 ? depositAmt : 50;
      }

      const promoValidation = await this.validatePromoCode(
        enrollment.promoCodeApplied,
        data.studentInfo.email,
        enrollment.courseId,
        verifyAmount,
        'course'
      );

      if (!promoValidation.isValid || promoValidation.finalAmount === undefined || promoValidation.finalAmount > 0) {
        throw new Error('Free enrollment claimed but promo code does not result in 100% discount');
      }
    } else {
      // Only verify payment with Stripe if it's NOT a free enrollment
      const { getStripeClient } = await import('./stripeClient');
      const stripe = await getStripeClient();

      // Verify payment with Stripe FIRST (critical security check)
      const paymentIntent = await stripe.paymentIntents.retrieve(data.paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not completed');
      }

      // Verify payment intent belongs to this enrollment
      if (paymentIntent.metadata.enrollmentId !== data.enrollmentId) {
        throw new Error('Payment verification failed - enrollment mismatch');
      }
    }

    // CRITICAL SECURITY FIX: Calculate expected payment amount server-side and validate
    if (!enrollment.course) {
      throw new Error('Course information not found');
    }

    // Calculate expected payment amount based on enrollment payment option
    let expectedAmount = 0;
    const coursePrice = parseFloat(enrollment.course.price);

    if (enrollment.paymentOption === 'full') {
      expectedAmount = coursePrice;
    } else if (enrollment.paymentOption === 'deposit') {
      const depositAmount = parseFloat(enrollment.course.depositAmount || '0');
      expectedAmount = depositAmount > 0 ? depositAmount : 50; // Default to $50 if not set
    }

    // Store promo code discount amount for redemption tracking
    let discountAmount = 0;
    if (enrollment.promoCodeApplied) {
      const validation = await this.validatePromoCode(
        enrollment.promoCodeApplied,
        data.studentInfo.email, // Using email for pre-user-creation validation; per-user limits tracked by email here
        enrollment.courseId,
        expectedAmount,
        'course'
      );
      if (validation.isValid) {
        discountAmount = validation.discountAmount || 0;
      }
    }

    // For paid enrollments, verify payment was already successful (checked earlier)
    // The payment intent amount was correctly calculated in upsertPaymentIntent
    // with Stripe Tax API, so we trust that amount rather than recalculating
    const subtotal = expectedAmount - discountAmount;

    // Hash password if provided (for new account creation)
    let passwordHash: string | undefined;
    if (data.accountCreation?.password) {
      const { hashPassword } = await import('./customAuth');
      passwordHash = await hashPassword(data.accountCreation.password);
    }

    // Create or find user by email
    let user = await this.getUserByEmail(data.studentInfo.email);

    if (!user) {
      // Create new user - auto-approve students on registration
      user = await this.upsertUser({
        email: data.studentInfo.email,
        firstName: data.studentInfo.firstName,
        lastName: data.studentInfo.lastName,
        passwordHash,
        role: 'student',
        userStatus: 'active',
      });
    } else if (passwordHash && !user.passwordHash) {
      // If user exists but has no password, update the password (account creation scenario)
      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      // Refresh user object to get the updated password hash
      user = (await this.getUser(user.id))!;
    }

    // WRAP ENTIRE PROCESS IN TRANSACTION FOR ATOMICITY
    const result = await db.transaction(async (tx) => {
      // Check schedule capacity and atomically decrement spots
      const schedule = enrollment.schedule;
      if (!schedule || schedule.availableSpots <= 0) {
        throw new Error('No available spots in this course schedule');
      }

      // Atomically decrement available spots to prevent race conditions
      const [updatedSchedule] = await tx
        .update(courseSchedules)
        .set({
          availableSpots: sql`${courseSchedules.availableSpots} - 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(courseSchedules.id, enrollment.scheduleId),
            sql`${courseSchedules.availableSpots} > 0`
          )
        )
        .returning();

      if (!updatedSchedule) {
        throw new Error('No available spots remaining for this course schedule');
      }

      // Finalize the enrollment with consistent field names
      const [finalizedEnrollment] = await tx
        .update(enrollments)
        .set({
          studentId: user.id,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentIntentId: data.paymentIntentId,
          stripePaymentIntentId: isFreeEnrollment ? null : data.paymentIntentId,
          confirmationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, data.enrollmentId))
        .returning();

      // Record promo code redemption if applicable
      if (enrollment.promoCodeApplied) {
        const promoCode = await this.getPromoCodeByCode(enrollment.promoCodeApplied);
        if (promoCode) {
          // Record redemption in the transaction
          await tx.insert(promoCodeRedemptions).values({
            promoCodeId: promoCode.id,
            userId: user.id,
            enrollmentId: data.enrollmentId,
            originalAmount: expectedAmount.toString(),
            discountAmount: discountAmount.toString(),
            finalAmount: (subtotal).toString(),
            paymentIntentId: data.paymentIntentId,
          });

          // Update promo code usage count atomically
          await tx
            .update(promoCodes)
            .set({
              currentUseCount: sql`${promoCodes.currentUseCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(promoCodes.id, promoCode.id));
        }
      }

      return finalizedEnrollment;
    });

    return result;
  }

  // Dashboard statistics
  async getInstructorDashboardStats(instructorId: string): Promise<{
    upcomingCourses: number;
    onlineStudents: number;
    allStudents: number;
    totalRevenue: number;
    outstandingRevenue: number;
    refundRequests: number;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all courses for the instructor
    const instructorCourses = await db.query.courses.findMany({
      where: and(
        eq(courses.instructorId, instructorId),
        isNull(courses.deletedAt)
      ),
      with: {
        schedules: {
          where: isNull(courseSchedules.deletedAt),
        },
        enrollments: true,
      },
    });

    // Count upcoming courses (schedules with future start dates)
    const upcomingCourses = instructorCourses.reduce((count, course) => {
      const upcomingSchedules = course.schedules.filter(
        schedule => schedule.startDate && new Date(schedule.startDate) >= startOfToday
      );
      return count + upcomingSchedules.length;
    }, 0);

    // Count online students (students enrolled in online New Mexico concealed carry course)
    const onlineCourse = instructorCourses.find(course => 
      course.title && 
      course.title.toLowerCase().includes('online') && 
      (course.title.toLowerCase().includes('concealed carry') || course.title.toLowerCase().includes('ccw')) &&
      course.title.toLowerCase().includes('new mexico')
    );

    const onlineEnrollments = onlineCourse 
      ? onlineCourse.enrollments.filter(e => 
          e.studentId !== null && 
          (e.status === 'confirmed' || e.status === 'pending')
        )
      : [];

    const uniqueOnlineStudentIds = new Set(
      onlineEnrollments.map(e => e.studentId)
    );
    const onlineStudents = uniqueOnlineStudentIds.size;

    // Get unique students across all enrollments
    const allEnrollments = instructorCourses.flatMap(course => course.enrollments);
    const uniqueStudentIds = new Set(
      allEnrollments
        .filter(e => e.studentId !== null)
        .map(e => e.studentId)
    );
    const allStudents = uniqueStudentIds.size;

    // Calculate revenue
    const paidEnrollments = allEnrollments.filter(e => e.paymentStatus === 'paid');
    const pendingEnrollments = allEnrollments.filter(e => e.paymentStatus === 'pending');

    const totalRevenue = paidEnrollments.reduce((sum, enrollment) => {
      const course = instructorCourses.find(c => c.id === enrollment.courseId);
      if (course) {
        return sum + parseFloat(course.price.toString());
      }
      return sum;
    }, 0);

    const outstandingRevenue = pendingEnrollments.reduce((sum, enrollment) => {
      const course = instructorCourses.find(c => c.id === enrollment.courseId);
      if (course) {
        return sum + parseFloat(course.price.toString());
      }
      return sum;
    }, 0);

    // Count refund requests
    const refundRequests = allEnrollments.filter(
      e => e.refundRequested && !e.refundProcessed
    ).length;

    // Count total appointments (confirmed, pending, and completed)
    const appointments = await db.query.instructorAppointments.findMany({
      where: and(
        eq(instructorAppointments.instructorId, instructorId),
        or(
          eq(instructorAppointments.status, 'confirmed'),
          eq(instructorAppointments.status, 'pending'),
          eq(instructorAppointments.status, 'completed')
        )
      ),
    });
    const totalAppointments = appointments.length;

    return {
      upcomingCourses,
      onlineStudents,
      allStudents,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      outstandingRevenue: Math.round(outstandingRevenue * 100) / 100,
      totalAppointments,
      refundRequests,
      totalAppointments,
    };
  }

  // App settings operations
  async getAppSettings(): Promise<AppSettings> {
    const settings = await db.select().from(appSettings).limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(appSettings).values({
        homeCoursesLimit: 20,
      }).returning();
      return newSettings;
    }

    return settings[0];
  }

  async updateAppSettings(input: InsertAppSettings): Promise<AppSettings> {
    const existingSettings = await db.select().from(appSettings).limit(1);

    if (existingSettings.length === 0) {
      // Create new settings if none exist
      const [newSettings] = await db.insert(appSettings).values({
        ...input,
      }).returning();
      return newSettings;
    }

    // Update existing settings
    const [updatedSettings] = await db.update(appSettings)
      .set({
        ...input,
        updatedAt: sql`now()`,
      })
      .where(eq(appSettings.id, existingSettings[0].id))
      .returning();

    return updatedSettings;
  }

  // Course Information Forms operations
  async createCourseInformationForm(form: InsertCourseInformationForm): Promise<CourseInformationForm> {
    // Validate mutual exclusivity
    if (!form.courseId && !form.appointmentTypeId) {
      throw new Error("Either courseId or appointmentTypeId must be provided");
    }
    if (form.courseId && form.appointmentTypeId) {
      throw new Error("Cannot specify both courseId and appointmentTypeId");
    }

    const [newForm] = await db.insert(courseInformationForms).values(form).returning();
    return newForm;
  }

  async updateCourseInformationForm(id: string, form: Partial<InsertCourseInformationForm>): Promise<CourseInformationForm> {
    // Validate mutual exclusivity if both IDs are provided in update
    if (form.courseId && form.appointmentTypeId) {
      throw new Error("Cannot specify both courseId and appointmentTypeId");
    }

    const [updatedForm] = await db
      .update(courseInformationForms)
      .set({
        ...form,
        updatedAt: sql`now()`,
      })
      .where(eq(courseInformationForms.id, id))
      .returning();
    return updatedForm;
  }

  async deleteCourseInformationForm(id: string): Promise<void> {
    await db.delete(courseInformationForms).where(eq(courseInformationForms.id, id));
  }

  async getCourseInformationForm(id: string): Promise<CourseInformationFormWithFields | undefined> {
    const form = await db.query.courseInformationForms.findFirst({
      where: eq(courseInformationForms.id, id),
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
        appointmentType: true,
      },
    });
    return form as CourseInformationFormWithFields | undefined;
  }

  async getCourseInformationForms(): Promise<CourseInformationFormWithFields[]> {
    const forms = await db.query.courseInformationForms.findMany({
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
        appointmentType: true,
      },
      orderBy: asc(courseInformationForms.sortOrder),
    });
    return forms as CourseInformationFormWithFields[];
  }

  async getCourseInformationFormsByCourse(courseId: string): Promise<CourseInformationFormWithFields[]> {
    const forms = await db.query.courseInformationForms.findMany({
      where: eq(courseInformationForms.courseId, courseId),
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
        appointmentType: true,
      },
      orderBy: asc(courseInformationForms.sortOrder),
    });
    return forms as CourseInformationFormWithFields[];
  }

  async getCourseInformationFormsByAppointmentType(appointmentTypeId: string): Promise<CourseInformationFormWithFields[]> {
    const forms = await db.query.courseInformationForms.findMany({
      where: eq(courseInformationForms.appointmentTypeId, appointmentTypeId),
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
        appointmentType: true,
      },
      orderBy: asc(courseInformationForms.sortOrder),
    });
    return forms as CourseInformationFormWithFields[];
  }

  // Course Information Form Fields operations
  async createCourseInformationFormField(field: InsertCourseInformationFormField): Promise<CourseInformationFormField> {
    const [newField] = await db.insert(courseInformationFormFields).values(field).returning();
    return newField;
  }

  async updateCourseInformationFormField(id: string, field: Partial<InsertCourseInformationFormField>): Promise<CourseInformationFormField> {
    const [updatedField] = await db
      .update(courseInformationFormFields)
      .set({
        ...field,
        updatedAt: sql`now()`,
      })
      .where(eq(courseInformationFormFields.id, id))
      .returning();
    return updatedField;
  }

  async deleteCourseInformationFormField(id: string): Promise<void> {
    await db.delete(courseInformationFormFields).where(eq(courseInformationFormFields.id, id));
  }

  async getCourseInformationFormFields(formId: string): Promise<CourseInformationFormField[]> {
    const fields = await db
      .select()
      .from(courseInformationFormFields)
      .where(eq(courseInformationFormFields.formId, formId))
      .orderBy(asc(courseInformationFormFields.sortOrder));
    return fields;
  }

  async reorderCourseInformationFormFields(updates: {id: string; sortOrder: number}[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(courseInformationFormFields)
        .set({ 
          sortOrder: update.sortOrder,
          updatedAt: sql`now()`,
        })
        .where(eq(courseInformationFormFields.id, update.id));
    }
  }

  // Student Form Response operations
  async createStudentFormResponse(response: InsertStudentFormResponse): Promise<StudentFormResponse> {
    const [newResponse] = await db.insert(studentFormResponses).values(response).returning();
    return newResponse;
  }

  async updateStudentFormResponse(id: string, response: Partial<InsertStudentFormResponse>): Promise<StudentFormResponse> {
    const [updatedResponse] = await db
      .update(studentFormResponses)
      .set(response)
      .where(eq(studentFormResponses.id, id))
      .returning();
    return updatedResponse;
  }

  async getStudentFormResponsesByEnrollment(enrollmentId: string): Promise<StudentFormResponse[]> {
    const responses = await db
      .select()
      .from(studentFormResponses)
      .where(eq(studentFormResponses.enrollmentId, enrollmentId));
    return responses;
  }

  async getStudentFormResponsesByForm(formId: string): Promise<StudentFormResponse[]> {
    const responses = await db
      .select()
      .from(studentFormResponses)
      .where(eq(studentFormResponses.formId, formId));
    return responses;
  }

  async getStudentFormResponsesWithDetails(enrollmentId: string): Promise<any[]> {
    const responses = await db.query.studentFormResponses.findMany({
      where: eq(studentFormResponses.enrollmentId, enrollmentId),
      with: {
        field: true,
        form: {
          with: {
            course: true,
          },
        },
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: true,
          },
        },
      },
      orderBy: asc(studentFormResponses.submittedAt),
    });
    return responses;
  }

  // Waitlist operations
  async joinWaitlist(data: { studentId: string; courseId: string; scheduleId: string; notes?: string }): Promise<WaitlistEntry> {
    // Get current max position for this schedule
    const maxPosition = await db
      .select({ maxPos: sql<number>`COALESCE(MAX(${waitlist.position}), 0)` })
      .from(waitlist)
      .where(eq(waitlist.scheduleId, data.scheduleId));
    
    const position = (maxPosition[0]?.maxPos || 0) + 1;
    
    const [entry] = await db
      .insert(waitlist)
      .values({
        studentId: data.studentId,
        courseId: data.courseId,
        scheduleId: data.scheduleId,
        notes: data.notes,
        position,
        status: 'waiting',
      })
      .returning();
    
    return entry;
  }

  async getWaitlistEntry(waitlistId: string): Promise<WaitlistWithUser | undefined> {
    const entry = await db.query.waitlist.findFirst({
      where: eq(waitlist.id, waitlistId),
      with: {
        student: true,
        schedule: true,
      },
    });
    return entry as WaitlistWithUser | undefined;
  }

  async getWaitlistBySchedule(scheduleId: string): Promise<WaitlistWithUser[]> {
    const entries = await db.query.waitlist.findMany({
      where: eq(waitlist.scheduleId, scheduleId),
      with: {
        student: true,
        schedule: true,
      },
      orderBy: asc(waitlist.position),
    });
    return entries as WaitlistWithUser[];
  }

  async getWaitlistByStudent(studentId: string): Promise<WaitlistWithUser[]> {
    const entries = await db.query.waitlist.findMany({
      where: eq(waitlist.studentId, studentId),
      with: {
        student: true,
        schedule: true,
      },
      orderBy: desc(waitlist.createdAt),
    });
    return entries as WaitlistWithUser[];
  }

  async getStudentWaitlistEntries(studentId: string): Promise<any[]> {
    const entries = await db.query.waitlist.findMany({
      where: eq(waitlist.studentId, studentId),
      with: {
        student: true,
        schedule: {
          with: {
            enrollments: {
              where: (enrollments, { or, eq }) => or(
                eq(enrollments.status, 'confirmed'),
                eq(enrollments.status, 'pending')
              ),
            },
          },
        },
        course: true,
      },
      orderBy: desc(waitlist.createdAt),
    });

    return entries.map(entry => ({
      ...entry,
      schedule: entry.schedule ? {
        ...entry.schedule,
        enrollmentCount: entry.schedule.enrollments?.length || 0,
        availableSpots: Math.max(0, entry.schedule.maxSpots - (entry.schedule.enrollments?.length || 0)),
      } : null,
    }));
  }

  async inviteFromWaitlist(waitlistId: string): Promise<WaitlistEntry> {
    const [entry] = await db
      .update(waitlist)
      .set({
        status: 'invited',
        invitedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(waitlist.id, waitlistId))
      .returning();
    
    return entry;
  }

  async removeFromWaitlist(waitlistId: string): Promise<void> {
    await db
      .update(waitlist)
      .set({
        status: 'removed',
        removedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(waitlist.id, waitlistId));
  }

  async updateWaitlistStatus(waitlistId: string, status: WaitlistStatus): Promise<WaitlistEntry> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (status === 'invited') {
      updateData.invitedAt = new Date();
    } else if (status === 'enrolled') {
      updateData.enrolledAt = new Date();
    } else if (status === 'removed') {
      updateData.removedAt = new Date();
    }
    
    const [entry] = await db
      .update(waitlist)
      .set(updateData)
      .where(eq(waitlist.id, waitlistId))
      .returning();
    
    return entry;
  }

  // Promo code operations
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const payload: any = {
      ...promoCode,
      value: String(promoCode.value), // Force string conversion for database
      // Convert decimal fields to strings for database
      minCartSubtotal: promoCode.minCartSubtotal != null ? String(promoCode.minCartSubtotal) : null,
      // Convert date strings to Date objects for database
      startDate: promoCode.startDate ? new Date(promoCode.startDate) : null,
      endDate: promoCode.endDate ? new Date(promoCode.endDate) : null,
    };
    const [newPromoCode] = await db
      .insert(promoCodes)
      .values(payload)
      .returning();
    return newPromoCode;
  }

  async updatePromoCode(id: string, promoCodeData: Partial<InsertPromoCode>): Promise<PromoCode> {
    const updateData: any = { 
      ...promoCodeData, 
      ...(promoCodeData.value !== undefined ? { value: String(promoCodeData.value) } : {}),
      updatedAt: new Date() 
    };
    
    // Convert date strings to Date objects for database
    if (promoCodeData.startDate !== undefined) {
      updateData.startDate = promoCodeData.startDate ? new Date(promoCodeData.startDate) : null;
    }
    if (promoCodeData.endDate !== undefined) {
      updateData.endDate = promoCodeData.endDate ? new Date(promoCodeData.endDate) : null;
    }

    const [updatedPromoCode] = await db
      .update(promoCodes)
      .set(updateData)
      .where(eq(promoCodes.id, id))
      .returning();
    if (!updatedPromoCode) {
      throw new Error('Promo code not found');
    }
    return updatedPromoCode;
  }

  async deletePromoCode(id: string): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async getPromoCode(id: string): Promise<PromoCodeWithDetails | undefined> {
    const promoCode = await db.query.promoCodes.findFirst({
      where: eq(promoCodes.id, id),
      with: {
        creator: true,
        updater: true,
        redemptions: {
          with: {
            user: true,
            promoCode: true,
            enrollment: {
              with: {
                course: true,
                schedule: true,
                student: true,
              },
            },
          },
          orderBy: desc(promoCodeRedemptions.createdAt),
        },
      },
    });

    if (!promoCode) return undefined;

    return {
      ...promoCode,
      updater: promoCode.updater || undefined,
      redemptions: promoCode.redemptions.map(r => ({
        ...r,
        enrollment: r.enrollment || undefined,
      })),
      redemptionCount: promoCode.redemptions.length,
    };
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    if (!code || !code.trim()) {
      return undefined;
    }

    // Get all promo codes and filter in memory for case-insensitive match
    const allPromoCodes = await db
      .select()
      .from(promoCodes);

    const trimmedCode = code.trim().toUpperCase();
    const matchingCode = allPromoCodes.find(
      pc => pc.code.trim().toUpperCase() === trimmedCode
    );

    return matchingCode;
  }

  async getPromoCodes(): Promise<PromoCodeWithDetails[]> {
    const promoCodeList = await db.query.promoCodes.findMany({
      with: {
        creator: true,
        updater: true,
        redemptions: {
          with: {
            user: true,
            promoCode: true,
            enrollment: {
              with: {
                course: true,
                schedule: true,
                student: true,
              },
            },
          },
        },
      },
      orderBy: desc(promoCodes.createdAt),
    });

    return promoCodeList.map(promoCode => ({
      ...promoCode,
      updater: promoCode.updater || undefined,
      redemptions: promoCode.redemptions.map(r => ({
        ...r,
        enrollment: r.enrollment || undefined,
      })),
      redemptionCount: promoCode.redemptions.length,
    }));
  }

  async getPromoCodesByCreator(createdBy: string): Promise<PromoCodeWithDetails[]> {
    const promoCodeList = await db.query.promoCodes.findMany({
      where: eq(promoCodes.createdBy, createdBy),
      with: {
        creator: true,
        updater: true,
        redemptions: {
          with: {
            user: true,
            promoCode: true,
            enrollment: {
              with: {
                course: true,
                schedule: true,
                student: true,
              },
            },
          },
        },
      },
      orderBy: desc(promoCodes.createdAt),
    });

    return promoCodeList.map(promoCode => ({
      ...promoCode,
      updater: promoCode.updater || undefined,
      redemptions: promoCode.redemptions.map(r => ({
        ...r,
        enrollment: r.enrollment || undefined,
      })),
      redemptionCount: promoCode.redemptions.length,
    }));
  }

  // Promo code validation and redemption
  async validatePromoCode(code: string, userId: string, courseId: string | null, amount: number, context: 'course' | 'appointment' = 'course'): Promise<PromoCodeValidationResult> {
    const promoCode = await this.getPromoCodeByCode(code.trim().toUpperCase());

    if (!promoCode) {
      return { isValid: false, error: 'Promo code not found', errorCode: 'NOT_FOUND' };
    }

    // Check if promo code is active
    if (promoCode.status !== 'ACTIVE') {
      return {
        isValid: false,
        error: 'Promo code is not active',
        errorCode: 'EXPIRED',
      };
    }

    // Check date validity
    const now = new Date();
    if (promoCode.startDate && new Date(promoCode.startDate) > now) {
      return {
        isValid: false,
        error: 'Promo code is not yet valid',
        errorCode: 'TIME_RESTRICTION',
      };
    }

    if (promoCode.endDate && new Date(promoCode.endDate) < now) {
      return {
        isValid: false,
        error: 'Promo code has expired',
        errorCode: 'EXPIRED',
      };
    }

    // Check time of day restrictions
    if (promoCode.validTimeStart && promoCode.validTimeEnd) {
      const currentTime = now.toTimeString().slice(0, 8);
      if (currentTime < promoCode.validTimeStart || currentTime > promoCode.validTimeEnd) {
        return {
          isValid: false,
          error: 'Promo code is not valid at this time',
          errorCode: 'TIME_RESTRICTION',
        };
      }
    }

    // Check day of week restrictions
    if (promoCode.validDaysOfWeek) {
      const currentDay = now.getDay().toString(); // 0=Sunday, 1=Monday, etc.
      const validDays = promoCode.validDaysOfWeek.split(',');
      if (!validDays.includes(currentDay)) {
        return {
          isValid: false,
          error: 'Promo code is not valid on this day',
          errorCode: 'TIME_RESTRICTION',
        };
      }
    }

    // Check total usage limit
    if (promoCode.maxTotalUses && promoCode.currentUseCount >= promoCode.maxTotalUses) {
      return {
        isValid: false,
        error: 'Promo code usage limit reached',
        errorCode: 'USAGE_LIMIT_REACHED',
      };
    }

    // Check minimum cart amount
    if (promoCode.minCartSubtotal && amount < parseFloat(promoCode.minCartSubtotal)) {
      return {
        isValid: false,
        error: `Minimum order amount of $${promoCode.minCartSubtotal} required`,
        errorCode: 'MIN_AMOUNT_NOT_MET',
      };
    }

    // Scope validation based on context
    if (context === 'appointment') {
      // For appointments, only GLOBAL and APPOINTMENTS scopes are valid
      if (promoCode.scopeType !== 'GLOBAL' && promoCode.scopeType !== 'APPOINTMENTS') {
        return {
          isValid: false,
          error: 'This promo code is not valid for appointments',
          errorCode: 'SCOPE_MISMATCH',
        };
      }
    } else if (context === 'course') {
      // For courses, check GLOBAL, COURSES, and CATEGORIES scopes
      if (promoCode.scopeType === 'APPOINTMENTS') {
        return {
          isValid: false,
          error: 'This promo code is only valid for appointments',
          errorCode: 'SCOPE_MISMATCH',
        };
      }

      // Check course scope
      if (promoCode.scopeType === 'COURSES' && promoCode.scopeCourseIds && courseId) {
        if (!promoCode.scopeCourseIds.includes(courseId)) {
          return {
            isValid: false,
            error: 'This promo code is not valid for this course',
            errorCode: 'SCOPE_MISMATCH',
          };
        }
      }

      // Check category scope
      if (promoCode.scopeType === 'CATEGORIES' && promoCode.scopeCategoryIds && courseId) {
        const course = await this.getCourse(courseId);
        if (!course || !course.categoryId || !promoCode.scopeCategoryIds.includes(course.categoryId)) {
          return {
            isValid: false,
            error: 'This promo code is not valid for this course category',
            errorCode: 'SCOPE_MISMATCH',
          };
        }
      }

      // Check exclusions
      if (promoCode.exclusionCourseIds && courseId && promoCode.exclusionCourseIds.includes(courseId)) {
        return {
          isValid: false,
          error: 'This course is excluded from this promo code',
          errorCode: 'SCOPE_MISMATCH',
        };
      }
    }

    // Check user eligibility (skip for draft enrollments)
    if (userId !== 'draft-enrollment') {
      if (promoCode.allowedUserIds && promoCode.allowedUserIds.length > 0) {
        if (!promoCode.allowedUserIds.includes(userId)) {
          return { isValid: false, error: 'This promo code is not available to you', errorCode: 'NOT_ELIGIBLE' };
        }
      }

      if (promoCode.deniedUserIds && promoCode.deniedUserIds.includes(userId)) {
        return { isValid: false, error: 'This promo code is not available to you', errorCode: 'NOT_ELIGIBLE' };
      }

      // Check if user has already used this code (if maxUsesPerUser is set)
      if (promoCode.maxUsesPerUser) {
        const userRedemptions = await db
          .select()
          .from(promoCodeRedemptions)
          .where(
            and(
              eq(promoCodeRedemptions.promoCodeId, promoCode.id),
              eq(promoCodeRedemptions.userId, userId)
            )
          );

        if (userRedemptions.length >= promoCode.maxUsesPerUser) {
          return { isValid: false, error: 'You have already used this promo code', errorCode: 'USER_LIMIT_REACHED' };
        }
      }
    }

    // Check first purchase eligibility
    if (promoCode.firstPurchaseOnly && userId !== 'draft-enrollment') {
      const userEnrollments = await this.getEnrollmentsByStudent(userId);
      const paidEnrollments = userEnrollments.filter(e => e.paymentStatus === 'paid');
      if (paidEnrollments.length > 0) {
        return {
          isValid: false,
          error: 'This promo code is only valid for first-time purchases',
          errorCode: 'NOT_ELIGIBLE',
        };
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promoCode.type === 'PERCENT') {
      discountAmount = amount * (parseFloat(promoCode.value) / 100);
    } else if (promoCode.type === 'FIXED_AMOUNT') {
      discountAmount = Math.min(parseFloat(promoCode.value), amount);
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    return {
      isValid: true,
      code: promoCode,
      discountAmount,
      finalAmount,
    };
  }

  async redeemPromoCode(redemption: InsertPromoCodeRedemption): Promise<PromoCodeRedemption> {
    const [newRedemption] = await db
      .insert(promoCodeRedemptions)
      .values(redemption)
      .returning();

    // Update the promo code usage count
    await this.updatePromoCodeUsageCount(redemption.promoCodeId, 1);

    return newRedemption;
  }

  async getPromoCodeRedemptions(promoCodeId: string): Promise<PromoCodeRedemption[]> {
    const redemptions = await db
      .select()
      .from(promoCodeRedemptions)
      .where(eq(promoCodeRedemptions.promoCodeId, promoCodeId))
      .orderBy(desc(promoCodeRedemptions.createdAt));
    return redemptions;
  }

  async getPromoCodeRedemptionsByUser(userId: string): Promise<PromoCodeRedemption[]> {
    const redemptions = await db
      .select()
      .from(promoCodeRedemptions)
      .where(eq(promoCodeRedemptions.userId, userId))
      .orderBy(desc(promoCodeRedemptions.createdAt));
    return redemptions;
  }

  async getPromoCodeRedemptionByEnrollment(enrollmentId: string): Promise<PromoCodeRedemption | undefined> {
    const redemption = await db.query.promoCodeRedemptions.findFirst({
      where: eq(promoCodeRedemptions.enrollmentId, enrollmentId),
    });
    return redemption || undefined;
  }

  // Promo code utility methods
  async generatePromoCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate a random 8-character alphanumeric code
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      attempts++;

      // Check if code already exists
      const existingCode = await this.getPromoCodeByCode(code);
      if (!existingCode) {
        return code;
      }
    } while (attempts < maxAttempts);

    // If we can't generate a unique code, add timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `${code.substring(0, 4)}${timestamp}`;
  }

  async updatePromoCodeUsageCount(promoCodeId: string, increment: number): Promise<void> {
    await db
      .update(promoCodes)
      .set({
        currentUseCount: sql`${promoCodes.currentUseCount} + ${increment}`,
        updatedAt: new Date(),
      })
      .where(eq(promoCodes.id, promoCodeId));
  }

  // Notification Template operations
  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [newTemplate] = await db
      .insert(notificationTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate> {
    const [updatedTemplate] = await db
      .update(notificationTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(notificationTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteNotificationTemplate(id: string): Promise<void> {
    await db
      .delete(notificationTemplates)
      .where(eq(notificationTemplates.id, id));
  }

  async getNotificationTemplate(id: string): Promise<NotificationTemplateWithDetails | undefined> {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .leftJoin(users, eq(notificationTemplates.createdBy, users.id))
      .leftJoin(courses, eq(notificationTemplates.courseId, courses.id))
      .leftJoin(courseSchedules, eq(notificationTemplates.scheduleId, courseSchedules.id))
      .where(eq(notificationTemplates.id, id));

    if (!template) return undefined;

    return {
      ...template.notification_templates,
      creator: template.users!,
      course: template.courses || undefined,
      schedule: template.course_schedules || undefined,
      schedules: [], // Will be populated if needed
    };
  }

  async getNotificationTemplates(courseId?: string): Promise<NotificationTemplateWithDetails[]> {
    const conditions = [eq(notificationTemplates.isActive, true)];

    if (courseId) {
      conditions.push(eq(notificationTemplates.courseId, courseId));
    }

    const templates = await db
      .select()
      .from(notificationTemplates)
      .leftJoin(users, eq(notificationTemplates.createdBy, users.id))
      .leftJoin(courses, eq(notificationTemplates.courseId, courses.id))
      .leftJoin(courseSchedules, eq(notificationTemplates.scheduleId, courseSchedules.id))
      .where(and(...conditions))
      .orderBy(asc(notificationTemplates.sortOrder), asc(notificationTemplates.name));

    return templates.map(template => ({
      ...template.notification_templates,
      creator: template.users!,
      course: template.courses || undefined,
      schedule: template.course_schedules || undefined,
      schedules: [], // Will be populated if needed
    }));
  }

  async getNotificationTemplatesByCategory(category: string): Promise<NotificationTemplateWithDetails[]> {
    const templates = await db
      .select()
      .from(notificationTemplates)
      .leftJoin(users, eq(notificationTemplates.createdBy, users.id))
      .leftJoin(courses, eq(notificationTemplates.courseId, courses.id))
      .leftJoin(courseSchedules, eq(notificationTemplates.scheduleId, courseSchedules.id))
      .where(and(
        eq(notificationTemplates.category, category),
        eq(notificationTemplates.isActive, true)
      ))
      .orderBy(asc(notificationTemplates.sortOrder), asc(notificationTemplates.name));

    return templates.map(template => ({
      ...template.notification_templates,
      creator: template.users!,
      course: template.courses || undefined,
      schedule: template.course_schedules || undefined,
      schedules: [], // Will be populated if needed
    }));
  }

  async reorderNotificationTemplates(updates: {id: string; sortOrder: number}[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(notificationTemplates)
          .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
          .where(eq(notificationTemplates.id, update.id));
      }
    });
  }

  // Notification Schedule operations
  async createNotificationSchedule(schedule: InsertNotificationSchedule): Promise<NotificationSchedule> {
    const [newSchedule] = await db
      .insert(notificationSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateNotificationSchedule(id: string, schedule: Partial<InsertNotificationSchedule>): Promise<NotificationSchedule> {
    const [updatedSchedule] = await db
      .update(notificationSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(notificationSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteNotificationSchedule(id: string): Promise<void> {
    await db
      .delete(notificationSchedules)
      .where(eq(notificationSchedules.id, id));
  }

  async getNotificationSchedule(id: string): Promise<NotificationScheduleWithDetails | undefined> {
    const [schedule] = await db
      .select()
      .from(notificationSchedules)
      .leftJoin(notificationTemplates, eq(notificationSchedules.templateId, notificationTemplates.id))
      .leftJoin(courses, eq(notificationSchedules.courseId, courses.id))
      .leftJoin(courseSchedules, eq(notificationSchedules.scheduleId, courseSchedules.id))
      .where(eq(notificationSchedules.id, id));

    if (!schedule) return undefined;

    return {
      ...schedule.notification_schedules,
      template: schedule.notification_templates!,
      course: schedule.courses || undefined,
      schedule: schedule.course_schedules || undefined,
    };
  }

  async getNotificationSchedules(courseId?: string, scheduleId?: string): Promise<NotificationScheduleWithDetails[]> {
    const conditions = [eq(notificationSchedules.isActive, true)];

    if (courseId) {
      conditions.push(eq(notificationSchedules.courseId, courseId));
    }
    if (scheduleId) {
      conditions.push(eq(notificationSchedules.scheduleId, scheduleId));
    }

    const schedules = await db
      .select()
      .from(notificationSchedules)
      .leftJoin(notificationTemplates, eq(notificationSchedules.templateId, notificationTemplates.id))
      .leftJoin(courses, eq(notificationSchedules.courseId, courses.id))
      .leftJoin(courseSchedules, eq(notificationSchedules.scheduleId, courseSchedules.id))
      .where(and(...conditions))
      .orderBy(asc(notificationTemplates.name));

    return schedules.map(schedule => ({
      ...schedule.notification_schedules,
      template: schedule.notification_templates!,
      course: schedule.courses || undefined,
      schedule: schedule.course_schedules || undefined,
    }));
  }

  async getActiveNotificationSchedulesByEvent(event: string): Promise<NotificationScheduleWithDetails[]> {
    const schedules = await db
      .select()
      .from(notificationSchedules)
      .leftJoin(notificationTemplates, eq(notificationSchedules.templateId, notificationTemplates.id))
      .leftJoin(courses, eq(notificationSchedules.courseId, courses.id))
      .leftJoin(courseSchedules, eq(notificationSchedules.scheduleId, courseSchedules.id))
      .where(and(
        eq(notificationSchedules.triggerEvent, event),
        eq(notificationSchedules.isActive, true)
      ));

    return schedules.map(schedule => ({
      ...schedule.notification_schedules,
      template: schedule.notification_templates!,
      course: schedule.courses || undefined,
      schedule: schedule.course_schedules || undefined,
    }));
  }

  // Notification Log operations
  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [newLog] = await db
      .insert(notificationLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async updateNotificationLog(id: string, log: Partial<InsertNotificationLog>): Promise<NotificationLog> {
    const [updatedLog] = await db
      .update(notificationLogs)
      .set(log)
      .where(eq(notificationLogs.id, id))
      .returning();
    return updatedLog;
  }

  async getNotificationLog(id: string): Promise<NotificationLogWithDetails | undefined> {
    const [log] = await db
      .select()
      .from(notificationLogs)
      .leftJoin(notificationTemplates, eq(notificationLogs.templateId, notificationTemplates.id))
      .leftJoin(notificationSchedules, eq(notificationLogs.scheduleId, notificationSchedules.id))
      .leftJoin(users, eq(notificationLogs.recipientId, users.id))
      .leftJoin(enrollments, eq(notificationLogs.enrollmentId, enrollments.id))
      .leftJoin(courses, eq(notificationLogs.courseId, courses.id))
      .where(eq(notificationLogs.id, id));

    if (!log) return undefined;

    return {
      ...log.notification_logs,
      template: log.notification_templates!,
      schedule: log.notification_schedules || undefined,
      recipient: log.users!,
      enrollment: log.enrollments || undefined,
      course: log.courses || undefined,
    };
  }

  async getNotificationLogs(filters: {
    recipientId?: string;
    templateId?: string;
    courseId?: string;
    status?: string;
    type?: string;
    recipientEmail?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: NotificationLogWithDetails[]; total: number }> {
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(notificationLogs)
      .leftJoin(users, eq(notificationLogs.recipientId, users.id));

    let dataQuery = db
      .select()
      .from(notificationLogs)
      .leftJoin(notificationTemplates, eq(notificationLogs.templateId, notificationTemplates.id))
      .leftJoin(notificationSchedules, eq(notificationLogs.scheduleId, notificationSchedules.id))
      .leftJoin(users, eq(notificationLogs.recipientId, users.id))
      .leftJoin(enrollments, eq(notificationLogs.enrollmentId, enrollments.id))
      .leftJoin(courses, eq(notificationLogs.courseId, courses.id));

    const conditions = [];
    if (filters.recipientId) conditions.push(eq(notificationLogs.recipientId, filters.recipientId));
    if (filters.templateId) conditions.push(eq(notificationLogs.templateId, filters.templateId));
    if (filters.courseId) conditions.push(eq(notificationLogs.courseId, filters.courseId));
    if (filters.status) conditions.push(eq(notificationLogs.status, filters.status));
    if (filters.type) conditions.push(eq(notificationLogs.type, filters.type));
    if (filters.recipientEmail) conditions.push(eq(users.email, filters.recipientEmail));

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(notificationLogs)
      .leftJoin(users, eq(notificationLogs.recipientId, users.id));

    dataQuery = db
      .select()
      .from(notificationLogs)
      .leftJoin(notificationTemplates, eq(notificationLogs.templateId, notificationTemplates.id))
      .leftJoin(notificationSchedules, eq(notificationLogs.scheduleId, notificationSchedules.id))
      .leftJoin(users, eq(notificationLogs.recipientId, users.id))
      .leftJoin(enrollments, eq(notificationLogs.enrollmentId, enrollments.id))
      .leftJoin(courses, eq(notificationLogs.courseId, courses.id));

    if (whereCondition) {
      countQuery = countQuery.where(whereCondition);
      dataQuery = dataQuery.where(whereCondition);
    }

    // Apply pagination to dataQuery
    dataQuery = dataQuery
      .orderBy(desc(notificationLogs.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    // Get total count and data
    const [countResult, logs] = await Promise.all([
      countQuery.execute(),
      dataQuery.execute()
    ]);

    const total = countResult[0]?.count || 0;

    return {
      logs: logs.map(log => ({
        ...log.notification_logs,
        template: log.notification_templates!,
        schedule: log.notification_schedules || undefined,
        recipient: log.users!,
        enrollment: log.enrollments || undefined,
        course: log.courses || undefined,
      })),
      total
    };
  }

  async getNotificationLogsByEnrollment(enrollmentId: string): Promise<NotificationLogWithDetails[]> {
    const logs = await db
      .select()
      .from(notificationLogs)
      .leftJoin(notificationTemplates, eq(notificationLogs.templateId, notificationTemplates.id))
      .leftJoin(notificationSchedules, eq(notificationLogs.scheduleId, notificationSchedules.id))
      .leftJoin(users, eq(notificationLogs.recipientId, users.id))
      .leftJoin(enrollments, eq(notificationLogs.enrollmentId, enrollments.id))
      .leftJoin(courses, eq(notificationLogs.courseId, courses.id))
      .where(eq(notificationLogs.enrollmentId, enrollmentId))
      .orderBy(desc(notificationLogs.createdAt));

    return logs.map(log => ({
      ...log.notification_logs,
      template: log.notification_templates!,
      schedule: log.notification_schedules || undefined,
      recipient: log.users!,
      enrollment: log.enrollments || undefined,
      course: log.courses || undefined,
    }));
  }

  // Waiver Template operations
  async createWaiverTemplate(template: InsertWaiverTemplate): Promise<WaiverTemplate> {
    const [created] = await db.insert(waiverTemplates).values(template).returning();
    return created;
  }

  async updateWaiverTemplate(id: string, template: Partial<InsertWaiverTemplate>): Promise<WaiverTemplate> {
    const [updated] = await db
      .update(waiverTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(waiverTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteWaiverTemplate(id: string): Promise<void> {
    await db.delete(waiverTemplates).where(eq(waiverTemplates.id, id));
  }

  async getWaiverTemplate(id: string): Promise<WaiverTemplateWithDetails | undefined> {
    const [template] = await db.query.waiverTemplates.findMany({
      where: eq(waiverTemplates.id, id),
      with: {
        creator: true,
        updater: true,
        instances: true,
      },
    });

    if (!template) return undefined;

    // Calculate computed fields
    const instanceCount = template.instances.length;
    const signedCount = template.instances.filter(instance => instance.status === 'signed').length;

    return {
      ...template,
      updater: template.updater || undefined,
      instanceCount,
      signedCount,
    };
  }

  async getWaiverTemplates(filters?: { scope?: string; courseId?: string; isActive?: boolean }): Promise<WaiverTemplateWithDetails[]> {
    const conditions = [];

    if (filters?.scope) {
      conditions.push(eq(waiverTemplates.scope, filters.scope));
    }
    if (filters?.courseId) {
      // Use array contains operator for courseIds array
      conditions.push(sql`${waiverTemplates.courseIds} @> ARRAY[${filters.courseId}]`);
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(waiverTemplates.isActive, filters.isActive));
    }

    const templates = await db.query.waiverTemplates.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        creator: true,
        updater: true,
        instances: true,
      },
      orderBy: [asc(waiverTemplates.name)],
    });

    // Add computed fields to each template
    return templates.map(template => {
      const instanceCount = template.instances.length;
      const signedCount = template.instances.filter(instance => instance.status === 'signed').length;

      return {
        ...template,
        updater: template.updater || undefined,
        instanceCount,
        signedCount,
      };
    });
  }

  async getWaiverTemplatesByCourse(courseId: string): Promise<WaiverTemplateWithDetails[]> {
    return await this.getWaiverTemplates({ courseId, isActive: true });
  }

  // Waiver Instance operations
  async createWaiverInstance(instance: InsertWaiverInstance): Promise<WaiverInstance> {
    const [created] = await db.insert(waiverInstances).values(instance).returning();
    return created;
  }

  async updateWaiverInstance(id: string, instance: Partial<InsertWaiverInstance>): Promise<WaiverInstance> {
    const [updated] = await db
      .update(waiverInstances)
      .set({ ...instance, updatedAt: new Date() })
      .where(eq(waiverInstances.id, id))
      .returning();
    return updated;
  }

  async signWaiverInstance(instanceId: string, signatureData: {
    signerName: string;
    signatureData: string;
    signatureMethod: 'typed' | 'canvas';
    consentCheckboxes: Array<{ sectionId: string; initial: string; timestamp: string }>;
    acknowledgementsCompleted: boolean;
    metadata?: Record<string, any>;
  }): Promise<WaiverInstance> {
    const now = new Date();
    
    // Get the waiver instance with enrollment to get student email
    const instance = await this.getWaiverInstance(instanceId);
    if (!instance) {
      throw new Error(`Waiver instance ${instanceId} not found`);
    }
    
    const studentEmail = instance.enrollment?.student?.email || signatureData.metadata?.email || 'unknown@example.com';
    
    // Update the waiver instance status to signed
    const [updatedInstance] = await db
      .update(waiverInstances)
      .set({ 
        status: 'signed',
        signedAt: now,
        updatedAt: now,
      })
      .where(eq(waiverInstances.id, instanceId))
      .returning();
    
    // Create a waiver signature record
    await db.insert(waiverSignatures).values({
      instanceId,
      signerName: signatureData.signerName,
      signerEmail: studentEmail,
      signerRole: 'student',
      signatureData: signatureData.signatureData,
      signatureMethod: signatureData.signatureMethod,
      ipAddress: signatureData.metadata?.ipAddress || 'unknown',
      userAgent: signatureData.metadata?.browserUserAgent || 'unknown',
      consentCheckboxes: signatureData.consentCheckboxes,
      acknowledgementsCompleted: signatureData.acknowledgementsCompleted,
      timestamp: now,
    });
    
    return updatedInstance;
  }

  async getWaiverInstance(id: string): Promise<WaiverInstanceWithDetails | undefined> {
    const [instance] = await db.query.waiverInstances.findMany({
      where: eq(waiverInstances.id, id),
      with: {
        template: true,
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: {
              with: {
                course: true,
              },
            },
          },
        },
        signatures: true,
      },
    });
    return instance;
  }

  async getWaiverInstancesByEnrollment(enrollmentId: string): Promise<WaiverInstanceWithDetails[]> {
    return await db.query.waiverInstances.findMany({
      where: eq(waiverInstances.enrollmentId, enrollmentId),
      with: {
        template: true,
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: {
              with: {
                course: true,
              },
            },
          },
        },
        signatures: true,
      },
      orderBy: [desc(waiverInstances.createdAt)],
    });
  }

  async getWaiverInstancesByTemplate(templateId: string): Promise<WaiverInstanceWithDetails[]> {
    return await db.query.waiverInstances.findMany({
      where: eq(waiverInstances.templateId, templateId),
      with: {
        template: true,
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: {
              with: {
                course: true,
              },
            },
          },
        },
        signatures: true,
      },
      orderBy: [desc(waiverInstances.createdAt)],
    });
  }

  async getWaiverInstancesByStatus(status: string): Promise<WaiverInstanceWithDetails[]> {
    return await db.query.waiverInstances.findMany({
      where: eq(waiverInstances.status, status),
      with: {
        template: true,
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: {
              with: {
                course: true,
              },
            },
          },
        },
        signatures: true,
      },
      orderBy: [desc(waiverInstances.createdAt)],
    });
  }

  // Waiver Signature operations
  async createWaiverSignature(signature: InsertWaiverSignature): Promise<WaiverSignature> {
    const [created] = await db.insert(waiverSignatures).values(signature).returning();
    return created;
  }

  async getWaiverSignature(id: string): Promise<WaiverSignature | undefined> {
    const [signature] = await db.select().from(waiverSignatures).where(eq(waiverSignatures.id, id));
    return signature;
  }

  async getWaiverSignaturesByInstance(instanceId: string): Promise<WaiverSignature[]> {
    return await db.select().from(waiverSignatures).where(eq(waiverSignatures.instanceId, instanceId));
  }

  // Waiver utility methods
  async generateWaiverContent(templateId: string, enrollmentId: string): Promise<{ content: string; mergedData: any }> {
    const template = await this.getWaiverTemplate(templateId);
    if (!template) {
      throw new Error('Waiver template not found');
    }

    const enrollment = await this.getEnrollment(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Merge template variables with enrollment data
    const mergedData = {
      studentName: enrollment.student ? `${enrollment.student.firstName} ${enrollment.student.lastName}` : 'N/A',
      studentEmail: enrollment.student?.email || 'N/A',
      studentPhone: enrollment.student?.phone || 'N/A',
      courseName: enrollment.course?.title || 'N/A',
      courseDate: enrollment.schedule.startDate,
      instructorName: 'N/A', // TODO: Fetch instructor details using instructorId
      currentDate: new Date().toLocaleDateString(),
    };

    // Simple template variable replacement
    let content = template.content;
    for (const [key, value] of Object.entries(mergedData)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { content, mergedData };
  }

  async checkWaiverRequirements(enrollmentId: string): Promise<{
    required: WaiverInstanceWithDetails[];
    signed: WaiverInstanceWithDetails[];
    pending: WaiverInstanceWithDetails[];
    expired: WaiverInstanceWithDetails[];
  }> {
    const instances = await this.getWaiverInstancesByEnrollment(enrollmentId);

    const required = instances; // All instances are considered required
    const signed = instances.filter(i => i.status === 'signed');
    const pending = instances.filter(i => i.status === 'pending');

    // Check for expired waivers (if expiresAt exists and is past)
    const now = new Date();
    const expired = instances.filter(i => 
      i.expiresAt && new Date(i.expiresAt) < now
    );

    return { required, signed, pending, expired };
  }

  async getWaiverComplianceReport(courseId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalWaivers: number;
    signedWaivers: number;
    pendingWaivers: number;
    expiredWaivers: number;
    complianceRate: number;
  }> {
    const conditions = [];

    if (courseId) {
      // Filter by course through enrollment relationship
      const courseEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollments.courseId, courseId),
        columns: { id: true },
      });
      const enrollmentIds = courseEnrollments.map(e => e.id);

      if (enrollmentIds.length === 0) {
        return { totalWaivers: 0, signedWaivers: 0, pendingWaivers: 0, expiredWaivers: 0, complianceRate: 0 };
      }
    }

    if (startDate) {
      conditions.push(sql`${waiverInstances.createdAt} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${waiverInstances.createdAt} <= ${endDate}`);
    }

    const allInstances = await db.query.waiverInstances.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        template: true,
      },
    });

    const totalWaivers = allInstances.length;
    const signedWaivers = allInstances.filter(i => i.status === 'signed').length;
    const pendingWaivers = allInstances.filter(i => i.status === 'pending').length;

    const now = new Date();
    const expiredWaivers = allInstances.filter(i => 
      i.expiresAt && new Date(i.expiresAt) < now
    ).length;

    const complianceRate = totalWaivers > 0 ? (signedWaivers / totalWaivers) * 100 : 0;

    return {
      totalWaivers,
      signedWaivers,
      pendingWaivers,
      expiredWaivers,
      complianceRate,
    };
  }

  // Content filtering and compliance operations
  async batchInsertProhibitedWords(words: InsertProhibitedWord[]): Promise<void> {
    if (words.length === 0) return;
    await db.insert(prohibitedWords).values(words);
  }

  async getActiveProhibitedWords(): Promise<ProhibitedWord[]> {
    return await db
      .select()
      .from(prohibitedWords)
      .where(eq(prohibitedWords.isActive, true))
      .orderBy(asc(prohibitedWords.category), asc(prohibitedWords.word));
  }

  async insertProhibitedWord(word: InsertProhibitedWord): Promise<ProhibitedWord> {
    const [row] = await db.insert(prohibitedWords).values(word).returning();
    return row;
  }

  async insertMessageAuditLog(log: InsertMessageAuditLog): Promise<MessageAuditLog> {
    const [row] = await db.insert(messageAuditLog).values(log).returning();
    return row;
  }

  async getMessageComplianceReport(dateFrom: Date, dateTo: Date): Promise<{
    totalAttempts: number;
    blockedAttempts: number;
    sentMessages: number;
    topViolations: Array<{ word: string; count: number; category: string }>;
    instructorStats: Array<{ instructorId: string; attempts: number; blocked: number }>;
  }> {
    // Get all audit logs in date range
    const logs = await db
      .select()
      .from(messageAuditLog)
      .where(
        and(
          sql`${messageAuditLog.attemptedAt} >= ${dateFrom}`,
          sql`${messageAuditLog.attemptedAt} <= ${dateTo}`
        )
      );

    const totalAttempts = logs.length;
    const blockedAttempts = logs.filter(log => log.status === 'blocked').length;
    const sentMessages = logs.filter(log => log.status === 'sent').length;

    // Calculate top violations - flatten prohibited words arrays and count frequency
    const violationCounts = new Map<string, { count: number; category: string }>();
    logs.forEach(log => {
      if (log.prohibitedWords && Array.isArray(log.prohibitedWords)) {
        log.prohibitedWords.forEach(word => {
          const current = violationCounts.get(word) || { count: 0, category: 'unknown' };
          violationCounts.set(word, { count: current.count + 1, category: current.category });
        });
      }
    });

    const topViolations = Array.from(violationCounts.entries())
      .map(([word, data]) => ({ word, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate instructor statistics
    const instructorCounts = new Map<string, { attempts: number; blocked: number }>();
    logs.forEach(log => {
      const current = instructorCounts.get(log.instructorId) || { attempts: 0, blocked: 0 };
      instructorCounts.set(log.instructorId, {
        attempts: current.attempts + 1,
        blocked: current.blocked + (log.status === 'blocked' ? 1 : 0)
      });
    });

    const instructorStats = Array.from(instructorCounts.entries())
      .map(([instructorId, data]) => ({ instructorId, attempts: data.attempts, blocked: data.blocked }))
      .sort((a, b) => b.blocked - a.blocked);

    return {
      totalAttempts,
      blockedAttempts,
      sentMessages,
      topViolations,
      instructorStats
    };
  }

  // Roster and scheduling operations
  async getInstructorAvailableSchedules(instructorId: string, excludeEnrollmentId?: string): Promise<any[]> {
    const now = new Date();
    // Get start of today to properly filter schedules (otherwise same-day future classes get excluded)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get the schedule ID to exclude if we have an enrollmentId
    let excludeScheduleId: string | undefined;

    if (excludeEnrollmentId) {
      // Get enrollment to determine which schedule to exclude
      const enrollment = await this.getEnrollment(excludeEnrollmentId);

      if (enrollment) {
        excludeScheduleId = enrollment.scheduleId;
      }
    }

    // Get all active course schedules for this instructor's courses that are in the future
    // Exclude only the specific schedule the student is currently enrolled in
    const whereConditions = [
      eq(courses.instructorId, instructorId),
      eq(courses.isActive, true),
      isNull(courses.deletedAt),
      isNull(courseSchedules.deletedAt),
      gte(courseSchedules.startDate, startOfToday), // Compare to start of today instead of current time
    ];

    // Exclude the current schedule if provided
    if (excludeScheduleId) {
      whereConditions.push(ne(courseSchedules.id, excludeScheduleId));
    }

    const availableSchedules = await db
      .select({
        id: courseSchedules.id,
        courseId: courseSchedules.courseId,
        courseTitle: courses.title,
        startDate: courseSchedules.startDate,
        endDate: courseSchedules.endDate,
        startTime: courseSchedules.startTime,
        endTime: courseSchedules.endTime,
        location: courseSchedules.location,
        maxSpots: courseSchedules.maxSpots,
        enrolledCount: sql<number>`CAST(COALESCE(COUNT(DISTINCT ${enrollments.id}), 0) AS INTEGER)`
      })
      .from(courseSchedules)
      .leftJoin(courses, eq(courseSchedules.courseId, courses.id))
      .leftJoin(enrollments, and(
        eq(enrollments.scheduleId, courseSchedules.id),
        eq(enrollments.status, 'confirmed')
      ))
      .where(and(...whereConditions))
      .groupBy(
        courseSchedules.id,
        courseSchedules.courseId,
        courses.title,
        courseSchedules.startDate,
        courseSchedules.endDate,
        courseSchedules.startTime,
        courseSchedules.endTime,
        courseSchedules.location,
        courseSchedules.maxSpots
      )
      .orderBy(courseSchedules.startDate, courseSchedules.startTime);

    console.log(`Found ${availableSchedules.length} available schedules for instructor ${instructorId}, excluding enrollment ${excludeEnrollmentId}`);

    // Calculate available spots and format response
    return availableSchedules.map(schedule => ({
      id: schedule.id,
      courseId: schedule.courseId,
      courseTitle: schedule.courseTitle,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location,
      maxSpots: schedule.maxSpots,
      availableSpots: Math.max(0, schedule.maxSpots - Number(schedule.enrolledCount))
    }));
  }

  async getAllAvailableSchedules(excludeStudentId?: string): Promise<any[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all schedules that the student is already enrolled in, so we can exclude them
    let excludeScheduleIds: string[] = [];

    if (excludeStudentId) {
      const studentEnrollments = await db.query.enrollments.findMany({
        where: and(
          eq(enrollments.studentId, excludeStudentId),
          eq(enrollments.status, 'confirmed')
        ),
        columns: {
          scheduleId: true,
        }
      });

      excludeScheduleIds = studentEnrollments.map(e => e.scheduleId);
    }

    // Get all active course schedules from any instructor that are in the future
    const whereConditions = [
      eq(courses.isActive, true),
      isNull(courses.deletedAt),
      isNull(courseSchedules.deletedAt),
      gte(courseSchedules.startDate, startOfToday),
    ];

    // Exclude schedules the student is already enrolled in
    if (excludeScheduleIds.length > 0) {
      whereConditions.push(notInArray(courseSchedules.id, excludeScheduleIds));
    }

    const availableSchedules = await db
      .select({
        id: courseSchedules.id,
        courseId: courseSchedules.courseId,
        courseTitle: courses.title,
        instructorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        startDate: courseSchedules.startDate,
        endDate: courseSchedules.endDate,
        startTime: courseSchedules.startTime,
        endTime: courseSchedules.endTime,
        location: courseSchedules.location,
        maxSpots: courseSchedules.maxSpots,
        enrolledCount: sql<number>`CAST(COALESCE(COUNT(DISTINCT ${enrollments.id}), 0) AS INTEGER)`
      })
      .from(courseSchedules)
      .leftJoin(courses, eq(courseSchedules.courseId, courses.id))
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(enrollments, and(
        eq(enrollments.scheduleId, courseSchedules.id),
        eq(enrollments.status, 'confirmed')
      ))
      .where(and(...whereConditions))
      .groupBy(
        courseSchedules.id,
        courseSchedules.courseId,
        courses.title,
        users.firstName,
        users.lastName,
        courseSchedules.startDate,
        courseSchedules.endDate,
        courseSchedules.startTime,
        courseSchedules.endTime,
        courseSchedules.location,
        courseSchedules.maxSpots
      )
      .orderBy(courseSchedules.startDate, courseSchedules.startTime);

    console.log(`Found ${availableSchedules.length} total available schedules (excluding student ${excludeStudentId})`);

    // Calculate available spots and filter out full schedules
    return availableSchedules
      .map(schedule => ({
        id: schedule.id,
        courseId: schedule.courseId,
        courseTitle: schedule.courseTitle,
        instructorName: schedule.instructorName,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location,
        maxSpots: schedule.maxSpots,
        availableSpots: Math.max(0, schedule.maxSpots - Number(schedule.enrolledCount))
      }))
      .filter(schedule => schedule.availableSpots > 0);
  }

  // Course notification signup operations
  async createCourseNotificationSignup(signup: InsertCourseNotificationSignup): Promise<CourseNotificationSignup> {
    const [newSignup] = await db
      .insert(courseNotificationSignups)
      .values(signup)
      .returning();
    return newSignup;
  }

  async getCourseNotificationSignups(courseId: string): Promise<CourseNotificationSignupWithDetails[]> {
    const signups = await db.query.courseNotificationSignups.findMany({
      where: eq(courseNotificationSignups.courseId, courseId),
      with: {
        course: true,
        deliveryLogs: true,
      },
      orderBy: desc(courseNotificationSignups.createdAt),
    });
    return signups;
  }

  async getCourseNotificationSignupsBySchedule(scheduleId: string): Promise<CourseNotificationSignupWithDetails[]> {
    // Get the course ID from the schedule
    const schedule = await db.query.courseSchedules.findFirst({
      where: eq(courseSchedules.id, scheduleId),
    });

    if (!schedule) {
      return [];
    }

    // Get all signups for this course that haven't been notified about this schedule yet
    const signups = await db
      .select({
        id: courseNotificationSignups.id,
        courseId: courseNotificationSignups.courseId,
        firstName: courseNotificationSignups.firstName,
        lastName: courseNotificationSignups.lastName,
        email: courseNotificationSignups.email,
        phone: courseNotificationSignups.phone,
        preferredChannel: courseNotificationSignups.preferredChannel,
        createdAt: courseNotificationSignups.createdAt,
      })
      .from(courseNotificationSignups)
      .leftJoin(
        courseNotificationDeliveryLogs,
        and(
          eq(courseNotificationDeliveryLogs.signupId, courseNotificationSignups.id),
          eq(courseNotificationDeliveryLogs.scheduleId, scheduleId)
        )
      )
      .where(
        and(
          eq(courseNotificationSignups.courseId, schedule.courseId),
          isNull(courseNotificationDeliveryLogs.id) // Only get signups that haven't been notified for this schedule
        )
      );

    return signups as CourseNotificationSignupWithDetails[];
  }

  async deleteCourseNotificationSignup(id: string): Promise<void> {
    await db.delete(courseNotificationSignups).where(eq(courseNotificationSignups.id, id));
  }

  async logNotificationDelivery(log: InsertCourseNotificationDeliveryLog): Promise<CourseNotificationDeliveryLog> {
    const [newLog] = await db
      .insert(courseNotificationDeliveryLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getNotificationDeliveryLogs(signupId: string): Promise<CourseNotificationDeliveryLog[]> {
    return await db.query.courseNotificationDeliveryLogs.findMany({
      where: eq(courseNotificationDeliveryLogs.signupId, signupId),
      orderBy: desc(courseNotificationDeliveryLogs.sentAt),
    });
  }

  // Communications tracking operations
  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db
      .insert(communications)
      .values(communication)
      .returning();
    return newCommunication;
  }

  async updateCommunication(id: string, communication: Partial<InsertCommunication>): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ ...communication, updatedAt: new Date() })
      .where(eq(communications.id, id))
      .returning();

    if (!updatedCommunication) {
      throw new Error('Communication not found');
    }

    return updatedCommunication;
  }

  async getCommunication(id: string): Promise<CommunicationWithDetails | undefined> {
    const communication = await db.query.communications.findFirst({
      where: eq(communications.id, id),
      with: {
        user: true,
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: true,
          },
        },
        course: true,
      },
    });
    return communication;
  }

  async getCommunications(filters: {
    userId?: string;
    courseId?: string;
    enrollmentId?: string;
    type?: 'email' | 'sms';
    direction?: 'inbound' | 'outbound';
    isRead?: boolean;
    isFlagged?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ communications: CommunicationWithDetails[]; total: number }> {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(communications.userId, filters.userId));
    }
    if (filters.courseId) {
      conditions.push(eq(communications.courseId, filters.courseId));
    }
    if (filters.enrollmentId) {
      conditions.push(eq(communications.enrollmentId, filters.enrollmentId));
    }
    if (filters.type) {
      conditions.push(eq(communications.type, filters.type));
    }
    if (filters.direction) {
      conditions.push(eq(communications.direction, filters.direction));
    }
    if (filters.isRead !== undefined) {
      conditions.push(eq(communications.isRead, filters.isRead));
    }
    if (filters.isFlagged !== undefined) {
      conditions.push(eq(communications.isFlagged, filters.isFlagged));
    }

    // Add full-text search functionality
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          sql`${communications.subject} ILIKE ${searchTerm}`,
          sql`${communications.content} ILIKE ${searchTerm}`,
          sql`${communications.fromAddress} ILIKE ${searchTerm}`,
          sql`${communications.toAddress} ILIKE ${searchTerm}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communications)
      .where(whereClause);

    // Get communications with relations and explicit ordering
    const communicationList = await db.query.communications.findMany({
      where: whereClause,
      with: {
        user: true,
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: true,
          },
        },
        course: true,
      },
      orderBy: [
        desc(sql`COALESCE(${communications.sentAt}, ${communications.createdAt})`),
        desc(communications.createdAt)
      ],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return {
      communications: communicationList,
      total: count,
    };
  }

  async markCommunicationAsRead(id: string): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(communications.id, id))
      .returning();

    if (!updatedCommunication) {
      throw new Error('Communication not found');
    }

    return updatedCommunication;
  }

  async markCommunicationAsUnread(id: string): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ 
        isRead: false, 
        readAt: null,
        updatedAt: new Date() 
      })
      .where(eq(communications.id, id))
      .returning();

    if (!updatedCommunication) {
      throw new Error('Communication not found');
    }

    return updatedCommunication;
  }

  async flagCommunication(id: string, note?: string): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ 
        isFlagged: true, 
        flagNote: note,
        flaggedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(communications.id, id))
      .returning();

    if (!updatedCommunication) {
      throw new Error('Communication not found');
    }

    return updatedCommunication;
  }

  async unflagCommunication(id: string): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ 
        isFlagged: false, 
        flagNote: null,
        flaggedAt: null,
        updatedAt: new Date() 
      })
      .where(eq(communications.id, id))
      .returning();

    if (!updatedCommunication) {
      throw new Error('Communication not found');
    }

    return updatedCommunication;
  }

  // E-commerce operations implementation

  // Product Categories
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const [created] = await db.insert(productCategories).values(category).returning();
    return created;
  }

  async updateProductCategory(id: string, category: Partial<InsertProductCategory>): Promise<ProductCategory> {
    const [updated] = await db
      .update(productCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(productCategories.id, id))
      .returning();

    if (!updated) {
      throw new Error('Product category not found');
    }

    return updated;
  }

  async deleteProductCategory(id: string): Promise<void> {
    await db.delete(productCategories).where(eq(productCategories.id, id));
  }

  async getProductCategory(id: string): Promise<ProductCategory | undefined> {
    return db.query.productCategories.findFirst({
      where: eq(productCategories.id, id),
    });
  }

  async getProductCategories(): Promise<ProductCategoryWithProducts[]> {
    return db.query.productCategories.findMany({
      with: {
        products: {
          where: eq(products.status, 'active'),
        },
        children: true,
        parent: true,
      },
      orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)],
    });
  }

  // Products
  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      throw new Error('Product not found');
    }

    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getProduct(id: string): Promise<ProductWithDetails | undefined> {
    return db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        category: true,
        variants: {
          orderBy: [asc(productVariants.sortOrder), asc(productVariants.name)],
        },
        createdByUser: true,
        updatedByUser: true,
      },
    });
  }

  async getProducts(): Promise<ProductWithDetails[]> {
    return db.query.products.findMany({
      with: {
        category: true,
        variants: {
          orderBy: [asc(productVariants.sortOrder), asc(productVariants.name)],
        },
        createdByUser: true,
        updatedByUser: true,
      },
      orderBy: [desc(products.featured), asc(products.sortOrder), asc(products.name)],
    });
  }

  async getProductsByCategory(categoryId: string): Promise<ProductWithDetails[]> {
    return db.query.products.findMany({
      where: eq(products.categoryId, categoryId),
      with: {
        category: true,
        variants: {
          orderBy: [asc(productVariants.sortOrder), asc(productVariants.name)],
        },
        createdByUser: true,
        updatedByUser: true,
      },
      orderBy: [desc(products.featured), asc(products.sortOrder), asc(products.name)],
    });
  }

  // Product Variants
  async createProductVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const [created] = await db.insert(productVariants).values(variant).returning();
    return created;
  }

  async updateProductVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant> {
    const [updated] = await db
      .update(productVariants)
      .set({ ...variant, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();

    if (!updated) {
      throw new Error('Product variant not found');
    }

    return updated;
  }

  async deleteProductVariant(id: string): Promise<void> {
    await db.delete(productVariants).where(eq(productVariants.id, id));
  }

  async getProductVariant(id: string): Promise<ProductVariant | undefined> {
    return db.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
    });
  }

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
      orderBy: [asc(productVariants.sortOrder), asc(productVariants.name)],
    });
  }

  // Shopping Cart
  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Build conditions based on item type (local vs printify)
    const itemType = item.itemType || 'local';
    let existingItem;
    
    if (itemType === 'printify') {
      // For Printify items, check by printifyProductId and printifyVariantId
      existingItem = await db.query.cartItems.findFirst({
        where: and(
          eq(cartItems.printifyProductId, item.printifyProductId!),
          eq(cartItems.printifyVariantId, item.printifyVariantId!),
          item.userId ? eq(cartItems.userId, item.userId) : isNull(cartItems.userId),
          item.sessionId ? eq(cartItems.sessionId, item.sessionId) : isNull(cartItems.sessionId)
        ),
      });
    } else {
      // For local items, check by productId and variantId
      existingItem = await db.query.cartItems.findFirst({
        where: and(
          item.productId ? eq(cartItems.productId, item.productId) : isNull(cartItems.productId),
          item.variantId ? eq(cartItems.variantId, item.variantId) : isNull(cartItems.variantId),
          item.userId ? eq(cartItems.userId, item.userId) : isNull(cartItems.userId),
          item.sessionId ? eq(cartItems.sessionId, item.sessionId) : isNull(cartItems.sessionId)
        ),
      });
    }

    if (existingItem) {
      return this.updateCartItem(existingItem.id, existingItem.quantity + (item.quantity || 1));
    }

    const [created] = await db.insert(cartItems).values({
      ...item,
      itemType,
    }).returning();
    return created;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const [updated] = await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();

    if (!updated) {
      throw new Error('Cart item not found');
    }

    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async getCartItems(userId?: string, sessionId?: string): Promise<CartItemWithDetails[]> {
    const whereConditions = [];

    if (userId) {
      whereConditions.push(eq(cartItems.userId, userId));
    } else if (sessionId) {
      whereConditions.push(eq(cartItems.sessionId, sessionId));
    } else {
      return []; // Must provide either userId or sessionId
    }

    return db.query.cartItems.findMany({
      where: and(...whereConditions),
      with: {
        product: {
          with: {
            category: true,
          },
        },
        variant: true,
        user: true,
      },
      orderBy: [desc(cartItems.createdAt)],
    });
  }

  async clearCart(userId?: string, sessionId?: string): Promise<void> {
    const whereConditions = [];

    if (userId) {
      whereConditions.push(eq(cartItems.userId, userId));
    } else if (sessionId) {
      whereConditions.push(eq(cartItems.sessionId, sessionId));
    } else {
      return; // Must provide either userId or sessionId
    }

    await db.delete(cartItems).where(and(...whereConditions));
  }

  // E-commerce Orders
  async createEcommerceOrder(order: InsertEcommerceOrder): Promise< EcommerceOrder> {
    const [created] = await db.insert(ecommerceOrders).values(order).returning();
    return created;
  }

  async updateEcommerceOrder(id: string, order: Partial<InsertEcommerceOrder>): Promise< EcommerceOrder> {
    const [updated] = await db
      .update(ecommerceOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(ecommerceOrders.id, id))
      .returning();

    if (!updated) {
      throw new Error('E-commerce order not found');
    }

    return updated;
  }

  async getEcommerceOrder(id: string): Promise< EcommerceOrderWithDetails | undefined> {
    return db.query.ecommerceOrders.findFirst({
      where: eq(ecommerceOrders.id, id),
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
          orderBy: [asc(ecommerceOrderItems.createdAt)],
        },
        user: true,
      },
    });
  }

  async getEcommerceOrders(userId?: string): Promise< EcommerceOrderWithDetails[]> {
    const whereConditions = userId ? [eq(ecommerceOrders.userId, userId)] : [];

    return db.query.ecommerceOrders.findMany({
      where: userId ? eq(ecommerceOrders.userId, userId) : undefined,
      with: {
        items: {
          with: {
            product: true,
            variant: true,
          },
          orderBy: [asc(ecommerceOrderItems.createdAt)],
        },
        user: true,
      },
      orderBy: [desc(ecommerceOrders.createdAt)],
    });
  }

  // E-commerce Order Items
  async createEcommerceOrderItem(item: InsertEcommerceOrderItem): Promise< EcommerceOrderItem> {
    const [created] = await db.insert(ecommerceOrderItems).values(item).returning();
    return created;
  }

  async updateEcommerceOrderItem(id: string, item: Partial<InsertEcommerceOrderItem>): Promise< EcommerceOrderItem> {
    const [updated] = await db
      .update(ecommerceOrderItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(ecommerceOrderItems.id, id))
      .returning();

    if (!updated) {
      throw new Error('E-commerce order item not found');
    }

    return updated;
  }

  async getEcommerceOrderItems(orderId: string): Promise< EcommerceOrderItem[]> {
    return db.query.ecommerceOrderItems.findMany({
      where: eq(ecommerceOrderItems.orderId, orderId),
      orderBy: [asc(ecommerceOrderItems.createdAt)],
    });
  }

  // Course Notifications
  async createCourseNotification(notification: InsertCourseNotification): Promise<CourseNotification> {
    const [result] = await db
      .insert(courseNotifications)
      .values(notification)
      .returning();
    return result;
  }

  async getCourseNotifications(courseType?: string): Promise<CourseNotificationWithUser[]>;
  async getCourseNotifications(courseType?: string): Promise<CourseNotificationWithUser[]> {
    const whereConditions = courseType 
      ? eq(courseNotifications.courseType, courseType)
      : undefined;

    return db.query.courseNotifications.findMany({
      where: whereConditions,
      with: {
        user: true,
      },
      orderBy: [desc(courseNotifications.createdAt)],
    });
  }

  async updateCourseNotification(id: string, notification: Partial<InsertCourseNotification>): Promise<CourseNotification> {
    const [result] = await db
      .update(courseNotifications)
      .set({
        ...notification,
        updatedAt: new Date(),
      })
      .where(eq(courseNotifications.id, id))
      .returning();
    return result;
  }

  async deleteCourseNotification(id: string): Promise<void> {
    await db
      .delete(courseNotifications)
      .where(eq(courseNotifications.id, id));
  }

  // SMS Lists Methods
  async createSmsList(data: InsertSmsList): Promise<SmsList> {
    const [list] = await db
      .insert(smsLists)
      .values(data)
      .returning();

    if (!list) {
      throw new Error('Failed to create SMS list');
    }

    return list;
  }

  async getSmsList(id: string): Promise<SmsList | undefined> {
    const [list] = await db
      .select()
      .from(smsLists)
      .where(eq(smsLists.id, id));

    return list;
  }

  async getSmsListsByInstructor(instructorId: string): Promise<SmsList[]> {
    return db
      .select()
      .from(smsLists)
      .where(and(
        eq(smsLists.instructorId, instructorId),
        eq(smsLists.isActive, true)
      ))
      .orderBy(desc(smsLists.createdAt));
  }

  async getSmsListBySchedule(scheduleId: string): Promise<SmsList | undefined> {
    const [list] = await db
      .select()
      .from(smsLists)
      .where(and(
        eq(smsLists.scheduleId, scheduleId),
        eq(smsLists.listType, 'course_schedule')
      ));

    return list;
  }

  async updateSmsList(id: string, data: Partial<InsertSmsList>): Promise<SmsList> {
    const [list] = await db
      .update(smsLists)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(smsLists.id, id))
      .returning();

    if (!list) {
      throw new Error('SMS list not found');
    }

    return list;
  }

  async deleteSmsList(id: string): Promise<void> {
    // Delete related records first to avoid foreign key constraint errors

    // Delete all broadcast deliveries for broadcasts in this list
    const broadcasts = await db
      .select({ id: smsBroadcastMessages.id })
      .from(smsBroadcastMessages)
      .where(eq(smsBroadcastMessages.listId, id));

    for (const broadcast of broadcasts) {
      await db
        .delete(smsBroadcastDeliveries)
        .where(eq(smsBroadcastDeliveries.broadcastId, broadcast.id));
    }

    // Delete all broadcasts for this list
    await db
      .delete(smsBroadcastMessages)
      .where(eq(smsBroadcastMessages.listId, id));

    // Delete all list members
    await db
      .delete(smsListMembers)
      .where(eq(smsListMembers.listId, id));

    // Finally delete the list itself
    await db
      .delete(smsLists)
      .where(eq(smsLists.id, id));
  }

  async searchSmsLists(instructorId: string, query: string): Promise<SmsList[]> {
    return db
      .select()
      .from(smsLists)
      .where(and(
        eq(smsLists.instructorId, instructorId),
        eq(smsLists.isActive, true),
        or(
          sql`${smsLists.name} ILIKE ${`%${query}%`}`,
          sql`${smsLists.description} ILIKE ${`%${query}%`}`,
          sql`${query} = ANY(${smsLists.tags})`
        )
      ))
      .orderBy(desc(smsLists.createdAt));
  }

  // SMS List Members Methods
  async addSmsListMember(data: InsertSmsListMember): Promise<SmsListMember> {
    const [member] = await db
      .insert(smsListMembers)
      .values(data)
      .returning();

    if (!member) {
      throw new Error('Failed to add SMS list member');
    }

    return member;
  }

  async addSmsListMembers(members: InsertSmsListMember[]): Promise<SmsListMember[]> {
    if (members.length === 0) {
      return [];
    }

    return db
      .insert(smsListMembers)
      .values(members)
      .returning();
  }

  async getSmsListMembers(listId: string): Promise<SmsListMemberWithUser[]> {
    return db.query.smsListMembers.findMany({
      where: eq(smsListMembers.listId, listId),
      with: {
        user: true,
        addedByUser: true,
        list: true,
      },
      orderBy: [desc(smsListMembers.createdAt)],
    });
  }

  async getSmsListMembersByUser(userId: string): Promise<SmsListMemberWithUser[]> {
    return db.query.smsListMembers.findMany({
      where: eq(smsListMembers.userId, userId),
      with: {
        user: true,
        addedByUser: true,
        list: true,
      },
      orderBy: [desc(smsListMembers.createdAt)],
    });
  }

  async removeSmsListMember(id: string): Promise<void> {
    await db
      .delete(smsListMembers)
      .where(eq(smsListMembers.id, id));
  }

  async removeSmsListMemberByUserAndList(listId: string, userId: string): Promise<void> {
    await db
      .delete(smsListMembers)
      .where(and(
        eq(smsListMembers.listId, listId),
        eq(smsListMembers.userId, userId)
      ));
  }

  async checkSmsListMembership(listId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(smsListMembers)
      .where(and(
        eq(smsListMembers.listId, listId),
        eq(smsListMembers.userId, userId)
      ))
      .limit(1);

    return !!member;
  }

  // SMS Broadcast Messages Methods
  async createSmsBroadcastMessage(data: InsertSmsBroadcastMessage): Promise<SmsBroadcastMessage> {
    const [message] = await db
      .insert(smsBroadcastMessages)
      .values(data)
      .returning();

    if (!message) {
      throw new Error('Failed to create SMS broadcast message');
    }

    return message;
  }

  async getSmsBroadcastMessage(id: string): Promise<SmsBroadcastMessage | undefined> {
    const [message] = await db
      .select()
      .from(smsBroadcastMessages)
      .where(eq(smsBroadcastMessages.id, id));

    return message;
  }

  async getSmsBroadcastsByList(listId: string): Promise<SmsBroadcastMessage[]> {
    return db
      .select()
      .from(smsBroadcastMessages)
      .where(eq(smsBroadcastMessages.listId, listId))
      .orderBy(desc(smsBroadcastMessages.createdAt));
  }

  async updateSmsBroadcastMessage(id: string, data: Partial<InsertSmsBroadcastMessage>): Promise<SmsBroadcastMessage> {
    const [message] = await db
      .update(smsBroadcastMessages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(smsBroadcastMessages.id, id))
      .returning();

    if (!message) {
      throw new Error('SMS broadcast message not found');
    }

    return message;
  }

  async deleteSmsBroadcastMessage(id: string): Promise<void> {
    await db
      .delete(smsBroadcastMessages)
      .where(eq(smsBroadcastMessages.id, id));
  }

  // SMS Broadcast Deliveries Methods
  async createSmsBroadcastDelivery(data: InsertSmsBroadcastDelivery): Promise<SmsBroadcastDelivery> {
    const [delivery] = await db
      .insert(smsBroadcastDeliveries)
      .values(data)
      .returning();

    if (!delivery) {
      throw new Error('Failed to create SMS broadcast delivery');
    }

    return delivery;
  }

  async createSmsBroadcastDeliveries(deliveries: InsertSmsBroadcastDelivery[]): Promise<SmsBroadcastDelivery[]> {
    if (deliveries.length === 0) {
      return [];
    }

    return db
      .insert(smsBroadcastDeliveries)
      .values(deliveries)
      .returning();
  }

  async getSmsBroadcastDeliveries(broadcastId: string): Promise<SmsBroadcastDeliveryWithDetails[]> {
    return db.query.smsBroadcastDeliveries.findMany({
      where: eq(smsBroadcastDeliveries.broadcastId, broadcastId),
      with: {
        broadcast: true,
        user: true,
      },
      orderBy: [desc(smsBroadcastDeliveries.createdAt)],
    });
  }

  async getSmsBroadcastDelivery(id: string): Promise<SmsBroadcastDelivery | undefined> {
    const [delivery] = await db
      .select()
      .from(smsBroadcastDeliveries)
      .where(eq(smsBroadcastDeliveries.id, id));

    return delivery;
  }

  async updateSmsBroadcastDelivery(id: string, data: Partial<InsertSmsBroadcastDelivery>): Promise<SmsBroadcastDelivery> {
    const [delivery] = await db
      .update(smsBroadcastDeliveries)
      .set(data)
      .where(eq(smsBroadcastDeliveries.id, id))
      .returning();

    if (!delivery) {
      throw new Error('SMS broadcast delivery not found');
    }

    return delivery;
  }

  async getDeliveriesByUser(userId: string): Promise<SmsBroadcastDeliveryWithDetails[]> {
    return db.query.smsBroadcastDeliveries.findMany({
      where: eq(smsBroadcastDeliveries.userId, userId),
      with: {
        broadcast: true,
        user: true,
      },
      orderBy: [desc(smsBroadcastDeliveries.createdAt)],
    });
  }

  // SMS Helper Methods
  async getSmsListWithDetails(id: string): Promise<SmsListWithDetails | undefined> {
    const list = await db.query.smsLists.findFirst({
      where: eq(smsLists.id, id),
      with: {
        schedule: true,
        instructor: true,
        members: {
          with: {
            user: true,
            addedByUser: true,
          },
        },
        broadcasts: true,
      },
    });

    if (!list) {
      return undefined;
    }

    return {
      ...list,
      members: list.members.map(m => ({
        ...m,
        list: list,
      })),
    };
  }

  async getSmsBroadcastWithDeliveryStats(id: string): Promise<SmsBroadcastMessageWithDetails | undefined> {
    const broadcast = await db.query.smsBroadcastMessages.findFirst({
      where: eq(smsBroadcastMessages.id, id),
      with: {
        list: true,
        instructor: true,
        deliveries: true,
      },
    });

    return broadcast;
  }

  // ============================================
  // APPOINTMENT SYSTEM IMPLEMENTATIONS
  // ============================================

  // Appointment Type operations
  async createAppointmentType(data: InsertAppointmentType): Promise<AppointmentType> {
    const [appointmentType] = await db
      .insert(appointmentTypes)
      .values(data)
      .returning();

    if (!appointmentType) {
      throw new Error('Failed to create appointment type');
    }

    return appointmentType;
  }

  async updateAppointmentType(id: string, data: Partial<InsertAppointmentType>): Promise<AppointmentType> {
    const [appointmentType] = await db
      .update(appointmentTypes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(appointmentTypes.id, id))
      .returning();

    if (!appointmentType) {
      throw new Error('Appointment type not found');
    }

    return appointmentType;
  }

  async deleteAppointmentType(id: string): Promise<void> {
    await db
      .delete(appointmentTypes)
      .where(eq(appointmentTypes.id, id));
  }

  async getAppointmentType(id: string): Promise<AppointmentType | undefined> {
    const [appointmentType] = await db
      .select()
      .from(appointmentTypes)
      .where(eq(appointmentTypes.id, id));

    return appointmentType;
  }

  async getAppointmentTypes(instructorId: string): Promise<AppointmentType[]> {
    // Instructors have admin-level data visibility - return ALL appointment types system-wide
    return db
      .select()
      .from(appointmentTypes)
      .orderBy(asc(appointmentTypes.sortOrder), asc(appointmentTypes.title));
  }

  async getActiveAppointmentTypes(instructorId: string): Promise<AppointmentType[]> {
    // Return active appointment types for the specified instructor (used for student booking)
    return db
      .select()
      .from(appointmentTypes)
      .where(and(
        eq(appointmentTypes.instructorId, instructorId),
        eq(appointmentTypes.isActive, true)
      ))
      .orderBy(asc(appointmentTypes.sortOrder), asc(appointmentTypes.title));
  }

  // Instructor Weekly Template operations
  async createWeeklyTemplate(data: InsertInstructorWeeklyTemplate): Promise<InstructorWeeklyTemplate> {
    const [template] = await db
      .insert(instructorWeeklyTemplates)
      .values(data)
      .returning();

    if (!template) {
      throw new Error('Failed to create weekly template');
    }

    return template;
  }

  async updateWeeklyTemplate(id: string, data: Partial<InsertInstructorWeeklyTemplate>): Promise<InstructorWeeklyTemplate> {
    const [template] = await db
      .update(instructorWeeklyTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(instructorWeeklyTemplates.id, id))
      .returning();

    if (!template) {
      throw new Error('Weekly template not found');
    }

    return template;
  }

  async deleteWeeklyTemplate(id: string): Promise<void> {
    await db
      .delete(instructorWeeklyTemplates)
      .where(eq(instructorWeeklyTemplates.id, id));
  }

  async getWeeklyTemplate(id: string): Promise<InstructorWeeklyTemplate | undefined> {
    const [template] = await db
      .select()
      .from(instructorWeeklyTemplates)
      .where(eq(instructorWeeklyTemplates.id, id));

    return template;
  }

  async getWeeklyTemplates(instructorId: string): Promise<InstructorWeeklyTemplate[]> {
    return db
      .select()
      .from(instructorWeeklyTemplates)
      .where(eq(instructorWeeklyTemplates.instructorId, instructorId))
      .orderBy(asc(instructorWeeklyTemplates.dayOfWeek), asc(instructorWeeklyTemplates.startTime));
  }

  async getWeeklyTemplatesByDay(instructorId: string, dayOfWeek: number): Promise<InstructorWeeklyTemplate[]> {
    return db
      .select()
      .from(instructorWeeklyTemplates)
      .where(and(
        eq(instructorWeeklyTemplates.instructorId, instructorId),
        eq(instructorWeeklyTemplates.dayOfWeek, dayOfWeek),
        eq(instructorWeeklyTemplates.isActive, true)
      ))
      .orderBy(asc(instructorWeeklyTemplates.startTime));
  }

  // Instructor Availability Override operations
  async createAvailabilityOverride(data: InsertInstructorAvailabilityOverride): Promise<InstructorAvailabilityOverride> {
    const [override] = await db
      .insert(instructorAvailabilityOverrides)
      .values(data)
      .returning();

    if (!override) {
      throw new Error('Failed to create availability override');
    }

    return override;
  }

  async updateAvailabilityOverride(id: string, data: Partial<InsertInstructorAvailabilityOverride>): Promise<InstructorAvailabilityOverride> {
    const [override] = await db
      .update(instructorAvailabilityOverrides)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(instructorAvailabilityOverrides.id, id))
      .returning();

    if (!override) {
      throw new Error('Availability override not found');
    }

    return override;
  }

  async deleteAvailabilityOverride(id: string): Promise<void> {
    await db
      .delete(instructorAvailabilityOverrides)
      .where(eq(instructorAvailabilityOverrides.id, id));
  }

  async getAvailabilityOverride(id: string): Promise<InstructorAvailabilityOverride | undefined> {
    const [override] = await db
      .select()
      .from(instructorAvailabilityOverrides)
      .where(eq(instructorAvailabilityOverrides.id, id));

    return override;
  }

  async getAvailabilityOverrides(instructorId: string): Promise<InstructorAvailabilityOverride[]> {
    return db
      .select()
      .from(instructorAvailabilityOverrides)
      .where(eq(instructorAvailabilityOverrides.instructorId, instructorId))
      .orderBy(asc(instructorAvailabilityOverrides.startDate));
  }

  async getAvailabilityOverridesInRange(instructorId: string, startDate: Date, endDate: Date): Promise<InstructorAvailabilityOverride[]> {
    return db
      .select()
      .from(instructorAvailabilityOverrides)
      .where(and(
        eq(instructorAvailabilityOverrides.instructorId, instructorId),
        or(
          and(
            gte(instructorAvailabilityOverrides.startDate, startDate),
            gte(endDate, instructorAvailabilityOverrides.startDate)
          ),
          and(
            gte(instructorAvailabilityOverrides.endDate, startDate),
            gte(endDate, instructorAvailabilityOverrides.endDate)
          )
        )
      ))
      .orderBy(asc(instructorAvailabilityOverrides.startDate));
  }

  // Instructor Appointment operations
  async createAppointment(data: InsertInstructorAppointment): Promise<InstructorAppointment> {
    const [appointment] = await db
      .insert(instructorAppointments)
      .values(data)
      .returning();

    if (!appointment) {
      throw new Error('Failed to create appointment');
    }

    return appointment;
  }

  async updateAppointment(id: string, data: Partial<InsertInstructorAppointment>): Promise<InstructorAppointment> {
    const [appointment] = await db
      .update(instructorAppointments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(instructorAppointments.id, id))
      .returning();

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  async cancelAppointment(id: string, cancelledBy: string, reason?: string): Promise<InstructorAppointment> {
    const [appointment] = await db
      .update(instructorAppointments)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(instructorAppointments.id, id))
      .returning();

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  async getAppointment(id: string): Promise<InstructorAppointmentWithDetails | undefined> {
    return db.query.instructorAppointments.findFirst({
      where: eq(instructorAppointments.id, id),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
    });
  }

  async getAppointments(filters: {
    instructorId?: string;
    studentId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<InstructorAppointmentWithDetails[]> {
    const conditions = [];

    if (filters.instructorId) {
      conditions.push(eq(instructorAppointments.instructorId, filters.instructorId));
    }

    if (filters.studentId) {
      conditions.push(eq(instructorAppointments.studentId, filters.studentId));
    }

    if (filters.status) {
      conditions.push(eq(instructorAppointments.status, filters.status));
    }

    // When both dates provided, use overlap detection for conflict checking:
    // Two ranges overlap if: range1.start < range2.end AND range1.end > range2.start
    // This ensures we find ALL appointments that overlap with the filter range
    if (filters.startDate && filters.endDate) {
      // Appointment overlaps if: appointment.startTime < filterEndDate AND appointment.endTime > filterStartDate
      conditions.push(lt(instructorAppointments.startTime, filters.endDate));
      conditions.push(gt(instructorAppointments.endTime, filters.startDate));
    } else if (filters.startDate) {
      // Just startDate: get appointments starting on or after this date (for listing views)
      conditions.push(gte(instructorAppointments.startTime, filters.startDate));
    } else if (filters.endDate) {
      // Just endDate: get appointments ending on or before this date (for listing views)
      conditions.push(lte(instructorAppointments.endTime, filters.endDate));
    }

    return db.query.instructorAppointments.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [asc(instructorAppointments.startTime)],
    });
  }

  async getAllAppointments(): Promise<InstructorAppointmentWithDetails[]> {
    // For admin/superadmin: return all appointments across all instructors
    return db.query.instructorAppointments.findMany({
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [desc(instructorAppointments.startTime)],
    });
  }

  async getAppointmentsByInstructor(instructorId: string): Promise<InstructorAppointmentWithDetails[]> {
    return db.query.instructorAppointments.findMany({
      where: eq(instructorAppointments.instructorId, instructorId),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [desc(instructorAppointments.startTime)],
    });
  }

  async getAppointmentsByStudent(studentId: string): Promise<InstructorAppointmentWithDetails[]> {
    return db.query.instructorAppointments.findMany({
      where: eq(instructorAppointments.studentId, studentId),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [desc(instructorAppointments.startTime)],
    });
  }

  async getPendingAppointments(instructorId: string): Promise<InstructorAppointmentWithDetails[]> {
    return db.query.instructorAppointments.findMany({
      where: and(
        eq(instructorAppointments.instructorId, instructorId),
        eq(instructorAppointments.status, 'pending')
      ),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [asc(instructorAppointments.startTime)],
    });
  }

  async getAllPendingAppointments(): Promise<InstructorAppointmentWithDetails[]> {
    return db.query.instructorAppointments.findMany({
      where: eq(instructorAppointments.status, 'pending'),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [asc(instructorAppointments.startTime)],
    });
  }

  async getUpcomingAppointments(instructorId: string, limit: number = 10): Promise<InstructorAppointmentWithDetails[]> {
    const now = new Date();
    
    return db.query.instructorAppointments.findMany({
      where: and(
        eq(instructorAppointments.instructorId, instructorId),
        gte(instructorAppointments.startTime, now),
        inArray(instructorAppointments.status, ['pending', 'confirmed'])
      ),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [asc(instructorAppointments.startTime)],
      limit,
    });
  }

  async getAllUpcomingAppointments(limit: number = 10): Promise<InstructorAppointmentWithDetails[]> {
    const now = new Date();
    
    return db.query.instructorAppointments.findMany({
      where: and(
        gte(instructorAppointments.startTime, now),
        inArray(instructorAppointments.status, ['pending', 'confirmed'])
      ),
      with: {
        appointmentType: true,
        instructor: true,
        student: true,
      },
      orderBy: [asc(instructorAppointments.startTime)],
      limit,
    });
  }

  async approveAppointment(id: string): Promise<InstructorAppointment> {
    const [appointment] = await db
      .update(instructorAppointments)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(instructorAppointments.id, id))
      .returning();

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  async rejectAppointment(id: string, reason: string): Promise<InstructorAppointment> {
    const [appointment] = await db
      .update(instructorAppointments)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(instructorAppointments.id, id))
      .returning();

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  // Appointment Notification Template operations
  async createAppointmentNotificationTemplate(data: InsertAppointmentNotificationTemplate): Promise<AppointmentNotificationTemplate> {
    const [template] = await db
      .insert(appointmentNotificationTemplates)
      .values(data)
      .returning();

    if (!template) {
      throw new Error('Failed to create appointment notification template');
    }

    return template;
  }

  async updateAppointmentNotificationTemplate(id: string, data: Partial<InsertAppointmentNotificationTemplate>): Promise<AppointmentNotificationTemplate> {
    const [template] = await db
      .update(appointmentNotificationTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(appointmentNotificationTemplates.id, id))
      .returning();

    if (!template) {
      throw new Error('Appointment notification template not found');
    }

    return template;
  }

  async deleteAppointmentNotificationTemplate(id: string): Promise<void> {
    await db
      .delete(appointmentNotificationTemplates)
      .where(eq(appointmentNotificationTemplates.id, id));
  }

  async getAppointmentNotificationTemplate(id: string): Promise<AppointmentNotificationTemplate | undefined> {
    const [template] = await db
      .select()
      .from(appointmentNotificationTemplates)
      .where(eq(appointmentNotificationTemplates.id, id));

    return template;
  }

  async getAppointmentNotificationTemplates(instructorId: string): Promise<AppointmentNotificationTemplate[]> {
    return db
      .select()
      .from(appointmentNotificationTemplates)
      .where(eq(appointmentNotificationTemplates.instructorId, instructorId))
      .orderBy(asc(appointmentNotificationTemplates.eventType), asc(appointmentNotificationTemplates.channelType));
  }

  async getAppointmentNotificationTemplateByEvent(
    instructorId: string,
    eventType: string,
    recipientType: string,
    channelType: string
  ): Promise<AppointmentNotificationTemplate | undefined> {
    const [template] = await db
      .select()
      .from(appointmentNotificationTemplates)
      .where(and(
        eq(appointmentNotificationTemplates.instructorId, instructorId),
        eq(appointmentNotificationTemplates.eventType, eventType),
        eq(appointmentNotificationTemplates.recipientType, recipientType),
        eq(appointmentNotificationTemplates.channelType, channelType),
        eq(appointmentNotificationTemplates.isActive, true)
      ))
      .limit(1);

    return template;
  }

  // Appointment Reminder Schedule operations
  async createAppointmentReminderSchedule(data: InsertAppointmentReminderSchedule): Promise<AppointmentReminderSchedule> {
    const [schedule] = await db
      .insert(appointmentReminderSchedules)
      .values(data)
      .returning();

    if (!schedule) {
      throw new Error('Failed to create appointment reminder schedule');
    }

    return schedule;
  }

  async updateAppointmentReminderSchedule(id: string, data: Partial<InsertAppointmentReminderSchedule>): Promise<AppointmentReminderSchedule> {
    const [schedule] = await db
      .update(appointmentReminderSchedules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(appointmentReminderSchedules.id, id))
      .returning();

    if (!schedule) {
      throw new Error('Appointment reminder schedule not found');
    }

    return schedule;
  }

  async deleteAppointmentReminderSchedule(id: string): Promise<void> {
    await db
      .delete(appointmentReminderSchedules)
      .where(eq(appointmentReminderSchedules.id, id));
  }

  async getAppointmentReminderSchedule(id: string): Promise<AppointmentReminderSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(appointmentReminderSchedules)
      .where(eq(appointmentReminderSchedules.id, id));

    return schedule;
  }

  async getAppointmentReminderSchedules(instructorId: string): Promise<AppointmentReminderSchedule[]> {
    return db
      .select()
      .from(appointmentReminderSchedules)
      .where(eq(appointmentReminderSchedules.instructorId, instructorId))
      .orderBy(desc(appointmentReminderSchedules.minutesBefore));
  }

  async getActiveAppointmentReminderSchedules(instructorId: string): Promise<AppointmentReminderSchedule[]> {
    return db
      .select()
      .from(appointmentReminderSchedules)
      .where(and(
        eq(appointmentReminderSchedules.instructorId, instructorId),
        eq(appointmentReminderSchedules.isActive, true)
      ))
      .orderBy(desc(appointmentReminderSchedules.minutesBefore));
  }

  // Appointment availability helper methods
  async getInstructorCourseSchedules(instructorId: string, startDate: Date, endDate: Date): Promise<CourseSchedule[]> {
    return db
      .select()
      .from(courseSchedules)
      .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
      .where(and(
        eq(courses.instructorId, instructorId),
        gte(courseSchedules.startDate, startDate),
        gte(endDate, courseSchedules.endDate),
        isNull(courseSchedules.deletedAt)
      ))
      .then(results => results.map(r => r.course_schedules));
  }

  async checkAppointmentConflict(
    instructorId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    // Use exclusive inequality for proper back-to-back booking support:
    // Conflict exists if: existingStart < newEnd AND existingEnd > newStart
    // This allows a 1-2 PM appointment to NOT conflict with a 2-3 PM appointment
    const conditions = [
      eq(instructorAppointments.instructorId, instructorId),
      inArray(instructorAppointments.status, ['pending', 'confirmed']),
      and(
        lt(instructorAppointments.startTime, endTime),
        gt(instructorAppointments.endTime, startTime)
      ),
    ];

    if (excludeAppointmentId) {
      conditions.push(ne(instructorAppointments.id, excludeAppointmentId));
    }

    const [conflict] = await db
      .select()
      .from(instructorAppointments)
      .where(and(...conditions))
      .limit(1);

    return !!conflict;
  }

  // ============================================
  // CREDIT SYSTEM METHODS IMPLEMENTATION
  // ============================================

  async getInstructorCredits(instructorId: string): Promise<InstructorCredits | undefined> {
    const [credits] = await db
      .select()
      .from(instructorCredits)
      .where(eq(instructorCredits.instructorId, instructorId));
    
    return credits;
  }

  async createInstructorCredits(instructorId: string): Promise<InstructorCredits> {
    const [credits] = await db
      .insert(instructorCredits)
      .values({
        instructorId,
        smsCredits: 0,
        emailCredits: 0,
      })
      .returning();

    if (!credits) {
      throw new Error('Failed to create instructor credits');
    }

    return credits;
  }

  async ensureInstructorCredits(instructorId: string): Promise<InstructorCredits> {
    const existing = await this.getInstructorCredits(instructorId);
    if (existing) {
      return existing;
    }
    return this.createInstructorCredits(instructorId);
  }

  async addCredits(
    instructorId: string,
    smsCredits: number,
    emailCredits: number,
    data: {
      amount?: number;
      stripePaymentIntentId?: string;
      packageId?: string;
      description?: string;
      transactionType?: 'purchase' | 'admin_grant';
      grantedByUserId?: string;
    }
  ): Promise<{ credits: InstructorCredits; transaction: CreditTransaction }> {
    // Ensure instructor has a credits record
    await this.ensureInstructorCredits(instructorId);

    // Update credits balance
    const [updatedCredits] = await db
      .update(instructorCredits)
      .set({
        smsCredits: sql`${instructorCredits.smsCredits} + ${smsCredits}`,
        emailCredits: sql`${instructorCredits.emailCredits} + ${emailCredits}`,
        updatedAt: new Date(),
      })
      .where(eq(instructorCredits.instructorId, instructorId))
      .returning();

    if (!updatedCredits) {
      throw new Error('Failed to update credits');
    }

    // Create transaction record
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        instructorId,
        transactionType: data.transactionType || 'purchase',
        smsCredits,
        emailCredits,
        balanceAfterSms: updatedCredits.smsCredits,
        balanceAfterEmail: updatedCredits.emailCredits,
        amount: data.amount?.toString(),
        stripePaymentIntentId: data.stripePaymentIntentId,
        packageId: data.packageId,
        grantedByUserId: data.grantedByUserId,
        description: data.description || `${data.transactionType === 'admin_grant' ? 'Admin granted' : 'Purchased'} ${smsCredits} SMS credits and ${emailCredits} email credits`,
      })
      .returning();

    if (!transaction) {
      throw new Error('Failed to create transaction record');
    }

    return { credits: updatedCredits, transaction };
  }
  
  async getAllInstructorsWithCredits(): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    smsCredits: number;
    emailCredits: number;
  }>> {
    const instructors = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        smsCredits: instructorCredits.smsCredits,
        emailCredits: instructorCredits.emailCredits,
      })
      .from(users)
      .leftJoin(instructorCredits, eq(users.id, instructorCredits.instructorId))
      .where(or(eq(users.role, 'instructor'), eq(users.role, 'superadmin')));

    return instructors.map(i => ({
      id: i.id,
      email: i.email || '',
      firstName: i.firstName || '',
      lastName: i.lastName || '',
      smsCredits: i.smsCredits || 0,
      emailCredits: i.emailCredits || 0,
    }));
  }

  async deductCredits(
    instructorId: string,
    smsCredits: number,
    emailCredits: number,
    data: {
      communicationId?: string;
      description?: string;
    }
  ): Promise<{ credits: InstructorCredits; transaction: CreditTransaction }> {
    // Ensure instructor has a credits record
    await this.ensureInstructorCredits(instructorId);

    // Atomically update credits balance with a check to prevent negative balances
    // This prevents race conditions by checking and updating in a single query
    const [updatedCredits] = await db
      .update(instructorCredits)
      .set({
        smsCredits: sql`${instructorCredits.smsCredits} - ${smsCredits}`,
        emailCredits: sql`${instructorCredits.emailCredits} - ${emailCredits}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(instructorCredits.instructorId, instructorId),
          sql`${instructorCredits.smsCredits} >= ${smsCredits}`,
          sql`${instructorCredits.emailCredits} >= ${emailCredits}`
        )
      )
      .returning();

    if (!updatedCredits) {
      // Get current balance to provide helpful error message
      const currentCredits = await this.getInstructorCredits(instructorId);
      if (!currentCredits) {
        throw new Error('Instructor credits record not found');
      }
      
      if (currentCredits.smsCredits < smsCredits) {
        throw new Error(`Insufficient SMS credits. Available: ${currentCredits.smsCredits}, Required: ${smsCredits}`);
      }
      if (currentCredits.emailCredits < emailCredits) {
        throw new Error(`Insufficient email credits. Available: ${currentCredits.emailCredits}, Required: ${emailCredits}`);
      }
      
      throw new Error('Failed to deduct credits');
    }

    // Create transaction record (negative values for usage)
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        instructorId,
        transactionType: 'usage',
        smsCredits: -smsCredits,
        emailCredits: -emailCredits,
        balanceAfterSms: updatedCredits.smsCredits,
        balanceAfterEmail: updatedCredits.emailCredits,
        communicationId: data.communicationId,
        description: data.description || `Used ${smsCredits} SMS credits and ${emailCredits} email credits`,
      })
      .returning();

    if (!transaction) {
      throw new Error('Failed to create transaction record');
    }

    return { credits: updatedCredits, transaction };
  }

  async refundCredits(
    instructorId: string,
    transactionId: string,
    refundReason?: string
  ): Promise<{ credits: InstructorCredits; transaction: CreditTransaction }> {
    // Get original transaction
    const [originalTransaction] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.id, transactionId));

    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    // Handle different transaction types
    let updatedCredits;
    if (originalTransaction.transactionType === 'purchase') {
      // Deduct the credits (reverse the purchase)
      [updatedCredits] = await db
        .update(instructorCredits)
        .set({
          smsCredits: sql`${instructorCredits.smsCredits} - ${originalTransaction.smsCredits}`,
          emailCredits: sql`${instructorCredits.emailCredits} - ${originalTransaction.emailCredits}`,
          updatedAt: new Date(),
        })
        .where(eq(instructorCredits.instructorId, instructorId))
        .returning();
    } else if (originalTransaction.transactionType === 'usage') {
      // Add the credits back (reverse the usage deduction)
      // Note: usage transactions have negative values, so we add them back
      [updatedCredits] = await db
        .update(instructorCredits)
        .set({
          smsCredits: sql`${instructorCredits.smsCredits} + ${Math.abs(originalTransaction.smsCredits)}`,
          emailCredits: sql`${instructorCredits.emailCredits} + ${Math.abs(originalTransaction.emailCredits)}`,
          updatedAt: new Date(),
        })
        .where(eq(instructorCredits.instructorId, instructorId))
        .returning();
    } else {
      throw new Error(`Cannot refund transaction type: ${originalTransaction.transactionType}`);
    }

    if (!updatedCredits) {
      throw new Error('Failed to refund credits');
    }

    // Create refund transaction record
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        instructorId,
        transactionType: 'refund',
        smsCredits: originalTransaction.transactionType === 'usage' 
          ? Math.abs(originalTransaction.smsCredits) 
          : -originalTransaction.smsCredits,
        emailCredits: originalTransaction.transactionType === 'usage'
          ? Math.abs(originalTransaction.emailCredits)
          : -originalTransaction.emailCredits,
        balanceAfterSms: updatedCredits.smsCredits,
        balanceAfterEmail: updatedCredits.emailCredits,
        amount: originalTransaction.amount,
        stripePaymentIntentId: originalTransaction.stripePaymentIntentId,
        description: refundReason || `Refund for transaction ${transactionId}`,
      })
      .returning();

    if (!transaction) {
      throw new Error('Failed to create refund record');
    }

    return { credits: updatedCredits, transaction };
  }

  async updateCreditTransactionCommunication(
    transactionId: string,
    communicationId: string
  ): Promise<void> {
    await db
      .update(creditTransactions)
      .set({ communicationId })
      .where(eq(creditTransactions.id, transactionId));
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    return db
      .select()
      .from(creditPackages)
      .orderBy(asc(creditPackages.sortOrder));
  }

  async getActiveCreditPackages(): Promise<CreditPackage[]> {
    return db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, true))
      .orderBy(asc(creditPackages.sortOrder));
  }

  async getCreditPackage(id: string): Promise<CreditPackage | undefined> {
    const [pkg] = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.id, id));
    
    return pkg;
  }

  async getCreditTransactions(instructorId: string, limit: number = 50): Promise<CreditTransactionWithDetails[]> {
    const transactions = await db.query.creditTransactions.findMany({
      where: eq(creditTransactions.instructorId, instructorId),
      with: {
        instructor: true,
        package: true,
        communication: true,
      },
      orderBy: [desc(creditTransactions.createdAt)],
      limit,
    });

    return transactions as CreditTransactionWithDetails[];
  }

  async getCreditTransaction(id: string): Promise<CreditTransactionWithDetails | undefined> {
    const transaction = await db.query.creditTransactions.findFirst({
      where: eq(creditTransactions.id, id),
      with: {
        instructor: true,
        package: true,
        communication: true,
      },
    });

    return transaction as CreditTransactionWithDetails | undefined;
  }

  // ============================================
  // GIFT CARD SYSTEM IMPLEMENTATIONS
  // ============================================

  // Gift card theme operations
  async createGiftCardTheme(theme: InsertGiftCardTheme): Promise<GiftCardTheme> {
    const [created] = await db.insert(giftCardThemes).values(theme).returning();
    return created;
  }

  async updateGiftCardTheme(id: string, theme: Partial<InsertGiftCardTheme>): Promise<GiftCardTheme> {
    const [updated] = await db
      .update(giftCardThemes)
      .set({ ...theme, updatedAt: new Date() })
      .where(eq(giftCardThemes.id, id))
      .returning();
    if (!updated) throw new Error('Gift card theme not found');
    return updated;
  }

  async deleteGiftCardTheme(id: string): Promise<void> {
    await db.delete(giftCardThemes).where(eq(giftCardThemes.id, id));
  }

  async getGiftCardTheme(id: string): Promise<GiftCardTheme | undefined> {
    const [theme] = await db.select().from(giftCardThemes).where(eq(giftCardThemes.id, id));
    return theme;
  }

  async getGiftCardThemes(): Promise<GiftCardTheme[]> {
    return db.select().from(giftCardThemes).orderBy(asc(giftCardThemes.sortOrder));
  }

  async getActiveGiftCardThemes(): Promise<GiftCardTheme[]> {
    return db
      .select()
      .from(giftCardThemes)
      .where(eq(giftCardThemes.isActive, true))
      .orderBy(asc(giftCardThemes.sortOrder));
  }

  // Gift card operations
  async createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard> {
    const [created] = await db.insert(giftCards).values(giftCard).returning();
    return created;
  }

  async updateGiftCard(id: string, giftCard: Partial<InsertGiftCard>): Promise<GiftCard> {
    const [updated] = await db
      .update(giftCards)
      .set({ ...giftCard, updatedAt: new Date() })
      .where(eq(giftCards.id, id))
      .returning();
    if (!updated) throw new Error('Gift card not found');
    return updated;
  }

  async getGiftCard(id: string): Promise<GiftCardWithDetails | undefined> {
    const giftCard = await db.query.giftCards.findFirst({
      where: eq(giftCards.id, id),
      with: {
        theme: true,
        redemptions: true,
        balanceAdjustments: true,
        issuedBy: true,
        voidedBy: true,
      },
    });
    return giftCard as GiftCardWithDetails | undefined;
  }

  async getGiftCardByCodeHash(codeHash: string): Promise<GiftCard | undefined> {
    const [giftCard] = await db.select().from(giftCards).where(eq(giftCards.codeHash, codeHash));
    return giftCard;
  }

  async getGiftCardByLast4(last4: string): Promise<GiftCardWithDetails[]> {
    const cards = await db.query.giftCards.findMany({
      where: eq(giftCards.codeLast4, last4),
      with: {
        theme: true,
        redemptions: true,
        balanceAdjustments: true,
        issuedBy: true,
        voidedBy: true,
      },
    });
    return cards as GiftCardWithDetails[];
  }

  async getGiftCards(filters?: { status?: string; issuedByUserId?: string }): Promise<GiftCardWithDetails[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(giftCards.status, filters.status as any));
    }
    if (filters?.issuedByUserId) {
      conditions.push(eq(giftCards.issuedByUserId, filters.issuedByUserId));
    }

    const cards = await db.query.giftCards.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        theme: true,
        redemptions: true,
        balanceAdjustments: true,
        issuedBy: true,
        voidedBy: true,
      },
      orderBy: [desc(giftCards.createdAt)],
    });
    return cards as GiftCardWithDetails[];
  }

  async voidGiftCard(id: string, voidedByUserId: string, reason: string): Promise<GiftCard> {
    const [voided] = await db
      .update(giftCards)
      .set({
        status: 'voided',
        voidedByUserId,
        voidedAt: new Date(),
        voidReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(giftCards.id, id))
      .returning();
    if (!voided) throw new Error('Gift card not found');
    return voided;
  }

  // Gift card redemption operations
  async createGiftCardRedemption(redemption: InsertGiftCardRedemption): Promise<GiftCardRedemption> {
    const [created] = await db.insert(giftCardRedemptions).values(redemption).returning();
    return created;
  }

  async getGiftCardRedemptions(giftCardId: string): Promise<GiftCardRedemptionWithDetails[]> {
    const redemptions = await db.query.giftCardRedemptions.findMany({
      where: eq(giftCardRedemptions.giftCardId, giftCardId),
      with: {
        giftCard: true,
        user: true,
      },
      orderBy: [desc(giftCardRedemptions.redeemedAt)],
    });
    return redemptions as GiftCardRedemptionWithDetails[];
  }

  async getGiftCardRedemptionsByUser(userId: string): Promise<GiftCardRedemptionWithDetails[]> {
    const redemptions = await db.query.giftCardRedemptions.findMany({
      where: eq(giftCardRedemptions.userId, userId),
      with: {
        giftCard: true,
        user: true,
      },
      orderBy: [desc(giftCardRedemptions.redeemedAt)],
    });
    return redemptions as GiftCardRedemptionWithDetails[];
  }

  // Gift card balance adjustment operations
  async createGiftCardBalanceAdjustment(adjustment: InsertGiftCardBalanceAdjustment): Promise<GiftCardBalanceAdjustment> {
    const [created] = await db.insert(giftCardBalanceAdjustments).values(adjustment).returning();
    return created;
  }

  async getGiftCardBalanceAdjustments(giftCardId: string): Promise<GiftCardBalanceAdjustment[]> {
    return db
      .select()
      .from(giftCardBalanceAdjustments)
      .where(eq(giftCardBalanceAdjustments.giftCardId, giftCardId))
      .orderBy(desc(giftCardBalanceAdjustments.adjustedAt));
  }

  // Gift card validation attempt operations
  async createGiftCardValidationAttempt(attempt: InsertGiftCardValidationAttempt): Promise<GiftCardValidationAttempt> {
    const [created] = await db.insert(giftCardValidationAttempts).values(attempt).returning();
    return created;
  }

  async getRecentValidationAttempts(ipAddress: string, minutes: number): Promise<GiftCardValidationAttempt[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return db
      .select()
      .from(giftCardValidationAttempts)
      .where(and(
        eq(giftCardValidationAttempts.ipAddress, ipAddress),
        gte(giftCardValidationAttempts.attemptedAt, cutoffTime)
      ))
      .orderBy(desc(giftCardValidationAttempts.attemptedAt));
  }

  async getRecentValidationAttemptsBySession(sessionId: string, minutes: number): Promise<GiftCardValidationAttempt[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return db
      .select()
      .from(giftCardValidationAttempts)
      .where(and(
        eq(giftCardValidationAttempts.sessionId, sessionId),
        gte(giftCardValidationAttempts.attemptedAt, cutoffTime)
      ))
      .orderBy(desc(giftCardValidationAttempts.attemptedAt));
  }

  // ============================================
  // FTA WAIVER SUBMISSION OPERATIONS
  // ============================================

  async createFtaWaiverSubmission(submission: InsertFtaWaiverSubmission): Promise<FtaWaiverSubmission> {
    const [created] = await db.insert(ftaWaiverSubmissions).values(submission).returning();
    return created;
  }

  async getFtaWaiverSubmission(id: string): Promise<FtaWaiverSubmission | undefined> {
    const [submission] = await db.select().from(ftaWaiverSubmissions).where(eq(ftaWaiverSubmissions.id, id));
    return submission;
  }

  async getFtaWaiverSubmissionsByEmail(email: string): Promise<FtaWaiverSubmission[]> {
    return db
      .select()
      .from(ftaWaiverSubmissions)
      .where(eq(ftaWaiverSubmissions.studentEmail, email))
      .orderBy(desc(ftaWaiverSubmissions.signedAt));
  }

  async getFtaWaiverSubmissions(): Promise<FtaWaiverSubmission[]> {
    return db
      .select()
      .from(ftaWaiverSubmissions)
      .orderBy(desc(ftaWaiverSubmissions.signedAt));
  }

  async updateFtaWaiverSubmissionEmailSent(id: string): Promise<FtaWaiverSubmission> {
    const [updated] = await db
      .update(ftaWaiverSubmissions)
      .set({ emailSentAt: new Date() })
      .where(eq(ftaWaiverSubmissions.id, id))
      .returning();
    if (!updated) throw new Error('Waiver submission not found');
    return updated;
  }

  // ============================================
  // STUDENT FEEDBACK OPERATIONS
  // ============================================

  async createStudentFeedback(feedback: InsertStudentFeedback): Promise<StudentFeedback> {
    const [created] = await db.insert(studentFeedback).values(feedback).returning();
    return created;
  }

  async getStudentFeedback(id: string): Promise<StudentFeedbackWithDetails | undefined> {
    const result = await db.query.studentFeedback.findFirst({
      where: eq(studentFeedback.id, id),
      with: {
        student: true,
        instructor: true,
      },
    });
    return result as StudentFeedbackWithDetails | undefined;
  }

  async getStudentFeedbackByStudent(studentId: string): Promise<StudentFeedbackWithDetails[]> {
    const results = await db.query.studentFeedback.findMany({
      where: eq(studentFeedback.studentId, studentId),
      with: {
        student: true,
        instructor: true,
      },
      orderBy: [desc(studentFeedback.createdAt)],
    });
    return results as StudentFeedbackWithDetails[];
  }

  async getStudentFeedbackByInstructor(instructorId: string): Promise<StudentFeedbackWithDetails[]> {
    const results = await db.query.studentFeedback.findMany({
      where: eq(studentFeedback.instructorId, instructorId),
      with: {
        student: true,
        instructor: true,
      },
      orderBy: [desc(studentFeedback.createdAt)],
    });
    return results as StudentFeedbackWithDetails[];
  }

  async updateStudentFeedback(id: string, feedback: Partial<InsertStudentFeedback>): Promise<StudentFeedback> {
    const [updated] = await db
      .update(studentFeedback)
      .set({ ...feedback, updatedAt: new Date() })
      .where(eq(studentFeedback.id, id))
      .returning();
    return updated;
  }

  async deleteStudentFeedback(id: string): Promise<void> {
    await db.delete(studentFeedback).where(eq(studentFeedback.id, id));
  }

  // ============================================
  // ONLINE COURSE ENROLLMENT OPERATIONS
  // ============================================

  async createOnlineCourseEnrollment(enrollment: InsertOnlineCourseEnrollment): Promise<OnlineCourseEnrollment> {
    const [created] = await db.insert(onlineCourseEnrollments).values(enrollment).returning();
    return created;
  }

  async getOnlineCourseEnrollment(id: string): Promise<OnlineCourseEnrollmentWithUser | undefined> {
    const result = await db.query.onlineCourseEnrollments.findFirst({
      where: eq(onlineCourseEnrollments.id, id),
      with: {
        user: true,
      },
    });
    return result as OnlineCourseEnrollmentWithUser | undefined;
  }

  async getOnlineCourseEnrollmentByPaymentIntent(paymentIntentId: string): Promise<OnlineCourseEnrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(onlineCourseEnrollments)
      .where(eq(onlineCourseEnrollments.stripePaymentIntentId, paymentIntentId));
    return enrollment;
  }

  async getOnlineCourseEnrollmentsByEmail(email: string): Promise<OnlineCourseEnrollment[]> {
    return db
      .select()
      .from(onlineCourseEnrollments)
      .where(eq(onlineCourseEnrollments.email, email))
      .orderBy(desc(onlineCourseEnrollments.createdAt));
  }

  async updateOnlineCourseEnrollment(
    id: string, 
    data: Partial<InsertOnlineCourseEnrollment & { 
      status?: string; 
      moodleSyncAttempts?: number; 
      moodleSyncError?: string | null; 
      moodleSyncedAt?: Date | null;
      emailNotificationSent?: boolean;
      smsNotificationSent?: boolean;
    }>
  ): Promise<OnlineCourseEnrollment> {
    const [updated] = await db
      .update(onlineCourseEnrollments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(onlineCourseEnrollments.id, id))
      .returning();
    if (!updated) throw new Error('Online course enrollment not found');
    return updated;
  }

  async getOnlineCourseEnrollments(): Promise<OnlineCourseEnrollmentWithUser[]> {
    const results = await db.query.onlineCourseEnrollments.findMany({
      with: {
        user: true,
      },
      orderBy: [desc(onlineCourseEnrollments.createdAt)],
    });
    return results as OnlineCourseEnrollmentWithUser[];
  }

  async updateOnlineCourseEnrollmentStatus(id: string, status: string): Promise<OnlineCourseEnrollment> {
    return this.updateOnlineCourseEnrollment(id, { status });
  }

  async updateOnlineCourseEnrollmentMoodleInfo(
    id: string, 
    data: { 
      moodleUserId: number; 
      moodleUsername: string; 
      moodlePassword?: string; 
      moodleCourseId: number; 
      moodleSyncedAt: Date;
    }
  ): Promise<OnlineCourseEnrollment> {
    return this.updateOnlineCourseEnrollment(id, {
      moodleUserId: data.moodleUserId,
      moodleUsername: data.moodleUsername,
      moodlePassword: data.moodlePassword,
      moodleCourseId: data.moodleCourseId,
      moodleSyncedAt: data.moodleSyncedAt,
    });
  }

  async updateOnlineCourseEnrollmentMoodleSyncError(id: string, error: string): Promise<OnlineCourseEnrollment> {
    const enrollment = await this.getOnlineCourseEnrollment(id);
    const currentAttempts = enrollment?.moodleSyncAttempts || 0;
    return this.updateOnlineCourseEnrollment(id, { 
      moodleSyncError: error,
      moodleSyncAttempts: currentAttempts + 1,
    });
  }

  async updateOnlineCourseEnrollmentNotificationStatus(
    id: string,
    type: 'email' | 'sms',
    sent: boolean
  ): Promise<OnlineCourseEnrollment> {
    if (type === 'email') {
      return this.updateOnlineCourseEnrollment(id, { emailNotificationSent: sent });
    } else {
      return this.updateOnlineCourseEnrollment(id, { smsNotificationSent: sent });
    }
  }

  // --- License Reminder Methods ---

  async getStudentsWithLicenseData(): Promise<User[]> {
    const students = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'student'),
          or(
            isNotNull(users.concealedCarryLicenseExpiration),
            isNotNull(users.concealedCarryLicenseIssued)
          )
        )
      );
    return students;
  }

  async getActiveEnrollmentsByStudentAndCourseType(studentId: string, courseType: string): Promise<any[]> {
    const results = await db
      .select()
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(courses.courseType, courseType),
          notInArray(enrollments.status, ['cancelled']),
          ne(enrollments.paymentStatus, 'refunded')
        )
      );
    return results;
  }

  async getCompletedEnrollmentsByCourseType(courseType: string, afterDate: Date): Promise<any[]> {
    const results = await db
      .select({
        enrollment: enrollments,
        course: courses,
        schedule: courseSchedules,
        student: users,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(courseSchedules, eq(enrollments.scheduleId, courseSchedules.id))
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(
        and(
          eq(courses.courseType, courseType),
          eq(enrollments.status, 'completed'),
          gte(courseSchedules.endDate, afterDate)
        )
      );
    return results;
  }

  async getNextAvailableCourseByType(courseType: string): Promise<{ course: any; schedule: any } | null> {
    const now = new Date();
    const results = await db
      .select({
        course: courses,
        schedule: courseSchedules,
      })
      .from(courseSchedules)
      .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
      .where(
        and(
          eq(courses.courseType, courseType),
          eq(courses.isActive, true),
          gt(courseSchedules.startDate, now),
          gt(courseSchedules.availableSpots, 0),
          isNull(courseSchedules.deletedAt)
        )
      )
      .orderBy(asc(courseSchedules.startDate))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async getLicenseReminderLog(userId: string, reminderType: string, snapshotDate: Date): Promise<LicenseReminderLog | null> {
    const [log] = await db
      .select()
      .from(licenseReminderLogs)
      .where(
        and(
          eq(licenseReminderLogs.userId, userId),
          eq(licenseReminderLogs.reminderType, reminderType),
          or(
            eq(licenseReminderLogs.licenseExpirationDate, snapshotDate),
            eq(licenseReminderLogs.licenseIssuedDate, snapshotDate)
          )
        )
      )
      .limit(1);
    return log || null;
  }

  async createLicenseReminderLog(log: InsertLicenseReminderLog): Promise<LicenseReminderLog> {
    const [newLog] = await db
      .insert(licenseReminderLogs)
      .values(log)
      .returning();
    return newLog;
  }
}

export const storage = new DatabaseStorage();