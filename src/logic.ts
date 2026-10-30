import type {
  AppNotification,
  AppState,
  Application,
  ApplyResult,
  ActionResult,
  Availability,
  Job,
  MatchResult,
  Merchant,
  Order,
  Review,
  Shift,
  Student,
  WalletTxn,
} from './types';
import {
  clamp,
  dayKey,
  formatDate,
  formatMoney,
  minutes,
  shiftHours,
  shiftMinutes,
  uid,
} from './utils';

const ACTIVE_ORDER_STATUSES: Order['status'][] = [
  'confirmed',
  'checked_in',
  'completed',
  'disputed',
  'resolved',
];

export const ADMIN_USER_ID = 'admin_zhou';

export function getJob(state: AppState, jobId: string): Job | undefined {
  return state.jobs.find((j) => j.id === jobId);
}

export function getShift(state: AppState, shiftId: string): Shift | undefined {
  for (const job of state.jobs) {
    const found = job.shifts.find((s) => s.id === shiftId);
    if (found) return found;
  }
  return undefined;
}

export function getJobOfShift(state: AppState, shiftId: string): Job | undefined {
  return state.jobs.find((j) => j.shifts.some((s) => s.id === shiftId));
}

export function getMerchant(state: AppState, merchantId: string): Merchant | undefined {
  return state.merchants.find((m) => m.id === merchantId);
}

export function getStudent(state: AppState, studentId: string): Student | undefined {
  return state.students.find((s) => s.id === studentId);
}

export function getApplication(state: AppState, applicationId: string): Application | undefined {
  return state.applications.find((a) => a.id === applicationId);
}

export function getOrder(state: AppState, orderId: string): Order | undefined {
  return state.orders.find((o) => o.id === orderId);
}

export function getOrderForApplication(state: AppState, applicationId: string): Order | undefined {
  return state.orders.find((o) => o.applicationId === applicationId);
}

export function getFilled(state: AppState, shiftId: string): number {
  return state.orders.filter(
    (o) => o.shiftId === shiftId && ACTIVE_ORDER_STATUSES.includes(o.status),
  ).length;
}

export function getShiftOrders(state: AppState, shiftId: string): Order[] {
  return state.orders.filter((o) => o.shiftId === shiftId);
}

export function getShiftRemaining(state: AppState, shift: Shift): number {
  return Math.max(0, shift.headcount - getFilled(state, shift.id));
}

export function isShiftFull(state: AppState, shift: Shift): boolean {
  return getFilled(state, shift.id) >= shift.headcount;
}

export function getApplicationForShift(
  state: AppState,
  studentId: string,
  shiftId: string,
): Application | undefined {
  return state.applications.find(
    (a) =>
      a.studentId === studentId &&
      a.shiftId === shiftId &&
      !['withdrawn', 'rejected', 'expired'].includes(a.status),
  );
}

export function getReviewsForOrder(state: AppState, orderId: string): Review[] {
  return state.reviews.filter((r) => r.orderId === orderId);
}

export function getStudentReviewForOrder(
  state: AppState,
  orderId: string,
  role: 'student' | 'merchant',
): Review | undefined {
  return state.reviews.find((r) => r.orderId === orderId && r.fromRole === role);
}

