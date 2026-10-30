import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../store';
import { getFilled, scoreShift } from '../logic';
import { cn, formatMoney } from '../utils';
import { JobCard } from '../components/JobCard';
import { Badge, Button, CategoryIcon, MatchRing } from '../components/UI';

export function LandingPage() {
  const { state, currentStudent, switchRole } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const liveJobs = state.jobs
    .filter((j) => j.status === 'active' && j.moderation === 'ok')
    .slice(0, 3)
    .map((job) => {
      const merchant = state.merchants.find((m) => m.id === job.merchantId);
      const shift = job.shifts.find((s) => s.status === 'open') ?? job.shifts[0];
      if (!merchant || !shift) return null;
      const filled = getFilled(state, shift.id);
      const match = scoreShift(state, currentStudent.id, job, shift);
      const applied = state.applications.some(
        (a) => a.studentId === currentStudent.id && a.shiftId === shift.id,
      );
      return { job, merchant, shift, filled, match, applied };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const verifiedCount = state.merchants.filter((m) => m.verificationStatus === 'verified').length;
  const shiftCount = state.jobs
    .filter((j) => j.status === 'active' && j.moderation === 'ok')
    .reduce((n, j) => n + j.shifts.length, 0);

  function goRole(role: 'student' | 'merchant') {
    switchRole(role);
    navigate(role === 'student' ? '/student' : '/merchant');
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    switchRole('student');
    navigate(`/student${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  }

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            星湖大学城 · 3km 生活圈 · 只做周末
          </div>
          <h1>
            周末两天空档，
            <br />
            找点<em>值得</em>做的事
          </h1>
          <p className="hero-sub">
            附近商家的真实班次，时间、距离、工资一次看清。
            <br />
            工资托管、到岗留痕，第一次兼职也能放心去。
          </p>

          <form className="hero-search" onSubmit={handleSearch}>
            <Search size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜咖啡师、花店帮工、书展协助…"
              aria-label="搜索岗位"
            />
            <button type="submit">找班次</button>
          </form>

          <div className="hero-actions">
            <Button size="lg" onClick={() => goRole('student')}>
              我是学生，找班次 <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => goRole('merchant')}>
              我是商家，去招人
            </Button>
          </div>

          <div className="hero-proof">
            <span>
              <ShieldCheck size={16} /> 商家认证
            </span>
            <span>
              <Wallet size={16} /> 工资托管
            </span>
            <span>
              <CheckCircle2 size={16} /> 0 押金
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <div className="hero-board">
            <div className="board-topline">
              <span className="board-brand">
                <span className="board-logo">周</span>
                周末职得
              </span>
              <Badge tone="green">演示</Badge>
            </div>
            <div className="board-job">
              <div className="board-job-cover">
                <CategoryIcon category="餐饮" size={22} />
                <span>拾光咖啡 · 1.2km</span>
              </div>
              <strong>周末咖啡师助手</strong>
              <div className="board-job-meta">
                <span>
                  <Clock3 size={13} /> 周六 10:00–18:00
                </span>
                <span className="board-pay">{formatMoney(16000)}/天</span>
              </div>
            </div>
            <div className="board-match">
              <MatchRing score={95} size={54} />
              <div>
                <strong>匹配度很高</strong>
                <span>时间正好 · 距离 1.2km</span>
              </div>
              <Sparkles size={17} />
            </div>
            <div className="board-trust">
              <span>
                <ShieldCheck size={14} /> 工资已托管
              </span>
              <span>剩 1 人</span>
            </div>
          </div>
          <div className="float-card float-one">
            <span className="float-avatar">陈</span>
            <div>
              <strong>陈姐 · 拾光咖啡</strong>
              <span>
                <Star size={11} fill="currentColor" /> 4.8 · 已认证
              </span>
            </div>
          </div>
          <div className="float-card float-two">
            <Users size={17} />
            <div>
              <strong>3 位同学报名</strong>
              <span>同校 2 人 · 可候补</span>
            </div>
          </div>
          <div className="float-chip float-three">
            <MapPin size={13} /> 步行 12 分钟
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div>
          <strong>{verifiedCount}</strong>
          <span>家已认证商家</span>
        </div>
        <div>
          <strong>{shiftCount}</strong>
          <span>个周末班次</span>
        </div>
        <div>
          <strong>0</strong>
          <span>学生押金</span>
        </div>
        <div>
          <strong>48h</strong>
          <span>纠纷处理时效</span>
        </div>
        <small>演示数据，非真实招聘</small>
      </section>

      <section className="section landing-jobs">
        <div className="section-heading">
          <div>
            <span className="section-kicker">本周末 · 精选</span>
            <h2>离你近，时间也刚好</h2>
          </div>
          <Button variant="ghost" onClick={() => goRole('student')}>
            看全部班次 <ArrowRight size={16} />
          </Button>
        </div>
        <div className="job-grid">
          {liveJobs.map((item) => (
            <JobCard key={item.job.id} {...item} />
          ))}
        </div>
      </section>

      <section className="section how-section">
        <div className="section-heading centered">
          <div>
            <span className="section-kicker">怎么用</span>
            <h2>三步，从一个空周末到一笔小收入</h2>
          </div>
        </div>
        <div className="how-grid">
          {[
            {
              n: '01',
              title: '看班次',
              desc: '按周六/周日、距离、类别筛选。每个班次都写清楚几点、在哪、做什么、多少钱。',
              icon: <Search size={22} />,
            },
            {
              n: '02',
              title: '报名等录用',
              desc: '系统自动检查时间冲突。商家按匹配度看人，录用后工作卡和签到码直接出现。',
              icon: <CheckCircle2 size={22} />,
            },
            {
              n: '03',
              title: '到岗结算',
              desc: '到店签到、结束签退，商家确认工时后释放工资（演示）。双向评价留下信用记录。',
              icon: <Wallet size={22} />,
            },
          ].map((item) => (
            <article key={item.n} className="how-card">
              <span className="how-num">{item.n}</span>
              <span className="how-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-value">
        <article className="value-panel student-panel">
          <span className="value-label">给学生</span>
          <h2>第一次兼职，也别先被劝退</h2>
          <p>不用加一堆微信群，不用猜工资靠不靠谱。先看清，再决定。</p>
          <ul>
            <li>
              <CheckCircle2 size={16} /> 时间冲突自动拦截，不耽误上课
            </li>
            <li>
              <CheckCircle2 size={16} /> 模糊地址保护隐私，录用后才显示详细地址
            </li>
            <li>
              <CheckCircle2 size={16} /> 商家认证、工资托管、双向评价
            </li>
          </ul>
          <Button onClick={() => goRole('student')}>
            看看附近的班次 <ArrowRight size={16} />
          </Button>
        </article>
        <article className="value-panel merchant-panel">
          <span className="value-label">给商家</span>
          <h2>周末缺人，不用在群里刷屏</h2>
          <p>一次发布，覆盖周边校园。有人不来，候补自动补位。</p>
          <ul>
            <li>
              <CheckCircle2 size={16} /> 按匹配度看候选人，不用翻长简历
            </li>
            <li>
              <CheckCircle2 size={16} /> 候补池 + 一键补位，降低爽约损失
            </li>
            <li>
              <CheckCircle2 size={16} /> 签到签退、工时确认、结算留痕
            </li>
          </ul>
          <Button variant="dark" onClick={() => goRole('merchant')}>
            发布一个周末班次 <ArrowRight size={16} />
          </Button>
        </article>
      </section>

      <section className="section trust-section">
        <div className="trust-copy">
          <span className="section-kicker">为什么敢去</span>
          <h2>把「靠谱」写进流程，而不是写在海报上</h2>
          <p>
            平台不承诺零风险，但把能留痕的环节都留痕：谁发的岗位、谁录用了谁、几点到店、几点离店、工资是否释放、双方如何评价。
          </p>
        </div>
        <div className="trust-grid">
          {[
            ['商家认证', '营业执照、门店信息、联系人核验后才可发布。'],
            ['工资托管', '发布前托管，履约后释放；演示版为模拟账本。'],
            ['签到留痕', '签到码 + 模拟定位 + 时间记录，异常可申诉。'],
            ['双向评价', '只允许完成履约的双方评价，信用分随之变化。'],
          ].map(([title, desc], index) => (
            <div key={title} className="trust-item">
              <span className={cn('trust-index', index === 0 && 'is-accent')}>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section final-cta">
        <div>
          <span className="section-kicker">这个周末</span>
          <h2>空着也是空着，不如去赚点值得的。</h2>
          <p>先看看附近有什么班次，再决定要不要报名。完全不收押金。</p>
        </div>
        <Button size="lg" onClick={() => goRole('student')}>
          开始找班次 <ArrowRight size={18} />
        </Button>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>周末职得 · WeekendWorth</strong>
          <span>大学生周末短工撮合与履约保障（产品演示）</span>
        </div>
        <div className="footer-links">
          <span>演示数据</span>
          <span>非真实招聘</span>
          <span>不收取任何费用</span>
          <span>© 2026</span>
        </div>
        <p>
          本页面为课程作业产品原型，不提供真实岗位、合同、支付或身份认证服务。页面中的商家、学生、薪资与履约记录均为演示数据。
        </p>
      </footer>
    </div>
  );
}
