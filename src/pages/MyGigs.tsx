import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircleMore,
  Star,
  Wallet,
} from 'lucide-react';
import type { Application, Job, Merchant, Order, Shift } from '../types';
import { useApp } from '../store';
import { getOrderForApplication, getStudentReviewForOrder } from '../logic';
import { cn, formatDate, formatMoney, relativeTime, shiftHours } from '../utils';
import { ReviewModal } from '../components/ReviewModal';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Modal,
  StatusPill,
  useToast,
} from '../components/UI';

type TabKey = 'pending' | 'upcoming' | 'active' | 'settle' | 'done';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'pending', label: '待确认' },
  { key: 'upcoming', label: '待上岗' },
  { key: 'active', label: '进行中' },
  { key: 'settle', label: '待结算' },
  { key: 'done', label: '已完成' },
];

interface GigItem {
  application: Application;
  job: Job;
  merchant: Merchant;
  shift: Shift;
  order: Order | undefined;
  tab: TabKey;
}

function tabFor(application: Application, order?: Order): TabKey {
  if (!order) {
    return application.status === 'applied' || application.status === 'waitlisted'
      ? 'pending'
      : 'done';
  }
  if (order.status === 'confirmed') return 'upcoming';
  if (order.status === 'checked_in') return 'active';
  if (order.status === 'completed') {
    return order.settlementStatus === 'released' ? 'done' : 'settle';
  }
  return 'done';
}