export function getMerchantReviews(state: AppState, merchantId: string): Review[] {
  return state.reviews
    .filter((r) => r.fromRole === 'student' && r.toId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMerchantJobs(state: AppState, merchantId: string): Job[] {
  return state.jobs.filter((j) => j.merchantId === merchantId);
}

export function getJobApplications(state: AppState, jobId: string): Application[] {
  return state.applications
    .filter((a) => a.jobId === jobId)
    .sort((a, b) => b.matchScore - a.matchScore || a.createdAt.localeCompare(b.createdAt));
}

export function getStudentApplications(state: AppState, studentId: string): Application[] {
  return state.applications
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getStudentOrders(state: AppState, studentId: string): Order[] {
  return state.orders
    .filter((o) => o.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMerchantOrders(state: AppState, merchantId: string): Order[] {
  return state.orders
    .filter((o) => o.merchantId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUnreadCount(state: AppState, userId: string): number {
  return state.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function getVerificationCase(state: AppState, merchantId: string) {
  return state.verificationCases.find((v) => v.merchantId === merchantId);
}

export function getOpenDisputes(state: AppState) {
  return state.disputes.filter((d) => d.status === 'open');
}

export function getAvailability(student: Student, shift: Shift): Availability | undefined {
  return student.availability.find((a) => a.day === dayKey(shift.date));
}

export function coversShift(student: Student, shift: Shift): boolean {
  const a = getAvailability(student, shift);
  if (!a) return false;
  return minutes(a.start) <= minutes(shift.startTime) && minutes(a.end) >= minutes(shift.endTime);
}

export function hasOverlappingOrder(
  state: AppState,
  studentId: string,
  shift: Shift,
  ignoreOrderId?: string,
): Order | undefined {
  const start = minutes(shift.startTime);
  const end = minutes(shift.endTime);
  return state.orders.find((o) => {
    if (o.studentId !== studentId || o.id === ignoreOrderId) return false;
    if (!['confirmed', 'checked_in'].includes(o.status)) return false;
    if (o.shiftId === shift.id) return true;
    const other = getShift(state, o.shiftId);
    if (!other) return false;
    if (other.date !== shift.date) return false;
    return minutes(other.startTime) < end && start < minutes(other.endTime);
  });
}

export function scoreShift(
  state: AppState,
  studentId: string,
  job: Job,
  shift: Shift,
): MatchResult {
  const student = getStudent(state, studentId);
  if (!student) {
    return {
      score: 0,
      reasons: [],
      gaps: ['请先完善学生档案'],
      blocked: true,
      blockReason: '请先完善学生档案',
    };
  }

  const full = isShiftFull(state, shift);
  const applied = Boolean(getApplicationForShift(state, studentId, shift.id));
  const blockedReasons: string[] = [];
  if (job.status !== 'active' || job.moderation !== 'ok') blockedReasons.push('岗位当前不可报名');
  if (!['open', 'full'].includes(shift.status)) blockedReasons.push('班次已结束');
  if (applied) blockedReasons.push('你已经报名过这个班次');
  if (shiftHours(shift) > 8) blockedReasons.push('单班次超过 8 小时');
  if (job.distanceKm > student.maxRadiusKm) blockedReasons.push(`超出你设置的 ${student.maxRadiusKm}km 距离`);
  if (student.credit < 40) blockedReasons.push('信用分低于报名门槛');
  if (!coversShift(student, shift)) blockedReasons.push('空闲时间不覆盖该班次');

  const overlap = hasOverlappingOrder(state, studentId, shift);
  if (overlap) blockedReasons.push('与已确认班次时间冲突');

  const activeApplications = state.applications.filter(
    (a) => a.studentId === studentId && ['applied', 'waitlisted'].includes(a.status),
  ).length;
  if (activeApplications >= 3 && !applied) blockedReasons.push('最多同时报名 3 个班次');

  const avail = getAvailability(student, shift);
  let timeFactor = 0;
  if (avail) {
    const bufferBefore = minutes(shift.startTime) - minutes(avail.start);
    const bufferAfter = minutes(avail.end) - minutes(shift.endTime);
    if (bufferBefore >= 0 && bufferAfter >= 0) {
      timeFactor = bufferBefore >= 60 && bufferAfter >= 60 ? 1 : 0.8;
    } else {
      timeFactor = 0.5;
    }
  }

  const distanceFactor =
    job.distanceKm <= 1
      ? 1
      : clamp(1 - ((job.distanceKm - 1) / Math.max(0.1, student.maxRadiusKm - 1)) * 0.6, 0.4, 1);

  const matchedSkills = job.skills.filter((s) => student.skills.includes(s));
  const skillFactor =
    job.skills.length === 0 ? 0.6 : matchedSkills.length === job.skills.length ? 1 : matchedSkills.length > 0 ? 0.8 : 0.45;

  const creditFactor = clamp((student.credit - 40) / 80, 0, 1);
  const preferenceFactor = student.preferredCategories.includes(job.category) ? 1 : 0.65;
  const activityFactor = 1;
  const newStudentBoost = student.completedCount === 0 ? 5 : 0;

  const raw =
    100 *
      (0.3 * timeFactor +
        0.2 * distanceFactor +
        0.2 * skillFactor +
        0.15 * creditFactor +
        0.1 * preferenceFactor +
        0.05 * activityFactor) +
    newStudentBoost;
  const score = Math.round(clamp(raw, 0, 100));

  const reasons: string[] = [];
  if (timeFactor >= 0.8) reasons.push(`时间匹配：${formatDate(shift.date)} ${shift.startTime}–${shift.endTime}`);
  if (job.distanceKm <= student.maxRadiusKm) {
    reasons.push(`距离 ${job.distanceKm.toFixed(1)}km，骑行约 ${Math.max(3, Math.round(job.distanceKm * 5))} 分钟`);
  }
  if (matchedSkills.length > 0) reasons.push(`技能匹配：${matchedSkills.join('、')}`);
  if (student.credit >= 100) reasons.push(`信用 ${student.credit}，履约记录良好`);
  if (preferenceFactor === 1) reasons.push(`你偏好的${job.category}类班次`);
  if (reasons.length < 2 && job.tags[0]) reasons.push(job.tags[0]);

  const gaps: string[] = [];
  const missingSkills = job.skills.filter((s) => !student.skills.includes(s));
  if (missingSkills.length > 0) gaps.push(`岗位需要${missingSkills.join('、')}，可在备注说明`);
  if (full) gaps.push('当前已满员，可加入候补');
  if (timeFactor < 1 && timeFactor > 0) gaps.push('班次前后缓冲较少，注意通勤');
  if (gaps.length === 0) gaps.push('报名后请留意商家确认消息');

  return {
    score,
    reasons: reasons.slice(0, 2),
    gaps: gaps.slice(0, 2),
    blocked: blockedReasons.length > 0,
    blockReason: blockedReasons[0],
  };
}

export interface ApplyOptions {
  waitlist?: boolean;
}

export function canApply(
  state: AppState,
  studentId: string,
  shiftId: string,
  options: ApplyOptions = {},
): ActionResult {
  const job = getJobOfShift(state, shiftId);
  const shift = getShift(state, shiftId);
  const student = getStudent(state, studentId);
  if (!job || !shift) return { ok: false, code: 'NOT_FOUND', message: '班次不存在' };
  if (!student) return { ok: false, code: 'NOT_FOUND', message: '学生不存在' };
  if (job.status !== 'active' || job.moderation !== 'ok') {
    return { ok: false, code: 'INVALID_STATE', message: '岗位当前不可报名' };
  }
  if (!['open', 'full'].includes(shift.status)) {
    return { ok: false, code: 'INVALID_STATE', message: '该班次已结束' };
  }
  if (getApplicationForShift(state, studentId, shiftId)) {
    return { ok: false, code: 'DUPLICATE_APPLICATION', message: '你已经报名过这个班次' };
  }
  if (isShiftFull(state, shift) && !options.waitlist) {
    return { ok: false, code: 'SHIFT_FULL', message: '这个班次刚满员，可以加入候补' };
  }
  if (shiftHours(shift) > 8) {
    return { ok: false, code: 'INVALID_STATE', message: '单班次不能超过 8 小时' };
  }
  if (job.distanceKm > student.maxRadiusKm) {
    return { ok: false, code: 'OUT_OF_RADIUS', message: `该岗位超出你设置的 ${student.maxRadiusKm}km 范围` };
  }
  if (student.credit < 40) {
    return { ok: false, code: 'RESTRICTED', message: '信用分不足，暂时无法报名' };
  }
  if (!coversShift(student, shift)) {
    return { ok: false, code: 'SCHEDULE_CONFLICT', message: '空闲时间不覆盖该班次' };
  }
  const overlap = hasOverlappingOrder(state, studentId, shift);
  if (overlap) {
    return { ok: false, code: 'SCHEDULE_CONFLICT', message: '与已确认班次时间冲突' };
  }
  const activeApplications = state.applications.filter(
    (a) => a.studentId === studentId && ['applied', 'waitlisted'].includes(a.status),
  ).length;
  if (activeApplications >= 3) {
    return { ok: false, code: 'APPLICATION_LIMIT', message: '最多同时报名 3 个班次' };
  }
  return { ok: true, message: '可以报名' };
}

function addNotification(
  state: AppState,
  input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
): AppState {
  const notification: AppNotification = {
    ...input,
    id: uid('noti'),
    read: false,
    createdAt: new Date().toISOString(),
  };
  return { ...state, notifications: [notification, ...state.notifications] };
}

function addAudit(
  state: AppState,
  actorRole: AppState['currentRole'],
  action: string,
  target: string,
  meta?: Record<string, unknown>,
): AppState {
  return {
    ...state,
    auditEvents: [
      {
        id: uid('audit'),
        actorRole,
        action,
        target,
        meta,
        createdAt: new Date().toISOString(),
      },
      ...state.auditEvents,
    ],
  };
}

function updateShift(
  state: AppState,
  shiftId: string,
  updater: (shift: Shift) => Shift,
): AppState {
  return {
    ...state,
    jobs: state.jobs.map((job) =>
      job.shifts.some((s) => s.id === shiftId)
        ? { ...job, shifts: job.shifts.map((s) => (s.id === shiftId ? updater(s) : s)) }
        : job,
    ),
  };
}

function updateOrder(state: AppState, orderId: string, updater: (order: Order) => Order): AppState {
  return {
    ...state,
    orders: state.orders.map((o) => (o.id === orderId ? updater(o) : o)),
  };
}

function updateApplication(
  state: AppState,
  applicationId: string,
  updater: (application: Application) => Application,
): AppState {
  return {
    ...state,
    applications: state.applications.map((a) => (a.id === applicationId ? updater(a) : a)),
  };
}

function adjustCredit(state: AppState, studentId: string, delta: number): AppState {
  return {
    ...state,
    students: state.students.map((s) =>
      s.id === studentId ? { ...s, credit: clamp(s.credit + delta, 0, 120) } : s,
    ),
  };
}

function addWallet(
  state: AppState,
  studentId: string,
  orderId: string,
  amountCents: number,
): AppState {
  const student = getStudent(state, studentId);
  if (!student) return state;
  const balanceAfterCents = student.walletCents + amountCents;
  const txn: WalletTxn = {
    id: uid('txn'),
    userId: studentId,
    orderId,
    type: amountCents >= 0 ? 'release' : 'refund',
    amountCents,
    balanceAfterCents,
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    students: state.students.map((s) =>
      s.id === studentId ? { ...s, walletCents: balanceAfterCents } : s,
    ),
    walletTxns: [txn, ...state.walletTxns],
  };
}

export function applyToShift(
  state: AppState,
  studentId: string,
  shiftId: string,
  note: string,
): { state: AppState; result: ApplyResult; applicationId?: string } {
  const job = getJobOfShift(state, shiftId);
  const shift = getShift(state, shiftId);
  const student = getStudent(state, studentId);
  if (!job || !shift || !student) {
    return { state, result: { ok: false, code: 'NOT_FOUND', message: '班次不存在' } };
  }
  const full = isShiftFull(state, shift);
  const check = canApply(state, studentId, shiftId, { waitlist: full });
  if (!check.ok) return { state, result: check };

  const match = scoreShift(state, studentId, job, shift);
  const application: Application = {
    id: uid('app'),
    jobId: job.id,
    shiftId,
    studentId,
    status: full ? 'waitlisted' : 'applied',
    matchScore: match.score,
    matchReasons: match.reasons,
    note: note.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let next: AppState = {
    ...state,
    applications: [application, ...state.applications],
  };
  next = addNotification(next, {
    userId: job.merchantId,
    role: 'merchant',
    type: 'application',
    title: `${student.name}报名了${job.title}`,
    body: full ? '班次已满，已进入候补。' : `匹配分 ${match.score}，去看看吧。`,
    link: `/merchant/jobs/${job.id}/applicants`,
  });
  next = addNotification(next, {
    userId: studentId,
    role: 'student',
    type: 'application',
    title: full ? '已加入候补' : '报名成功，等待确认',
    body: `${job.title} · ${formatDate(shift.date)} ${shift.startTime}–${shift.endTime}`,
    link: '/student/gigs',
  });
  next = addAudit(next, 'student', 'apply', application.id, { jobId: job.id, shiftId });
  return { state: next, result: { ok: true, message: full ? '已加入候补' : '报名成功' }, applicationId: application.id };
}

export function acceptApplication(
  state: AppState,
  applicationId: string,
): { state: AppState; result: ActionResult; orderId?: string } {
  const app = getApplication(state, applicationId);
  if (!app) return { state, result: { ok: false, code: 'NOT_FOUND', message: '报名不存在' } };
  if (!['applied', 'waitlisted'].includes(app.status)) {
    return { state, result: { ok: false, code: 'INVALID_STATE', message: '该报名已处理' } };
  }
  const job = getJob(state, app.jobId);
  const shift = getShift(state, app.shiftId);
  const student = getStudent(state, app.studentId);
  if (!job || !shift || !student) {
    return { state, result: { ok: false, code: 'NOT_FOUND', message: '数据不完整' } };
  }
  if (isShiftFull(state, shift)) {
    return { state, result: { ok: false, code: 'SHIFT_FULL', message: '班次已满，无法继续录用' } };
  }
  const overlap = hasOverlappingOrder(state, app.studentId, shift);
  if (overlap) {
    return { state, result: { ok: false, code: 'SCHEDULE_CONFLICT', message: '该学生已有冲突班次' } };
  }

  const order: Order = {
    id: uid('ord'),
    applicationId: app.id,
    jobId: job.id,
    shiftId: shift.id,
    studentId: app.studentId,
    merchantId: job.merchantId,
    status: 'confirmed',
    payCents: job.payCents,
    settlementStatus: 'escrowed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let next: AppState = {
    ...state,
    applications: state.applications.map((a) =>
      a.id === app.id ? { ...a, status: 'accepted', updatedAt: new Date().toISOString() } : a,
    ),
    orders: [order, ...state.orders],
  };
  const filled = getFilled(next, shift.id);
  next = updateShift(next, shift.id, (s) => ({
    ...s,
    status: filled >= s.headcount ? 'full' : s.status,
  }));
  next = addNotification(next, {
    userId: app.studentId,
    role: 'student',
    type: 'accepted',
    title: `你被录用了：${job.title}`,
    body: `${formatDate(shift.date)} ${shift.startTime}–${shift.endTime}，记得提前 10 分钟到店。`,
    link: '/student/gigs',
  });
  next = addAudit(next, 'merchant', 'accept_application', app.id, { orderId: order.id });
  return { state: next, result: { ok: true, message: '已录用' }, orderId: order.id };
}

export function rejectApplication(
  state: AppState,
  applicationId: string,
): { state: AppState; result: ActionResult } {
  const app = getApplication(state, applicationId);
  if (!app) return { state, result: { ok: false, message: '报名不存在' } };
  if (!['applied', 'waitlisted'].includes(app.status)) {
    return { state, result: { ok: false, message: '该报名已处理' } };
  }
  const job = getJob(state, app.jobId);
  let next = updateApplication(state, applicationId, (a) => ({
    ...a,
    status: 'rejected',
    updatedAt: new Date().toISOString(),
  }));
  next = addNotification(next, {
    userId: app.studentId,
    role: 'student',
    type: 'application',
    title: `报名结果：${job?.title ?? '岗位'}`,
    body: '商家这次没有选中你，可以看看其他班次。',
    link: '/student',
  });
  next = addAudit(next, 'merchant', 'reject_application', applicationId);
  return { state: next, result: { ok: true, message: '已拒绝' } };
}

export function waitlistApplication(
  state: AppState,
  applicationId: string,
): { state: AppState; result: ActionResult } {
  const app = getApplication(state, applicationId);
  if (!app) return { state, result: { ok: false, message: '报名不存在' } };
  if (app.status !== 'applied') {
    return { state, result: { ok: false, message: '只有待处理报名可以转候补' } };
  }
  let next = updateApplication(state, applicationId, (a) => ({
    ...a,
    status: 'waitlisted',
    updatedAt: new Date().toISOString(),
  }));
  next = addNotification(next, {
    userId: app.studentId,
    role: 'student',
    type: 'application',
    title: '你已进入候补',
    body: '班次出现空位时会自动通知你。',
    link: '/student/gigs',
  });
  next = addAudit(next, 'merchant', 'waitlist_application', applicationId);
  return { state: next, result: { ok: true, message: '已加入候补' } };
}

export function withdrawApplication(
  state: AppState,
  applicationId: string,
): { state: AppState; result: ActionResult } {
  const app = getApplication(state, applicationId);
  if (!app) return { state, result: { ok: false, message: '报名不存在' } };
  const order = getOrderForApplication(state, applicationId);
  if (order && ['confirmed', 'checked_in'].includes(order.status)) {
    return cancelOrder(state, order.id, 'student', '学生撤回报名');
  }
  if (!['applied', 'waitlisted'].includes(app.status)) {
    return { state, result: { ok: false, message: '当前状态不能撤回' } };
  }
  const next = updateApplication(state, applicationId, (a) => ({
    ...a,
    status: 'withdrawn',
    updatedAt: new Date().toISOString(),
  }));
  return { state: next, result: { ok: true, message: '已撤回报名' } };
}


function createOrderForApplication(
  state: AppState,
  app: Application,
  job: Job,
  shift: Shift,
): AppState {
  const order: Order = {
    id: uid('ord'),
    applicationId: app.id,
    jobId: job.id,
    shiftId: shift.id,
    studentId: app.studentId,
    merchantId: job.merchantId,
    status: 'confirmed',
    payCents: job.payCents,
    settlementStatus: 'escrowed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  let next: AppState = {
    ...state,
    applications: state.applications.map((a) =>
      a.id === app.id ? { ...a, status: 'accepted', updatedAt: new Date().toISOString() } : a,
    ),
    orders: [order, ...state.orders],
  };
  const filled = getFilled(next, shift.id);
  next = updateShift(next, shift.id, (s) => ({
    ...s,
    status: filled >= s.headcount ? 'full' : 'open',
  }));
  next = addNotification(next, {
    userId: app.studentId,
    role: 'student',
    type: 'accepted',
    title: `候补成功：${job.title}`,
    body: `${formatDate(shift.date)} ${shift.startTime}–${shift.endTime}，工作卡已生成。`,
    link: '/student/gigs',
  });
  return next;
}

function promoteWaitlist(state: AppState, shiftId: string, actor: 'merchant' | 'admin' = 'merchant'): AppState {
  const shift = getShift(state, shiftId);
  if (!shift || ['completed', 'cancelled'].includes(shift.status)) return state;
  let next = state;
  let guard = 0;
  while (getFilled(next, shiftId) < shift.headcount && guard < 10) {
    guard += 1;
    const candidates = next.applications
      .filter((a) => a.shiftId === shiftId && a.status === 'waitlisted')
      .sort((a, b) => b.matchScore - a.matchScore || a.createdAt.localeCompare(b.createdAt));
    if (candidates.length === 0) break;
    const candidate = candidates[0];
    const currentShift = getShift(next, shiftId);
    if (!currentShift) break;
    const overlap = hasOverlappingOrder(next, candidate.studentId, currentShift);
    if (overlap) {
      next = updateApplication(next, candidate.id, (a) => ({
        ...a,
        status: 'expired',
        updatedAt: new Date().toISOString(),
      }));
      continue;
    }
    const job = getJob(next, candidate.jobId);
    if (!job) break;
    next = createOrderForApplication(next, candidate, job, currentShift);
    next = addAudit(next, actor, 'promote_waitlist', candidate.id, { shiftId });
    break;
  }
  const finalFilled = getFilled(next, shiftId);
  next = updateShift(next, shiftId, (s) => ({
    ...s,
    status: finalFilled >= s.headcount ? 'full' : 'open',
  }));
  return next;
}

function shiftStart(shift: Shift): Date {
  const [y, m, d] = shift.date.split('-').map(Number);
  const [h, min] = shift.startTime.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function cancelOrder(
  state: AppState,
  orderId: string,
  actor: 'student' | 'merchant',
  reason: string,
): { state: AppState; result: ActionResult } {
  const order = getOrder(state, orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  if (!['confirmed', 'checked_in'].includes(order.status)) {
    return { state, result: { ok: false, message: '当前状态不能取消' } };
  }
  if (order.status === 'checked_in') {
    return { state, result: { ok: false, message: '已签到，请先完成签退或联系商家' } };
  }
  const shift = getShift(state, order.shiftId);
  const job = getJob(state, order.jobId);
  if (!shift || !job) return { state, result: { ok: false, message: '班次信息缺失' } };

  let creditDelta = 0;
  if (actor === 'student') {
    const hoursUntil = (shiftStart(shift).getTime() - Date.now()) / 3600000;
    creditDelta = hoursUntil > 24 ? 0 : hoursUntil > 12 ? -3 : -8;
  } else {
    creditDelta = 0;
  }

  let next = updateOrder(state, orderId, (o) => ({
    ...o,
    status: actor === 'student' ? 'cancelled_by_student' : 'cancelled_by_merchant',
    settlementStatus: 'refunded',
    cancelReason: reason || '用户取消',
    creditDelta,
    updatedAt: new Date().toISOString(),
  }));
  if (creditDelta !== 0) next = adjustCredit(next, order.studentId, creditDelta);
  next = updateShift(next, shift.id, (s) => ({
    ...s,
    status: s.status === 'full' ? 'open' : s.status,
  }));
  next = addNotification(next, {
    userId: actor === 'student' ? order.merchantId : order.studentId,
    role: actor === 'student' ? 'merchant' : 'student',
    type: 'cancelled',
    title: actor === 'student' ? '有学生取消了班次' : '商家取消了班次',
    body: `${job.title} · ${formatDate(shift.date)} ${shift.startTime}–${shift.endTime}。${reason || ''}`,
    link: actor === 'student' ? '/merchant/fulfillment' : '/student/gigs',
  });
  next = addAudit(next, actor, 'cancel_order', orderId, { reason, creditDelta });
  next = promoteWaitlist(next, shift.id);
  return {
    state: next,
    result: { ok: true, message: creditDelta < 0 ? `已取消，信用 ${creditDelta}` : '已取消' },
  };
}

export function checkIn(
  state: AppState,
  orderId: string,
  code: string,
): { state: AppState; result: ActionResult } {
  const order = getOrder(state, orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  if (order.status === 'checked_in') return { state, result: { ok: true, message: '已签到' } };
  if (order.status !== 'confirmed') {
    return { state, result: { ok: false, message: '当前状态不能签到' } };
  }
  const shift = getShift(state, order.shiftId);
  const job = getJob(state, order.jobId);
  if (!shift || !job) return { state, result: { ok: false, message: '班次信息缺失' } };
  if (code.trim() !== shift.checkinCode) {
    return { state, result: { ok: false, code: 'INVALID_CODE', message: '签到码不正确，请向商家确认' } };
  }
  const now = new Date().toISOString();
  let next = updateOrder(state, orderId, (o) => ({
    ...o,
    status: 'checked_in',
    checkinAt: now,
    updatedAt: now,
  }));
  next = updateShift(next, shift.id, (s) => ({ ...s, status: 'in_progress' }));
  next = addNotification(next, {
    userId: order.merchantId,
    role: 'merchant',
    type: 'checkin',
    title: '学生已签到',
    body: `${getStudent(state, order.studentId)?.name ?? '学生'} 已到店，班次 ${shift.startTime}–${shift.endTime}。`,
    link: '/merchant/fulfillment',
  });
  next = addAudit(next, 'student', 'check_in', orderId);
  return { state: next, result: { ok: true, message: '签到成功' } };
}

export function checkOut(
  state: AppState,
  orderId: string,
): { state: AppState; result: ActionResult } {
  const order = getOrder(state, orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  if (order.status !== 'checked_in') {
    return { state, result: { ok: false, message: '请先签到' } };
  }
  const shift = getShift(state, order.shiftId);
  if (!shift) return { state, result: { ok: false, message: '班次信息缺失' } };
  const now = new Date().toISOString();
  const workMinutes = shiftMinutes(shift);
  let next = updateOrder(state, orderId, (o) => ({
    ...o,
    status: 'completed',
    checkoutAt: now,
    workMinutes,
    settlementStatus: 'pending_release',
    updatedAt: now,
  }));
  next = updateShift(next, shift.id, (s) => ({ ...s, status: 'completed' }));
  next = addNotification(next, {
    userId: order.merchantId,
    role: 'merchant',
    type: 'settlement',
    title: '学生已签退，待确认工时',
    body: `${getStudent(state, order.studentId)?.name ?? '学生'} 已完成 ${(workMinutes / 60).toFixed(1)} 小时，工资 ${formatMoney(order.payCents)}。`,
    link: '/merchant/fulfillment',
  });
  next = addAudit(next, 'student', 'check_out', orderId, { workMinutes });
  return { state: next, result: { ok: true, message: '签退成功，等待商家确认' } };
}

export function confirmCompletion(
  state: AppState,
  orderId: string,
  merchantId: string,
): { state: AppState; result: ActionResult } {
  const order = getOrder(state, orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  if (order.merchantId !== merchantId) return { state, result: { ok: false, message: '无权操作' } };
  if (order.status !== 'completed' || order.settlementStatus !== 'pending_release') {
    return { state, result: { ok: false, message: '当前状态不能确认结算' } };
  }
  let next = updateOrder(state, orderId, (o) => ({
    ...o,
    settlementStatus: 'released',
    updatedAt: new Date().toISOString(),
  }));
  next = addWallet(next, order.studentId, orderId, order.payCents);
  next = {
    ...next,
    merchants: next.merchants.map((m) =>
      m.id === order.merchantId ? { ...m, spentCents: m.spentCents + order.payCents } : m,
    ),
    students: next.students.map((s) =>
      s.id === order.studentId ? { ...s, completedCount: s.completedCount + 1 } : s,
    ),
  };
  next = adjustCredit(next, order.studentId, 1);
  next = addNotification(next, {
    userId: order.studentId,
    role: 'student',
    type: 'settlement',
    title: '工资已释放（模拟）',
    body: `${formatMoney(order.payCents)} 已进入你的演示钱包，记得评价商家。`,
    link: '/student/gigs',
  });
  next = addAudit(next, 'merchant', 'confirm_completion', orderId, { amountCents: order.payCents });
  return { state: next, result: { ok: true, message: `已释放 ${formatMoney(order.payCents)}` } };
}

export function submitReview(
  state: AppState,
  orderId: string,
  fromRole: 'student' | 'merchant',
  rating: 1 | 2 | 3 | 4 | 5,
  tags: string[],
  comment: string,
): { state: AppState; result: ActionResult } {
  const order = getOrder(state, orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  if (!['completed', 'resolved'].includes(order.status)) {
    return { state, result: { ok: false, message: '完成履约后才能评价' } };
  }
  if (getStudentReviewForOrder(state, orderId, fromRole)) {
    return { state, result: { ok: false, message: '你已经评价过了' } };
  }
  const job = getJob(state, order.jobId);
  if (!job) return { state, result: { ok: false, message: '岗位不存在' } };
  const fromId = fromRole === 'student' ? order.studentId : order.merchantId;
  const toId = fromRole === 'student' ? order.merchantId : order.studentId;
  const review: Review = {
    id: uid('rev'),
    orderId,
    fromRole,
    fromId,
    toId,
    rating,
    tags,
    comment: comment.trim().slice(0, 200),
    createdAt: new Date().toISOString(),
  };
  let next: AppState = { ...state, reviews: [review, ...state.reviews] };
  if (fromRole === 'student') {
    next = {
      ...next,
      merchants: next.merchants.map((m) => {
        if (m.id !== order.merchantId) return m;
        const count = m.reviewCount + 1;
        return {
          ...m,
          rating: Math.round(((m.rating * m.reviewCount + rating) / count) * 10) / 10,
          reviewCount: count,
        };
      }),
    };
  } else if (rating === 5) {
    next = adjustCredit(next, order.studentId, 1);
  }
  next = addNotification(next, {
    userId: toId,
    role: fromRole === 'student' ? 'merchant' : 'student',
    type: 'review',
    title: '收到一条新评价',
    body: `${rating} 星 · ${job.title}`,
    link: fromRole === 'student' ? '/merchant' : '/student/gigs',
  });
  next = addAudit(next, fromRole, 'submit_review', orderId, { rating });
  return { state: next, result: { ok: true, message: '评价已提交' } };
}

export interface CreateJobInput {
  title: string;
  category: Job['category'];
  description: string;
  requirements: string[];
  skills: string[];
  payType: Job['payType'];
  payCents: number;
  addressArea: string;
  distanceKm: number;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  urgent?: boolean;
}

export function createJob(
  state: AppState,
  merchantId: string,
  input: CreateJobInput,
): { state: AppState; result: ActionResult; jobId?: string } {
  const merchant = getMerchant(state, merchantId);
  if (!merchant) return { state, result: { ok: false, message: '商家不存在' } };
  if (merchant.verificationStatus !== 'verified') {
    return { state, result: { ok: false, message: '商家认证通过后才能发布岗位' } };
  }
  const jobId = uid('job');
  const shiftId = uid('sh');
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const job: Job = {
    id: jobId,
    merchantId,
    title: input.title.trim(),
    category: input.category,
    description: input.description.trim(),
    requirements: input.requirements.filter(Boolean),
    skills: input.skills.filter(Boolean),
    payType: input.payType,
    payCents: input.payCents,
    addressArea: input.addressArea,
    distanceKm: input.distanceKm,
    tags: input.urgent ? ['加急', '新发布'] : ['新发布'],
    cover: merchant.cover,
    status: 'active',
    moderation: 'ok',
    createdAt: new Date().toISOString(),
    shifts: [
      {
        id: shiftId,
        jobId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        headcount: input.headcount,
        status: 'open',
        checkinCode: code,
      },
    ],
  };
  let next: AppState = { ...state, jobs: [job, ...state.jobs] };
  next = addNotification(next, {
    userId: merchantId,
    role: 'merchant',
    type: 'system',
    title: '岗位发布成功',
    body: `${job.title} 已开始匹配周边学生。`,
    link: `/merchant/jobs/${jobId}/applicants`,
  });
  next = addAudit(next, 'merchant', 'create_job', jobId);
  return { state: next, result: { ok: true, message: '发布成功' }, jobId };
}

export function toggleJobStatus(
  state: AppState,
  jobId: string,
  action: 'pause' | 'resume' | 'close',
): { state: AppState; result: ActionResult } {
  const job = getJob(state, jobId);
  if (!job) return { state, result: { ok: false, message: '岗位不存在' } };
  if (action === 'pause' && job.status !== 'active') {
    return { state, result: { ok: false, message: '只有招募中的岗位可以暂停' } };
  }
  if (action === 'resume' && job.status !== 'paused') {
    return { state, result: { ok: false, message: '只有暂停的岗位可以恢复' } };
  }
  if (action === 'close' && ['closed', 'rejected'].includes(job.status)) {
    return { state, result: { ok: false, message: '岗位已关闭' } };
  }
  const status: Job['status'] = action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'closed';
  let next: AppState = {
    ...state,
    jobs: state.jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status,
            shifts: j.shifts.map((s) => ({
              ...s,
              status: action === 'close' ? 'cancelled' : s.status === 'cancelled' ? 'open' : s.status,
            })),
          }
        : j,
    ),
  };
  next = addAudit(next, 'merchant', `${action}_job`, jobId);
  return { state: next, result: { ok: true, message: action === 'pause' ? '已暂停' : action === 'resume' ? '已恢复' : '已关闭' } };
}

export function reviewVerification(
  state: AppState,
  merchantId: string,
  approve: boolean,
  note: string,
): { state: AppState; result: ActionResult } {
  const merchant = getMerchant(state, merchantId);
  if (!merchant) return { state, result: { ok: false, message: '商家不存在' } };
  const now = new Date().toISOString();
  let next: AppState = {
    ...state,
    merchants: state.merchants.map((m) =>
      m.id === merchantId
        ? { ...m, verificationStatus: approve ? 'verified' : 'rejected' }
        : m,
    ),
    verificationCases: state.verificationCases.map((v) =>
      v.merchantId === merchantId
        ? { ...v, status: approve ? 'approved' : 'rejected', note, reviewedAt: now }
        : v,
    ),
    jobs: state.jobs.map((j) => {
      if (j.merchantId !== merchantId) return j;
      if (approve && j.status === 'pending') return { ...j, status: 'active' };
      if (!approve && j.status === 'pending') return { ...j, status: 'rejected' };
      return j;
    }),
  };
  next = addNotification(next, {
    userId: merchantId,
    role: 'merchant',
    type: 'system',
    title: approve ? '商家认证已通过' : '商家认证未通过',
    body: approve ? '现在可以发布岗位了。' : note || '请补充资料后重新提交。',
    link: '/merchant',
  });
  next = addAudit(next, 'admin', 'review_verification', merchantId, { approve, note });
  return { state: next, result: { ok: true, message: approve ? '已通过认证' : '已驳回' } };
}

export function moderateJob(
  state: AppState,
  jobId: string,
  action: 'approve' | 'remove',
): { state: AppState; result: ActionResult } {
  const job = getJob(state, jobId);
  if (!job) return { state, result: { ok: false, message: '岗位不存在' } };
  let next: AppState = {
    ...state,
    jobs: state.jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            moderation: action === 'approve' ? 'ok' : 'removed',
            status: action === 'remove' ? 'rejected' : j.status === 'rejected' ? 'active' : j.status,
            shifts: action === 'remove' ? j.shifts.map((s) => ({ ...s, status: 'cancelled' })) : j.shifts,
          }
        : j,
    ),
  };
  next = addNotification(next, {
    userId: job.merchantId,
    role: 'merchant',
    type: 'system',
    title: action === 'remove' ? '岗位已被下架' : '岗位巡检已通过',
    body: action === 'remove' ? job.flagReason || '岗位信息不符合平台规范。' : '岗位信息正常。',
    link: '/merchant/jobs',
  });
  next = addAudit(next, 'admin', action === 'remove' ? 'remove_job' : 'approve_job', jobId);
  return { state: next, result: { ok: true, message: action === 'remove' ? '已下架' : '已通过' } };
}

export function resolveDispute(
  state: AppState,
  disputeId: string,
  resolution: 'release' | 'partial' | 'reject',
  note: string,
): { state: AppState; result: ActionResult } {
  const dispute = state.disputes.find((d) => d.id === disputeId);
  if (!dispute) return { state, result: { ok: false, message: '纠纷不存在' } };
  if (dispute.status === 'resolved') return { state, result: { ok: false, message: '纠纷已处理' } };
  const order = getOrder(state, dispute.orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  const now = new Date().toISOString();
  const paid = order.settlementStatus === 'released';
  let next = state;
  let studentAmount = 0;
  let settlement: Order['settlementStatus'] = 'released';
  let resolutionText = '';
  if (resolution === 'release') {
    studentAmount = order.payCents;
    settlement = 'released';
    resolutionText = '支持学生：全额释放工资';
  } else if (resolution === 'partial') {
    studentAmount = Math.round(order.payCents / 2);
    settlement = 'partial_refund';
    resolutionText = '各承担一半：释放 50% 工资';
  } else {
    studentAmount = 0;
    settlement = 'refunded';
    resolutionText = '支持商家：驳回学生诉求';
  }
  next = updateOrder(next, order.id, (o) => ({
    ...o,
    status: 'resolved',
    settlementStatus: settlement,
    updatedAt: now,
  }));
  if (!paid && studentAmount > 0) {
    next = addWallet(next, order.studentId, order.id, studentAmount);
    next = {
      ...next,
      merchants: next.merchants.map((m) =>
        m.id === order.merchantId ? { ...m, spentCents: m.spentCents + studentAmount } : m,
      ),
    };
  }
  next = {
    ...next,
    disputes: next.disputes.map((d) =>
      d.id === disputeId
        ? {
            ...d,
            status: 'resolved',
            resolution: `${resolutionText}${note ? ` · ${note}` : ''}`,
            resolvedAt: now,
          }
        : d,
    ),
  };
  next = addNotification(next, {
    userId: order.studentId,
    role: 'student',
    type: 'settlement',
    title: '纠纷已处理',
    body: `${resolutionText}。${note}`,
    link: '/student/gigs',
  });
  next = addNotification(next, {
    userId: order.merchantId,
    role: 'merchant',
    type: 'settlement',
    title: '纠纷已处理',
    body: `${resolutionText}。${note}`,
    link: '/merchant/fulfillment',
  });
  next = addAudit(next, 'admin', 'resolve_dispute', disputeId, { resolution, note });
  return { state: next, result: { ok: true, message: '纠纷已处理' } };
}

export function markNoShow(
  state: AppState,
  orderId: string,
  merchantId: string,
): { state: AppState; result: ActionResult } {
  const order = getOrder(state, orderId);
  if (!order) return { state, result: { ok: false, message: '订单不存在' } };
  if (order.merchantId !== merchantId) return { state, result: { ok: false, message: '无权操作' } };
  if (order.status !== 'confirmed') {
    return { state, result: { ok: false, message: '当前状态不能标记爽约' } };
  }
  let next = updateOrder(state, orderId, (o) => ({
    ...o,
    status: 'no_show',
    settlementStatus: 'refunded',
    creditDelta: -15,
    updatedAt: new Date().toISOString(),
  }));
  next = adjustCredit(next, order.studentId, -15);
  next = {
    ...next,
    students: next.students.map((s) =>
      s.id === order.studentId ? { ...s, noShowCount: s.noShowCount + 1 } : s,
    ),
  };
  next = updateShift(next, order.shiftId, (s) => ({ ...s, status: 'open' }));
  next = addNotification(next, {
    userId: order.studentId,
    role: 'student',
    type: 'cancelled',
    title: '商家标记了爽约',
    body: '信用分 -15，如有异议可联系运营。',
    link: '/student/gigs',
  });
  next = addAudit(next, 'merchant', 'mark_no_show', orderId);
  next = promoteWaitlist(next, order.shiftId);
  return { state: next, result: { ok: true, message: '已标记爽约' } };
}
