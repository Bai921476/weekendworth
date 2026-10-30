import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { AppState, ApplyResult, ActionResult, Role, Student, Merchant } from './types';
import type { CreateJobInput } from './logic';
import { makeSeed } from './seed';
import {
  acceptApplication,
  applyToShift,
  cancelOrder,
  checkIn,
  checkOut,
  confirmCompletion,
  createJob,
  markNoShow,
  moderateJob,
  rejectApplication,
  resolveDispute,
  reviewVerification,
  submitReview,
  toggleJobStatus,
  waitlistApplication,
  withdrawApplication,
} from './logic';
import { ADMIN_USER_ID } from './logic';

const STORAGE_KEY = 'weekendworth.demo.v1';

type Action =
  | { type: 'set'; state: AppState }
  | { type: 'reset' }
  | { type: 'role'; role: Role };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set':
      return action.state;
    case 'reset':
      return makeSeed();
    case 'role':
      return { ...state, currentRole: action.role };
    default:
      return state;
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeSeed();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.students) ||
      !Array.isArray(parsed.jobs) ||
      !Array.isArray(parsed.applications) ||
      !Array.isArray(parsed.orders)
    ) {
      return makeSeed();
    }
    return parsed as AppState;
  } catch {
    return makeSeed();
  }
}

