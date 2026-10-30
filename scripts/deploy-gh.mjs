import fs from 'node:fs';
import path from 'node:path';

const OWNER = process.env.GITHUB_OWNER || 'Bai921476';
const REPO = process.env.GITHUB_REPO || 'weekendworth';
const TOKEN = process.env.GITHUB_TOKEN;
const API = 'https://api.github.com';
const SITE_URL = `https://${OWNER.toLowerCase()}.github.io/${REPO}/`;
const ROOT = process.cwd();

if (!TOKEN) {
  console.error('GITHUB_TOKEN is missing. Run: $env:GITHUB_TOKEN = gh auth token');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'weekendworth-deploy',
  'Content-Type': 'application/json',
};

class ApiError extends Error {
  constructor(status, message, body) {
    super(`${status} ${message}`);
    this.status = status;
    this.body = body;
  }
}

async function api(endpoint, options = {}) {
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, data);
  }
  return data;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRepo() {
  try {
    const repo = await api(`/repos/${OWNER}/${REPO}`);
    console.log(`Repo exists: ${repo.full_name}`);
    return repo;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    console.log(`Creating public repo ${OWNER}/${REPO}...`);
    return api('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: REPO,
        private: false,
        description: '周末职得 · 大学生周末兼职撮合产品原型',
        has_issues: true,
        has_projects: false,
        has_wiki: false,
        auto_init: false,
      }),
    });
  }
}

async function ensureInitialCommit() {
  try {
    await api(`/repos/${OWNER}/${REPO}/git/ref/heads/main`);
    return;
  } catch (error) {
    if (!(error instanceof ApiError) || ![404, 409].includes(error.status)) throw error;
  }
  console.log('Empty repo: creating initial commit on main...');
  await api(`/repos/${OWNER}/${REPO}/contents/README.md`, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'chore: initialize repository',
      branch: 'main',
      content: Buffer.from('# weekendworth\n\n周末职得产品原型。\n').toString('base64'),
    }),
  });
}

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.npm-cache',
  'shots',
  'tmp',
  '.edge-profile',
  '.edge-profile2',
]);
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

function collectFiles(dir, base = '') {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_FILES.has(entry.name)) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      result.push(...collectFiles(absolute, rel));
    } else {
      result.push({ rel, absolute });
    }
  }
  return result;
}

async function uploadFiles(branch, files, message) {
  console.log(`Uploading ${files.length} files to ${branch}...`);
  const blobs = [];
  for (const file of files) {
    const content = fs.readFileSync(file.absolute).toString('base64');
    const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'base64' }),
    });
    blobs.push({ path: file.rel, mode: '100644', type: 'blob', sha: blob.sha });
  }

  let baseTree = null;
  let parent = null;
  try {
    const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${branch}`);
    parent = ref.object.sha;
    const commit = await api(`/repos/${OWNER}/${REPO}/git/commits/${parent}`);
    baseTree = commit.tree.sha;
  } catch (error) {
    if (!(error instanceof ApiError) || ![404, 409].includes(error.status)) throw error;
  }

  const treeBody = { tree: blobs };
  if (baseTree) treeBody.base_tree = baseTree;
  const tree = await api(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify(treeBody),
  });

  const commitBody = { message, tree: tree.sha };
  if (parent) commitBody.parents = [parent];
  const commit = await api(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify(commitBody),
  });

  if (parent) {
    await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: true }),
    });
  } else {
    await api(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });
  }
  console.log(`Committed ${commit.sha.slice(0, 8)} to ${branch}`);
  return commit.sha;
}

async function tryEnableWorkflowPages() {
  const bodies = [{ build_type: 'workflow' }];
  for (const body of bodies) {
    try {
      await api(`/repos/${OWNER}/${REPO}/pages`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      console.log('Pages enabled with GitHub Actions source');
      return true;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.status === 409) {
        try {
          await api(`/repos/${OWNER}/${REPO}/pages`, {
            method: 'PUT',
            body: JSON.stringify(body),
          });
          console.log('Pages updated to GitHub Actions source');
          return true;
        } catch (inner) {
          console.log(`Could not switch Pages to Actions source: ${inner.message}`);
        }
      } else {
        console.log(`Could not enable workflow Pages: ${error.message}`);
      }
    }
  }
  return false;
}

async function triggerWorkflow() {
  await api(`/repos/${OWNER}/${REPO}/actions/workflows/deploy.yml/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  });
  console.log('Workflow dispatched: deploy.yml');
}

