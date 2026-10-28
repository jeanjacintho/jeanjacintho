// Generates assets/terminal-dark.svg and assets/terminal-light.svg:
// an animated terminal that types out a short profile intro.
// Run with `node scripts/terminal.js`. Stats come from the GitHub API when reachable.

const fs = require('fs');
const path = require('path');

const USER = 'jeanjacintho';
const CODING_SINCE = 2015;

const THEMES = {
  dark: {
    bg: '#0d1117', bar: '#161b22', border: '#30363d', title: '#8b949e',
    text: '#c9d1d9', muted: '#8b949e', user: '#7ee787', path: '#79c0ff',
    key: '#d2a8ff', accent: '#e3b341', cursor: '#c9d1d9',
  },
  light: {
    bg: '#ffffff', bar: '#f6f8fa', border: '#d0d7de', title: '#57606a',
    text: '#24292f', muted: '#57606a', user: '#1a7f37', path: '#0969da',
    key: '#8250df', accent: '#9a6700', cursor: '#24292f',
  },
};

const FONT_SIZE = 14;
const CHAR_W = FONT_SIZE * 0.6;
const LINE_H = 22;
const PAD_X = 24;
const BAR_H = 36;
const WIDTH = 720;

const TYPE_SPEED = 0.06;
const START_DELAY = 0.6;
const AFTER_TYPE = 0.35;
const AFTER_OUTPUT = 0.6;

async function fetchStats() {
  try {
    const headers = { 'User-Agent': USER };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${USER}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const user = await res.json();
    return { repos: user.public_repos, followers: user.followers };
  } catch (err) {
    console.warn(`Skipping stats: ${err.message}`);
    return null;
  }
}

