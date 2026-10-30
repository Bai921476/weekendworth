export type Role = 'student' | 'merchant' | 'admin';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';
export type JobStatus = 'active' | 'paused' | 'closed' | 'pending' | 'rejected';
export type ShiftStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus =
  | 'applied'
  | 'accepted'
  | 'rejected'
  | 'waitlisted'
  | 'withdrawn'
  | 'expired';

export type OrderStatus =
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled_by_student'
  | 'cancelled_by_merchant'
  | 'no_show'
  | 'disputed'
  | 'resolved';

export type SettlementStatus =
  | 'escrowed'
  | 'pending_release'
  | 'released'
  | 'refunded'
  | 'partial_refund'
  | 'held';

export type Category = '餐饮' | '零售' | '活动' | '宠物' | '其他';
export type DayKey = 'sat' | 'sun';

export interface Availability {
  day: DayKey;
  start: string;
  end: string;
}

export interface Student {
  id: string;
  name: string;
  avatarColor: string;
  school: string;
  campus: string;
  grade: string;
  major: string;
  bio: string;
  skills: string[];
  preferredCategories: Category[];
  availability: Availability[];
  maxRadiusKm: number;
  credit: number;
  completedCount: number;
  noShowCount: number;
  verification: VerificationStatus;
  walletCents: number;
  createdAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  category: Category;
  ownerName: string;
  phone: string;
  address: string;
  area: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  cover: string;
  description: string;
  guarantee: boolean;
  verificationStatus: VerificationStatus;
  spentCents: number;
  createdAt: string;
}

export interface Shift {
  id: string;
  jobId: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  status: ShiftStatus;
  checkinCode: string;
}

export interface Job {
  id: string;
  merchantId: string;
  title: string;
  category: Category;
  description: string;
  requirements: string[];
  skills: string[];
  payType: 'daily' | 'hourly';
  payCents: number;
  addressArea: string;
  distanceKm: number;
  tags: string[];
  cover: string;
  status: JobStatus;
  moderation: 'ok' | 'flagged' | 'removed';
  flagReason?: string;
  createdAt: string;
  shifts: Shift[];
}

export interface Application {
  id: string;
  jobId: string;
  shiftId: string;
  studentId: string;
  status: ApplicationStatus;
  matchScore: number;
  matchReasons: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  applicationId: string;
  jobId: string;
  shiftId: string;
  studentId: string;
  merchantId: string;
  status: OrderStatus;
  checkinAt?: string;
  checkoutAt?: string;
  workMinutes?: number;
  payCents: number;
  settlementStatus: SettlementStatus;
  cancelReason?: string;
  creditDelta?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  fromRole: 'student' | 'merchant';
  fromId: string;
  toId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  role: Role;
  type: 'application' | 'accepted' | 'cancelled' | 'checkin' | 'settlement' | 'review' | 'system';
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  initiatorRole: 'student' | 'merchant';
  reason: string;
  detail: string;
  status: 'open' | 'resolved';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface VerificationCase {
  id: string;
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface WalletTxn {
  id: string;
  userId: string;
  orderId: string;
  type: 'escrow_in' | 'release' | 'refund' | 'compensation';
  amountCents: number;
  balanceAfterCents: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorRole: Role;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AppState {
  schemaVersion: 1;
  currentRole: Role;
  currentStudentId: string;
  currentMerchantId: string;
  students: Student[];
  merchants: Merchant[];
  jobs: Job[];
  applications: Application[];
  orders: Order[];
  reviews: Review[];
  notifications: AppNotification[];
  disputes: Dispute[];
  verificationCases: VerificationCase[];
  walletTxns: WalletTxn[];
  auditEvents: AuditEvent[];
}

export interface ActionResult {
  ok: boolean;
  message: string;
  code?: string;
}

export interface ApplyResult extends ActionResult {
  applicationId?: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  gaps: string[];
  blocked: boolean;
  blockReason?: string;
}

export interface JobWithMeta {
  job: Job;
  merchant: Merchant;
  shift: Shift | null;
  filled: number;
  match: MatchResult;
  applied: boolean;
}