export function MyGigsPage() {
  const { state, currentStudent, withdraw, cancel } = useApp();
  const navigate = useNavigate();
  const { push } = useToast();

  const items = useMemo<GigItem[]>(() => {
    return state.applications
      .filter((a) => a.studentId === currentStudent.id)
      .map((application) => {
        const job = state.jobs.find((j) => j.id === application.jobId);
        if (!job) return null;
        const merchant = state.merchants.find((m) => m.id === job.merchantId);
        const shift = job.shifts.find((s) => s.id === application.shiftId);
        if (!merchant || !shift) return null;
        const order = getOrderForApplication(state, application.id);
        return {
          application,
          job,
          merchant,
          shift,
          order,
          tab: tabFor(application, order),
        };
      })
      .filter((item): item is GigItem => item !== null)
      .sort((a, b) => (a.shift.date + a.shift.startTime).localeCompare(b.shift.date + b.shift.startTime));
  }, [state, currentStudent.id]);

  const initialTab: TabKey = items.some((item) => item.tab === 'active')
    ? 'active'
    : items.some((item) => item.tab === 'upcoming')
      ? 'upcoming'
      : items.some((item) => item.tab === 'settle')
        ? 'settle'
        : items.some((item) => item.tab === 'pending')
          ? 'pending'
          : 'done';

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [reviewTarget, setReviewTarget] = useState<GigItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<GigItem | null>(null);
  const [cancelReason, setCancelReason] = useState('时间有变，无法到岗');
  const [cancelError, setCancelError] = useState('');

  const counts = TABS.reduce<Record<TabKey, number>>(
    (acc, item) => ({ ...acc, [item.key]: items.filter((x) => x.tab === item.key).length }),
    { pending: 0, upcoming: 0, active: 0, settle: 0, done: 0 },
  );

  const visible = items.filter((item) => item.tab === tab);
  const wallet = currentStudent.walletCents;
  const upcomingCount = counts.upcoming + counts.active;

  function handleWithdraw(item: GigItem) {
    const result = withdraw(item.application.id);
    push(result.message, result.ok ? 'success' : 'error');
  }

  function handleCancel() {
    if (!cancelTarget?.order) return;
    const result = cancel(cancelTarget.order.id, 'student', cancelReason);
    if (!result.ok) {
      setCancelError(result.message);
      return;
    }
    setCancelTarget(null);
    push(result.message, 'success');
  }

  return (
    <div className="page gigs-page" data-testid="my-gigs">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">我的兼职</span>
          <h1>这周末，安排明白</h1>
          <p>报名、录用、签到、结算，都在这里往下走。</p>
        </div>
        <div className="gig-summary">
          <div>
            <span>待上岗</span>
            <strong>{upcomingCount}</strong>
          </div>
          <div>
            <span>待结算</span>
            <strong>{counts.settle}</strong>
          </div>
          <div>
            <span>演示钱包</span>
            <strong>{formatMoney(wallet)}</strong>
          </div>
        </div>
      </header>

      <div className="gig-tabs" role="tablist" aria-label="兼职状态">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={cn('gig-tab', tab === item.key && 'is-active')}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            {counts[item.key] > 0 && <span>{counts[item.key]}</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={26} />}
          title={tab === 'done' ? '还没有完成的班次' : '这一栏暂时空着'}
          description={
            tab === 'pending'
              ? '去发现页看看附近班次，报名后就会出现在这里。'
              : tab === 'upcoming'
                ? '商家录用后，工作卡会在这里出现。'
                : '完成一次履约后，这里会留下记录。'
          }
          action={<Button onClick={() => navigate('/student')}>去发现班次</Button>}
        />
      ) : (
        <div className="gig-list">
          {visible.map((item) => {
            const reviewed = Boolean(
              item.order && getStudentReviewForOrder(state, item.order.id, 'student'),
            );
            const isDone = item.tab === 'done';
            const canReview =
              Boolean(item.order) &&
              item.order?.status === 'completed' &&
              item.order.settlementStatus === 'released' &&
              !reviewed;
            return (
              <article key={item.application.id} className="gig-card" data-testid="gig-card">
                <div className="gig-card-head">
                  <div className="gig-merchant">
                    <Avatar name={item.merchant.ownerName} color="#F0E3D1" size={38} />
                    <div>
                      <strong>{item.merchant.name}</strong>
                      <span>
                        <MapPin size={12} /> {item.job.distanceKm}km · {item.job.addressArea}
                      </span>
                    </div>
                  </div>
                  <StatusPill status={item.order?.status ?? item.application.status} />
                </div>

                <div className="gig-card-main">
                  <div>
                    <Link to={`/student/jobs/${item.job.id}`} className="gig-title">
                      {item.job.title}
                    </Link>
                    <div className="gig-meta">
                      <span>
                        <Clock3 size={14} /> {formatDate(item.shift.date)} {item.shift.startTime}–{item.shift.endTime}
                      </span>
                      <span>{shiftHours(item.shift)}h</span>
                      <span>{formatMoney(item.job.payCents)}</span>
                    </div>
                  </div>
                  <div className="gig-pay">
                    <strong>{formatMoney(item.job.payCents)}</strong>
                    <span>{item.order ? '模拟结算' : '待录用'}</span>
                  </div>
                </div>

                <div className="gig-progress">
                  {['报名', '录用', '签到', '结算'].map((step, index) => {
                    const order = item.order;
                    const done =
                      index === 0 ||
                      (index === 1 && Boolean(order)) ||
                      (index === 2 && Boolean(order?.checkinAt)) ||
                      (index === 3 && order?.settlementStatus === 'released');
                    return (
                      <span key={step} className={cn('gig-step', done && 'is-done')}>
                        <i>{done ? <CheckCircle2 size={12} /> : index + 1}</i>
                        {step}
                      </span>
                    );
                  })}
                </div>

                {item.application.status === 'waitlisted' && (
                  <div className="gig-note amber">
                    <Clock3 size={14} /> 候补中。有人取消时会自动递补，保持手机可达。
                  </div>
                )}
                {item.order?.status === 'confirmed' && (
                  <div className="gig-note">
                    <CheckCircle2 size={14} /> 已录用，记得提前 10 分钟到店。
                  </div>
                )}
                {item.order?.status === 'checked_in' && (
                  <div className="gig-note green">
                    <Clock3 size={14} /> 已签到，结束后记得签退。
                  </div>
                )}
                {item.tab === 'settle' && (
                  <div className="gig-note amber">
                    <Wallet size={14} /> 已签退，等待商家确认工时（演示版可立即确认）。
                  </div>
                )}
                {item.order && (
                  <div className="gig-footnote">
                    报名于 {relativeTime(item.application.createdAt)}
                    {item.order.workMinutes ? ` · 本次工时 ${(item.order.workMinutes / 60).toFixed(1)}h` : ''}
                  </div>
                )}

                <div className="gig-actions">
                  {item.tab === 'pending' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleWithdraw(item)}>
                        撤回报名
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => navigate('/student')}>
                        看看其他班次
                      </Button>
                    </>
                  )}
                  {item.tab === 'upcoming' && item.order && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(item)}>
                        取消
                      </Button>
                      <Link to={`/student/work/${item.order.id}`} className="btn btn-primary btn-sm" data-testid="work-card-link">
                        查看工作卡 <ArrowRight size={15} />
                      </Link>
                    </>
                  )}
                  {item.tab === 'active' && item.order && (
                    <Link to={`/student/work/${item.order.id}`} className="btn btn-primary btn-sm">
                      去签退 <ArrowRight size={15} />
                    </Link>
                  )}
                  {item.tab === 'settle' && item.order && (
                    <Link to={`/student/work/${item.order.id}`} className="btn btn-secondary btn-sm">
                      查看进度 <ArrowRight size={15} />
                    </Link>
                  )}
                  {isDone && item.order && (
                    <>
                      {canReview && (
                        <Button size="sm" onClick={() => setReviewTarget(item)} data-testid="review-button">
                          <Star size={15} /> 去评价
                        </Button>
                      )}
                      {reviewed && (
                        <Badge tone="green">
                          <CheckCircle2 size={12} /> 已评价
                        </Badge>
                      )}
                      <Link to={`/student/work/${item.order.id}`} className="btn btn-secondary btn-sm">
                        查看详情
                      </Link>
                    </>
                  )}
                  {isDone && !item.order && (
                    <Button size="sm" variant="secondary" onClick={() => navigate('/student')}>
                      再找一个班次
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="gigs-tip">
        <MessageCircleMore size={18} />
        <span>
          <strong>遇到问题？</strong> 先联系商家；协商不成，可联系运营处理。演示版不提供真实客服。
        </span>
      </div>

      {reviewTarget?.order && (
        <ReviewModal
          open
          onClose={() => setReviewTarget(null)}
          orderId={reviewTarget.order.id}
          title="评价这次兼职"
          subtitle={`${reviewTarget.job.title} · ${reviewTarget.merchant.name}`}
          role="student"
        />
      )}

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => {
          setCancelTarget(null);
          setCancelError('');
        }}
        title="取消这个班次？"
        description="取消会释放名额，并可能影响信用分。"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCancelTarget(null);
                setCancelError('');
              }}
            >
              再想想
            </Button>
            <Button variant="danger" onClick={handleCancel}>
              确认取消
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <>
            <div className="apply-modal-summary">
              <div>
                <span>班次</span>
                <strong>{formatDate(cancelTarget.shift.date)}</strong>
              </div>
              <div>
                <span>时间</span>
                <strong>
                  {cancelTarget.shift.startTime}–{cancelTarget.shift.endTime}
                </strong>
              </div>
            </div>
            <div className="cancel-rules">
              <p>开始前 24 小时以上取消：不扣信用。</p>
              <p>12–24 小时取消：信用 -3。</p>
              <p>12 小时内取消：信用 -8。</p>
            </div>
            <label className="field">
              <span className="field-label">取消原因</span>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="告诉商家一声，方便他们补人。"
              />
            </label>
            {cancelError && <div className="form-error">{cancelError}</div>}
          </>
        )}
      </Modal>
    </div>
  );
}