interface StoreValue {
  state: AppState;
  currentStudent: Student;
  currentMerchant: Merchant;
  currentUserId: string;
  unreadCount: number;
  switchRole: (role: Role) => void;
  resetDemo: () => void;
  markNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  apply: (shiftId: string, note: string) => ApplyResult;
  accept: (applicationId: string) => ActionResult & { orderId?: string };
  reject: (applicationId: string) => ActionResult;
  waitlist: (applicationId: string) => ActionResult;
  withdraw: (applicationId: string) => ActionResult;
  cancel: (orderId: string, actor: 'student' | 'merchant', reason: string) => ActionResult;
  checkin: (orderId: string, code: string) => ActionResult;
  checkout: (orderId: string) => ActionResult;
  confirm: (orderId: string) => ActionResult;
  review: (
    orderId: string,
    fromRole: 'student' | 'merchant',
    rating: 1 | 2 | 3 | 4 | 5,
    tags: string[],
    comment: string,
  ) => ActionResult;
  publishJob: (input: CreateJobInput) => { result: ActionResult; jobId?: string };
  changeJobStatus: (jobId: string, action: 'pause' | 'resume' | 'close') => ActionResult;
  verifyMerchant: (merchantId: string, approve: boolean, note: string) => ActionResult;
  inspectJob: (jobId: string, action: 'approve' | 'remove') => ActionResult;
  resolveDisputeAction: (disputeId: string, resolution: 'release' | 'partial' | 'reject', note: string) => ActionResult;
  noShow: (orderId: string) => ActionResult;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode / quota: keep running with in-memory state.
    }
  }, [state]);

  const commit = useCallback((next: AppState) => {
    dispatch({ type: 'set', state: next });
  }, []);

  const switchRole = useCallback((role: Role) => {
    dispatch({ type: 'role', role });
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    dispatch({ type: 'reset' });
  }, []);

  const currentStudent =
    (state.students.find((s) => s.id === state.currentStudentId) ?? state.students[0]) as Student;
  const currentMerchant =
    (state.merchants.find((m) => m.id === state.currentMerchantId) ?? state.merchants[0]) as Merchant;

  const currentUserId =
    state.currentRole === 'student'
      ? currentStudent.id
      : state.currentRole === 'merchant'
        ? currentMerchant.id
        : ADMIN_USER_ID;

  const markNotificationsRead = useCallback(() => {
    commit({
      ...state,
      notifications: state.notifications.map((n) =>
        n.userId === currentUserId ? { ...n, read: true } : n,
      ),
    });
  }, [state, currentUserId, commit]);

  const markNotificationRead = useCallback(
    (id: string) => {
      commit({
        ...state,
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      });
    },
    [state, commit],
  );

  const unreadCount = state.notifications.filter(
    (n) => n.userId === currentUserId && !n.read,
  ).length;

  const apply = useCallback(
    (shiftId: string, note: string) => {
      const outcome = applyToShift(state, currentStudent.id, shiftId, note);
      if (outcome.result.ok) commit(outcome.state);
      return { ...outcome.result, applicationId: outcome.applicationId };
    },
    [state, currentStudent.id, commit],
  );

  const accept = useCallback(
    (applicationId: string) => {
      const outcome = acceptApplication(state, applicationId);
      if (outcome.result.ok) commit(outcome.state);
      return { ...outcome.result, orderId: outcome.orderId };
    },
    [state, commit],
  );

  const reject = useCallback(
    (applicationId: string) => {
      const outcome = rejectApplication(state, applicationId);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const waitlist = useCallback(
    (applicationId: string) => {
      const outcome = waitlistApplication(state, applicationId);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const withdraw = useCallback(
    (applicationId: string) => {
      const outcome = withdrawApplication(state, applicationId);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const cancel = useCallback(
    (orderId: string, actor: 'student' | 'merchant', reason: string) => {
      const outcome = cancelOrder(state, orderId, actor, reason);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const checkin = useCallback(
    (orderId: string, code: string) => {
      const outcome = checkIn(state, orderId, code);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const checkout = useCallback(
    (orderId: string) => {
      const outcome = checkOut(state, orderId);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const confirm = useCallback(
    (orderId: string) => {
      const outcome = confirmCompletion(state, orderId, currentMerchant.id);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, currentMerchant.id, commit],
  );

  const review = useCallback(
    (
      orderId: string,
      fromRole: 'student' | 'merchant',
      rating: 1 | 2 | 3 | 4 | 5,
      tags: string[],
      comment: string,
    ) => {
      const outcome = submitReview(state, orderId, fromRole, rating, tags, comment);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const publishJob = useCallback(
    (input: CreateJobInput) => {
      const outcome = createJob(state, currentMerchant.id, input);
      if (outcome.result.ok) commit(outcome.state);
      return { result: outcome.result, jobId: outcome.jobId };
    },
    [state, currentMerchant.id, commit],
  );

  const changeJobStatus = useCallback(
    (jobId: string, action: 'pause' | 'resume' | 'close') => {
      const outcome = toggleJobStatus(state, jobId, action);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const verifyMerchant = useCallback(
    (merchantId: string, approve: boolean, note: string) => {
      const outcome = reviewVerification(state, merchantId, approve, note);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const inspectJob = useCallback(
    (jobId: string, action: 'approve' | 'remove') => {
      const outcome = moderateJob(state, jobId, action);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const resolveDisputeAction = useCallback(
    (disputeId: string, resolution: 'release' | 'partial' | 'reject', note: string) => {
      const outcome = resolveDispute(state, disputeId, resolution, note);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, commit],
  );

  const noShow = useCallback(
    (orderId: string) => {
      const outcome = markNoShow(state, orderId, currentMerchant.id);
      if (outcome.result.ok) commit(outcome.state);
      return outcome.result;
    },
    [state, currentMerchant.id, commit],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      currentStudent,
      currentMerchant,
      currentUserId,
      unreadCount,
      switchRole,
      resetDemo,
      markNotificationsRead,
      markNotificationRead,
      apply,
      accept,
      reject,
      waitlist,
      withdraw,
      cancel,
      checkin,
      checkout,
      confirm,
      review,
      publishJob,
      changeJobStatus,
      verifyMerchant,
      inspectJob,
      resolveDisputeAction,
      noShow,
    }),
    [
      state,
      currentStudent,
      currentMerchant,
      currentUserId,
      unreadCount,
      switchRole,
      resetDemo,
      markNotificationsRead,
      markNotificationRead,
      apply,
      accept,
      reject,
      waitlist,
      withdraw,
      cancel,
      checkin,
      checkout,
      confirm,
      review,
      publishJob,
      changeJobStatus,
      verifyMerchant,
      inspectJob,
      resolveDisputeAction,
      noShow,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useApp(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}

export { STORAGE_KEY };
