import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import type { Category } from '../types';
import { useApp } from '../store';
import { cn, formatDate, formatMoney, nextWeekend, shiftHours } from '../utils';
import {
  Badge,
  Button,
  CategoryIcon,
  Field,
  StatusPill,
  useToast,
} from '../components/UI';

const CATEGORIES: Category[] = ['餐饮', '零售', '活动', '宠物', '其他'];

const TEMPLATES: Record<string, { title: string; category: Category; description: string; requirements: string; skills: string }> = {
  cafe: {
    title: '周末咖啡师助手',
    category: '餐饮',
    description: '周末客流高峰，协助店长完成点单、出杯、简单清洁和堂食区整理。会做基础咖啡更好，不会也可以从协助开始。',
    requirements: '能站 6 小时以上\n愿意和顾客沟通\n有健康证或愿意办理',
    skills: '咖啡, 沟通',
  },
  retail: {
    title: '周末门店帮工',
    category: '零售',
    description: '协助整理货架、接待顾客、打包和简单盘点。工作不难，需要细心和准时。',
    requirements: '做事细心\n能接受站立工作\n周六或周日能到店',
    skills: '收银, 理货',
  },
  event: {
    title: '活动执行协助',
    category: '活动',
    description: '协助布展、签到、现场引导和物料整理。需要听从现场安排，沟通自然。',
    requirements: '能搬轻物\n沟通自然\n不迟到',
    skills: '活动执行, 沟通',
  },
  pet: {
    title: '宠物洗护助理',
    category: '宠物',
    description: '协助洗护师吹毛、整理台面、安抚宠物。需要不怕猫狗，动作轻。',
    requirements: '不怕猫狗\n无动物毛发过敏\n有耐心',
    skills: '耐心, 沟通',
  },
};

