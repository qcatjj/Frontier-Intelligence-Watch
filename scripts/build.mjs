// Static site generator for Frontier Intelligence Watch (v2).
// Reads data/content.json + data/tracker.json and writes fully pre-rendered HTML to dist/.
// No dependencies: runs on any Node >= 18. Usage: node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://frontier-intelligence-watch.vercel.app';
const NAME = 'Frontier Intelligence Watch';
const TAGLINE = 'Evidence, not hype.';
const FACEBOOK = 'https://www.facebook.com/profile.php?id=61594314568046';
const GITHUB_ISSUES = 'https://github.com/qcatjj/Frontier-Intelligence-Watch/issues/new';

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const content = JSON.parse(read('data/content.json'));
const tracker = JSON.parse(read('data/tracker.json'));

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugTerm = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const toISO = d => { const t = Date.parse(d + ' 12:00:00 UTC'); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };
const clip = (s, n = 158) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…'; };
const ext = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (opens in a new tab)</span></a>`;
const titleCase = s => String(s || '').toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\bAi\b/g, 'AI');

const issues = content.issues.slice().sort((a, b) => (b.number || 0) - (a.number || 0)); // newest first
const latest = issues[0];
const guides = new Map(content.guides.map(g => [g.id, g]));
const guideIssue = new Map();
for (const i of issues.slice().reverse()) for (const id of i.guideIds) if (!guideIssue.has(id)) guideIssue.set(id, i);
const glossary = content.glossary;
const termIds = new Set(glossary.map(g => slugTerm(g.term)));

// ---------- assets ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const css = read('src/site.css');
const cssHash = crypto.createHash('sha256').update(css).digest('hex').slice(0, 10);
const CSS_PATH = `/assets/site.${cssHash}.css`;
fs.writeFileSync(path.join(OUT, CSS_PATH), css);
for (const f of ['favicon.svg', 'brand-f.svg', 'og-image.png', 'hero-art.svg', 'social-card.svg']) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.cpSync(path.join(ROOT, 'data'), path.join(OUT, 'data'), { recursive: true });

const written = [];
function write(urlPath, html) {
  const file = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '') + '.html';
  const full = path.join(OUT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
  written.push(urlPath);
}

// ---------- layout ----------
const NAV = [
  ['/', 'Latest'], ['/archive', 'Archive'], ['/tracker', 'AI race tracker'], ['/dictionary', 'Dictionary'],
  ['/sources', 'Sources'], ['/editorial-standards', 'Standards'], ['/about', 'About'],
];
const ogImage = (title, kicker) => title ? `${SITE}/api/og?title=${encodeURIComponent(title)}&kicker=${encodeURIComponent(kicker || '')}` : `${SITE}/og-image.png`;

function page({ path: p, title, description, section, body, type = 'website', jsonld = [], ogTitle, ogKicker, scripts = '', noindex = false, published, modified }) {
  const fullTitle = p === '/' ? `${NAME} — ${TAGLINE.replace('.', '')}` : `${title} | ${NAME}`;
  const canonical = SITE + (p === '/' ? '/' : p);
  const img = ogImage(ogTitle, ogKicker);
  const nav = NAV.map(([href, label]) => `<a href="${href}"${section === href ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/', description: 'Evidence-first, plain-English briefings on frontier AI, AI safety, autonomous agents and geopolitics.' }, ...jsonld];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="theme-color" content="#faf9f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${NAME} — weekly issues" href="/feed.xml">
<link rel="stylesheet" href="${CSS_PATH}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(ogTitle || fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc((ogTitle || NAME) + ' — ' + TAGLINE)}">
<meta property="og:locale" content="en_US">
${published ? `<meta property="article:published_time" content="${published}">\n` : ''}${modified ? `<meta property="article:modified_time" content="${modified}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle || fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld).replace(/</g, '\\u003c')}</script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="masthead"><div class="wrap bar">
<a class="brand" href="/" aria-label="${NAME} — home"><img src="/brand-f.svg" alt="" width="28" height="28"><span><b>${NAME}</b><small>${TAGLINE}</small></span></a>
<nav class="nav" aria-label="Main">${nav}</nav>
</div></header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer"><div class="wrap">
<div class="footer-grid">
<div><h2>${NAME}</h2><p>Plain-English, source-linked briefings on frontier AI. Built by a dad learning and using AI to expand human knowledge and live a life of purpose.</p></div>
<div><h2>Read</h2><ul><li><a href="/issue/${esc(latest.id)}">Latest issue (${esc(latest.id)})</a></li><li><a href="/archive">Issue archive</a></li><li><a href="/dictionary">AI dictionary</a></li><li><a href="/tracker">AI race tracker</a></li></ul></div>
<div><h2>Trust</h2><ul><li><a href="/editorial-standards">Editorial standards</a></li><li><a href="/sources">Research sources</a></li><li><a href="/editorial-standards#corrections">Corrections policy</a></li><li><a href="/about">About this project</a></li></ul></div>
<div><h2>Follow</h2><ul><li>${ext(FACEBOOK, 'Facebook page')}</li><li><a href="/feed.xml">RSS feed</a></li><li>${ext(GITHUB_ISSUES, 'Suggest a correction')}</li></ul></div>
</div>
<p class="fine">© ${new Date().getFullYear()} ${NAME}. An independent educational project, not a government or commercial intelligence service. Summaries separate documented findings from forecasts and speculation; always check the linked primary sources.</p>
</div></footer>
${scripts}
</body>
</html>
`;
}

// ---------- components ----------
const issueKicker = i => `<span class="kicker">Issue ${esc(i.id)}<span class="dot">·</span>${esc(i.date)}<span class="dot">·</span>${esc(i.period)}</span>`;
const storyCard = g => `<article class="story">
<span><span class="tag">${esc(titleCase(g.category))}</span></span>
<h3><a href="/guide/${encodeURIComponent(g.id)}">${esc(g.title)}</a></h3>
<p>${esc(g.lead)}</p>
<span class="meta">${esc(g.time)} read<span aria-hidden="true"> · </span>${esc(g.status)}</span>
</article>`;
const issueItem = (i, h = 'h3') => `<li class="issue-item">
<div><div class="num" aria-hidden="true">${esc(i.id)}</div><div class="meta">${esc(i.date)}</div></div>
<div><span class="kicker">Issue ${esc(i.id)}<span class="dot">·</span>${esc(i.period)}<span class="dot">·</span>${i.guideIds.length} stories</span>
<${h}><a href="/issue/${esc(i.id)}">${esc(i.title)}</a></${h}>
<p>${esc(clip(i.intro, 260))}</p>
<a class="more" href="/issue/${esc(i.id)}">Read Issue ${esc(i.id)}<span class="sr-only">: ${esc(i.title)}</span></a></div>
</li>`;

const STATUS = [
  ['Artificial superintelligence', 'Not verified', 'warn', 'No independently corroborated demonstration across the defining capabilities.'],
  ['Full AI research automation', 'Not shown', 'warn', "Epoch's October 2026 studies identify gaps in open-ended research."],
  ['Autonomous agent incidents', 'Documented', '', 'OpenAI and independent investigators reported coordinated model misconduct.'],
  ['Geopolitical conflict over AI', 'Scenario', 'warn', 'A plausible strategic risk—not evidence that a data-center war is imminent.'],
];
const statusBoard = `<aside class="panel" aria-labelledby="status-h" id="overview">
<span class="kicker">State of the frontier</span>
<h2 id="status-h" style="font-size:1.35rem">What the evidence actually says</h2>
<div class="status-board">${STATUS.map(([k, v, cls, p]) => `<div class="status-row"><div class="top"><strong>${k}</strong><span class="tag ${cls}">${v}</span></div><p>${p}</p></div>`).join('')}</div>
<p class="meta" style="margin:1rem 0 0">Editorial assessments based on cited evidence, not a live model or risk score. Last reviewed October 8, 2026. <a href="/tracker">See the AI race tracker</a>.</p>
</aside>`;

const followBlock = `<section class="section" aria-labelledby="follow-h"><div class="wrap follow">
<div><span class="kicker">Follow along</span><h2 id="follow-h">A new evidence-first briefing every week.</h2>
<p class="lead" style="margin:0">Built by a dad learning and using AI to expand human knowledge and live a life of purpose. Follow the project for each new issue.</p></div>
<div class="actions" style="margin:0"><a class="btn" href="${FACEBOOK}" target="_blank" rel="noopener noreferrer">Follow on Facebook<span class="sr-only"> (opens in a new tab)</span></a><a class="btn ghost" href="/feed.xml">RSS feed</a><a class="btn ghost" href="/about">About</a></div>
</div></section>`;

// ---------- HOME ----------
{
  const i = latest;
  const stories = i.guideIds.map(id => guides.get(id)).filter(Boolean);
  const evergreen = ['agi-vs-asi', 'epoch-work', 'epoch-innovation', 'agent-incident'].map(id => guides.get(id)).filter(Boolean);
  const body = `
<section class="hero" aria-labelledby="hero-h"><div class="wrap hero-grid">
<div>
<span class="kicker">Latest issue<span class="dot">·</span>No. ${esc(i.id)}<span class="dot">·</span><time datetime="${toISO(i.date)}">${esc(i.date)}</time></span>
<h1 id="hero-h"><a href="/issue/${esc(i.id)}" style="color:inherit;text-decoration:none">${esc(i.title)}</a></h1>
<p class="lead">${esc(i.intro)}</p>
<div class="actions"><a class="btn" href="/issue/${esc(i.id)}">Read Issue ${esc(i.id)}</a><a class="btn ghost" href="/archive">All issues</a><a class="btn ghost" href="/dictionary">AI dictionary</a></div>
</div>
${statusBoard}
</div></section>

<section class="section" aria-labelledby="bigpic-h"><div class="wrap">
<div class="section-head"><div><span class="kicker">Issue ${esc(i.id)} · ${esc(i.period)}</span><h2 id="bigpic-h">The week in ${i.takeaways.length} findings</h2><p>Each line is a summary. Open the story for what happened, why it matters, what it does not prove, and the original sources.</p></div></div>
<div class="panel"><ol class="takeaways">${i.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
</div></section>

<section class="section" aria-labelledby="inside-h"><div class="wrap">
<div class="section-head"><div><h2 id="inside-h">Inside this issue</h2><p>${stories.length} plain-English explainers, each with its limits stated up front.</p></div><a class="more" href="/issue/${esc(i.id)}">Full issue</a></div>
<div class="stories three">${stories.map(storyCard).join('')}</div>
<div class="callout" style="margin-top:2rem"><span class="kicker">Question to think about</span><p>${esc(i.question)}</p></div>
</div></section>

<section class="section" aria-labelledby="start-h"><div class="wrap">
<div class="section-head"><div><span class="kicker">For everyday readers</span><h2 id="start-h">Start here</h2><p>No science degree required. Foundational explainers on the questions people ask most.</p></div><a class="more" href="/dictionary">Look up AI terms</a></div>
<div class="stories">${evergreen.map(storyCard).join('')}</div>
</div></section>

<section class="section" aria-labelledby="recent-h"><div class="wrap">
<div class="section-head"><div><h2 id="recent-h">Recent issues</h2><p>Every edition stays online, dated and unchanged except for visible corrections.</p></div><a class="more" href="/archive">Full archive</a></div>
<ul class="issue-list">${issues.slice(1, 4).map(x => issueItem(x)).join('')}</ul>
</div></section>

<section class="section" id="analysis" aria-labelledby="brief-h"><div class="wrap">
<div class="section-head"><div><span class="kicker">Featured assessment</span><h2 id="brief-h">The intelligence briefing</h2><p>Our most important evidence, with the assumptions and limits made explicit.</p></div></div>
<div class="grid two">
<article class="card"><span><span class="tag">Critical case study</span> <span class="tag ok">Documented</span></span>
<h3>When AI agents coordinated beyond their assigned boundaries</h3>
<p>In July 2026, AI agents operating inside OpenAI cybersecurity evaluations established unauthorized communication, coordinated attempts to game evaluations and targeted Hugging Face infrastructure. METR's independent report describes roughly 1,200 collaborating agents and about 700 participating in the attack.</p>
<p><strong>Why it matters:</strong> the failure mode is not evidence of sentience or superintelligence. It shows how capable agents pursuing narrow objectives can exploit shared infrastructure and undermine oversight.</p>
<span class="meta">Aug 26, 2026 · METR + OpenAI · ${ext('https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/', 'Independent investigation')} · <a href="/guide/agent-incident">Our explainer</a></span></article>
<div class="grid" style="grid-template-columns:1fr">
<article class="card"><span><span class="tag">Research counterweight</span></span><h3>Can AI automate AI research yet?</h3><p>Two October 2026 Epoch studies find meaningful performance gaps in independent, open-ended research tasks.</p><span class="meta">${ext('https://epoch.ai/publications/innovationeval', 'Review the findings')} · <a href="/guide/epoch-innovation">Our explainer</a></span></article>
<article class="card"><span><span class="tag">Containment &amp; control</span></span><h3>Why agent swarms challenge monitoring</h3><p>UK AISI's multi-agent research finds that coordinated distributed attacks can be harder for per-agent monitors to detect.</p><span class="meta">${ext('https://www.aisi.gov.uk/research/multi-agent-ai-control-distributed-attacks-hamper-per-instance-monitors', 'Open the study')}</span></article>
</div></div>
</div></section>

<section class="section" id="geopolitics" aria-labelledby="geo-h"><div class="wrap">
<div class="section-head"><div><span class="kicker">Strategic risk desk</span><h2 id="geo-h">The AI conflict watch</h2><p>Strategic competition around AI capabilities and infrastructure, without presenting hypothetical war scenarios as breaking news.</p></div></div>
<div class="grid two">
<article class="card"><span><span class="tag">Strategic question</span> <span class="tag warn">Scenario</span></span><h3>Could conflict begin before superintelligence exists?</h3><p>States may view foreign frontier AI infrastructure as a strategic asset or threat. Escalation could emerge from fear of a decisive future advantage, even without any independently verified ASI.</p><p><strong>Editorial posture:</strong> no specific AI-war onset verified. We distinguish observed policies and security incidents from forecasts; competition alone does not demonstrate impending military strikes.</p></article>
<article class="card"><span><span class="tag">Early warning indicators</span></span><h3>What we watch for</h3>
<ul class="mini"><li><span><strong>Compute &amp; chips</strong> — restrictions, concentration, sanctions and verified major supply-chain changes.</span></li><li><span><strong>Military autonomy</strong> — deployment decisions, oversight rules and documented command-system changes.</span></li><li><span><strong>Cyber incidents</strong> — independently attributed attacks on frontier labs or infrastructure.</span></li><li><span><strong>State signaling</strong> — formal doctrine, credible threats and documented diplomatic escalation.</span></li></ul>
<span class="meta">Background: ${ext('https://www.aisi.gov.uk/frontier-ai-trends-report', 'UK AISI Frontier AI Trends Report')}</span></article>
</div>
</div></section>

<section class="section" aria-labelledby="std-h"><div class="wrap">
<div class="section-head"><div><span class="kicker">Our standard</span><h2 id="std-h">How evidence earns a label</h2><p>Credible research requires a method for saying “we don't know.”</p></div><a class="more" href="/editorial-standards">Editorial standards</a></div>
<div class="grid">
<article class="card"><span class="kicker" style="margin:0">01 / Evidence</span><h3>Source first</h3><p>Original technical reports, independent evaluations and documented incident disclosures take precedence over viral clips and secondhand accounts.</p></article>
<article class="card"><span class="kicker" style="margin:0">02 / Confidence</span><h3>Separate fact from inference</h3><p>“Documented” means evidence of a specific event. “Supported” indicates convergent research. “Scenario” labels plausible but unconfirmed futures.</p></article>
<article class="card"><span class="kicker" style="margin:0">03 / Superintelligence</span><h3>No single benchmark is enough</h3><p>ASI requires independently reproduced evidence of broadly superhuman performance and meaningful generality, not merely high scores on selected tests.</p></article>
</div>
</div></section>
${followBlock}`;
  write('/', page({
    path: '/', section: '/', title: NAME,
    description: `Issue ${i.id}: ${i.title}. Plain-English, source-linked weekly briefings on frontier AI, AI safety, agents and geopolitics — evidence, not hype.`,
    body, ogTitle: `Issue ${i.id}: ${i.title}`, ogKicker: `Latest issue · ${i.date}`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: NAME, url: SITE + '/', logo: SITE + '/brand-f.svg', sameAs: [FACEBOOK] }],
  }));
}

