import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronDown,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import type { Category, DayKey } from '../types';
import { useApp } from '../store';
import { getFilled, scoreShift } from '../logic';
import { cn, formatDateShort, nextWeekend } from '../utils';
import { JobCard } from '../components/JobCard';
import { Button, CategoryIcon, EmptyState } from '../components/UI';

const CATEGORIES: Array<'全部' | Category> = ['全部', '餐饮', '零售', '活动', '宠物', '其他'];
const DAYS: Array<{ key: 'all' | DayKey; label: string }> = [
  { key: 'all', label: '本周末' },
  { key: 'sat', label: '周六' },
  { key: 'sun', label: '周日' },
];

export function DiscoverPage() {
  const { state, currentStudent } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState<'全部' | Category>('全部');
  const [day, setDay] = useState<'all' | DayKey>('all');
  const [radius, setRadius] = useState(currentStudent.maxRadiusKm);
  const [sort, setSort] = useState<'match' | 'distance' | 'pay'>('match');
  const [filterOpen, setFilterOpen] = useState(false);
  const weekend = nextWeekend();

  const items = useMemo(() => {
    const mapped = state.jobs
      .filter((job) => job.status === 'active' && job.moderation === 'ok')
      .map((job) => {
        const merchant = state.merchants.find((m) => m.id === job.merchantId);
        if (!merchant) return null;
        const shifts = job.shifts.filter((s) => ['open', 'full'].includes(s.status));
        const shift =
          shifts.find((s) => (day === 'all' ? true : s.date === weekend[day])) ?? shifts[0];
        if (!shift) return null;
        const filled = getFilled(state, shift.id);
        const match = scoreShift(state, currentStudent.id, job, shift);
        const applied = state.applications.some(
          (a) =>
            a.studentId === currentStudent.id &&
            a.jobId === job.id &&
            !['withdrawn', 'rejected', 'expired'].includes(a.status),
        );
        return { job, merchant, shift, filled, match, applied };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => {
        if (category !== '全部' && item.job.category !== category) return false;
        if (day !== 'all' && item.shift.date !== weekend[day]) return false;
        if (item.job.distanceKm > radius) return false;
        if (query.trim()) {
          const text = `${item.job.title} ${item.merchant.name} ${item.job.category} ${item.job.tags.join(' ')} ${item.job.skills.join(' ')}`;
          if (!text.toLowerCase().includes(query.trim().toLowerCase())) return false;
        }
        return true;
      });

    return mapped.sort((a, b) => {
      if (sort === 'distance') return a.job.distanceKm - b.job.distanceKm;
      if (sort === 'pay') return b.job.payCents - a.job.payCents;
      return b.match.score - a.match.score;
    });
  }, [state, currentStudent.id, category, day, radius, query, sort, weekend]);

  const greeting = new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好';

  return (
    <div className="page discover-page">
      <header className="discover-head">
        <div>
          <span className="page-eyebrow">
            {greeting}，{currentStudent.name}
          </span>
          <h1>这个周末，想做点什么？</h1>
          <p>
            按你的空闲时间和 {currentStudent.maxRadiusKm}km 范围，已筛好 {items.length} 个班次。
          </p>
        </div>
        <button type="button" className="match-profile" onClick={() => setFilterOpen(true)}>
          <span className="match-profile-icon">
            <Sparkles size={16} />
          </span>
          <span>
            <strong>匹配档案</strong>
            <small>
              信用 {currentStudent.credit} · {currentStudent.maxRadiusKm}km
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
      </header>

      <div className="discover-search-row">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜岗位、商家或技能"
            aria-label="搜索岗位"
          />
          {query && (
            <button type="button" aria-label="清空搜索" onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <button
          type="button"
          className={cn('filter-toggle', filterOpen && 'is-active')}
          onClick={() => setFilterOpen((open) => !open)}
        >
          <SlidersHorizontal size={17} />
          筛选
        </button>
      </div>

      <div className="category-scroll" aria-label="岗位类别">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={cn('category-chip', category === item && 'is-active')}
            onClick={() => setCategory(item)}
          >
            {item !== '全部' && <CategoryIcon category={item} size={15} />}
            {item}
          </button>
        ))}
      </div>

      <div className="discover-toolbar">
        <div className="day-tabs" role="tablist" aria-label="日期">
          {DAYS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={day === item.key}
              className={cn('day-tab', day === item.key && 'is-active')}
              onClick={() => setDay(item.key)}
            >
              {item.label}
              {item.key !== 'all' && <small>{formatDateShort(weekend[item.key])}</small>}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="select-wrap">
            <MapPin size={14} />
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="距离范围">
              <option value={1}>1km 内</option>
              <option value={2}>2km 内</option>
              <option value={3}>3km 内</option>
            </select>
          </label>
          <label className="select-wrap">
            <ArrowUpDown size={14} />
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="排序">
              <option value="match">匹配优先</option>
              <option value="distance">距离优先</option>
              <option value="pay">薪资优先</option>
            </select>
          </label>
        </div>
      </div>

      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-panel-head">
            <strong>匹配偏好</strong>
            <span>演示档案，可在「我的」里查看</span>
          </div>
          <div className="filter-pref-grid">
            <div>
              <span>可接受距离</span>
              <strong>{currentStudent.maxRadiusKm}km 内</strong>
            </div>
            <div>
              <span>空闲时间</span>
              <strong>周六 / 周日 09:00–18:00</strong>
            </div>
            <div>
              <span>技能</span>
              <strong>{currentStudent.skills.join('、')}</strong>
            </div>
            <div>
              <span>信用分</span>
              <strong>{currentStudent.credit} / 120</strong>
            </div>
          </div>
          <div className="filter-panel-foot">
            <span>
              <ShieldCheck size={14} /> 推荐不使用学校、性别等信息
            </span>
            <Button size="sm" variant="ghost" onClick={() => setFilterOpen(false)}>
              收起
            </Button>
          </div>
        </div>
      )}

      <div className="result-heading">
        <div>
          <h2>{day === 'all' ? '为你匹配的班次' : day === 'sat' ? '周六的班次' : '周日的班次'}</h2>
          <span>{items.length} 个结果 · 按{sort === 'match' ? '匹配度' : sort === 'distance' ? '距离' : '薪资'}排序</span>
        </div>
        <span className="result-note">
          <ShieldCheck size={14} /> 全部商家已认证
        </span>
      </div>

      {items.length > 0 ? (
        <div className="job-grid">
          {items.map((item) => (
            <JobCard key={item.job.id} {...item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search size={25} />}
          title="这组条件下暂时没有班次"
          description="换个关键词，或者把距离放宽到 3km 再看看。"
          action={
            <Button
              onClick={() => {
                setQuery('');
                setCategory('全部');
                setRadius(3);
                setDay('all');
              }}
            >
              重置筛选
            </Button>
          }
        />
      )}

      <button type="button" className="floating-tip" onClick={() => navigate('/student/gigs')}>
        <span>已报名？</span> 去「我的兼职」看进度
      </button>
    </div>
  );
}
