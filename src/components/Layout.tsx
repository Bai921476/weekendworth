import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Compass,
  LayoutDashboard,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
} from 'lucide-react';
import type { Role } from '../types';
import { useApp } from '../store';
import { cn, money, relativeTime } from '../utils';
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  IconButton,
  Logo,
  Modal,
  StatusPill,
  useToast,
} from './UI';

const ROLE_HOME: Record<Role, string> = {
  student: '/student',
  merchant: '/merchant',
  admin: '/admin',
};

interface NavItem {
  label: string;
  to: string;
  icon: typeof Compass;
  end?: boolean;
  action?: 'notifications';
}

export function AppLayout() {
  const {
    state,
    currentStudent,
    currentMerchant,
    currentUserId,
    unreadCount,
    switchRole,
    resetDemo,
    markNotificationsRead,
    markNotificationRead,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const isLanding = location.pathname === '/';
  const role = state.currentRole;

  useEffect(() => {
    const expected: Role | null = location.pathname.startsWith('/merchant')
      ? 'merchant'
      : location.pathname.startsWith('/admin')
        ? 'admin'
        : location.pathname.startsWith('/student')
          ? 'student'
          : null;
    if (expected && role !== expected) switchRole(expected);
  }, [location.pathname, role, switchRole]);

  const navItems = useMemo<NavItem[]>(() => {
    if (role === 'student') {
      return [
        { label: '发现', to: '/student', icon: Compass, end: true },
        { label: '我的兼职', to: '/student/gigs', icon: CalendarCheck },
        { label: '消息', to: '#', icon: Bell, action: 'notifications' },
      ];
    }
    if (role === 'merchant') {
      return [
        { label: '工作台', to: '/merchant', icon: LayoutDashboard, end: true },
        { label: '岗位管理', to: '/merchant/jobs', icon: BriefcaseBusiness },
        { label: '发布岗位', to: '/merchant/jobs/new', icon: Sparkles },
        { label: '履约结算', to: '/merchant/fulfillment', icon: CalendarCheck },
      ];
    }
    return [
      { label: '运营概览', to: '/admin?tab=overview', icon: LayoutDashboard },
      { label: '认证审核', to: '/admin?tab=verification', icon: ShieldCheck },
      { label: '岗位巡检', to: '/admin?tab=inspection', icon: ClipboardList },
      { label: '纠纷处理', to: '/admin?tab=dispute', icon: AlertTriangle },
    ];
  }, [role]);

  const bottomItems = navItems.filter((item) => item.label !== '发布岗位');

  const userName =
    role === 'student' ? currentStudent.name : role === 'merchant' ? currentMerchant.ownerName : '周航';
  const userColor =
    role === 'student' ? currentStudent.avatarColor : role === 'merchant' ? '#E7E1D4' : '#E4E9F7';
  const notifications = state.notifications
    .filter((n) => n.userId === currentUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function handleRole(nextRole: Role) {
    switchRole(nextRole);
    navigate(ROLE_HOME[nextRole]);
    setProfileOpen(false);
  }

  function handleNav(item: NavItem) {
    if (item.action === 'notifications') {
      setNotificationsOpen(true);
      return;
    }
    navigate(item.to);
  }

  function handleReset() {
    resetDemo();
    setResetOpen(false);
    setProfileOpen(false);
    navigate('/');
    push('演示数据已重置', 'info');
  }

  function isNavActive(item: NavItem): boolean {
    const path = location.pathname;
    if (role === 'admin') {
      const tab = new URLSearchParams(location.search).get('tab') ?? 'overview';
      return path === '/admin' && item.to.includes(`tab=${tab}`);
    }
    if (item.to === '/student') {
      return path === '/student' || path.startsWith('/student/jobs');
    }
    if (item.to === '/student/gigs') {
      return path.startsWith('/student/gigs') || path.startsWith('/student/work');
    }
    if (item.to === '/merchant') return path === '/merchant';
    if (item.to === '/merchant/jobs') {
      return path.startsWith('/merchant/jobs') && path !== '/merchant/jobs/new';
    }
    if (item.to === '/merchant/jobs/new') return path === '/merchant/jobs/new';
    if (item.to === '/merchant/fulfillment') return path.startsWith('/merchant/fulfillment');
    return path === item.to;
  }

  return (
    <div className={cn('app-shell', isLanding && 'is-landing')}>
      <header className="topbar">
        <Link to="/" className="brand-link" aria-label="回到首页">
          <Logo compact={false} />
        </Link>

        <div className="role-switch" role="group" aria-label="切换身份">
          {(['student', 'merchant', 'admin'] as Role[]).map((item) => (
            <button
              key={item}
              type="button"
              className={cn('role-btn', role === item && 'is-active')}
              aria-pressed={role === item}
              onClick={() => handleRole(item)}
            >
              {item === 'student' ? '学生' : item === 'merchant' ? '商家' : '运营'}
            </button>
          ))}
        </div>

        <div className="top-actions">
          <IconButton label="消息" className="bell-btn" onClick={() => setNotificationsOpen(true)}>
            <Bell size={19} />
            {unreadCount > 0 && <span className="bell-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </IconButton>
          <button
            type="button"
            className="profile-trigger"
            aria-label="打开个人中心"
            onClick={() => setProfileOpen(true)}
          >
            <Avatar name={userName} color={userColor} size={34} />
          </button>
        </div>
      </header>

      <div className="demo-strip">
        <span>
          <span className="demo-pulse" />
          演示环境 · 数据仅存于本浏览器 · 支付/定位为模拟
        </span>
        <button type="button" onClick={() => setResetOpen(true)}>
          <RotateCcw size={13} /> 重置
        </button>
      </div>

      <div className="shell-grid">
        {!isLanding && (
          <aside className="sidebar" aria-label="主导航">
            <nav>
              {navItems.map((item) => {
                const Icon = item.icon;
                if (item.action) {
                  return (
                    <button key={item.label} type="button" className="side-link" onClick={() => handleNav(item)}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {unreadCount > 0 && <i className="side-count">{unreadCount}</i>}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={cn('side-link', isNavActive(item) && 'is-active')}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="side-card">
              <span className="side-card-eyebrow">{role === 'student' ? '本周提示' : role === 'merchant' ? '经营提示' : '运营提示'}</span>
              <strong>
                {role === 'student'
                  ? '先看时间，再看距离'
                  : role === 'merchant'
                    ? '工资托管后再发布'
                    : '认证与纠纷优先处理'}
              </strong>
              <p>
                {role === 'student'
                  ? '报名会自动校验时间冲突，避免和已确认班次撞车。'
                  : role === 'merchant'
                    ? '演示版已默认托管；真实规则为发布前完成资金托管。'
                    : '所有处理动作都会写入审计记录。'}
              </p>
            </div>
          </aside>
        )}

        <main className={cn('main', isLanding && 'main-landing')}>
          <Outlet />
        </main>
      </div>

      {!isLanding && (
        <nav className="bottom-nav" aria-label="底部导航">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            if (item.action) {
              return (
                <button key={item.label} type="button" className="bottom-link" onClick={() => handleNav(item)}>
                  <span className="bottom-icon">
                    <Icon size={20} />
                    {unreadCount > 0 && <i className="bottom-dot" />}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn('bottom-link', isNavActive(item) && 'is-active')}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <Drawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="消息">
        <div className="drawer-toolbar">
          <span>{notifications.filter((n) => !n.read).length} 条未读</span>
          <button
            type="button"
            className="text-btn"
            onClick={() => markNotificationsRead()}
          >
            <CheckCheck size={14} /> 全部已读
          </button>
        </div>
        <div className="notification-list">
          {notifications.length === 0 && (
            <div className="drawer-empty">还没有消息，报名或发布岗位后这里会有提醒。</div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn('notification-item', !item.read && 'is-unread')}
              onClick={() => {
                markNotificationRead(item.id);
                setNotificationsOpen(false);
                if (item.link) navigate(item.link);
              }}
            >
              <span className="notification-dot" />
              <span className="notification-content">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <small>{relativeTime(item.createdAt)}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </Drawer>

      <Drawer open={profileOpen} onClose={() => setProfileOpen(false)} title="我的">
        {role === 'student' && (
          <div className="profile-panel">
            <div className="profile-head">
              <Avatar name={currentStudent.name} color={currentStudent.avatarColor} size={56} />
              <div>
                <h3>{currentStudent.name}</h3>
                <p>
                  {currentStudent.school} · {currentStudent.campus} · {currentStudent.grade}
                </p>
                <Badge tone="green">学生已认证</Badge>
              </div>
            </div>
            <div className="profile-stats">
              <div>
                <span>信用分</span>
                <strong>{currentStudent.credit}</strong>
              </div>
              <div>
                <span>完成班次</span>
                <strong>{currentStudent.completedCount}</strong>
              </div>
              <div>
                <span>演示钱包</span>
                <strong>{money(currentStudent.walletCents)}</strong>
              </div>
            </div>
            <div className="profile-block">
              <span className="profile-label">技能</span>
              <div className="tag-row">
                {currentStudent.skills.map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="profile-block">
              <span className="profile-label">可工作时间</span>
              {currentStudent.availability.map((a) => (
                <div key={`${a.day}-${a.start}`} className="profile-line">
                  <span>{a.day === 'sat' ? '周六' : '周日'}</span>
                  <strong>
                    {a.start}–{a.end}
                  </strong>
                </div>
              ))}
            </div>
            <div className="profile-block">
              <span className="profile-label">可接受距离</span>
              <div className="profile-line">
                <span>以校区为中心</span>
                <strong>{currentStudent.maxRadiusKm}km 内</strong>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/student/gigs')}>
              查看我的兼职 <ChevronRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(true)}>
              <RotateCcw size={15} /> 重置演示数据
            </Button>
          </div>
        )}

        {role === 'merchant' && (
          <div className="profile-panel">
            <div className="profile-head">
              <span className="merchant-avatar">
                <Store size={24} />
              </span>
              <div>
                <h3>{currentMerchant.name}</h3>
                <p>{currentMerchant.ownerName} · {currentMerchant.category}</p>
                <StatusPill status={currentMerchant.verificationStatus} />
              </div>
            </div>
            <div className="profile-stats">
              <div>
                <span>评分</span>
                <strong className="inline-star">{currentMerchant.rating} <Star size={13} fill="currentColor" /></strong>
              </div>
              <div>
                <span>评价数</span>
                <strong>{currentMerchant.reviewCount}</strong>
              </div>
              <div>
                <span>已结算</span>
                <strong>{money(currentMerchant.spentCents)}</strong>
              </div>
            </div>
            <div className="profile-block">
              <span className="profile-label">门店地址</span>
              <div className="profile-line">
                <span>{currentMerchant.address}</span>
              </div>
              <div className="profile-line">
                <span>距校区</span>
                <strong>{currentMerchant.distanceKm}km</strong>
              </div>
            </div>
            <div className="profile-block">
              <span className="profile-label">工资托管</span>
              <div className="profile-line">
                <span>发布岗位前托管（演示）</span>
                <Badge tone={currentMerchant.guarantee ? 'green' : 'red'}>
                  {currentMerchant.guarantee ? '已开通' : '未开通'}
                </Badge>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/merchant/jobs/new')}>
              发布新岗位 <ChevronRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(true)}>
              <RotateCcw size={15} /> 重置演示数据
            </Button>
          </div>
        )}

        {role === 'admin' && (
          <div className="profile-panel">
            <div className="profile-head">
              <span className="admin-avatar">
                <ShieldCheck size={24} />
              </span>
              <div>
                <h3>周航</h3>
                <p>平台运营 · 星湖大学城</p>
                <Badge tone="blue">运营视角</Badge>
              </div>
            </div>
            <div className="profile-stats">
              <div>
                <span>待认证</span>
                <strong>{state.verificationCases.filter((v) => v.status === 'pending').length}</strong>
              </div>
              <div>
                <span>待处理纠纷</span>
                <strong>{state.disputes.filter((d) => d.status === 'open').length}</strong>
              </div>
              <div>
                <span>异常岗位</span>
                <strong>{state.jobs.filter((j) => j.moderation === 'flagged').length}</strong>
              </div>
            </div>
            <div className="profile-block">
              <span className="profile-label">当前试点</span>
              <div className="profile-line">
                <span>
                  <MapPin size={14} /> 星湖大学城 · 3km
                </span>
              </div>
              <div className="profile-line">
                <span>本周末班次</span>
                <strong>
                  {state.jobs.filter((j) => j.status === 'active').reduce((n, j) => n + j.shifts.length, 0)}
                </strong>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/admin')}>
              进入运营控制台 <ChevronRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(true)}>
              <RotateCcw size={15} /> 重置演示数据
            </Button>
          </div>
        )}
      </Drawer>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="重置演示数据？"
        description="会清除本浏览器里的报名、录用、签到和评价记录，恢复到初始演示状态。"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleReset}>
              确认重置
            </Button>
          </>
        }
      >
        <div className="reset-note">
          <AlertTriangle size={18} />
          <span>此操作不会影响任何真实数据，仅用于演示前恢复干净状态。</span>
        </div>
      </Modal>
    </div>
  );
}
