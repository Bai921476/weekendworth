import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock3,
  MapPin,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { Application } from '../types';
import { useApp } from '../store';
import { getFilled, getJobApplications, getOrderForApplication } from '../logic';
import { cn, formatDate, formatMoney, relativeTime } from '../utils';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  MatchRing,
  Progress,
  StatusPill,
  useToast,
} from '../components/UI';

type TabKey = 'applied' | 'accepted' | 'waitlisted' | 'rejected';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'applied', label: '待处理' },
  { key: 'accepted', label: '已录用' },
  { key: 'waitlisted', label: '候补' },
  { key: 'rejected', label: '已拒绝' },
];

export function ApplicantsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { state, currentMerchant, accept, reject, waitlist } = useApp();
  const { push } = useToast();
  const [tab, setTab] = useState<TabKey>('applied');

  const job = state.jobs.find((j) => j.id === jobId && j.merchantId === currentMerchant.id);
  const shift = job?.shifts[0];
  const applications = useMemo(() => (job ? getJobApplications(state, job.id) : []), [state, job]);

  if (!job || !shift) {
    return (
      <div className="page">
        <EmptyState
          title="岗位不存在"
          description="检查一下链接，或回岗位管理重新选择。"
          action={<Button onClick={() => navigate('/merchant/jobs')}>返回岗位管理</Button>}
        />
      </div>
    );
  }

  const filled = getFilled(state, shift.id);
  const remaining = Math.max(0, shift.headcount - filled);
  const visible = applications.filter((a) => a.status === tab);
  const counts = TABS.reduce<Record<TabKey, number>>(
    (acc, item) => ({ ...acc, [item.key]: applications.filter((a) => a.status === item.key).length }),
    { applied: 0, accepted: 0, waitlisted: 0, rejected: 0 },
  );

  function handleAccept(app: Application) {
    const result = accept(app.id);
    push(result.message, result.ok ? 'success' : 'error');
  }

  function handleReject(app: Application) {
    const result = reject(app.id);
    push(result.message, result.ok ? 'success' : 'error');
  }

  function handleWaitlist(app: Application) {
    const result = waitlist(app.id);
    push(result.message, result.ok ? 'success' : 'error');
  }

  return (
    <div className="page applicants-page" data-testid="applicants-page">
      <button type="button" className="back-link" onClick={() => navigate('/merchant/jobs')}>
        <ArrowLeft size={16} /> 返回岗位管理
      </button>

      <header className="applicants-head">
        <div>
          <span className="page-eyebrow">候选人</span>
          <h1>{job.title}</h1>
          <p>
            {formatDate(shift.date)} {shift.startTime}–{shift.endTime} · {formatMoney(job.payCents)}/{job.payType === 'daily' ? '天' : '时'}
          </p>
        </div>
        <div className="fill-box">
          <div>
            <span>已录用</span>
            <strong>{filled}/{shift.headcount}</strong>
          </div>
          <Progress value={Math.round((filled / shift.headcount) * 100)} tone={remaining === 0 ? 'green' : 'amber'} />
          <small>{remaining === 0 ? '已招满，可继续收候补' : `还缺 ${remaining} 人`}</small>
        </div>
      </header>

      <div className="applicant-note">
        <ShieldCheck size={17} />
        <span>
          <strong>按匹配分排序，而不是先到先得。</strong> 匹配分综合时间、距离、技能、信用与偏好，点击卡片可看完整理由。
        </span>
      </div>

      <div className="gig-tabs">
        {TABS.map((item) => (
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
          icon={<Users size={26} />}
          title={tab === 'applied' ? '还没有待处理报名' : '这一栏暂时空着'}
          description={tab === 'applied' ? '学生报名后会出现在这里，也可以把岗位分享给班级群。' : '切换标签看看其他候选人。'}
        />
      ) : (
        <div className="applicant-list">
          {visible.map((app) => {
            const student = state.students.find((s) => s.id === app.studentId);
            if (!student) return null;
            const order = getOrderForApplication(state, app.id);
            const canAccept = ['applied', 'waitlisted'].includes(app.status) && remaining > 0;
            return (
              <article key={app.id} className="applicant-card" data-testid="applicant-card">
                <div className="applicant-top">
                  <div className="applicant-person">
                    <Avatar name={student.name} color={student.avatarColor} size={52} />
                    <div>
                      <div className="applicant-name-row">
                        <h2>{student.name}</h2>
                        <StatusPill status={app.status} />
                      </div>
                      <p>
                        {student.school} · {student.campus} · {student.grade} · {student.major}
                      </p>
                      <div className="applicant-facts">
                        <span><Star size={12} fill="currentColor" /> 信用 {student.credit}</span>
                        <span><Check size={12} /> 完成 {student.completedCount} 单</span>
                        <span><MapPin size={12} /> {job.distanceKm}km</span>
                      </div>
                    </div>
                  </div>
                  <MatchRing score={app.matchScore} size={54} />
                </div>

                <p className="applicant-bio">{student.bio}</p>

                <div className="applicant-tags">
                  {student.skills.map((skill) => (
                    <span key={skill} className={cn('tag', job.skills.includes(skill) && 'tag-match')}>
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="applicant-reasons">
                  {app.matchReasons.map((reason) => (
                    <span key={reason}><Check size={13} /> {reason}</span>
                  ))}
                </div>

                {app.note && (
                  <blockquote className="applicant-note-quote">
                    <span>备注</span>
                    {app.note}
                  </blockquote>
                )}

                <div className="applicant-foot">
                  <span>报名于 {relativeTime(app.createdAt)}</span>
                  <div className="applicant-actions">
                    {app.status === 'applied' && (
                      <Button size="sm" variant="ghost" onClick={() => handleReject(app)}>
                        <X size={15} /> 拒绝
                      </Button>
                    )}
                    {app.status === 'applied' && (
                      <Button size="sm" variant="secondary" onClick={() => handleWaitlist(app)}>
                        <Clock3 size={15} /> 候补
                      </Button>
                    )}
                    {['applied', 'waitlisted'].includes(app.status) && (
                      <Button
                        size="sm"
                        onClick={() => handleAccept(app)}
                        disabled={!canAccept}
                        data-testid="accept-application"
                      >
                        <UserCheck size={15} /> {remaining === 0 ? '已满员' : '录用'}
                      </Button>
                    )}
                    {app.status === 'accepted' && order && (
                      <>
                        <Badge tone="green"><Check size={12} /> 已录用</Badge>
                        <Link to="/merchant/fulfillment" className="btn btn-secondary btn-sm">
                          看履约
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {remaining === 0 && (
        <div className="full-tip">
          <ShieldCheck size={17} />
          <span>班次已满。再报名的学生会自动进入候补；有人取消时按候补顺序自动递补。</span>
        </div>
      )}
    </div>
  );
}