async function waitForWorkflow() {
  const started = Date.now();
  let dispatched = false;
  for (let i = 0; i < 72; i += 1) {
    const runs = await api(`/repos/${OWNER}/${REPO}/actions/runs?per_page=20`);
    const candidates = (runs.workflow_runs || []).filter(
      (run) => run.path?.endsWith('/deploy.yml') || run.name === 'Deploy to GitHub Pages',
    );
    const run = candidates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (run) {
      console.log(
        `Workflow run ${run.id}: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ''}`,
      );
      if (run.status === 'completed') {
        return run;
      }
    } else if (!dispatched && Date.now() - started > 12000) {
      await triggerWorkflow();
      dispatched = true;
    }
    if (!dispatched && i === 2) {
      await triggerWorkflow();
      dispatched = true;
    }
    await sleep(5000);
  }
  return null;
}

async function waitForPages() {
  for (let i = 0; i < 36; i += 1) {
    try {
      const pages = await api(`/repos/${OWNER}/${REPO}/pages`);
      const build = await api(`/repos/${OWNER}/${REPO}/pages/builds/latest`).catch(() => null);
      console.log(`Pages: ${pages.status}; build: ${build?.status ?? 'n/a'}`);
      if (pages.status === 'built' || build?.status === 'built') return pages;
    } catch (error) {
      console.log(`Pages not ready: ${error.message}`);
    }
    await sleep(5000);
  }
  return null;
}

async function verifyUrl() {
  for (let i = 0; i < 12; i += 1) {
    try {
      const response = await fetch(SITE_URL, { redirect: 'follow' });
      const html = await response.text();
      if (response.ok && html.includes('周末职得')) {
        const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
          .map((match) => match[1])
          .filter((url) => url.includes('assets/'));
        let allAssetsOk = true;
        for (const asset of assets) {
          const assetResponse = await fetch(new URL(asset, SITE_URL));
          if (!assetResponse.ok) allAssetsOk = false;
          console.log(`Asset ${asset}: ${assetResponse.status}`);
        }
        if (allAssetsOk) {
          console.log(`Live: ${SITE_URL}`);
          return true;
        }
      }
      console.log(`Live check: HTTP ${response.status}`);
    } catch (error) {
      console.log(`Live check failed: ${error.message}`);
    }
    await sleep(5000);
  }
  return false;
}

async function fallbackToBranch() {
  console.log('Falling back to gh-pages branch deployment...');
  const dist = path.join(ROOT, 'dist');
  const files = collectFiles(dist).map((file) => ({
    ...file,
    rel: path.relative(dist, file.absolute).replaceAll('\\', '/'),
  }));
  await uploadFiles('gh-pages', files, 'chore: deploy static prototype to GitHub Pages');
  await api(`/repos/${OWNER}/${REPO}/pages`, {
    method: 'PUT',
    body: JSON.stringify({ source: { branch: 'gh-pages', path: '/' } }),
  });
  const pages = await waitForPages();
  if (!pages) throw new Error('Pages did not build from gh-pages');
}

async function main() {
  await ensureRepo();
  await ensureInitialCommit();
  const sourceFiles = collectFiles(ROOT);
  await uploadFiles('main', sourceFiles, 'feat: 周末职得产品原型');
  await api(`/repos/${OWNER}/${REPO}`, {
    method: 'PATCH',
    body: JSON.stringify({ default_branch: 'main' }),
  }).catch(() => undefined);

  let deployed = false;
  const workflowPages = await tryEnableWorkflowPages();
  if (workflowPages) {
    try {
      const run = await waitForWorkflow();
      if (run?.conclusion === 'success') {
        const pages = await waitForPages();
        if (pages) deployed = await verifyUrl();
      } else if (run) {
        console.log(`Workflow failed: ${run.conclusion}; ${run.html_url}`);
      }
    } catch (error) {
      console.log(`Workflow deployment error: ${error.message}`);
    }
  }

  if (!deployed) {
    await fallbackToBranch();
    deployed = await verifyUrl();
  }

  if (!deployed) {
    throw new Error(`Deployment finished but ${SITE_URL} did not verify`);
  }

  console.log(`\nDEPLOYED_URL=${SITE_URL}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