export function NewJobPage() {
  const { currentMerchant, publishJob } = useApp();
  const navigate = useNavigate();
  const { push } = useToast();
  const weekend = nextWeekend();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('周末咖啡师助手');
  const [category, setCategory] = useState<Category>('餐饮');
  const [description, setDescription] = useState(TEMPLATES.cafe.description);
  const [requirements, setRequirements] = useState(TEMPLATES.cafe.requirements);
  const [skills, setSkills] = useState(TEMPLATES.cafe.skills);
  const [date, setDate] = useState(weekend.sat);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('18:00');
  const [headcount, setHeadcount] = useState(2);
  const [payType, setPayType] = useState<'daily' | 'hourly'>('daily');
  const [payYuan, setPayYuan] = useState(160);
  const [addressArea, setAddressArea] = useState(currentMerchant.area);
  const [distanceKm, setDistanceKm] = useState(currentMerchant.distanceKm);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState('');

  const payCents = Math.round(payYuan * 100);
  const total = payCents * headcount;
  const hours = shiftHours({ startTime, endTime });

  const preview = useMemo(
    () => ({
      title: title || '未命名班次',
      category,
      payCents,
      payType,
      date,
      startTime,
      endTime,
      headcount,
      addressArea,
      distanceKm,
      tags: urgent ? ['加急', '新发布'] : ['新发布'],
    }),
    [title, category, payCents, payType, date, startTime, endTime, headcount, addressArea, distanceKm, urgent],
  );

  function applyTemplate(key: string) {
    const template = TEMPLATES[key];
    if (!template) return;
    setTitle(template.title);
    setCategory(template.category);
    setDescription(template.description);
    setRequirements(template.requirements);
    setSkills(template.skills);
    setError('');
  }

  function validateStep(current: 1 | 2 | 3): string {
    if (current === 1) {
      if (!title.trim()) return '请填写岗位标题';
      if (title.trim().length > 30) return '岗位标题不超过 30 字';
      if (!description.trim()) return '请填写工作内容';
      return '';
    }
    if (current === 2) {
      if (!date) return '请选择日期';
      if (!date.includes('-')) return '日期格式不正确';
      const day = new Date(`${date}T12:00:00`).getDay();
      if (day !== 0 && day !== 6) return '本期只支持周六或周日班次';
      if (!startTime || !endTime) return '请填写起止时间';
      if (endTime <= startTime) return '结束时间必须晚于开始时间';
      if (hours <= 0 || hours > 8) return '单班次需在 8 小时以内';
      if (headcount < 1 || headcount > 20) return '招聘人数需在 1–20 人之间';
      if (payYuan <= 0) return '请填写有效薪资';
      if (!addressArea.trim()) return '请填写地址区域';
      return '';
    }
    return '';
  }

  function nextStep() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((step + 1) as 1 | 2 | 3);
  }

  function submit() {
    for (const s of [1, 2, 3] as const) {
      const message = validateStep(s);
      if (message) {
        setStep(s);
        setError(message);
        return;
      }
    }
    const result = publishJob({
      title,
      category,
      description,
      requirements: requirements.split('\n').map((s) => s.trim()).filter(Boolean),
      skills: skills.split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
      payType,
      payCents,
      addressArea,
      distanceKm,
      date,
      startTime,
      endTime,
      headcount,
      urgent,
    });
    if (!result.result.ok) {
      setError(result.result.message);
      return;
    }
    push('发布成功，已开始匹配周边学生', 'success');
    navigate('/merchant/jobs');
  }

  return (
    <div className="page new-job-page">
      <button type="button" className="back-link" onClick={() => navigate('/merchant')}>
        <ArrowLeft size={16} /> 返回工作台
      </button>

      <header className="page-head">
        <div>
          <span className="page-eyebrow">发布岗位</span>
          <h1>3 分钟，补上周末的人手</h1>
          <p>写清楚时间、地点、做什么和多少钱，匹配会更准。</p>
        </div>
        <Badge tone="green">服务费 ¥0 · 试点期</Badge>
      </header>

      <div className="wizard-steps">
        {[
          { n: 1, label: '基本信息' },
          { n: 2, label: '班次与薪资' },
          { n: 3, label: '要求与预览' },
        ].map((item) => (
          <div key={item.n} className={cn('wizard-step', step === item.n && 'is-active', step > item.n && 'is-done')}>
            <span>{step > item.n ? <Check size={14} /> : item.n}</span>
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>

      <div className="wizard-layout">
        <div className="wizard-main">
          {step === 1 && (
            <section className="panel wizard-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Step 1</span>
                  <h2>先选个模板，少写一半</h2>
                </div>
              </div>
              <div className="template-grid">
                {[
                  { key: 'cafe', label: '咖啡 / 餐饮', icon: '餐饮' as Category },
                  { key: 'retail', label: '零售 / 门店', icon: '零售' as Category },
                  { key: 'event', label: '活动 / 展会', icon: '活动' as Category },
                  { key: 'pet', label: '宠物 / 洗护', icon: '宠物' as Category },
                ].map((item) => (
                  <button key={item.key} type="button" className="template-card" onClick={() => applyTemplate(item.key)}>
                    <span className="template-icon"><CategoryIcon category={item.icon} size={20} /></span>
                    <strong>{item.label}</strong>
                    <span>套用后还能改</span>
                  </button>
                ))}
              </div>

              <Field label="岗位标题" hint="不超过 30 字">
                <input value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)} placeholder="例如：周末咖啡师助手" />
              </Field>

              <Field label="岗位类别">
                <div className="choice-grid">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={cn('choice-chip', category === item && 'is-active')}
                      onClick={() => setCategory(item)}
                    >
                      <CategoryIcon category={item} size={15} /> {item}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="工作内容" hint="写清楚要做什么，减少当天沟通">
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>

              {error && <div className="form-error"><AlertTriangle size={15} /> {error}</div>}

              <div className="wizard-actions">
                <Button onClick={nextStep}>
                  下一步：班次与薪资 <ArrowRight size={16} />
                </Button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="panel wizard-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Step 2</span>
                  <h2>把时间和钱说清楚</h2>
                </div>
              </div>

              <div className="form-grid two">
                <Field label="日期">
                  <div className="input-with-icon">
                    <CalendarDays size={16} />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </Field>
                <Field label="招聘人数">
                  <div className="input-with-icon">
                    <Users size={16} />
                    <input type="number" min={1} max={20} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} />
                  </div>
                </Field>
                <Field label="开始时间">
                  <div className="input-with-icon">
                    <Clock3 size={16} />
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                </Field>
                <Field label="结束时间">
                  <div className="input-with-icon">
                    <Clock3 size={16} />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </Field>
              </div>

              <Field label="计薪方式">
                <div className="segment">
                  <button type="button" className={cn(payType === 'daily' && 'is-active')} onClick={() => setPayType('daily')}>
                    日薪
                  </button>
                  <button type="button" className={cn(payType === 'hourly' && 'is-active')} onClick={() => setPayType('hourly')}>
                    时薪
                  </button>
                </div>
              </Field>

              <Field label={payType === 'daily' ? '日薪（元）' : '时薪（元）'}>
                <div className="input-with-icon">
                  <Wallet size={16} />
                  <input type="number" min={1} value={payYuan} onChange={(e) => setPayYuan(Number(e.target.value))} />
                </div>
              </Field>

              <div className="form-grid two">
                <Field label="地址区域" hint="录用后展示详细地址">
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input value={addressArea} onChange={(e) => setAddressArea(e.target.value)} placeholder="例如：南门 · 梧桐街" />
                  </div>
                </Field>
                <Field label="距校区">
                  <select value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))}>
                    <option value={0.5}>0.5km</option>
                    <option value={0.9}>0.9km</option>
                    <option value={1.2}>1.2km</option>
                    <option value={1.5}>1.5km</option>
                    <option value={2}>2km</option>
                    <option value={3}>3km</option>
                  </select>
                </Field>
              </div>

              <div className="cost-preview">
                <div>
                  <span>预计工资支出</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <div>
                  <span>平台服务费</span>
                  <strong className="green-text">¥0</strong>
                </div>
                <div>
                  <span>班次时长</span>
                  <strong>{hours}h</strong>
                </div>
              </div>

              {error && <div className="form-error"><AlertTriangle size={15} /> {error}</div>}

              <div className="wizard-actions split">
                <Button variant="ghost" onClick={() => { setError(''); setStep(1); }}>
                  <ArrowLeft size={16} /> 上一步
                </Button>
                <Button onClick={nextStep}>
                  下一步：要求与预览 <ArrowRight size={16} />
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="panel wizard-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Step 3</span>
                  <h2>最后补两句，就可以发了</h2>
                </div>
              </div>

              <Field label="岗位要求" hint="每行一条，最多 5 条">
                <textarea rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
              </Field>

              <Field label="加分技能" hint="用逗号分隔">
                <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="例如：咖啡, 沟通" />
              </Field>

              <label className="switch-row">
                <span>
                  <strong>标记为加急</strong>
                  <small>加急岗位会在列表里优先展示</small>
                </span>
                <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              </label>

              <div className="publish-note">
                <ShieldCheckIcon />
                <div>
                  <strong>发布前确认</strong>
                  <p>演示版默认工资已托管，不产生真实扣款。真实产品中，商家需在发布前完成资金托管。</p>
                </div>
              </div>

              {error && <div className="form-error"><AlertTriangle size={15} /> {error}</div>}

              <div className="wizard-actions split">
                <Button variant="ghost" onClick={() => { setError(''); setStep(2); }}>
                  <ArrowLeft size={16} /> 上一步
                </Button>
                <Button onClick={submit}>
                  <Sparkles size={16} /> 发布岗位
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="wizard-side">
          <div className="wizard-side-label">学生看到的样子</div>
          <article className="preview-card">
            <div className="preview-cover" style={{ background: currentMerchant.cover }}>
              <span><CategoryIcon category={preview.category} size={20} /></span>
              <Badge tone="green">新发布</Badge>
            </div>
            <div className="preview-body">
              <span className="preview-merchant">{currentMerchant.name} · {distanceKm}km</span>
              <h3>{preview.title}</h3>
              <div className="preview-meta">
                <span>{preview.date ? formatDate(preview.date) : '待选择日期'}</span>
                <span>{preview.startTime}–{preview.endTime}</span>
              </div>
              <div className="preview-pay">
                {formatMoney(payCents)}<small>/{payType === 'daily' ? '天' : '时'}</small>
              </div>
              <div className="tag-row">
                {preview.tags.map((tag) => <span key={tag} className="mini-tag">{tag}</span>)}
              </div>
            </div>
          </article>

          <div className="wizard-side-card">
            <span className="section-kicker">发布后</span>
            <div className="side-step"><span>1</span> 学生按匹配度看到岗位</div>
            <div className="side-step"><span>2</span> 你在工作台处理报名</div>
            <div className="side-step"><span>3</span> 录用后学生收到工作卡</div>
          </div>

          <div className="wizard-side-card">
            <StatusPill status={currentMerchant.verificationStatus} />
            <p className="small-copy">当前商家认证状态。只有已认证商家可以发布岗位。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.6 7.5 9.5 4.3-1.9 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.5 12 2.3 2.3 4.7-4.6" />
    </svg>
  );
}
