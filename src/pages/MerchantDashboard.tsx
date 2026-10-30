import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  Clock3,
  Plus,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import type { Job, Shift } from '../types';
import { useApp } from '../store';
import { getFilled, getMerchantJobs, getMerchantReviews } from '../logic';
import { cn, formatDate, formatMoney, shiftHours } from '../utils';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Progress,
  Stat,
  StatusPill,
} from '../components/UI';

export function MerchantDashboardPage() {
  const { state, currentMerchant } = useApp();
  const navigate = useNavigate();

  const jobs = getMerchantJobs(state, currentMerchant.id).filter((j) => j.status !== 'rejected');
  const activeJobs = jobs.filter((j) => j.status === 'active');
  const merchantOrders = state.orders.filter((o) => o.merchantId === currentMerchant.id);
  const pendingApps = state.applications
    .filter((a) => a.status === 'applied' && jobs.some((j) => j.id === a.jobId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const waitlistApps = state.applications.filter(
    (a) => a.status === 'waitlisted' && jobs.some((j) => j.id === a.jobId),
  );

  const shiftRows: Array<{ job: Job; shift: Shift; filled: number; remaining: number }> = [];
  activeJobs.forEach((job) => {
    job.shifts.forEach((shift) => {
      const filled = getFilled(state, shift.id);
      if (!['cancelled', 'completed'].includes(shift.status)) {
        shiftRows.push({ job, shift, filled, remaining: Math.max(0, shift.headcount - filled) });
      }
    });
  });
  shiftRows.sort((a, b) => (a.shift.date + a.shift.startTime).localeCompare(b.shift.date + b.shift.startTime));

  const underfilled = shiftRows.filter((row) => row.remaining > 0);
  const doneCount = merchantOrders.filter((o) => o.status === 'completed').length;
  const noShowCount = merchantOrders.filter((o) => o.status === 'no_show').length;
  const showRate = doneCount + noShowCount === 0 ? 100 : Math.round((doneCount / (doneCount + noShowCount)) * 100);
  const settled = merchantOrders
    .filter((o) => o.settlementStatus === 'released')
    .reduce((sum, o) => sum + o.payCents, 0);
  const reviews = getMerchantReviews(state, currentMerchant.id).slice(0, 3);
  const pendingTotal = pendingApps.length + underfilled.length;

  return (
    <div className="page merchant-page" data-testid="merchant-dashboard">
      <header className="merchant-head">
        <div className="merchant-head-copy">
          <span className="page-eyebrow">商家工作台</span>
          <h1>{currentMerchant.name}</h1>
          <div className="merchant-head-meta">
            <span>
              <ShieldCheck size={14} /> 已认证商家
            </span>
            <span>
              <Star size={14} fill="currentColor" /> {currentMerchant.rating}（{currentMerchant.reviewCount}）
            </span>
            <span>{currentMerchant.category} · {currentMerchant.area}</span>
          </div>
        </div>
        <div className="merchant-head-actions">
          <Button variant="secondary" onClick={() => navigate('/merchant/jobs')}>
            岗位管理
          </Button>
          <Button onClick={() => navigate('/merchant/jobs/new')}>
            <Plus size={17} /> 发布岗位
          </Button>
        </div>
      </header>

      <div className="merchant-stats">
        <Stat label="本周班次" value={shiftRows.length} hint="含招募中与已满" />
        <Stat label="待处理报名" value={pendingApps.length} hint="尽快确认，学生等着" tone="amber" />
        <Stat label="缺人班次" value={underfilled.length} hint="可让候补递补" tone="amber" />
        <Stat label="到岗率" value={`${showRate}%`} hint="已完成 / 已确认" tone="green" />
      </div>

      <div className="merchant-grid">
        <section className="panel todo-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">待办</span>
              <h2>{pendingTotal === 0 ? '这周都安排好了' : `${pendingTotal} 件事等你处理`}</h2>
            </div>
            <Badge tone={pendingTotal > 0 ? 'amber' : 'green'}>{pendingTotal > 0 ? '待处理' : '暂无'}</Badge>
          </div>

          {pendingTotal === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon />}
              title="没有待处理事项"
              description="可以看看本周排班，或者再发布一个周末班次。"
              action={<Button size="sm" onClick={() => navigate('/merchant/jobs/new')}>发布岗位</Button>}
            />
          ) : (
            <div className="todo-list">
              {pendingApps.map((app) => {
                const job = jobs.find((j) => j.id === app.jobId);
                const student = state.students.find((s) => s.id === app.studentId);
                if (!job || !student) return null;
                return (
                  <Link key={app.id} to={`/merchant/jobs/${job.id}/applicants`} className="todo-item">
                    <Avatar name={student.name} color={student.avatarColor} size={38} />
                    <div>
                      <strong>{student.name} 报名了「{job.title}」</strong>
                      <span>
                        匹配 {app.matchScore} · 信用 {student.credit} · {student.school}
                      </span>
                    </div>
                    <span className="todo-cta">去处理 <ChevronRight size={14} /></span>
                  </Link>
                );
              })}
              {underfilled.map((row) => (
                <Link
                  key={row.shift.id}
                  to={`/merchant/jobs/${row.job.id}/applicants`}
                  className="todo-item"
                >
                  <span className="todo-icon warn">
                    <Users size={18} />
                  </span>
                  <div>
                    <strong>{row.job.title} 还缺 {row.remaining} 人</strong>
                    <span>
                      {formatDate(row.shift.date)} {row.shift.startTime}–{row.shift.endTime} · {row.filled}/{row.shift.headcount} 已录
                    </span>
                  </div>
                  <span className="todo-cta">看候选人 <ChevronRight size={14} /></span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="merchant-side">
          <section className="panel side-summary">
            <span className="section-kicker">本周概览</span>
            <div className="summary-big">
              <span>预计工资支出</span>
              <strong>{formatMoney(shiftRows.reduce((sum, row) => sum + row.shift.headcount * row.job.payCents, 0))}</strong>
            </div>
            <div className="summary-line">
              <span>已结算（模拟）</span>
              <strong>{formatMoney(settled)}</strong>
            </div>
            <div className="summary-line">
              <span>候补人数</span>
              <strong>{waitlistApps.length}</strong>
            </div>
            <div className="summary-line">
              <span>平台服务费</span>
              <strong className="green-text">¥0 · 试点期</strong>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/merchant/fulfillment')}>
              去履约与结算 <ArrowRight size={15} />
            </Button>
          </section>

          <section className="panel quick-panel">
            <span className="section-kicker">快捷操作</span>
            <button type="button" onClick={() => navigate('/merchant/jobs/new')}>
              <Plus size={17} />
              <span>
                <strong>发布新班次</strong>
                <small>3 分钟填完</small>
              </span>
              <ChevronRight size={15} />
            </button>
            <button type="button" onClick={() => navigate('/merchant/jobs')}>
              <BriefcaseBusiness size={17} />
              <span>
                <strong>管理岗位</strong>
                <small>{activeJobs.length} 个招募中</small>
              </span>
              <ChevronRight size={15} />
            </button>
            <button type="button" onClick={() => navigate('/merchant/fulfillment')}>
              <CalendarCheck size={17} />
              <span>
                <strong>确认工时</strong>
                <small>{merchantOrders.filter((o) => o.settlementStatus === 'pending_release').length} 条待确认</small>
              </span>
              <ChevronRight size={15} />
            </button>
          </section>
        </aside>
      </div>

      <section className="panel schedule-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">本周排班</span>
            <h2>周末人手一眼看清</h2>
          </div>
          <span className="panel-note">共 {shiftRows.length} 个班次</span>
        </div>
        {shiftRows.length === 0 ? (
          <EmptyState title="还没有班次" description="发布一个周末班次，开始接收报名。" action={<Button onClick={() => navigate('/merchant/jobs/new')}>发布岗位</Button>} />
        ) : (
          <div className="schedule-list">
            {shiftRows.map((row) => {
              const percent = Math.round((row.filled / row.shift.headcount) * 100);
              return (
                <div key={row.shift.id} className="schedule-row">
                  <div className="schedule-date">
                    <strong>{formatDate(row.shift.date)}</strong>
                    <span>{row.shift.startTime}–{row.shift.endTime}</span>
                  </div>
                  <div className="schedule-job">
                    <strong>{row.job.title}</strong>
                    <span>{row.job.category} · {row.job.payType === 'daily' ? `${formatMoney(row.job.payCents)}/天` : `${formatMoney(row.job.payCents)}/时`} · {shiftHours(row.shift)}h</span>
                  </div>
                  <div className="schedule-fill">
                    <div>
                      <span>{row.filled}/{row.shift.headcount} 已录</span>
                      <strong className={cn(row.remaining === 0 ? 'green-text' : 'amber-text')}>
                        {row.remaining === 0 ? '已满' : `缺 ${row.remaining}`}
                      </strong>
                    </div>
                    <Progress value={percent} tone={row.remaining === 0 ? 'green' : 'amber'} />
                  </div>
                  <Link to={`/merchant/jobs/${row.job.id}/applicants`} className="schedule-link">
                    候选人 <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="merchant-grid lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">最近评价</span>
              <h2>学生怎么说</h2>
            </div>
            <Link to="/merchant" className="text-link">全部 <ChevronRight size={14} /></Link>
          </div>
          {reviews.length === 0 ? (
            <EmptyState title="还没有评价" description="完成一次履约后，学生会留下评价。" />
          ) : (
            <div className="review-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-row">
                  <div className="review-row-head">
                    <strong>匿名学生</strong>
                    <span>
                      <Star size={13} fill="currentColor" /> {review.rating}.0
                    </span>
                  </div>
                  <p>{review.comment}</p>
                  <div className="tag-row">
                    {review.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel trust-tip-panel">
          <Clock3 size={22} />
          <h2>给商家的一个小建议</h2>
          <p>把「几点到、穿什么、找谁」写进岗位要求，能显著减少当天沟通成本，也能降低学生迟到和爽约。</p>
          <div className="trust-tip-foot">
            <Wallet size={16} /> 发布前托管工资，学生更愿意报名
          </div>
        </section>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}
