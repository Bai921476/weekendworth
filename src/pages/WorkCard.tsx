import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { useApp } from '../store';
import { getStudentReviewForOrder } from '../logic';
import { cn, formatDate, formatMoney, maskPhone, shiftHours } from '../utils';
import { ReviewModal } from '../components/ReviewModal';
import {
  Avatar,
  Badge,
  Button,
  CheckRow,
  EmptyState,
  Modal,
  StatusPill,
  useToast,
} from '../components/UI';

export function WorkCardPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { state, currentStudent, checkin, checkout } = useApp();
  const { push } = useToast();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const order = state.orders.find((o) => o.id === orderId);
  const job = order ? state.jobs.find((j) => j.id === order.jobId) : undefined;
  const merchant = order ? state.merchants.find((m) => m.id === order.merchantId) : undefined;
  const shift = order ? job?.shifts.find((s) => s.id === order.shiftId) : undefined;

  if (!order || !job || !merchant || !shift || order.studentId !== currentStudent.id) {
    return (
      <div className="page">
        <EmptyState
          title="工作卡不存在"
          description="这个订单可能已被重置，或不属于当前演示学生。"
          action={<Button onClick={() => navigate('/student/gigs')}>返回我的兼职</Button>}
        />
      </div>
    );
  }

  const reviewed = getStudentReviewForOrder(state, order.id, 'student');
  const isCancelled = ['cancelled_by_student', 'cancelled_by_merchant', 'no_show'].includes(order.status);
  const canCheckin = order.status === 'confirmed';
  const canCheckout = order.status === 'checked_in';
  const isSettled = order.settlementStatus === 'released';
  const timeline = [
    { label: '报名', done: true, time: order.createdAt },
    {
      label: '录用',
      done: ['confirmed', 'checked_in', 'completed', 'disputed', 'resolved'].includes(order.status),
      time: order.createdAt,
    },
    { label: '签到', done: Boolean(order.checkinAt), time: order.checkinAt },
    { label: '签退', done: Boolean(order.checkoutAt), time: order.checkoutAt },
    { label: '结算', done: isSettled, time: order.updatedAt },
  ];

  function submitCheckin() {
    if (!order) return;
    const result = checkin(order.id, code);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCheckinOpen(false);
    setCode('');
    push('签到成功，开始工作吧', 'success');
  }

  function submitCheckout() {
    if (!order) return;
    const result = checkout(order.id);
    if (!result.ok) {
      push(result.message, 'error');
      return;
    }
    setCheckoutOpen(false);
    push('签退成功，等待商家确认工时', 'success');
  }

  return (
    <div className="page work-page" data-testid="work-card">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> 返回我的兼职
      </button>

      <header className="work-head">
        <div>
          <span className="page-eyebrow">工作卡</span>
          <h1>{job.title}</h1>
          <p>
            {formatDate(shift.date)} {shift.startTime}–{shift.endTime} · {shiftHours(shift)} 小时
          </p>
        </div>
        <StatusPill status={order.status} />
      </header>

      {isCancelled && (
        <div className="alert-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>这个班次已取消</strong>
            <span>{order.cancelReason || '如有疑问，请联系商家或运营。'}</span>
          </div>
        </div>
      )}

      <div className="work-layout">
        <div className="work-main">
          <section className="work-card-primary">
            <div className="work-timeline">
              {timeline.map((step, index) => (
                <div key={step.label} className={cn('work-step', step.done && 'is-done')}>
                  <span className="work-step-dot">{step.done ? <CheckCircle2 size={13} /> : index + 1}</span>
                  <strong>{step.label}</strong>
                  <span>{step.time ? new Date(step.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '等待'}</span>
                </div>
              ))}
            </div>

            <div className="work-merchant">
              <Avatar name={merchant.ownerName} color="#F0E3D1" size={48} />
              <div>
                <strong>{merchant.name}</strong>
                <span>{merchant.ownerName} · 店长</span>
              </div>
              <Badge tone="green">
                <ShieldCheck size={11} /> 已认证
              </Badge>
            </div>

            <div className="work-address">
              <div>
                <MapPin size={17} />
                <span>
                  <strong>{merchant.address}</strong>
                  <small>{merchant.area} · 距校区 {merchant.distanceKm}km</small>
                </span>
              </div>
              <div>
                <Phone size={17} />
                <span>
                  <strong>{maskPhone(merchant.phone)}</strong>
                  <small>录用后可见，演示数据</small>
                </span>
              </div>
            </div>

            {!isCancelled && (
              <div className="checkin-zone">
                <div className="checkin-code">
                  <span className="checkin-code-label">
                    <QrCode size={16} /> 到店签到码
                  </span>
                  <strong>{shift.checkinCode}</strong>
                  <small>演示班次固定签到码，向商家确认后输入</small>
                </div>
                <div className="checkin-location">
                  <span className="location-pulse" />
                  <div>
                    <strong>模拟定位：已到店</strong>
                    <small>距店约 80m · 演示定位，不读取真实位置</small>
                  </div>
                </div>
              </div>
            )}

            <div className="sop-block">
              <h3>到岗清单</h3>
              <div className="sop-list">
                <CheckRow>提前 10 分钟到店，找 {merchant.ownerName} 报到</CheckRow>
                <CheckRow>穿深色上衣或围裙，长发扎起</CheckRow>
                <CheckRow>先看一遍当日流程，再开始上手</CheckRow>
                <CheckRow>结束前和店长确认工时，再签退</CheckRow>
              </div>
            </div>

            <div className="work-actions">
              {canCheckin && (
                <Button size="lg" onClick={() => { setError(''); setCheckinOpen(true); }} data-testid="checkin-button">
                  <QrCode size={18} /> 到店签到
                </Button>
              )}
              {canCheckout && (
                <Button size="lg" onClick={() => setCheckoutOpen(true)} data-testid="checkout-button">
                  <Clock3 size={18} /> 结束工作，签退
                </Button>
              )}
              {order.status === 'completed' && order.settlementStatus === 'pending_release' && (
                <div className="waiting-block">
                  <Clock3 size={19} />
                  <div>
                    <strong>已签退，等待商家确认工时</strong>
                    <span>演示版商家确认后会立即释放工资。</span>
                  </div>
                </div>
              )}
              {isSettled && (
                <div className="settled-block">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>本次工资已释放（模拟）</strong>
                    <span>{formatMoney(order.payCents)} 已进入演示钱包</span>
                  </div>
                  {!reviewed && (
                    <Button size="sm" onClick={() => setReviewOpen(true)} data-testid="review-button">
                      <Star size={15} /> 去评价
                    </Button>
                  )}
                </div>
              )}
              {order.status === 'disputed' && (
                <div className="alert-banner inline">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>订单进入纠纷处理</strong>
                    <span>运营会在 48 小时内给出处理结果。</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">结算</span>
                <h2>这笔钱怎么算</h2>
              </div>
              <Badge tone={isSettled ? 'green' : 'amber'}>
                {isSettled ? '已释放' : order.settlementStatus === 'held' ? '冻结中' : '演示托管'}
              </Badge>
            </div>
            <div className="settlement-lines">
              <div>
                <span>工作薪资</span>
                <strong>{formatMoney(order.payCents)}</strong>
              </div>
              <div>
                <span>平台服务费（学生）</span>
                <strong>¥0</strong>
              </div>
              <div className="settlement-total">
                <span>实得工资（模拟）</span>
                <strong>{formatMoney(order.payCents)}</strong>
              </div>
            </div>
            <p className="demo-note">
              <Info size={14} /> 演示版不涉及真实资金。真实产品中，工资由商家在发布前托管，履约确认后释放。
            </p>
          </section>

          {reviewed && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">你的评价</span>
                  <h2>已提交</h2>
                </div>
                <Badge tone="green">不可修改</Badge>
              </div>
              <div className="submitted-review">
                <span className="submitted-stars">
                  <Star size={16} fill="currentColor" /> {reviewed.rating}.0
                </span>
                <p>{reviewed.comment || '只打了分，没有写文字。'}</p>
                <div className="tag-row">
                  {reviewed.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="work-side">
          <section className="work-side-card">
            <span className="section-kicker">本次收入</span>
            <strong className="work-side-pay">{formatMoney(order.payCents)}</strong>
            <span className="work-side-unit">/ 班次</span>
            <div className="work-side-line">
              <Clock3 size={15} /> {shiftHours(shift)} 小时
            </div>
            <div className="work-side-line">
              <MapPin size={15} /> {merchant.distanceKm}km
            </div>
            <div className="work-side-line">
              <Wallet size={15} /> {isSettled ? '已进入演示钱包' : '工资已托管（模拟）'}
            </div>
          </section>

          <section className="side-trust">
            <h3>遇到问题</h3>
            <div>
              <Phone size={17} />
              <span>
                <strong>先联系商家</strong>
                店长 {merchant.ownerName} · {maskPhone(merchant.phone)}
              </span>
            </div>
            <div>
              <ShieldCheck size={17} />
              <span>
                <strong>再找平台</strong>
                保留签到、签退与沟通记录，运营会介入。
              </span>
            </div>
          </section>

          <button type="button" className="side-link-card" onClick={() => navigate('/student/gigs')}>
            返回我的兼职 <ArrowLeft size={15} />
          </button>
        </aside>
      </div>

      <Modal
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        title="到店签到"
        description={`${merchant.name} · 演示定位已到店（80m）`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCheckinOpen(false)}>
              取消
            </Button>
            <Button onClick={submitCheckin}>确认签到</Button>
          </>
        }
      >
        <div className="checkin-modal-location">
          <span className="location-pulse" />
          <div>
            <strong>已到店</strong>
            <span>演示定位 · 不读取真实位置</span>
          </div>
        </div>
        <label className="field">
          <span className="field-label">
            4 位签到码 <small>演示码见工作卡</small>
          </span>
          <input
            className="code-input"
            inputMode="numeric"
            maxLength={4}
            value={code}
            data-testid="checkin-input"
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••"
            autoFocus
          />
        </label>
        <p className="modal-hint">演示模式已放宽签到时间窗口，真实产品仅在班次开始前后 30 分钟内可签到。</p>
        {error && <div className="form-error">{error}</div>}
      </Modal>

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="确认签退？"
        description="签退后工时将提交给商家确认。"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)}>
              还没有
            </Button>
            <Button onClick={submitCheckout} data-testid="checkout-confirm">
              确认签退
            </Button>
          </>
        }
      >
        <div className="apply-modal-summary">
          <div>
            <span>班次</span>
            <strong>{formatDate(shift.date)}</strong>
          </div>
          <div>
            <span>工时</span>
            <strong>{shiftHours(shift)}h</strong>
          </div>
          <div>
            <span>工资</span>
            <strong>{formatMoney(order.payCents)}</strong>
          </div>
        </div>
        <p className="modal-hint">签退后商家会确认工时，确认后演示工资立即释放。</p>
      </Modal>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        orderId={order.id}
        title="评价这次兼职"
        subtitle={`${job.title} · ${merchant.name}`}
        role="student"
      />
    </div>
  );
}
