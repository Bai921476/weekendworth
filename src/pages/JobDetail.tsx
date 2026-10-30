import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  MapPin,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import type { Application } from '../types';
import { useApp } from '../store';
import { getApplicationForShift, getFilled, getOrderForApplication, scoreShift } from '../logic';
import { cn, formatDate, formatMoney, maskPhone, shiftHours } from '../utils';
import {
  Avatar,
  Badge,
  Button,
  CheckRow,
  EmptyState,
  MatchRing,
  Modal,
  useToast,
} from '../components/UI';

export function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { state, currentStudent, apply } = useApp();
  const { push } = useToast();
  const job = state.jobs.find((j) => j.id === jobId);
  const merchant = job ? state.merchants.find((m) => m.id === job.merchantId) : undefined;
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');

  const selectedShift = useMemo(() => {
    if (!job) return undefined;
    return (
      job.shifts.find((s) => s.id === selectedShiftId) ??
      job.shifts.find((s) => ['open', 'full'].includes(s.status)) ??
      job.shifts[0]
    );
  }, [job, selectedShiftId]);

  if (!job || !merchant || !selectedShift) {
    return (
      <div className="page">
        <EmptyState
          title="岗位不存在或已下架"
          description="可能是演示数据被重置了，回发现页看看其他班次。"
          action={<Button onClick={() => navigate('/student')}>返回发现页</Button>}
        />
      </div>
    );
  }

  const filled = getFilled(state, selectedShift.id);
  const remaining = Math.max(0, selectedShift.headcount - filled);
  const full = remaining === 0;
  const application: Application | undefined = getApplicationForShift(
    state,
    currentStudent.id,
    selectedShift.id,
  );
  const order = application ? getOrderForApplication(state, application.id) : undefined;
  const match = scoreShift(state, currentStudent.id, job, selectedShift);
  const detailedVisible = Boolean(order && ['confirmed', 'checked_in', 'completed', 'disputed', 'resolved'].includes(order.status));

  function openApply() {
    if (application) {
      navigate('/student/gigs');
      return;
    }
    setError('');
    setAgree(false);
    setApplyOpen(true);
  }

  function submitApply() {
    if (!selectedShift) return;
    if (!agree) {
      setError('请先阅读并勾选取消与结算规则');
      return;
    }
    const result = apply(selectedShift.id, note);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setApplyOpen(false);
    push(result.message, 'success');
    navigate('/student/gigs');
  }

  const actionLabel = application
    ? application.status === 'waitlisted'
      ? '候补中，查看进度'
      : '已报名，查看进度'
    : full
      ? '加入候补'
      : '报名这个班次';

  return (
    <div className="page job-detail-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> 返回
      </button>

      <section className="detail-hero" style={{ background: job.cover }}>
        <div className="detail-hero-shade" />
        <div className="detail-hero-content">
          <div className="detail-hero-tags">
            <Badge tone="green">{job.category}</Badge>
            {job.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="hero-soft-tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="detail-hero-main">
            <div>
              <span className="detail-merchant">
                {merchant.name}
                {merchant.verificationStatus === 'verified' && (
                  <span>
                    <ShieldCheck size={14} /> 已认证
                  </span>
                )}
              </span>
              <h1>{job.title}</h1>
              <div className="detail-quickmeta">
                <span>
                  <MapPin size={15} /> {job.distanceKm}km · {job.addressArea}
                </span>
                <span>
                  <Clock3 size={15} /> {formatDate(selectedShift.date)} {selectedShift.startTime}–{selectedShift.endTime}
                </span>
                <span>
                  <Star size={15} fill="currentColor" /> {merchant.rating}（{merchant.reviewCount}）
                </span>
              </div>
            </div>
            <div className="detail-match">
              <MatchRing score={match.score} size={66} />
              <span>匹配度</span>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel match-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">为什么推荐给你</span>
                <h2>匹配说明</h2>
              </div>
              <Badge tone={match.score >= 85 ? 'green' : 'amber'}>
                {match.score >= 85 ? '很合适' : '可以试试'}
              </Badge>
            </div>
            <div className="match-reasons">
              {match.reasons.map((reason) => (
                <CheckRow key={reason}>{reason}</CheckRow>
              ))}
              {match.gaps.map((gap) => (
                <CheckRow key={gap} checked={false}>
                  {gap}
                </CheckRow>
              ))}
            </div>
            <div className="match-foot">
              <span>
                <ShieldCheck size={14} /> 推荐不使用性别、学校层次等信息
              </span>
              <span>信用 {currentStudent.credit}</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">班次</span>
                <h2>选一个你能到的时间</h2>
              </div>
              <span className="panel-note">每班 {selectedShift.headcount} 人</span>
            </div>
            <div className="shift-options">
              {job.shifts.map((shift) => {
                const shiftFilled = getFilled(state, shift.id);
                const shiftRemaining = Math.max(0, shift.headcount - shiftFilled);
                const active = shift.id === selectedShift.id;
                return (
                  <button
                    key={shift.id}
                    type="button"
                    className={cn('shift-option', active && 'is-active')}
                    onClick={() => setSelectedShiftId(shift.id)}
                  >
                    <span className="shift-option-date">
                      <strong>{formatDate(shift.date)}</strong>
                      <small>
                        {shift.startTime}–{shift.endTime} · {shiftHours(shift)}h
                      </small>
                    </span>
                    <span className={cn('shift-option-slot', shiftRemaining === 0 && 'is-full')}>
                      {shiftRemaining === 0 ? '已满 · 可候补' : `剩 ${shiftRemaining} 人`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">工作内容</span>
                <h2>到店之后做什么</h2>
              </div>
            </div>
            <p className="body-copy">{job.description}</p>
            <div className="requirement-list">
              {job.requirements.map((item) => (
                <div key={item} className="requirement-item">
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel location-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">地点</span>
                <h2>{job.addressArea}</h2>
              </div>
              <Badge tone="gray">{job.distanceKm}km</Badge>
            </div>
            <div className="mock-map">
              <span className="map-road road-a" />
              <span className="map-road road-b" />
              <span className="map-road road-c" />
              <span className="map-pin">
                <MapPin size={18} />
              </span>
              <span className="map-label">{merchant.name}</span>
              <span className="map-campus">星湖大学城</span>
              <span className="map-distance">骑行约 {Math.max(3, Math.round(job.distanceKm * 5))} 分钟</span>
            </div>
            <div className="location-info">
              <div>
                <span>详细地址</span>
                <strong>{detailedVisible ? merchant.address : '录用后显示详细地址'}</strong>
              </div>
              <div>
                <span>联系人</span>
                <strong>{detailedVisible ? `${merchant.ownerName} · ${maskPhone(merchant.phone)}` : '录用后可见'}</strong>
              </div>
            </div>
            <p className="demo-note">
              <Info size={14} /> 地图与定位为演示占位，不接入真实地图服务。
            </p>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">规则</span>
                <h2>报名前请确认</h2>
              </div>
            </div>
            <div className="rule-grid">
              <div>
                <strong>取消</strong>
                <p>开始前 24 小时以上取消不扣信用；12–24 小时扣 3 分；12 小时内扣 8 分。</p>
              </div>
              <div>
                <strong>签到</strong>
                <p>到店后输入 4 位签到码。演示模式放宽签到时间窗口，并模拟定位。</p>
              </div>
              <div>
                <strong>结算</strong>
                <p>签退后由商家确认工时，模拟释放工资。真实规则为确认后 24 小时无纠纷自动释放。</p>
              </div>
              <div>
                <strong>评价</strong>
                <p>完成履约后双方各评价一次，信用分随之变化。</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="detail-side">
          <section className="apply-card">
            <div className="apply-pay">
              <strong>{formatMoney(job.payCents)}</strong>
              <span>/{job.payType === 'daily' ? '天' : '小时'}</span>
            </div>
            <div className="apply-line">
              <Clock3 size={15} />
              <span>
                {formatDate(selectedShift.date)} {selectedShift.startTime}–{selectedShift.endTime}
              </span>
            </div>
            <div className="apply-line">
              <Users size={15} />
              <span>{full ? '已满员，可加入候补' : `还剩 ${remaining} 个名额`}</span>
            </div>
            <div className="apply-line">
              <Wallet size={15} />
              <span>工资已托管（模拟）</span>
            </div>

            {match.blocked && !application && (
              <div className="apply-warning">
                <AlertTriangle size={16} />
                <span>{match.blockReason}</span>
              </div>
            )}

            <Button size="lg" full disabled={Boolean(match.blocked && !application)} onClick={openApply}>
              {actionLabel}
            </Button>
            <p className="apply-note">不收取任何押金或报名费</p>

            <div className="merchant-mini">
              <Avatar name={merchant.ownerName} color="#F0E3D1" size={38} />
              <div>
                <strong>{merchant.ownerName}</strong>
                <span>
                  {merchant.name} · <Star size={11} fill="currentColor" /> {merchant.rating}
                </span>
              </div>
              <Badge tone="green">已认证</Badge>
            </div>
          </section>

          <section className="side-trust">
            <h3>平台保障</h3>
            <div>
              <ShieldCheck size={17} />
              <span>
                <strong>商家已认证</strong>
                营业执照与门店信息核验
              </span>
            </div>
            <div>
              <Wallet size={17} />
              <span>
                <strong>工资已托管</strong>
                履约确认后释放（演示）
              </span>
            </div>
            <div>
              <CheckCircle2 size={17} />
              <span>
                <strong>履约留痕</strong>
                签到、签退、评价全记录
              </span>
            </div>
          </section>

          <button type="button" className="side-link-card" onClick={() => navigate('/student')}>
            看看其他班次 <ChevronRight size={15} />
          </button>
        </aside>
      </div>

      <div className="mobile-action-bar">
        <div>
          <strong>{formatMoney(job.payCents)}</strong>
          <span>/{job.payType === 'daily' ? '天' : '时'}</span>
        </div>
        <Button disabled={Boolean(match.blocked && !application)} onClick={openApply}>
          {actionLabel}
        </Button>
      </div>

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="确认报名"
        description={`${job.title} · ${formatDate(selectedShift.date)} ${selectedShift.startTime}–${selectedShift.endTime}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              再想想
            </Button>
            <Button onClick={submitApply}>确认报名</Button>
          </>
        }
      >
        <div className="apply-modal-summary">
          <div>
            <span>薪资</span>
            <strong>{formatMoney(job.payCents)}/{job.payType === 'daily' ? '天' : '时'}</strong>
          </div>
          <div>
            <span>距离</span>
            <strong>{job.distanceKm}km</strong>
          </div>
          <div>
            <span>名额</span>
            <strong>{full ? '候补' : `剩 ${remaining} 人`}</strong>
          </div>
        </div>
        <div className="conflict-check">
          <CheckCircle2 size={17} />
          <span>时间校验通过：与你已确认的班次不冲突</span>
        </div>
        {full && (
          <div className="apply-warning">
            <AlertTriangle size={16} />
            <span>该班次已满员，提交后将进入候补；有空位时自动递补。</span>
          </div>
        )}
        <label className="field">
          <span className="field-label">
            给商家留句话 <small>选填，100 字以内</small>
          </span>
          <textarea
            value={note}
            maxLength={100}
            onChange={(e) => setNote(e.target.value)}
            placeholder="比如：做过咖啡店兼职，周六可以全天，能提前 10 分钟到。"
            rows={3}
          />
        </label>
        <label className="agree-row">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>我已阅读并同意取消、签到与结算规则，确认本班次为演示数据。</span>
        </label>
        {error && (
          <div className="form-error">
            <AlertTriangle size={15} /> {error}
          </div>
        )}
        <Link to="/student/gigs" className="modal-sub-link">
          报名后可在「我的兼职」查看进度
        </Link>
      </Modal>
    </div>
  );
}
