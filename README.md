# 周末职得 · WeekendWorth

> 面向大学城 3 公里生活圈的「周末短工撮合 + 履约保障」产品原型。
>
> **Slogan：** 周末不虚度，兼职更值得。
>
> **在线演示：** https://bai921476.github.io/weekendworth/

---

## 当前状态

| 项目 | 状态 |
|---|---|
| 产品原型 | 已完成 |
| 在线演示 | https://bai921476.github.io/weekendworth/ |
| 技术形态 | 纯前端 React 静态 SPA |
| 数据 | 浏览器 `localStorage` + 内置演示种子 |
| 构建 | 已通过 `tsc` 与 `vite build` |
| 核心流程 | 已通过无头 DOM 冒烟测试 |
| 部署 | 已部署到 GitHub Pages（`gh-pages` 分支） |

> 这是一个产品原型，不是真实招聘平台。页面中的商家、学生、岗位、工资、定位、支付均为演示数据或模拟能力，不构成真实用工承诺。

---

## 产品是什么

大学生在周末有空时，快速找到**距离近、时间合适、工资有保障**的短工；周边商家在高峰前，快速补齐**能到岗、上手快**的学生人手。

核心闭环：

```text
学生发现班次 → 报名 → 商家录用 → 工作卡签到
→ 签退 → 商家确认工时 → 模拟结算 → 双向评价
```

三个视角，一键切换：

- **学生**：发现、筛选、岗位详情、报名、我的兼职、工作卡、签到/签退、评价。
- **商家**：工作台、发布岗位、候选人录用/候补、履约名单、确认工时、评价。
- **运营**：商家认证、岗位巡检、纠纷处理、平台概览。

### 设计上的几个取舍

- 以**班次**而不是岗位为撮合单位：学生关心「周六 10:00–18:00 有没有活」。
- 用**时间 / 距离 / 技能 / 信用**做可解释匹配，不做黑盒推荐。
- 用**商家认证 + 工资托管展示 + 签到留痕 + 双向评价**建立信任。
- 用**候补递补**解决商家最痛的临时爽约。
- 不做真实支付、真实地图、真实实名：演示态明确标注，避免假装能力。

---

## 本地运行

环境：Node.js 20.19+ / 22.12+（建议 22 LTS）。

```bash
npm install
npm run dev
```

打开终端提示的地址（默认 `http://127.0.0.1:5173/`）。

### 构建

```bash
npm run build
npm run preview
```

构建产物在 `dist/`。`vite.config.ts` 已设置 `base: './'`，并使用 `HashRouter`，因此可以部署在 GitHub Pages 的任意仓库子路径下。

### 检查

```bash
npm run check   # TypeScript 类型检查
npm run smoke   # 无头 DOM 核心流程冒烟（需要 tsx + jsdom）
```

`smoke` 覆盖：

1. 学生打开岗位并报名；
2. 商家查看候选人并录用；
3. 学生签到、签退；
4. 商家确认工时并模拟结算；
5. 学生评价；
6. 商家发布新岗位；
7. 运营通过认证、处理纠纷；
8. `localStorage` 持久化。

---

## 部署到你自己的 GitHub Pages

当前仓库采用 **main 存源码、gh-pages 存构建产物** 的方式。

### 方式 A：发布 `dist` 到 `gh-pages`（当前仓库使用）

1. 本地执行：
   ```bash
   npm install
   npm run build
   ```
2. 把 `dist/` 里的全部文件上传到仓库的 `gh-pages` 分支根目录。
3. 打开仓库 **Settings → Pages**，**Source** 选择 `Deploy from a branch`，分支选 `gh-pages`，目录选 `/ (root)`。
4. 访问：
   ```text
   https://<你的用户名>.github.io/<仓库名>/
   ```

也可以用 git 直接维护一个只放构建产物的分支：

```bash
git checkout --orphan gh-pages
git rm -rf --cached .
cp -r dist/* .
git add .
git commit -m "deploy: static build"
git push origin gh-pages
```

### 方式 B：GitHub Actions（可选）

仓库里保留了 Actions 示例：[`docs/github-actions-deploy.yml`](docs/github-actions-deploy.yml)。

把它复制到 `.github/workflows/deploy.yml`，在 **Settings → Pages → Source** 选择 **GitHub Actions**，之后推送到 `main` 即可自动构建发布。

> GitHub 对 OAuth App 推送 workflow 文件有 `workflow` scope 限制；如果命令行推送被拒，用网页上传该文件，或在 GitHub 设置里给 token 增加 `workflow` 权限。

因为使用了 Hash 路由，页面内路由形如 `/#/student`、`/#/merchant`，刷新不会 404；不要改成 BrowserRouter，除非你同时配置 404 回退。

---

## 演示路径（约 3 分钟）

1. 打开首页，点「我是学生，找班次」。
2. 打开「周末咖啡师助手」，点「报名这个班次」，勾选规则并提交。
3. 顶部切换「商家」，工作台出现「林小满报名了」；进入候选人，点「录用」。
4. 切回「学生」→「我的兼职」→「查看工作卡」。
5. 输入签到码 **4821**，确认模拟定位，签到；随后签退。
6. 切「商家」→「履约结算」→「确认工时并结算」。
7. 切回「学生」→「我的兼职」→「去评价」。
8. 切「运营」看认证审核、岗位巡检、纠纷处理。
9. 刷新页面，数据仍在；顶部「重置」恢复初始演示数据。

---

## 项目结构

```text
.
├─ src/
│  ├─ pages/            # 学生、商家、运营页面
│  ├─ components/       # 布局、UI、岗位卡、评价弹窗
│  ├─ logic.ts          # 匹配、报名、履约、信用规则
│  ├─ store.tsx         # Context + reducer + localStorage
│  ├─ seed.ts           # 演示种子数据（日期按下一个周末动态生成）
│  ├─ types.ts
│  └─ styles/           # tokens / base / components / pages / responsive
├─ public/              # favicon、.nojekyll、404 兜底
├─ scripts/dom-smoke.tsx
├─ docs/github-actions-deploy.yml  # 可选 Actions 示例
├─ docs/                # SDD 规格文档
└─ dist/                # 构建产物（被 .gitignore 忽略，可手动上传）
```

---

## 已知限制

- 数据只在当前浏览器，换设备/清缓存会重置。
- 不是真实招聘平台，不提供真实岗位、合同、工资、保险。
- 支付、定位、认证均为模拟；不能用于真实交易。
- 没有后端，因此无法做跨设备同步、真实风控与真实消息推送。
- 演示日期按「下一个周末」动态生成；间隔较久后打开，建议先「重置演示数据」。

---

## 规格文档

- [00 · SDD 规格总览](docs/00-SDD规格总览.md)
- [01 · 需求分析](docs/01-需求分析.md)
- [02 · 技术规范](docs/02-技术规范.md)
- [03 · 产品设计与验收](docs/03-产品设计与验收.md)
