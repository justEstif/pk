const scenarios = {
   pm: [
      { type: 'you', text: 'You: why did we push the v2 launch back?' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Let me check your knowledge base.' },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_search', args: '{"query": "v2 launch delay", "type": "decision"}' },
      { type: 'result', path: 'decisions/v2-launch-delay.md', score: '0.91' },
      { type: 'snippet', text: '"Delayed 6 weeks — enterprise SSO was a confirmed blocker…"' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: You pushed v2 back 6 weeks to ship enterprise SSO first.' },
      { type: 'cont', text: 'Three customer calls in mid-October confirmed it was a hard blocker.' },
      { type: 'divider' },
      { type: 'you', text: 'You: are there any open questions about the enterprise tier?' },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_search', args: '{"query": "enterprise tier", "type": "question", "status": "open"}' },
      { type: 'result', path: 'questions/enterprise-pricing.md', score: '0.87' },
      { type: 'snippet', text: '"Do enterprise customers get SSO included or as an add-on?"' },
      { type: 'result', path: 'questions/enterprise-sla.md', score: '0.74' },
      { type: 'snippet', text: '"What SLA are we committing to for enterprise customers?"' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Two open questions — SSO pricing (included vs add-on)' },
      { type: 'cont', text: 'and the SLA commitment. Both still unresolved.' },
      { type: 'divider' },
      { type: 'you', text: 'You: save this — we decided SSO is included in enterprise' },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_new', args: '{"type": "decision", "title": "SSO included in enterprise tier", "tags": "enterprise, pricing"}' },
      { type: 'created', path: 'decisions/sso-enterprise-included.md' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Saved. Tagged enterprise + pricing. The open question' },
      { type: 'cont', text: 'about SSO pricing is now answered. ▌', cursor: true },
   ],

   eng: [
      { type: 'you', text: 'You: what did we decide about rate limiting?' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Let me check your knowledge base.' },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_search', args: '{"query": "rate limiting", "type": "decision"}' },
      { type: 'result', path: 'decisions/api-rate-limiting.md', score: '0.88' },
      { type: 'snippet', text: '"Token bucket, 1000 req/min per API key — revisit at 10k users…"' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Token bucket at 1000 req/min per API key.' },
      { type: 'cont', text: 'You flagged it to revisit once you hit 10k active users.' },
      { type: 'divider' },
      { type: 'you', text: "You: we're at 8k now — save a note to revisit next sprint" },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_new', args: '{"type": "question", "title": "Revisit rate limit — approaching 10k users", "tags": "api, scaling"}' },
      { type: 'created', path: 'questions/rate-limit-revisit.md' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Saved as an open question. Will surface next time' },
      { type: 'cont', text: 'you search for rate limiting or scaling decisions.' },
      { type: 'divider' },
      { type: 'you', text: 'You: any other scaling decisions I should know about?' },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_search', args: '{"query": "scaling", "type": "decision"}' },
      { type: 'result', path: 'decisions/drop-postgres.md', score: '0.82' },
      { type: 'snippet', text: '"SQLite for now — single server, revisit if we need multi-region…"' },
      { type: 'result', path: 'decisions/cdn-strategy.md', score: '0.71' },
      { type: 'snippet', text: '"Cloudflare for static assets, no origin shield until 50k DAU…"' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Two relevant decisions — SQLite until multi-region is needed,' },
      { type: 'cont', text: 'and Cloudflare CDN with no origin shield until 50k DAU. ▌', cursor: true },
   ],

   hire: [
      { type: 'you', text: 'You: what should I know before my first week?' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Let me pull together your project context.' },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_synthesize', args: '{"session_start": true, "limit": 5}' },
      { type: 'result', path: 'Synthesized 5 notes', score: null },
      { type: 'snippet', text: '"2 open questions · 4 key decisions · 1 active note"' },
      { type: 'gap' },
      { type: 'agent', text: "Claude: Here's what matters right now: you're mid-way through a" },
      { type: 'cont', text: 'pricing model change, 2 open questions on the enterprise tier,' },
      { type: 'cont', text: 'and v2 ships in 6 weeks.' },
      { type: 'divider' },
      { type: 'you', text: "You: what's still unresolved?" },
      { type: 'gap' },
      { type: 'tool', cmd: 'pk_search', args: '{"type": "question", "status": "open"}' },
      { type: 'result', path: 'questions/enterprise-pricing.md', score: null },
      { type: 'snippet', text: '"Do enterprise customers get SSO included or as an add-on?"' },
      { type: 'result', path: 'questions/enterprise-sla.md', score: null },
      { type: 'snippet', text: '"What SLA are we committing to for enterprise customers?"' },
      { type: 'result', path: 'questions/mobile-app-timeline.md', score: null },
      { type: 'snippet', text: '"When does the mobile app ship relative to v2?"' },
      { type: 'gap' },
      { type: 'agent', text: 'Claude: Three open questions. The first two block the enterprise' },
      { type: 'cont', text: 'launch. The mobile timeline is tracked but not on the critical path. ▌', cursor: true },
   ],
};

function renderLine(line) {
   if (line.type === 'gap') {
      const d = document.createElement('div');
      d.className = 'gap';
      return d;
   }
   if (line.type === 'divider') {
      const d = document.createElement('div');
      d.className = 'turn-divider';
      return d;
   }

   const d = document.createElement('div');

   if (line.type === 'you') {
      d.className = 'you-line';
      d.textContent = line.text;
   } else if (line.type === 'agent') {
      d.className = 'agent-line';
      d.textContent = line.text;
   } else if (line.type === 'cont') {
      d.className = 'agent-line cont';
      d.innerHTML = line.cursor
         ? line.text.replace(' ▌', '') + ' <span class="cursor">▌</span>'
         : line.text;
   } else if (line.type === 'tool') {
      d.className = 'tool-line';
      d.innerHTML = `<span class="ok">⏺</span> <span class="cmd">${line.cmd}</span> <span class="dim">${line.args}</span>`;
   } else if (line.type === 'result') {
      d.className = 'result-line';
      d.innerHTML = line.score
         ? `${line.path} <span class="dim">· score ${line.score}</span>`
         : `<span class="dim">${line.path}</span>`;
   } else if (line.type === 'snippet') {
      d.className = 'snippet-line dim';
      d.textContent = line.text;
   } else if (line.type === 'created') {
      d.className = 'created-line';
      d.innerHTML = `<span class="ok">✓</span>  ${line.path}`;
   }

   return d;
}

function render(tab) {
   const body = document.getElementById('demo-body');
   body.innerHTML = '';
   for (const line of scenarios[tab]) {
      body.appendChild(renderLine(line));
   }
}

document.querySelectorAll('.demo-tab').forEach(btn => {
   btn.addEventListener('click', () => {
      document.querySelectorAll('.demo-tab').forEach(b => {
         b.classList.remove('active');
         b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      render(btn.dataset.tab);
   });
});

render('pm');
