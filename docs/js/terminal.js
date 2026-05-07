const scenarios = {
   acme: {
      label: '~/projects/acme',
      lines: [
         { type: 'you', text: 'You: why did we push the v2 launch back?' },
         { type: 'gap' },
         { type: 'tool', cmd: 'pk_search', args: '{"query": "v2 launch delay", "type": "decision"}' },
         { type: 'result', path: 'decisions/v2-launch-delay.md', score: '0.91' },
         { type: 'snippet', text: '"Delayed 6 weeks — enterprise SSO was a confirmed blocker…"' },
         { type: 'gap' },
         { type: 'agent', text: 'Claude: You pushed v2 back 6 weeks to ship enterprise SSO first.' },
         { type: 'cont', text: 'Three customer calls in mid-October confirmed it as a hard blocker.' },
         { type: 'divider' },
         { type: 'you', text: 'You: any open questions on the enterprise tier?' },
         { type: 'gap' },
         { type: 'tool', cmd: 'pk_search', args: '{"query": "enterprise", "type": "question", "status": "open"}' },
         { type: 'result', path: 'questions/enterprise-pricing.md', score: '0.87' },
         { type: 'snippet', text: '"SSO included in enterprise, or sold as an add-on?"' },
         { type: 'result', path: 'questions/enterprise-sla.md', score: '0.74' },
         { type: 'snippet', text: '"What SLA are we committing to for enterprise customers?"' },
         { type: 'gap' },
         { type: 'agent', text: 'Claude: Two open questions — SSO pricing and the SLA commitment.' },
         { type: 'cont', text: 'Both still unresolved.', cursor: true },
      ],
   },

   nova: {
      label: '~/projects/nova',
      lines: [
         { type: 'you', text: 'You: catch me up — what are we working on?' },
         { type: 'gap' },
         { type: 'tool', cmd: 'pk_synthesize', args: '{"session_start": true, "limit": 5}' },
         { type: 'result', path: 'Synthesized 5 notes', score: null },
         { type: 'snippet', text: '"2 open questions · 3 decisions · 1 active note"' },
         { type: 'gap' },
         { type: 'agent', text: "Claude: Nova is a research tool for clinical trials. You're mid-way" },
         { type: 'cont', text: 'through the data ingestion pipeline. Two open questions: the export' },
         { type: 'cont', text: 'format for regulators and whether to self-host the LLM.' },
         { type: 'divider' },
         { type: 'you', text: 'You: what did we decide about the LLM?' },
         { type: 'gap' },
         { type: 'tool', cmd: 'pk_search', args: '{"query": "LLM self-host", "type": "decision"}' },
         { type: 'result', path: 'decisions/llm-hosting.md', score: '0.93' },
         { type: 'snippet', text: '"Self-host on-prem — patient data cannot leave the hospital network…"' },
         { type: 'gap' },
         {
            type: 'agent', text: "Claude: Decided to self-host. Patient data can't leave the hospital"
         },
         { type: 'cont', text: 'network — regulatory requirement, non-negotiable.', cursor: true },
      ],
   },

   atlas: {
      label: '~/clients/atlas',
      lines: [
         { type: 'you', text: 'You: first day on atlas — what do I need to know?' },
         { type: 'gap' },
         { type: 'tool', cmd: 'pk_synthesize', args: '{"session_start": true, "limit": 6}' },
         { type: 'result', path: 'Synthesized 6 notes', score: null },
         { type: 'snippet', text: '"3 open questions · 4 decisions · 2 sources"' },
         { type: 'gap' },
         {
            type: 'agent', text: "Claude: Atlas is a logistics platform. Key things: they're migrating"
         },
         { type: 'cont', text: 'from a monolith to services, Postgres is the source of truth, and' },
         { type: 'cont', text: 'the mobile app is owned by a separate vendor team.' },
         { type: 'divider' },
         { type: 'you', text: 'You: why did they pick Postgres over MongoDB?' },
         { type: 'gap' },
         { type: 'tool', cmd: 'pk_search', args: '{"query": "postgres mongodb decision"}' },
         { type: 'result', path: 'decisions/database-choice.md', score: '0.89' },
         { type: 'snippet', text: '"Relational model fits shipment tracking — joins over documents…"' },
         { type: 'gap' },
         { type: 'agent', text: 'Claude: Chose Postgres because the shipment tracking data is' },
         { type: 'cont', text: 'inherently relational — joins outperformed document lookups in load tests.', cursor: true },
      ],
   },
};

function renderLine(line) {
   if (line.type === 'gap') {
      const d = document.createElement('div');
      d.className = 't-gap';
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
         ? line.text + ' <span class="cursor">▌</span>'
         : line.text;
   } else if (line.type === 'tool') {
      d.className = 'tool-line';
      d.innerHTML = `<span class="green">⏺</span> <span class="amber">${line.cmd}</span> <span class="dim">${line.args}</span>`;
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
      d.innerHTML = `<span class="green">✓</span>  ${line.path}`;
   }

   return d;
}

function render(tab) {
   const scenario = scenarios[tab];
   const body = document.getElementById('demo-body');
   const label = document.getElementById('win-label');
   body.innerHTML = '';
   label.textContent = 'Claude Code · ' + scenario.label;
   for (const line of scenario.lines) {
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

render('acme');
