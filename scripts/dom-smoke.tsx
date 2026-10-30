import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/#/',
  pretendToBeVisual: true,
});

const g = globalThis as Record<string, unknown>;
function defineGlobal(name: string, value: unknown) {
  Object.defineProperty(g, name, { value, configurable: true, writable: true });
}
defineGlobal('window', dom.window);
defineGlobal('document', dom.window.document);
defineGlobal('navigator', dom.window.navigator);
defineGlobal('localStorage', dom.window.localStorage);
defineGlobal('HTMLElement', dom.window.HTMLElement);
defineGlobal('HTMLInputElement', dom.window.HTMLInputElement);
defineGlobal('Node', dom.window.Node);
defineGlobal('Event', dom.window.Event);
defineGlobal('MouseEvent', dom.window.MouseEvent);
defineGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
defineGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0));
defineGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
defineGlobal('IS_REACT_ACT_ENVIRONMENT', true);
dom.window.scrollTo = () => undefined;
dom.window.matchMedia = () =>
  ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) as MediaQueryList;

const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { HashRouter } = await import('react-router-dom');
const { AppProvider } = await import('../src/store');
const { ToastProvider } = await import('../src/components/UI');
const App = (await import('../src/App')).default;

const root = createRoot(document.getElementById('root')!);
const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const text = args.map(String).join(' ');
  if (!text.includes('not wrapped in act')) errors.push(text);
  originalError(...args);
};

async function render() {
  await act(async () => {
    root.render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(
          ToastProvider,
          null,
          React.createElement(HashRouter, null, React.createElement(App)),
        ),
      ),
    );
  });
}

function bodyText() {
  return document.body.textContent ?? '';
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

async function clickText(text: string, selector = 'button, a') {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const target = nodes.find((node) => (node.textContent ?? '').includes(text));
  if (!target) throw new Error(`CLICK NOT FOUND: ${text}\n${bodyText().slice(0, 500)}`);
  await act(async () => {
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function clickIn(containerSelector: string, containerText: string, buttonText: string) {
  const container = Array.from(document.querySelectorAll<HTMLElement>(containerSelector)).find((node) =>
    (node.textContent ?? '').includes(containerText),
  );
  if (!container) throw new Error(`CONTAINER NOT FOUND: ${containerText}`);
  const target = Array.from(container.querySelectorAll<HTMLElement>('button, a')).find((node) =>
    (node.textContent ?? '').includes(buttonText),
  );
  if (!target) throw new Error(`TARGET NOT FOUND: ${buttonText}`);
  await act(async () => {
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function setInput(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`INPUT NOT FOUND: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  await act(async () => {
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}

await render();
assert(bodyText().includes('周末两天空档'), 'landing hero');
assert(bodyText().includes('本周末'), 'landing featured jobs');

await clickText('我是学生，找班次');
assert(bodyText().includes('这个周末，想做点什么'), 'student discover');

await clickText('周末咖啡师助手', 'a');
assert(bodyText().includes('到店之后做什么'), 'job detail');

await clickText('报名这个班次');
assert(bodyText().includes('确认报名'), 'apply modal');
const checkbox = document.querySelector<HTMLInputElement>('.agree-row input');
assert(Boolean(checkbox), 'agreement checkbox');
await act(async () => {
  checkbox!.click();
});
await clickText('确认报名');
assert(bodyText().includes('我的兼职'), 'my gigs after apply');

await clickText('商家', '.role-btn');
assert(bodyText().includes('商家工作台'), 'merchant dashboard');
assert(bodyText().includes('林小满'), 'application visible to merchant');

await clickText('林小满 报名了', 'a');
assert(bodyText().includes('候选人'), 'applicants page');
await clickIn('.applicant-card', '林小满', '录用');
assert(bodyText().includes('已录用'), 'application accepted');

await clickText('学生', '.role-btn');
await clickText('我的兼职', '.side-link, .bottom-link');
assert(bodyText().includes('待上岗'), 'student upcoming tab');

await clickText('查看工作卡', 'a');
assert(bodyText().includes('工作卡'), 'work card');
await clickText('到店签到');
assert(bodyText().includes('4 位签到码'), 'checkin modal');
await setInput('[data-testid="checkin-input"]', '4821');
await clickText('确认签到');
assert(bodyText().includes('结束工作，签退'), 'checked in');

await clickText('结束工作，签退');
await clickText('确认签退');
assert(bodyText().includes('等待商家确认工时'), 'checked out');

await clickText('商家', '.role-btn');
await clickText('履约结算', '.side-link, .bottom-link');
assert(bodyText().includes('确认工时并结算'), 'fulfillment');
await clickText('确认工时并结算');
await clickText('确认并结算');
assert(bodyText().includes('已结算'), 'settled');

await clickText('学生', '.role-btn');
await clickText('我的兼职', '.side-link, .bottom-link');
assert(bodyText().includes('去评价'), 'review available');
await clickText('去评价');
await clickText('提交评价');
assert(bodyText().includes('已评价'), 'review submitted');

await clickText('商家', '.role-btn');
await clickText('发布岗位', '.side-link');
assert(bodyText().includes('3 分钟，补上周末的人手'), 'new job page');
await clickText('下一步：班次与薪资', 'button');
await clickText('下一步：要求与预览', 'button');
await clickText('发布岗位', 'button');
assert(bodyText().includes('你发布的周末班次'), 'job published and list visible');

await clickText('运营', '.role-btn');
assert(bodyText().includes('运营控制台'), 'admin console');
await clickText('认证审核', '.admin-tab');
await clickText('通过认证', 'button');
assert(bodyText().includes('审核商家认证'), 'verification modal');
await clickText('通过认证', '.modal button');
assert(bodyText().includes('已通过'), 'merchant verified');

await clickText('纠纷处理', '.admin-tab');
assert(bodyText().includes('工时与交接争议'), 'dispute detail');
await clickText('提交处理结果', 'button');
assert(bodyText().includes('已处理'), 'dispute resolved');

const persisted = dom.window.localStorage.getItem('weekendworth.demo.v1');
assert(Boolean(persisted), 'localStorage persisted');
const parsed = JSON.parse(persisted!);
assert(parsed.orders.some((o: { status: string }) => o.status === 'completed'), 'order completed in storage');
assert(parsed.jobs.length > 8, 'new job persisted');
assert(parsed.merchants.some((m: { id: string; verificationStatus: string }) => m.id === 'mer_tea' && m.verificationStatus === 'verified'), 'verification persisted');
assert(parsed.disputes.some((d: { status: string }) => d.status === 'resolved'), 'dispute persisted');

console.log('DOM SMOKE PASS');
console.log('console errors:', errors.length ? errors : 'none');
await act(async () => root.unmount());
dom.window.close();
process.exit(0);
