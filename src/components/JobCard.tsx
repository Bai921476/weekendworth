import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, MapPin, ShieldCheck, Users } from 'lucide-react';
import type { Job, MatchResult, Merchant, Shift } from '../types';
import { cn, formatDate, formatMoney, shiftHours } from '../utils';
import { Badge, CategoryIcon, MatchRing } from './UI';

export function JobCard({
  job,
  merchant,
  shift,
  filled,
  match,
  applied,
  compact = false,
}: {
  job: Job;
  merchant: Merchant;
  shift: Shift | null;
  filled: number;
  match: MatchResult;
  applied: boolean;
  compact?: boolean;
}) {
  if (!shift) return null;
  const remaining = Math.max(0, shift.headcount - filled);
  const full = remaining === 0;

  return (
    <Link
      to={`/student/jobs/${job.id}`}
      className={cn('job-card', compact && 'job-card-compact', applied && 'is-applied')}
      aria-label={`${job.title}，${formatMoney(job.payCents)}`}
    >
      <div className="job-cover" style={{ background: job.cover }}>
        <span className="job-cover-pattern" />
        <span className="job-cover-icon">
          <CategoryIcon category={job.category} size={22} />
        </span>
        <span className="job-cover-distance">
          <MapPin size={12} /> {job.distanceKm}km
        </span>
        <span className="job-cover-match">
          <MatchRing score={match.score} size={44} />
        </span>
      </div>

      <div className="job-card-body">
        <div className="job-card-kicker">
          <span>{merchant.name}</span>
          {merchant.verificationStatus === 'verified' && (
            <span className="verified-mark">
              <ShieldCheck size={12} /> 已认证
            </span>
          )}
          {applied && <Badge tone="blue">已报名</Badge>}
        </div>
        <div className="job-card-heading">
          <h3>{job.title}</h3>
          <ArrowUpRight size={17} className="job-arrow" />
        </div>
        <div className="job-card-meta">
          <span>
            <Clock3 size={13} /> {formatDate(shift.date)} {shift.startTime}–{shift.endTime}
          </span>
          <span>{shiftHours(shift)}h</span>
        </div>
        <div className="job-card-payline">
          <span className="job-pay">
            {formatMoney(job.payCents)}
            <small>/{job.payType === 'daily' ? '天' : '时'}</small>
          </span>
          <span className={cn('job-slots', full && 'is-full')}>
            <Users size={13} /> {full ? '可候补' : `剩 ${remaining} 人`}
          </span>
        </div>
        <div className="job-card-tags">
          {job.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="mini-tag">
              {tag}
            </span>
          ))}
          {merchant.guarantee && (
            <span className="mini-trust">
              <ShieldCheck size={11} /> 工资已托管
            </span>
          )}
        </div>
        {!compact && (
          <div className="job-card-matchline">
            <span className="match-bar" aria-hidden="true">
              <span style={{ width: `${match.score}%` }} />
            </span>
            <span>{match.reasons[0] ?? '按时间与距离匹配'}</span>
          </div>
        )}
      </div>

      {full && <span className="job-full-ribbon">候补</span>}
    </Link>
  );
}
