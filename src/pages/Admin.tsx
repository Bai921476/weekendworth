import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Gavel,
  ShieldCheck,
  Store,
  XCircle,
} from 'lucide-react';
import type { Dispute, VerificationCase } from '../types';
import { useApp } from '../store';
import { getFilled } from '../logic';
import { cn, formatDate, formatMoney, relativeTime } from '../utils';
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  Progress,
  Stat,
  StatusPill,
  useToast,
} from '../components/UI';

type AdminTab = 'overview' | 'verification' | 'inspection' | 'dispute';

const TABS: Array<{ key: AdminTab; label: string; icon: typeof BarChart3 }> = [
  { key: 'overview', label: '概览', icon: BarChart3 },
  { key: 'verification', label: '认证审核', icon: FileCheck2 },
  { key: 'inspection', label: '岗位巡检', icon: ClipboardList },
  { key: 'dispute', label: '纠纷处理', icon: Gavel },
];

export function AdminPage() {
  const { state, verifyMerchant, inspectJob, resolveDisputeAction } = useApp();
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as AdminTab | null;
  const tab: AdminTab = rawTab && TABS.some((t) => t.key === rawTab) ? rawTab : 'overview';

  const [verifyTarget, setVerifyTarget] = useState<VerificationCase | null>(null);
  const [verifyApprove, setVerifyApprove] = useState(true);
  const [verifyNote, setVerifyNote] = useState('资料完整，门店信息核验通过。');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(
    state.disputes.find((d) => d.status === 'open')?.id ?? state.disputes[0]?.id ?? null,
  );
  const [resolution, setResolution] = useState<'release' | 'partial' | 'reject'>('partial');
  const [resolutionNote, setResolutionNote] = useState('双方证据不足，按实际签退时间各承担一半。');

  const pendingVerifications = state.verificationCases.filter((v) => v.status === 'pending');
  const flaggedJobs = state.jobs.filter((j) => j.moderation === 'flagged');
  const openDisputes = state.disputes.filter((d) => d.status === 'open');
  const activeJobs = state.jobs.filter((j) => j.status === 'active' && j.moderation === 'ok');
  const allShifts = activeJobs.flatMap((j) => j.shifts);
  const totalSlots = allShifts.reduce((n, s) => n + s.headcount, 0);
  const filledSlots = allShifts.reduce((n, s) => n + getFilled(state, s.id), 0);
  const fillRate = totalSlots === 0 ? 0 : Math.round((filledSlots / totalSlots) * 100);
  const selectedDispute: Dispute | undefined = state.disputes.find((d) => d.id === selectedDisputeId);
  const selectedOrder = selectedDispute
    ? state.orders.find((o) => o.id === selectedDispute.orderId)
    : undefined;

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    activeJobs.forEach((j) => map.set(j.category, (map.get(j.category) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeJobs]);

  function setTab(next: AdminTab) {
    setParams(next === 'overview' ? {} : { tab: next });
  }

  function handleVerify(approve: boolean) {
    if (!verifyTarget) return;
    const result = verifyMerchant(verifyTarget.merchantId, approve, verifyNote);
    push(result.message, result.ok ? 'success' : 'error');
    if (result.ok) setVerifyTarget(null);
  }
  function handleInspect(jobId: string, action: 'approve' | 'remove') {
    const result = inspectJob(jobId, action);
    push(result.message, result.ok ? 'success' : 'error');
  }

  function handleResolve() {
    if (!selectedDispute) return;
    const result = resolveDisputeAction(selectedDispute.id, resolution, resolutionNote);
    push(result.message, result.ok ? 'success' : 'error');
  }

  return (
    <div className="page admin-page" data-testid="admin-console">
      <header className="page-head admin-head">
        <div>
          <span className="page-eyebrow">运营控制台</span>
          <h1>把平台的风险，挡在学生前面</h1>
          <p>星湖大学城试点 · {formatDate(new Date().toISOString().slice(0, 10))}</p>
        </div>
        <div className="admin-role-badge">
          <ShieldCheck size={18} />
          <span>
            <strong>运营视角</strong>
            <small>所有处理写入审计记录</small>
          </span>
        </div>
      </header>

      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={cn('admin-tab', tab === item.key && 'is-active')}
              onClick={() => setTab(item.key)}
            >
              <Icon size={16} />
              {item.label}
              {item.key === 'verification' && pendingVerifications.length > 0 && (
                <span>{pendingVerifications.length}</span>
              )}
              {item.key === 'inspection' && flaggedJobs.length > 0 && (
                <span>{flaggedJobs.length}</span>
              )}
              {item.key === 'dispute' && openDisputes.length > 0 && (
                <span>{openDisputes.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="admin-overview">
          <div className="admin-stats">
            <Stat label="招募中岗位" value={activeJobs.length} hint="已认证商家" />
            <Stat label="班次填充率" value={`${fillRate}%`} hint={`${filledSlots}/${totalSlots} 个名额`} tone="green" />
            <Stat label="待认证" value={pendingVerifications.length} hint="认证通过后才能发布" tone="amber" />
            <Stat label="待处理纠纷" value={openDisputes.length} hint="48h 内处理" tone="amber" />
          </div>

          <div className="admin-overview-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">供给结构</span>
                  <h2>本周岗位类别</h2>
                </div>
                <Badge tone="gray">演示数据</Badge>
              </div>
              <div className="category-bars">
                {categoryStats.map(([label, count]) => (
                  <div key={label} className="category-bar">
                    <span>{label}</span>
                    <Progress value={(count / Math.max(1, activeJobs.length)) * 100} />
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">待办</span>
                  <h2>先处理这三类</h2>
                </div>
              </div>
              <div className="admin-todo-list">
                <button type="button" onClick={() => setTab('verification')}>
                  <span className="admin-todo-icon amber"><FileCheck2 size={18} /></span>
                  <span><strong>商家认证</strong><small>{pendingVerifications.length} 家待审核</small></span>
                  <Badge tone="amber">{pendingVerifications.length}</Badge>
                </button>
                <button type="button" onClick={() => setTab('inspection')}>
                  <span className="admin-todo-icon red"><AlertTriangle size={18} /></span>
                  <span><strong>异常岗位</strong><small>{flaggedJobs.length} 个待巡检</small></span>
                  <Badge tone="red">{flaggedJobs.length}</Badge>
                </button>
                <button type="button" onClick={() => setTab('dispute')}>
                  <span className="admin-todo-icon blue"><Gavel size={18} /></span>
                  <span><strong>履约纠纷</strong><small>{openDisputes.length} 条待处理</small></span>
                  <Badge tone="blue">{openDisputes.length}</Badge>
                </button>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">平台健康度</span>
                <h2>这周跑得怎么样</h2>
              </div>
            </div>
            <div className="health-grid">
              <div>
                <span>有效履约</span>
                <strong>{state.orders.filter((o) => o.status === 'completed').length}</strong>
                <small>已完成签退</small>
              </div>
              <div>
                <span>爽约记录</span>
                <strong>{state.orders.filter((o) => o.status === 'no_show').length}</strong>
                <small>信用已扣分</small>
              </div>
              <div>
                <span>争议率</span>
                <strong>{state.orders.length === 0 ? '0%' : `${Math.round((state.disputes.length / state.orders.length) * 100)}%`}</strong>
                <small>目标 ≤ 3%</small>
              </div>
              <div>
                <span>认证商家</span>
                <strong>{state.merchants.filter((m) => m.verificationStatus === 'verified').length}</strong>
                <small>全部商家 {state.merchants.length} 家</small>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'verification' && (
        <div className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>商家认证</h2>
              <p>核对营业执照、门店信息与联系人，通过后商家才能发布岗位。</p>
            </div>
            <Badge tone={pendingVerifications.length > 0 ? 'amber' : 'green'}>
              {pendingVerifications.length} 家待审核
            </Badge>
          </div>
          {pendingVerifications.length === 0 ? (
            <EmptyState title="没有待审核商家" description="新的认证申请会出现在这里。" />
          ) : (
            <div className="verification-list">
              {pendingVerifications.map((item) => {
                const merchant = state.merchants.find((m) => m.id === item.merchantId);
                if (!merchant) return null;
                return (
                  <article key={item.id} className="verification-card">
                    <div className="verification-head">
                      <div className="verification-shop">
                        <span className="merchant-avatar"><Store size={22} /></span>
                        <div>
                          <h3>{merchant.name}</h3>
                          <p>{merchant.category} · {merchant.area} · {merchant.distanceKm}km</p>
                        </div>
                      </div>
                      <StatusPill status="pending" />
                    </div>
                    <div className="verification-grid">
                      <div><span>经营者</span><strong>{merchant.ownerName}</strong></div>
                      <div><span>联系电话</span><strong>{merchant.phone}</strong></div>
                      <div><span>门店地址</span><strong>{merchant.address}</strong></div>
                      <div><span>提交时间</span><strong>{relativeTime(item.submittedAt)}</strong></div>
                    </div>
                    <div className="license-box">
                      <FileCheck2 size={18} />
                      <div>
                        <strong>营业执照（演示占位）</strong>
                        <span>{item.note}</span>
                      </div>
                      <Badge tone="gray">已上传</Badge>
                    </div>
                    <div className="verification-actions">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setVerifyTarget(item);
                          setVerifyApprove(false);
                          setVerifyNote('资料不完整，请补充门店照片后重新提交。');
                        }}
                      >
                        <XCircle size={15} /> 驳回
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setVerifyTarget(item);
                          setVerifyApprove(true);
                          setVerifyNote('资料完整，门店信息核验通过。');
                        }}
                        data-testid="approve-verification"
                      >
                        <CheckCircle2 size={15} /> 通过认证
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="admin-history">
            <h3>最近处理</h3>
            {state.verificationCases.filter((v) => v.status !== 'pending').map((item) => {
              const merchant = state.merchants.find((m) => m.id === item.merchantId);
              return (
                <div key={item.id} className="admin-history-row">
                  <span>{merchant?.name ?? item.merchantId}</span>
                  <StatusPill status={item.status} />
                  <span>{item.reviewedAt ? relativeTime(item.reviewedAt) : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'inspection' && (
        <div className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>岗位巡检</h2>
              <p>高薪异常、描述不清、被举报的岗位会进入这里。下架后学生端立即不可见。</p>
            </div>
            <Badge tone={flaggedJobs.length > 0 ? 'red' : 'green'}>{flaggedJobs.length} 个待处理</Badge>
          </div>
          {flaggedJobs.length === 0 ? (
            <EmptyState title="没有异常岗位" description="当前岗位都通过了巡检。" />
          ) : (
            <div className="inspection-list">
              {flaggedJobs.map((job) => {
                const merchant = state.merchants.find((m) => m.id === job.merchantId);
                return (
                  <article key={job.id} className="inspection-card">
                    <div className="inspection-main">
                      <div className="inspection-title">
                        <AlertTriangle size={18} />
                        <div>
                          <h3>{job.title}</h3>
                          <p>{merchant?.name ?? '未知商家'} · {job.addressArea} · {formatMoney(job.payCents)}</p>
                        </div>
                      </div>
                      <div className="inspection-reason">
                        <strong>命中原因</strong>
                        <span>{job.flagReason || '岗位信息需要人工复核'}</span>
                      </div>
                      <p className="inspection-desc">{job.description}</p>
                    </div>
                    <div className="inspection-actions">
                      <Button size="sm" variant="secondary" onClick={() => handleInspect(job.id, 'approve')}>
                        通过巡检
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleInspect(job.id, 'remove')}>
                        下架岗位
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'dispute' && (
        <div className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>纠纷处理</h2>
              <p>查看订单时间线、双方陈述与证据，选择处理结果并记录说明。</p>
            </div>
            <Badge tone={openDisputes.length > 0 ? 'red' : 'green'}>{openDisputes.length} 条待处理</Badge>
          </div>
          <div className="dispute-layout">
            <div className="dispute-list">
              {state.disputes.map((item) => {
                const order = state.orders.find((o) => o.id === item.orderId);
                const student = order ? state.students.find((s) => s.id === order.studentId) : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn('dispute-list-item', selectedDisputeId === item.id && 'is-active')}
                    onClick={() => setSelectedDisputeId(item.id)}
                  >
                    <span className={cn('dispute-status-dot', item.status === 'open' && 'is-open')} />
                    <span>
                      <strong>{item.reason}</strong>
                      <small>{student?.name ?? '学生'} · {relativeTime(item.createdAt)}</small>
                    </span>
                    <StatusPill status={item.status} />
                  </button>
                );
              })}
            </div>

            <div className="dispute-detail">
              {!selectedDispute ? (
                <EmptyState title="选择一条纠纷" description="左侧列表里的记录会显示处理详情。" />
              ) : (
                <>
                  <div className="dispute-detail-head">
                    <div>
                      <span className="section-kicker">纠纷详情</span>
                      <h3>{selectedDispute.reason}</h3>
                    </div>
                    <StatusPill status={selectedDispute.status} />
                  </div>
                  {selectedOrder && (
                    <div className="dispute-order">
                      <div className="dispute-order-top">
                        <span>{state.merchants.find((m) => m.id === selectedOrder.merchantId)?.name}</span>
                        <StatusPill status={selectedOrder.settlementStatus} />
                      </div>
                      <div className="dispute-order-grid">
                        <div><span>学生</span><strong>{state.students.find((s) => s.id === selectedOrder.studentId)?.name}</strong></div>
                        <div><span>工资</span><strong>{formatMoney(selectedOrder.payCents)}</strong></div>
                        <div><span>签到</span><strong>{selectedOrder.checkinAt ? new Date(selectedOrder.checkinAt).toLocaleString('zh-CN') : '—'}</strong></div>
                        <div><span>签退</span><strong>{selectedOrder.checkoutAt ? new Date(selectedOrder.checkoutAt).toLocaleString('zh-CN') : '—'}</strong></div>
                      </div>
                    </div>
                  )}
                  <div className="dispute-statement">
                    <strong>双方陈述</strong>
                    <p>{selectedDispute.detail}</p>
                    <small>发起方：{selectedDispute.initiatorRole === 'merchant' ? '商家' : '学生'} · {relativeTime(selectedDispute.createdAt)}</small>
                  </div>

                  {selectedDispute.status === 'open' ? (
                    <div className="dispute-resolution">
                      <span className="field-label">处理结果</span>
                      <div className="resolution-options">
                        {[
                          { key: 'release' as const, label: '支持学生', desc: '全额释放' },
                          { key: 'partial' as const, label: '各承担一半', desc: '释放 50%' },
                          { key: 'reject' as const, label: '支持商家', desc: '驳回诉求' },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className={cn('resolution-option', resolution === item.key && 'is-active')}
                            onClick={() => setResolution(item.key)}
                          >
                            <strong>{item.label}</strong>
                            <small>{item.desc}</small>
                          </button>
                        ))}
                      </div>
                      <label className="field">
                        <span className="field-label">处理说明</span>
                        <textarea rows={2} value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
                      </label>
                      <Button onClick={handleResolve} data-testid="resolve-dispute">
                        <Gavel size={16} /> 提交处理结果
                      </Button>
                    </div>
                  ) : (
                    <div className="resolved-box">
                      <CheckCircle2 size={19} />
                      <div>
                        <strong>已处理</strong>
                        <span>{selectedDispute.resolution}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        title="审核商家认证"
        description="演示版不接真实证照核验，处理结果会同步到商家端。"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVerifyTarget(null)}>取消</Button>
            <Button onClick={() => handleVerify(verifyApprove)}>
              {verifyApprove ? '通过认证' : '确认驳回'}
            </Button>
          </>
        }
      >
        {verifyTarget && (
          <>
            <div className="verify-shop-line">
              <Store size={18} />
              <strong>{state.merchants.find((m) => m.id === verifyTarget.merchantId)?.name}</strong>
            </div>
            <label className="field">
              <span className="field-label">审核说明</span>
              <textarea rows={3} value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} />
            </label>
            <p className="modal-hint">说明会展示给商家，也会写入审计记录。</p>
          </>
        )}
      </Modal>
    </div>
  );
}
