import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Star,
  Wallet,
} from 'lucide-react';
import type { Order } from '../types';
import { useApp } from '../store';
import {
  getMerchantOrders,
  getStudentReviewForOrder,
} from '../logic';
import { formatDate, formatMoney, relativeTime } from '../utils';
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

export function FulfillmentPage() {
  const { state, currentMerchant, confirm, noShow } = useApp();
  const { push } = useToast();
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Order | null>(null);

  const orders = useMemo(
    () => getMerchantOrders(state, currentMerchant.id),
    [state, currentMerchant.id],
  );
  const pending = orders.filter((o) => o.settlementStatus === 'pending_release');
  const toCheckin = orders.filter((o) => o.status === 'confirmed');
  const released = orders.filter((o) => o.settlementStatus === 'released');
  const totalReleased = released.reduce((sum, o) => sum + o.payCents, 0);

  function handleConfirm() {
    if (!confirmTarget) return;
    const result = confirm(confirmTarget.id);
    push(result.message, result.ok ? 'success' : 'error');
    if (result.ok) setConfirmTarget(null);
  }

  function handleNoShow(order: Order) {
    const result = noShow(order.id);
    push(result.message, result.ok ? 'success' : 'error');
  }

  return (
    <div className="page fulfillment-page" data-testid="fulfillment-page">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">履约与结算</span>
          <h1>谁来上班，谁来结钱</h1>
          <p>到岗名单、工时确认、模拟结算，一处看清。</p>
        </div>
        <div className="fulfillment-summary">
          <div>
            <span>待确认工时</span>
            <strong>{pending.length}</strong>
          </div>
          <div>
            <span>待签到</span>
            <strong>{toCheckin.length}</strong>
          </div>
          <div>
            <span>已结算（模拟）</span>
            <strong>{formatMoney(totalReleased)}</strong>
          </div>
        </div>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={26} />}
          title="还没有履约记录"
          description="录用学生后，签到、签退和结算会出现在这里。"
          action={<Link to="/merchant/jobs" className="btn btn-primary btn-sm">去看岗位</Link>}
        />
      ) : (
        <div className="fulfillment-list">
          {orders.map((order) => {
            const job = state.jobs.find((j) => j.id === order.jobId);
            const shift = job?.shifts.find((s) => s.id === order.shiftId);
            const student = state.students.find((s) => s.id === order.studentId);
            if (!job || !shift || !student) return null;
            const merchantReviewed = getStudentReviewForOrder(state, order.id, 'merchant');
            const canConfirm = order.status === 'completed' && order.settlementStatus === 'pending_release';
            const canReview = order.settlementStatus === 'released' && !merchantReviewed;
            return (
              <article key={order.id} className="fulfillment-card">
                <div className="fulfillment-card-head">
                  <div className="fulfillment-person">
                    <Avatar name={student.name} color={student.avatarColor} size={42} />
                    <div>
                      <strong>{student.name}</strong>
                      <span>{job.title}</span>
                    </div>
                  </div>
                  <StatusPill status={order.status} />
                </div>

                <div className="fulfillment-meta">
                  <span>
                    <CalendarCheck size={14} /> {formatDate(shift.date)} {shift.startTime}–{shift.endTime}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {order.checkinAt ? `签到 ${new Date(order.checkinAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '未签到'}
                  </span>
                  <span>
                    <Wallet size={14} /> {formatMoney(order.payCents)}
                  </span>
                </div>

                <div className="fulfillment-status-row">
                  <div>
                    <span>签到</span>
                    <strong className={order.checkinAt ? 'green-text' : 'muted-text'}>
                      {order.checkinAt ? '已到店' : '未签到'}
                    </strong>
                  </div>
                  <div>
                    <span>签退 / 工时</span>
                    <strong>
                      {order.workMinutes ? `${(order.workMinutes / 60).toFixed(1)}h` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>结算</span>
                    <StatusPill status={order.settlementStatus} />
                  </div>
                </div>

                {order.status === 'no_show' && (
                  <div className="gig-note red">
                    <AlertTriangle size={14} /> 已标记爽约，信用 -15，候补已自动递补。
                  </div>
                )}
                {order.status === 'cancelled_by_student' && (
                  <div className="gig-note">
                    学生已取消：{order.cancelReason || '未填写原因'}
                  </div>
                )}
                {pending.includes(order) && (
                  <div className="gig-note amber">
                    <Clock3 size={14} /> 学生已签退，确认工时后立即释放工资（演示）。
                  </div>
                )}

                <div className="fulfillment-actions">
                  <div className="fulfillment-time">
                    {order.checkoutAt ? `签退于 ${relativeTime(order.checkoutAt)}` : `创建于 ${relativeTime(order.createdAt)}`}
                  </div>
                  <div>
                    {order.status === 'confirmed' && (
                      <Button size="sm" variant="ghost" onClick={() => handleNoShow(order)}>
                        标记爽约
                      </Button>
                    )}
                    {canConfirm && (
                      <Button size="sm" onClick={() => setConfirmTarget(order)} data-testid="confirm-completion">
                        <CheckCircle2 size={15} /> 确认工时并结算
                      </Button>
                    )}
                    {canReview && (
                      <Button size="sm" variant="secondary" onClick={() => setReviewTarget(order)}>
                        <Star size={15} /> 评价学生
                      </Button>
                    )}
                    {order.status === 'completed' && order.settlementStatus === 'released' && (
                      <Badge tone="green"><CheckCircle2 size={12} /> 已结算</Badge>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="fulfillment-tip">
        <Wallet size={18} />
        <span>
          <strong>演示结算说明：</strong> 本页面不产生真实资金流转。真实产品中，商家发布前将工资托管至合规支付机构，确认工时后 24 小时无纠纷自动释放。
        </span>
      </div>

      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        title="确认工时并结算？"
        description="确认后演示工资会立即释放到学生钱包。"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmTarget(null)}>取消</Button>
            <Button onClick={handleConfirm}>确认并结算</Button>
          </>
        }
      >
        {confirmTarget && (
          <div className="confirm-settlement">
            <div>
              <span>学生</span>
              <strong>{state.students.find((s) => s.id === confirmTarget.studentId)?.name}</strong>
            </div>
            <div>
              <span>工时</span>
              <strong>{confirmTarget.workMinutes ? `${(confirmTarget.workMinutes / 60).toFixed(1)} 小时` : '—'}</strong>
            </div>
            <div>
              <span>工资</span>
              <strong>{formatMoney(confirmTarget.payCents)}</strong>
            </div>
            <div>
              <span>平台服务费</span>
              <strong className="green-text">¥0</strong>
            </div>
          </div>
        )}
        <p className="modal-hint">确认后不可撤销；如工时存在争议，请先不要结算，联系运营处理。</p>
      </Modal>

      {reviewTarget && (
        <ReviewModal
          open
          onClose={() => setReviewTarget(null)}
          orderId={reviewTarget.id}
          title="评价这位学生"
          subtitle={`${state.students.find((s) => s.id === reviewTarget.studentId)?.name ?? '学生'} · 本次履约`}
          role="merchant"
        />
      )}

      <Link to="/merchant/jobs" className="fulfillment-back">
        去岗位管理 <ChevronRight size={15} />
      </Link>
    </div>
  );
}
