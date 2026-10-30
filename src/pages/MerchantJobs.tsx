import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Pause,
  Play,
  Plus,
  Users,
  X,
} from 'lucide-react';
import type { Job } from '../types';
import { useApp } from '../store';
import { getFilled, getJobApplications, getMerchantJobs } from '../logic';
import { cn, formatDate, formatMoney } from '../utils';
import {
  Badge,
  Button,
  CategoryIcon,
  EmptyState,
  Modal,
  Progress,
  StatusPill,
  useToast,
} from '../components/UI';

export function MerchantJobsPage() {
  const { state, currentMerchant, changeJobStatus } = useApp();
  const navigate = useNavigate();
  const { push } = useToast();
  const [tab, setTab] = useState<'active' | 'paused' | 'closed'>('active');
  const [closeTarget, setCloseTarget] = useState<Job | null>(null);

  const allJobs = getMerchantJobs(state, currentMerchant.id);
  const visible = allJobs.filter((j) =>
    tab === 'active' ? j.status === 'active' : tab === 'paused' ? j.status === 'paused' : ['closed', 'rejected'].includes(j.status),
  );
  const counts = {
    active: allJobs.filter((j) => j.status === 'active').length,
    paused: allJobs.filter((j) => j.status === 'paused').length,
    closed: allJobs.filter((j) => ['closed', 'rejected'].includes(j.status)).length,
  };

  function toggle(job: Job) {
    const action = job.status === 'active' ? 'pause' : 'resume';
    const result = changeJobStatus(job.id, action);
    push(result.message, result.ok ? 'success' : 'error');
  }

  function closeJob() {
    if (!closeTarget) return;
    const result = changeJobStatus(closeTarget.id, 'close');
    push(result.message, result.ok ? 'success' : 'error');
    setCloseTarget(null);
  }

  return (
    <div className="page merchant-jobs-page">
      <header className="page-head">
        <div>
          <span className="page-eyebrow">岗位管理</span>
          <h1>你发布的周末班次</h1>
          <p>看报名、调状态、关闭岗位，都在这里。</p>
        </div>
        <Button onClick={() => navigate('/merchant/jobs/new')}>
          <Plus size={17} /> 发布岗位
        </Button>
      </header>

      <div className="gig-tabs job-tabs">
        {[
          { key: 'active' as const, label: '招募中' },
          { key: 'paused' as const, label: '已暂停' },
          { key: 'closed' as const, label: '已结束' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
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
          icon={<CalendarDays size={25} />}
          title={tab === 'active' ? '还没有招募中的岗位' : '这一栏暂时空着'}
          description={tab === 'active' ? '发布一个周末班次，开始接收周边学生的报名。' : '切换上方标签看看其他岗位。'}
          action={tab === 'active' ? <Button onClick={() => navigate('/merchant/jobs/new')}>发布岗位</Button> : undefined}
        />
      ) : (
        <div className="merchant-job-list">
          {visible.map((job) => {
            const applications = getJobApplications(state, job.id);
            const pending = applications.filter((a) => a.status === 'applied').length;
            const waitlisted = applications.filter((a) => a.status === 'waitlisted').length;
            const shift = job.shifts[0];
            const filled = shift ? getFilled(state, shift.id) : 0;
            const percent = shift ? Math.round((filled / shift.headcount) * 100) : 0;
            return (
              <article key={job.id} className="merchant-job-card">
                <div className="merchant-job-cover" style={{ background: job.cover }}>
                  <CategoryIcon category={job.category} size={22} />
                  <StatusPill status={job.status} />
                </div>
                <div className="merchant-job-body">
                  <div className="merchant-job-heading">
                    <div>
                      <h2>{job.title}</h2>
                      <span>{job.category} · {job.addressArea} · {job.distanceKm}km</span>
                    </div>
                    <strong>{formatMoney(job.payCents)}<small>/{job.payType === 'daily' ? '天' : '时'}</small></strong>
                  </div>
                  <div className="merchant-job-meta">
                    {shift && (
                      <span>
                        <CalendarDays size={14} /> {formatDate(shift.date)} {shift.startTime}–{shift.endTime}
                      </span>
                    )}
                    <span>
                      <Users size={14} /> {filled}/{shift?.headcount ?? 0} 已录
                    </span>
                    {pending > 0 && <Badge tone="amber">{pending} 个待处理</Badge>}
                    {waitlisted > 0 && <Badge tone="purple">{waitlisted} 个候补</Badge>}
                  </div>
                  <div className="job-fill-row">
                    <Progress value={percent} tone={percent === 100 ? 'green' : 'amber'} />
                    <span>{percent === 100 ? '已招满' : `还缺 ${Math.max(0, (shift?.headcount ?? 0) - filled)} 人`}</span>
                  </div>
                  <div className="merchant-job-actions">
                    <Link to={`/merchant/jobs/${job.id}/applicants`} className="btn btn-secondary btn-sm">
                      查看候选人 <ChevronRight size={15} />
                    </Link>
                    {job.status === 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => toggle(job)}>
                        <Pause size={15} /> 暂停
                      </Button>
                    )}
                    {job.status === 'paused' && (
                      <Button size="sm" variant="ghost" onClick={() => toggle(job)}>
                        <Play size={15} /> 恢复
                      </Button>
                    )}
                    {job.status !== 'closed' && (
                      <Button size="sm" variant="ghost" onClick={() => setCloseTarget(job)}>
                        <X size={15} /> 关闭
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        title="关闭这个岗位？"
        description="关闭后学生端不再展示，已有录用记录会保留。"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloseTarget(null)}>取消</Button>
            <Button variant="danger" onClick={closeJob}>确认关闭</Button>
          </>
        }
      >
        {closeTarget && <p className="modal-hint">「{closeTarget.title}」关闭后不可恢复，可以重新发布一个新班次。</p>}
      </Modal>
    </div>
  );
}