// Each output line is a list of [text, color] segments.
function buildSession(stats) {
  const years = new Date().getFullYear() - CODING_SINCE;
  const session = [
    { cmd: 'whoami', out: [[['Jean Jacintho', 'text'], [' · Full Stack Software Engineer', 'muted']]] },
    {
      cmd: 'cat stack.txt',
      out: [
        [['back-end    ', 'key'], ['Java · Spring Boot · Node.js · REST · Microservices', 'text']],
        [['front-end   ', 'key'], ['TypeScript · JavaScript · React · Next.js · Vue.js · Angular', 'text']],
        [['mobile      ', 'key'], ['React Native · Swift', 'text']],
        [['data        ', 'key'], ['PostgreSQL · MySQL · Oracle · MongoDB · Firebase', 'text']],
        [['ai agents   ', 'key'], ['OpenClaw · Hermes · Plow · Spring AI', 'text']],
        [['llms        ', 'key'], ['Claude · GPT · Gemini · Grok · Llama · Ollama', 'text']],
        [['devops      ', 'key'], ['Docker · RabbitMQ · Jenkins · Maven · Git', 'text']],
        [['e-commerce  ', 'key'], ['Shopify · Liquid · SEO · CRO', 'text'], ['  (7+ years)', 'muted']],
        [['practices   ', 'key'], ['Scrum · SOLID · Design Patterns', 'text']],
      ],
    },
    {
      cmd: 'cat now.md',
      out: [[['building    ', 'key'], ['a team of AI agents that runs on your own AI subscriptions', 'text']]],
    },
    {
      cmd: 'cat achievements/hackathon.md',
      out: [
        [['★ Winner', 'accent'], [' · Build Your First Hire hackathon by AI Worth Using', 'text']],
        [['  built   ', 'key'], ['Meetly, a personal AI meeting agent', 'text']],
        [['  picked  ', 'key'], ['by Tom Preston-Werner (GitHub co-founder)', 'text']],
        [['  demoed  ', 'key'], ["at PWV's AgentCribs", 'text']],
      ],
    },
    { cmd: 'uptime', out: [[['coding since ', 'muted'], [String(CODING_SINCE), 'text'], [` · ${years} years`, 'muted']]] },
  ];
  if (stats) {
    session.push({
      cmd: `gh api users/${USER}`,
      out: [[
        ['repos ', 'key'], [String(stats.repos), 'text'],
        ['  followers ', 'key'], [String(stats.followers), 'text'],
      ]],
    });
  }
  return session;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(session, t) {
  const PROMPT = [['jean@github', 'user'], [':', 'muted'], ['~', 'path'], ['$ ', 'muted']];
  const promptLen = PROMPT.reduce((n, [s]) => n + s.length, 0);
  const promptX = PAD_X + promptLen * CHAR_W;

  const lineCount = session.reduce((n, s) => n + 1 + s.out.length + 1, 0) + 1;
  const height = BAR_H + 20 + lineCount * LINE_H;

  const tspans = (segs) =>
    segs.map(([s, c]) => `<tspan fill="${t[c]}">${esc(s)}</tspan>`).join('');
  const show = (time) => `<set attributeName="opacity" to="1" begin="${time.toFixed(2)}s" fill="freeze"/>`;

  const defs = [];
  const body = [];
  let y = BAR_H + 26;
  let time = START_DELAY;

  session.forEach(({ cmd, out }, i) => {
    const typeDur = cmd.length * TYPE_SPEED;
    const widths = Array.from({ length: cmd.length + 1 }, (_, k) => (k * CHAR_W).toFixed(1));
    const steps = widths.map((w) => (promptX + Number(w)).toFixed(1));

    defs.push(
      `<clipPath id="c${i}"><rect x="${promptX}" y="${y - 16}" height="${LINE_H}" width="0">` +
      `<animate attributeName="width" values="${widths.join(';')}" calcMode="discrete" ` +
      `begin="${time.toFixed(2)}s" dur="${typeDur.toFixed(2)}s" fill="freeze"/></rect></clipPath>`
    );
    body.push(`<text x="${PAD_X}" y="${y}" opacity="0">${tspans(PROMPT)}${show(time)}</text>`);
    body.push(`<text x="${promptX}" y="${y}" fill="${t.text}" clip-path="url(#c${i})">${esc(cmd)}</text>`);
    body.push(
      `<rect x="${promptX}" y="${y - 13}" width="${CHAR_W}" height="16" fill="${t.cursor}" opacity="0">` +
      `${show(time)}<animate attributeName="x" values="${steps.join(';')}" calcMode="discrete" ` +
      `begin="${time.toFixed(2)}s" dur="${typeDur.toFixed(2)}s" fill="freeze"/>` +
      `<set attributeName="opacity" to="0" begin="${(time + typeDur + AFTER_TYPE).toFixed(2)}s" fill="freeze"/></rect>`
    );

    time += typeDur + AFTER_TYPE;
    y += LINE_H;
    out.forEach((segs) => {
      body.push(`<text x="${PAD_X}" y="${y}" opacity="0">${tspans(segs)}${show(time)}</text>`);
      y += LINE_H;
    });
    y += LINE_H;
    time += AFTER_OUTPUT;
  });

  body.push(`<text x="${PAD_X}" y="${y}" opacity="0">${tspans(PROMPT)}${show(time)}</text>`);
  body.push(
    `<rect x="${promptX}" y="${y - 13}" width="${CHAR_W}" height="16" fill="${t.cursor}" opacity="0">` +
    `<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.1s" ` +
    `begin="${time.toFixed(2)}s" repeatCount="indefinite"/></rect>`
  );

  const dots = ['#ff5f56', '#ffbd2e', '#27c93f']
    .map((c, i) => `<circle cx="${22 + i * 20}" cy="${BAR_H / 2}" r="6" fill="${c}"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
<defs>${defs.join('')}</defs>
<style>text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;font-size:${FONT_SIZE}px;white-space:pre}</style>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="10" fill="${t.bg}" stroke="${t.border}"/>
<path d="M0.5 ${BAR_H}V10.5a10 10 0 0 1 10-10h${WIDTH - 21}a10 10 0 0 1 10 10V${BAR_H}Z" fill="${t.bar}"/>
<line x1="0.5" y1="${BAR_H}" x2="${WIDTH - 0.5}" y2="${BAR_H}" stroke="${t.border}"/>
${dots}
<text x="${WIDTH / 2}" y="${BAR_H / 2 + 4}" fill="${t.title}" text-anchor="middle" style="font-size:12px">jean@github: ~</text>
${body.join('\n')}
</svg>
`;
}

(async () => {
  const session = buildSession(await fetchStats());
  const outDir = path.join(__dirname, '..', 'assets');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, theme] of Object.entries(THEMES)) {
    fs.writeFileSync(path.join(outDir, `terminal-${name}.svg`), render(session, theme));
  }
  console.log('Generated terminal SVGs');
})();