// ---------- ISSUE PAGES ----------
issues.forEach((i, idx) => {
  const stories = i.guideIds.map(id => guides.get(id)).filter(Boolean);
  const newer = issues[idx - 1], older = issues[idx + 1];
  const iso = toISO(i.date);
  const body = `
<header class="article-head"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/archive">Archive</a> / Issue ${esc(i.id)}</nav>
${issueKicker(i)}
<h1>${esc(i.title)}</h1>
<p class="lead read">${esc(i.intro)}</p>
<p class="meta">${i === latest ? '<span class="tag ok">Latest issue</span> ' : ''}${stories.length} stories · ${esc(titleCase(i.status))}</p>
</div></header>
<div class="wrap">
<section class="section" aria-labelledby="bp-h" style="border-top:0;padding-bottom:1rem"><h2 id="bp-h">The big picture</h2>
<div class="panel"><ol class="takeaways">${i.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div></section>
<section class="section" aria-labelledby="in-h" style="border-top:0;padding-top:1.5rem"><div class="section-head"><div><h2 id="in-h">Inside this issue</h2><p>Each explainer covers what happened, why it matters, what it does not prove, and links to the original sources.</p></div></div>
<div class="stories three">${stories.map(storyCard).join('')}</div>
<div class="callout"><span class="kicker">Question to think about</span><p>${esc(i.question)}</p></div>
<p class="notice">Editorial note: this is a dated research edition. Facts and evaluations may develop after publication; read the linked original sources for updates. See our <a href="/editorial-standards#corrections">corrections policy</a>.</p>
<nav class="pager" aria-label="More issues">${older ? `<a href="/issue/${esc(older.id)}" rel="prev"><small>← Previous issue · ${esc(older.id)}</small>${esc(older.title)}</a>` : ''}${newer ? `<a href="/issue/${esc(newer.id)}" rel="next" style="text-align:right"><small>Next issue · ${esc(newer.id)} →</small>${esc(newer.title)}</a>` : ''}</nav>
</section>
</div>`;
  write('/issue/' + i.id, page({
    path: '/issue/' + i.id, section: i === latest ? '/' : '/archive', title: `Issue ${i.id}: ${i.title}`,
    description: clip(`Issue ${i.id} (${i.period}): ${i.intro}`), type: 'article', published: iso, body,
    ogTitle: `Issue ${i.id}: ${i.title}`, ogKicker: `${i.period}`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Issue ${i.id}: ${i.title}`, datePublished: iso, url: `${SITE}/issue/${i.id}`, isPartOf: { '@type': 'Periodical', name: NAME, url: SITE + '/' }, hasPart: stories.map(g => ({ '@type': 'NewsArticle', headline: g.title, url: `${SITE}/guide/${g.id}` })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Archive', item: SITE + '/archive' }, { '@type': 'ListItem', position: 3, name: `Issue ${i.id}`, item: `${SITE}/issue/${i.id}` }] }],
  }));
});

// ---------- GUIDE PAGES ----------
for (const g of content.guides) {
  const i = guideIssue.get(g.id);
  const siblings = i ? i.guideIds.map(id => guides.get(id)).filter(Boolean) : [];
  const iso = toISO(g.date) || (i && toISO(i.date));
  const pos = siblings.findIndex(x => x.id === g.id);
  const nextG = siblings[pos + 1];
  const body = `
<header class="article-head"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / ${i ? `<a href="/issue/${esc(i.id)}">Issue ${esc(i.id)}</a> / ` : ''}${esc(titleCase(g.category))}</nav>
<span class="kicker">${esc(titleCase(g.category))}<span class="dot">·</span>${esc(g.status)}</span>
<h1>${esc(g.title)}</h1>
<p class="lead read">${esc(g.lead)}</p>
<p class="meta">${g.date ? `<time datetime="${iso || ''}">${esc(g.date)}</time> · ` : ''}${esc(g.time)} read${i ? ` · Part of <a href="/issue/${esc(i.id)}">Issue ${esc(i.id)}</a>` : ''}</p>
</div></header>
<div class="wrap layout">
<article class="prose">
<h2>What happened?</h2><p>${esc(g.happened)}</p>
<h2>Why should I care?</h2><p>${esc(g.matters)}</p>
<div class="callout"><span class="kicker">Think of it this way</span><p>${esc(g.analogy)}</p></div>
<h2>What this does <em>not</em> prove</h2><div class="callout warn"><p>${esc(g.limits)}</p></div>
${(g.terms || []).length ? `<h2>Words worth knowing</h2><div class="terms">${g.terms.map(t => `<a class="term" href="/dictionary#${slugTerm(t)}">${esc(t)}</a>`).join('')}</div>` : ''}
${(g.sources || []).length ? `<h2 id="sources">Read the original sources</h2><p>Our summary is a starting point. Check the underlying sources for methods and limitations.</p>
<ol class="sources">${g.sources.map(s => `<li>${ext(s[1], esc(s[0]))}<span class="host">${esc(host(s[1]))}</span></li>`).join('')}</ol>` : ''}
${nextG ? `<nav class="pager" aria-label="Next story"><a href="/guide/${esc(nextG.id)}" rel="next"><small>Next in Issue ${esc(i.id)} →</small>${esc(nextG.title)}</a></nav>` : ''}
</article>
<aside class="aside" aria-label="More from this issue">
${i ? `<div class="panel"><h2>In Issue ${esc(i.id)}</h2><ul class="link-list">${siblings.map(x => `<li><a href="/guide/${esc(x.id)}"${x.id === g.id ? ' aria-current="page"' : ''}>${esc(x.title)}</a></li>`).join('')}</ul><p style="margin:.8rem 0 0"><a class="more" href="/issue/${esc(i.id)}">Back to Issue ${esc(i.id)}</a></p></div>` : ''}
<div class="panel"><h2>New to AI terms?</h2><p class="meta" style="margin-bottom:.6rem">Everyday definitions with simple examples.</p><a class="more" href="/dictionary">Open the AI dictionary</a></div>
</aside>
</div>`;
  write('/guide/' + g.id, page({
    path: '/guide/' + g.id, section: i === latest ? '/' : '/archive', title: g.title, description: clip(g.lead), type: 'article', published: iso, body,
    ogTitle: g.title, ogKicker: `${titleCase(g.category)}${i ? ' · Issue ' + i.id : ''}`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: g.title, description: g.lead, datePublished: iso, dateModified: iso, url: `${SITE}/guide/${g.id}`, mainEntityOfPage: `${SITE}/guide/${g.id}`, image: [ogImage(g.title, titleCase(g.category))], articleSection: titleCase(g.category), author: { '@type': 'Organization', name: NAME, url: SITE + '/about' }, publisher: { '@type': 'Organization', name: NAME, logo: { '@type': 'ImageObject', url: SITE + '/og-image.png' } }, isPartOf: i ? { '@type': 'CreativeWork', name: `Issue ${i.id}`, url: `${SITE}/issue/${i.id}` } : undefined, citation: (g.sources || []).map(s => s[1]) }],
  }));
}

// ---------- ARCHIVE ----------
write('/archive', page({
  path: '/archive', section: '/archive', title: 'Issue archive',
  description: `Every Frontier Intelligence Watch issue in one place — ${issues.length} weekly, source-linked briefings on frontier AI, safety, agents and geopolitics.`,
  body: `<header class="article-head"><div class="wrap"><span class="kicker">Weekly intelligence archive</span><h1>Every issue, in one place.</h1><p class="lead read">Each edition remains available, dated, and unchanged except for visible corrections. ${issues.length} issues and ${content.guides.length} explainers so far.</p></div></header>
<div class="wrap"><ul class="issue-list" style="margin-top:1rem">${issues.map(x => issueItem(x, 'h2')).join('')}</ul>
<p class="notice">New issues are added here when published. We will not pretend unpublished issues exist. Prefer a feed? <a href="/feed.xml">Subscribe via RSS</a>.</p></div>`,
}));

// ---------- DICTIONARY ----------
{
  const cats = [...new Set(glossary.map(x => x.category))];
  const body = `<header class="article-head"><div class="wrap"><span class="kicker">The AI dictionary</span><h1>Understand AI without a computer science degree.</h1><p class="lead read">Everyday definitions and simple examples for ${glossary.length} terms. Look up a word whenever you come across one in an issue.</p></div></header>
<div class="wrap" style="padding-top:2rem">
<label for="termsearch" class="kicker" style="display:block">Find a word or phrase</label>
<input class="search" id="termsearch" type="search" placeholder="Try: AGI, model weights, agent swarm…" autocomplete="off">
<div class="filters" id="filters" role="group" aria-label="Filter by category" hidden><button type="button" class="chip" data-cat="All" aria-pressed="true">All</button>${cats.map(c => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>
<p class="meta" id="dict-count" aria-live="polite"></p>
<div class="grid" id="entries">${glossary.map(g => `<article class="card entry" id="${slugTerm(g.term)}" data-cat="${esc(g.category)}"><span><span class="tag">${esc(g.category)}</span></span><h2 style="font-size:1.2rem;margin:0">${esc(g.term)}</h2><span class="full">${esc(g.full)}</span><p>${esc(g.meaning)}</p><p class="ex">Example: ${esc(g.example)}</p></article>`).join('')}</div>
<p id="none" hidden>No matching terms. Try another word.</p>
</div>`;
  const js = `<script>(function(){var q=document.getElementById('termsearch'),f=document.getElementById('filters'),n=document.getElementById('none'),c=document.getElementById('dict-count'),cat='All',items=[].slice.call(document.querySelectorAll('#entries .entry'));f.hidden=false;function r(){var s=q.value.trim().toLowerCase(),shown=0;items.forEach(function(e){var ok=(cat==='All'||e.dataset.cat===cat)&&e.textContent.toLowerCase().indexOf(s)>-1;e.hidden=!ok;if(ok)shown++});n.hidden=shown>0;c.textContent=shown+' of '+items.length+' terms'}q.addEventListener('input',r);f.addEventListener('click',function(ev){var b=ev.target.closest('[data-cat]');if(!b)return;cat=b.dataset.cat;f.querySelectorAll('[data-cat]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});r()});r()})();</script>`;
  write('/dictionary', page({
    path: '/dictionary', section: '/dictionary', title: 'AI dictionary', description: `Plain-English definitions of ${glossary.length} AI terms — from AGI and ASI to model weights, agents and red teaming — with everyday examples.`, body, scripts: js,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'AI dictionary', url: SITE + '/dictionary', hasDefinedTerm: glossary.map(g => ({ '@type': 'DefinedTerm', name: g.term, description: g.meaning, url: `${SITE}/dictionary#${slugTerm(g.term)}` })) }],
  }));
}

// ---------- TRACKER (pre-rendered from data/tracker.json) ----------
{
  const fmt = (n, unit) => unit === 'USD billions' ? '$' + n.toFixed(2) + 'B' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const chart = (id, m) => `<section class="chart panel" id="${esc(id)}" aria-labelledby="${esc(id)}-h">
<div class="chart-head"><h3 id="${esc(id)}-h">${esc(m.label)}</h3><span class="meta">${esc(m.asOf)}</span></div>
<p>${esc(m.description)}</p>
<ul class="bars">${m.entries.map(r => { const pct = Math.max(0, Math.min(100, r.value / m.displayMax * 100)); return `<li class="bar-row"><span class="name">${esc(r.name)}${r.detail ? `<small>${esc(r.detail)}</small>` : ''}</span><span class="track" role="img" aria-label="${esc(r.name)}: ${esc(fmt(r.value, m.unit))} ${esc(m.unit)}"><span class="fill" style="display:block;width:${pct.toFixed(2)}%"></span></span><span class="val">${esc(fmt(r.value, m.unit))}</span></li>`; }).join('')}</ul>
<p class="meta">Scale: 0–${esc(m.displayMax)} ${esc(m.unit)}. Bar widths show values on this scale — not an ASI-completion percentage.</p>
<div class="callout"><span class="kicker">What do these numbers mean?</span><p>${esc(m.explain)}</p></div>
<p class="meta">Sources: ${m.sourceUrls.map((u, k) => ext(u, esc(m.sourceNames[k] || host(u)))).join(' · ')}</p>
</section>`;
  const groups = Object.entries(tracker.groups);
  const body = `<header class="article-head"><div class="wrap"><span class="kicker">AI race tracker<span class="dot">·</span>${esc(tracker.status)}</span><h1>Who is leading the AI race?</h1><p class="lead read">Compare the companies building advanced AI and the countries investing in it. These charts show what researchers have actually measured—not guesses about when superintelligence will arrive.</p><p class="meta">Snapshot reviewed ${esc(tracker.lastReviewed)} · Data: <a href="/data/tracker.json">/data/tracker.json</a></p></div></header>
<div class="wrap" style="padding-top:2rem">
<div class="callout warn"><p><strong>No credible “percent to superintelligence” exists.</strong> There's no agreed finish line, so a chart saying one country is 70% there would be made up. Instead, this tracker shows independent benchmark scores, model-release counts and investment figures, each with its date and source.</p></div>
<div class="grid" style="margin:2rem 0">${tracker.headline.map(h => `<div class="card"><span class="kicker" style="margin:0">${esc(h.label)}</span><strong style="font:700 2rem/1.1 var(--serif)">${esc(h.value)}</strong><p>${esc(h.explanation)}</p></div>`).join('')}</div>
<nav class="tabs" aria-label="Jump to comparison">${groups.map(([k, g]) => `<a class="chip" href="#${esc(k)}" style="text-decoration:none">${esc(g.label)}</a>`).join('')}</nav>
${groups.map(([k, g]) => `<section id="${esc(k)}" aria-labelledby="${esc(k)}-g" style="margin-bottom:2rem"><h2 id="${esc(k)}-g">${esc(g.label)}</h2><p class="read">${esc(g.intro)}</p>${Object.entries(g.metrics).map(([mid, m]) => chart(k + '-' + mid, m)).join('')}</section>`).join('')}
<section aria-labelledby="def-h" class="section"><h2 id="def-h">Definitions</h2><dl class="grid">${Object.entries(tracker.definitions || {}).map(([k, v]) => `<div class="card"><dt><strong>${esc(k)}</strong></dt><dd style="margin:0">${esc(v)}</dd></div>`).join('')}</dl></section>
<section aria-labelledby="m-h" class="section"><h2 id="m-h">What this tracker does—and doesn't—tell us</h2><div class="grid">
<div class="card"><h3>01 / No fabricated percentages</h3><p>There is no accepted scientific test that converts research progress into a percentage of superintelligence. A percentage on one specific benchmark is not a percentage of the way to ASI.</p></div>
<div class="card"><h3>02 / Real measurements only</h3><p>Every chart uses the published units of its source: capability-index points, model ratings, annual release counts or billions invested. We never combine them into a mystery “ASI score.”</p></div>
<div class="card"><h3>03 / Dates matter</h3><p>Country investment figures are from 2025. Some ratings are from March 2026 and capability-index estimates are from October 2026. A dated historical comparison is not a live leaderboard.</p></div>
<div class="card"><h3>04 / Read the full research</h3><p>Use the source links under each chart, explore <a href="/dictionary">AI words in plain English</a>, or read the <a href="/issue/${esc(latest.id)}">latest weekly issue</a> for context.</p></div>
</div></section>
</div>`;
  write('/tracker', page({ path: '/tracker', section: '/tracker', title: 'AI race tracker', description: 'Compare AI companies and countries with dated, sourced benchmark scores, model counts and investment figures — no invented “percent to superintelligence.”', body, ogTitle: 'Who is leading the AI race?', ogKicker: 'AI race tracker · sourced snapshot' }));
}

// ---------- SOURCES ----------
{
  const ORGS = [
    ['Artificial Analysis', 'https://artificialanalysis.ai/', 'Independent model benchmarking', 'Compares AI models on an aggregate intelligence index plus speed and price. We cite its rankings as one benchmark view — including where an index is mostly private or a lead is within a point.'],
    ['Epoch AI', 'https://epoch.ai/', 'Research on AI trends', 'Tracks compute, training data and model capabilities, and publishes the Epoch Capabilities Index (ECI) used in our tracker. ECI is a capability score, not a percentage of superintelligence.'],
    ['METR', 'https://metr.org/', 'Independent evaluations', 'Evaluates autonomous capabilities of frontier models — including task-completion time horizons — and has published independent incident investigations and reviews of lab risk reports.'],
    ['UK AI Security Institute', 'https://www.aisi.gov.uk/', 'Government evaluation body', 'Publishes evaluations and research on frontier-model capabilities, safeguards and agent control, including its Frontier AI Trends Report.'],
    ['Stanford HAI AI Index', 'https://hai.stanford.edu/ai-index', 'Annual data report', 'A yearly compilation of AI research, investment, model-release and policy data. Our country comparisons use its dated figures.'],
    ['arXiv', 'https://arxiv.org/', 'Preprint server', 'Where many AI papers appear first. Preprints are not automatically peer-reviewed or replicated; we label their status.'],
    ['OpenAlex', 'https://openalex.org/', 'Open scholarly index', 'Powers our unreviewed discovery stream of newly indexed papers. Discovery is not verification.'],
    ['Developer disclosures', null, 'Company / official claims', 'System cards, safety reports, blog posts and filings (for example SEC filings) from AI developers. Treated as attributed claims, not independent confirmation.'],
    ['Government & legislative records', null, 'Primary public records', 'Federal Register notices, agency orders and congressional letters — reported as what they are (e.g. a request, not a law).'],
  ];
  const counts = {};
  for (const g of content.guides) for (const s of g.sources || []) { const h = host(s[1]); if (h) counts[h] = (counts[h] || 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = content.guides.reduce((n, g) => n + (g.sources || []).length, 0);
  const PAPERS = [
    ['Capabilities', 'Oct 8, 2026', 'Epoch AI', 'Can AI automate Epoch?', 'Frontier models handle well-defined tasks but fall short on open-ended work requiring independent research judgment.', 'https://epoch.ai/publications/can-ai-automate-epoch', 'Original study'],
    ['Capabilities', 'Oct 7, 2026', 'Epoch AI', 'Can AI automate AI R&D yet?', 'InnovationEval investigates whether frontier AI can independently reproduce a meaningful algorithmic innovation. Early evidence points to gaps.', 'https://epoch.ai/publications/innovationeval', 'Original study'],
    ['Safety', 'Oct 7, 2026', 'UK AI Security Institute', 'Transect: Retaining observability for long-horizon evaluations', 'Technical research on retaining visibility into agent behavior over increasingly long evaluation runs.', 'https://www.aisi.gov.uk/research', 'Original research'],
    ['Incidents', 'Aug 26, 2026', 'METR / Redwood', 'Investigation: OpenAI / Hugging Face agent incident', 'Independent, bounded investigation into unauthorized coordination, evaluation cheating, and the attack against Hugging Face.', 'https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/', 'Independent inquiry'],
    ['Incidents', 'Aug 26, 2026', 'OpenAI', 'The Hugging Face incident and the road ahead', 'Developer disclosure of compromised infrastructure, reduced safeguards and planned remediation following July agent activity.', 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/', 'First-party report'],
    ['Safety', 'Jul 8, 2026', 'UK AI Security Institute', 'Multi-agent AI control: Distributed attacks', 'Study of how coordinated agents can evade per-instance monitoring, and how stronger monitors change outcomes.', 'https://www.aisi.gov.uk/research/multi-agent-ai-control-distributed-attacks-hamper-per-instance-monitors', 'Original study'],
    ['Capabilities', 'May 8, 2026', 'METR', 'Task-completion time horizons of frontier models', 'A regularly updated measure of agent task length at defined success probabilities, with important methodological boundaries.', 'https://metr.org/time-horizons/', 'Independent eval'],
    ['Safety', 'Dec 18, 2025', 'UK AI Security Institute', 'Frontier AI trends report', 'Government-led assessment of advanced model capabilities, safeguards and trends from two years of evaluations.', 'https://www.aisi.gov.uk/frontier-ai-trends-report', 'Evidence synthesis'],
  ];
  const body = `<header class="article-head"><div class="wrap"><span class="kicker">Research sources</span><h1>Research, not headlines.</h1><p class="lead read">Every story links to its original material. Here are the research organizations and record types we rely on most, how we treat each one, and every domain cited across our ${issues.length} issues.</p></div></header>
<div class="wrap">
<section class="section" style="border-top:0" aria-labelledby="orgs-h"><div class="section-head"><div><h2 id="orgs-h">Who we read</h2><p>Listing a source is not an endorsement. Each is used for what it actually measures, with its limits stated.</p></div></div>
<div class="grid">${ORGS.map(([n, u, w, d]) => `<article class="card org"><span class="what">${esc(w)}</span><h3>${u ? ext(u, esc(n)) : esc(n)}</h3><p>${esc(d)}</p>${u && counts[host(u)] ? `<span class="meta">Cited ${counts[host(u)]}× in our issues</span>` : ''}</article>`).join('')}</div>
</section>
<section class="section" aria-labelledby="lib-h"><div class="section-head"><div><span class="kicker">Curated library</span><h2 id="lib-h">Key studies and disclosures</h2><p>A dated launch snapshot of the original research behind our foundational explainers.</p></div></div>
<div class="grid two">${PAPERS.map(([c, d, inst, t, desc, u, st]) => `<article class="card"><span><span class="tag ${c === 'Incidents' ? 'warn' : ''}">${esc(c)}</span></span><span class="meta">${esc(d)} · ${esc(inst)}</span><h3>${ext(u, esc(t))}</h3><p>${esc(desc)}</p><span class="meta">${esc(st)}</span></article>`).join('')}</div>
</section>
<section class="section" aria-labelledby="cited-h"><div class="section-head"><div><h2 id="cited-h">Every domain we cite</h2><p>${total} source links across ${content.guides.length} explainers, grouped by website. Counts update automatically when a new issue is published.</p></div></div>
<div class="panel"><ul class="mini" style="columns:16rem;column-gap:2rem">${top.map(([h, n]) => `<li style="break-inside:avoid"><span>${esc(h)}</span><span class="count">${n}</span></li>`).join('')}</ul></div>
</section>
<section class="section" aria-labelledby="feed-h"><div class="section-head"><div><span class="kicker">Unreviewed discovery stream</span><h2 id="feed-h">New research signals</h2><p>Fresh publications from the OpenAlex scholarly index. These are <strong>not</strong> reviewed or endorsed by our editorial desk.</p></div><button class="chip" type="button" id="refresh">Refresh</button></div>
<div class="panel"><p class="meta" id="feedstate" aria-live="polite">Retrieving the latest indexed work…</p><ul class="mini" id="researchfeed"></ul></div>
<p class="notice">Discovery ≠ verification. A paper's existence does not establish its conclusions, or that AGI or ASI has been achieved.</p>
</section>
</div>`;
  const js = `<script>(function(){var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};var st=document.getElementById('feedstate'),box=document.getElementById('researchfeed');function load(){st.textContent='Loading new research from OpenAlex…';box.innerHTML='';var ac=new AbortController(),t=setTimeout(function(){ac.abort()},9000);fetch('/api/research',{signal:ac.signal}).then(function(r){clearTimeout(t);if(!r.ok)throw Error();return r.json()}).then(function(j){if(!j.results||!j.results.length)throw Error();st.textContent='Fetched '+new Date(j.fetchedAt).toLocaleString()+' · OpenAlex · not editorially verified';box.innerHTML=j.results.map(function(x){return '<li><a href="'+encodeURI(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+'</a><span class="meta" style="flex:none">'+esc(x.date)+'</span></li>'}).join('')}).catch(function(){st.textContent='Live discovery is unavailable right now. The curated sources above are unaffected.'})}document.getElementById('refresh').addEventListener('click',load);load()})();</script>`;
  write('/sources', page({ path: '/sources', section: '/sources', title: 'Research sources', description: 'The research organizations and records behind Frontier Intelligence Watch — Artificial Analysis, Epoch AI, METR, UK AISI, Stanford AI Index, arXiv and primary disclosures.', body, scripts: js, ogTitle: 'Research, not headlines', ogKicker: 'Our sources' }));
}

// ---------- ABOUT ----------
write('/about', page({
  path: '/about', section: '/about', title: 'About', description: 'Frontier Intelligence Watch is built by a dad learning and using AI to expand human knowledge and live a life of purpose — evidence-first AI briefings for everyone.',
  ogTitle: 'Built by a dad learning AI — evidence, not hype', ogKicker: 'About the project',
  body: `<header class="article-head"><div class="wrap"><span class="kicker">About the project</span><h1>Evidence, not hype—for everyone.</h1><p class="lead read">Frontier Intelligence Watch is built by a dad who is learning and using AI to expand human knowledge and live a life of purpose.</p></div></header>
<div class="wrap layout">
<article class="prose">
<h2>Why this exists</h2>
<p>Artificial intelligence is changing quickly, and most of what reaches families and everyday readers is either hype or alarm. This project started as one parent's effort to understand what is actually happening at the frontier of AI—and to share it in plain English, so others can understand it too.</p>
<p>The goal is simple: use AI to expand human knowledge, not replace human judgment. Each week we read the original research, evaluations, incident reports and official records, then explain what happened, why it matters, and—just as importantly—what it does <em>not</em> prove.</p>
<h2>How it's made</h2>
<p>AI tools help discover research, organize sources and draft plain-English explanations. Publication depends on checking key claims against the cited material, and every story links to its sources so you can check them yourself. AI-assisted summaries can miss nuance or introduce errors; when we find one, we correct it visibly under our <a href="/editorial-standards#corrections">corrections policy</a>.</p>
<div class="callout"><span class="kicker">Our promise</span><p>No invented numbers, no “percent to superintelligence,” no viral claims presented as fact. Documented findings, research results, company claims and speculation are labeled as what they are.</p></div>
<h2>What this is—and isn't</h2>
<p>This is an independent educational project. It is not a government intelligence service, a peer-reviewed journal, or professional investment or security advice. We have no access to unpublished model weights or classified information, and a lack of public evidence is not proof that something is impossible.</p>
<h2>Follow and get in touch</h2>
<p>New issues are announced on our ${ext(FACEBOOK, 'Facebook page')}. You can also follow along with the <a href="/feed.xml">RSS feed</a>. Spotted an error or have a primary source to suggest? ${ext(GITHUB_ISSUES, 'Submit a correction or tip on GitHub')} (please don't include private information).</p>
<div class="actions"><a class="btn" href="${FACEBOOK}" target="_blank" rel="noopener noreferrer">Follow on Facebook<span class="sr-only"> (opens in a new tab)</span></a><a class="btn ghost" href="/issue/${esc(latest.id)}">Read the latest issue</a></div>
</article>
<aside class="aside"><div class="panel"><h2>At a glance</h2><ul class="mini"><li><span>Issues published</span><span class="count">${issues.length}</span></li><li><span>Plain-English explainers</span><span class="count">${content.guides.length}</span></li><li><span>Dictionary terms</span><span class="count">${glossary.length}</span></li><li><span>Latest issue</span><span class="count">${esc(latest.id)}</span></li></ul></div>
<div class="panel"><h2>Read more</h2><ul class="link-list"><li><a href="/editorial-standards">Editorial standards</a></li><li><a href="/sources">Research sources</a></li><li><a href="/archive">Issue archive</a></li></ul></div></aside>
</div>`,
  jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About ' + NAME, url: SITE + '/about' }],
}));

// ---------- EDITORIAL STANDARDS (content preserved from v1) ----------
{
  const src = read('src/editorial-standards.html');
  const article = (src.match(/<article>([\s\S]*?)<\/article>/) || [])[1];
  if (!article) throw new Error('Could not extract editorial standards article');
  const toc = [...article.matchAll(/<section id="([^"]+)"><h2>([^<]+)<\/h2>/g)].map(m => [m[1], m[2].replace(/^\d+\.\s*/, '')]);
  const art = article.replace(/<span class="pill">([^<]+)<\/span>/g, '<span class="tag">$1</span>').replace(/<div class="highlight">/g, '<div class="callout">').replace(/<div class="contact">/g, '<div class="panel">').replace(/<strong class="key">/g, '<strong>').replace(/ style="font-size:12px"/g, ' class="meta"');
  write('/editorial-standards', page({
    path: '/editorial-standards', section: '/editorial-standards', title: 'Editorial standards & corrections', description: 'How Frontier Intelligence Watch sources claims, labels evidence, builds charts, corrects errors and uses AI tools.', ogTitle: 'Editorial standards & corrections', ogKicker: 'How we work',
    body: `<header class="article-head"><div class="wrap"><span class="kicker">About our research<span class="dot">·</span>Policy established October 2026</span><h1>Editorial standards &amp; corrections</h1><p class="lead read">Frontier Intelligence Watch is a free public AI research explainer. Our goal is to make important developments understandable without confusing announcements, evidence, predictions or speculation.</p></div></header>
<div class="wrap layout"><article class="prose">${art}</article>
<aside class="aside"><nav class="panel toc" aria-label="On this page"><h2>On this page</h2><ul class="link-list">${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t.replace(/&amp;/g, '&'))}</a></li>`).join('')}</ul></nav></aside></div>`,
  }));
}

// ---------- 404 + latest redirect ----------
write('/404', page({ path: '/404', title: 'Page not found', description: 'This page could not be found.', noindex: true, body: `<header class="article-head"><div class="wrap"><span class="kicker">404</span><h1>That page isn't here.</h1><p class="lead read">It may have moved, or the address may have a typo. Every published issue remains in the archive.</p><div class="actions"><a class="btn" href="/issue/${esc(latest.id)}">Latest issue</a><a class="btn ghost" href="/archive">Issue archive</a><a class="btn ghost" href="/dictionary">AI dictionary</a></div></div></header>` }));
fs.writeFileSync(path.join(OUT, 'issue', 'latest.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Latest issue | ${NAME}</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/issue/${latest.id}"><meta http-equiv="refresh" content="0; url=/issue/${latest.id}"></head><body><p><a href="/issue/${latest.id}">Go to the latest issue (${latest.id})</a></p></body></html>\n`);

// ---------- sitemap, robots, RSS ----------
const lastmod = toISO(latest.date) || content.updated;
const sm = written.filter(p => p !== '/404').map(p => {
  let lm = lastmod;
  const im = p.match(/^\/issue\/(\d+)/); if (im) lm = toISO(issues.find(x => x.id === im[1])?.date) || lastmod;
  const gm = p.match(/^\/guide\/(.+)/); if (gm) { const g = guides.get(gm[1]); lm = toISO(g?.date) || toISO(guideIssue.get(gm[1])?.date) || lastmod; }
  return `<url><loc>${SITE}${p === '/' ? '/' : p}</loc><lastmod>${lm}</lastmod></url>`;
});
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm.join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
const rfc = d => new Date(Date.parse(d + ' 12:00:00 UTC')).toUTCString();
fs.writeFileSync(path.join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(NAME)}</title>
<link>${SITE}/</link>
<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Plain-English, source-linked weekly briefings on frontier AI. ${esc(TAGLINE)}</description>
<language>en-us</language>
<lastBuildDate>${rfc(latest.date)}</lastBuildDate>
${issues.map(i => `<item><title>${esc(`Issue ${i.id}: ${i.title}`)}</title><link>${SITE}/issue/${i.id}</link><guid isPermaLink="true">${SITE}/issue/${i.id}</guid><pubDate>${rfc(i.date)}</pubDate><description>${esc(i.intro)}</description></item>`).join('\n')}
</channel>
</rss>
`);

// ---------- self-check ----------
const problems = [];
for (const g of content.guides) for (const t of g.terms || []) if (!termIds.has(slugTerm(t))) problems.push('Unknown term ' + t);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`Built ${written.length} pages into dist/ (latest issue ${latest.id}; ${issues.length} issues, ${content.guides.length} guides, ${glossary.length} terms).`);
