const scenarios = {
   acme: {
      label: '~/projects/acme',
      lines: [
         { type: 'you', text: 'You: why did we push the v2 launch back?' },
         { type: 'lookup', text: 'searched decisions · v2-launch-delay.md' },
         { type: 'agent', text: 'Claude: You pushed v2 back 6 weeks to ship enterprise SSO first.' },
         { type: 'cont', text: 'Three customer calls in mid-October confirmed it as a blocker.' },
         { type: 'divider' },
         { type: 'you', text: 'You: any open questions on the enterprise tier?' },
         { type: 'lookup', text: 'searched questions · enterprise-pricing.md, enterprise-sla.md' },
         { type: 'agent', text: 'Claude: Two open questions — SSO pricing and the SLA commitment.' },
         { type: 'cont', text: 'Both still unresolved.' },
         { type: 'divider' },
         { type: 'you', text: 'You: log that we decided SSO is included, not an add-on.' },
         { type: 'lookup', text: 'created decisions/sso-pricing.md' },
         { type: 'agent', text: 'Claude: Saved. Marked enterprise-pricing.md as answered.', cursor: true },
      ],
   },

   nova: {
      label: '~/projects/nova',
      lines: [
         { type: 'you', text: 'You: catch me up — what are we working on?' },
         { type: 'lookup', text: 'synthesized 5 notes · 2 open questions, 3 decisions' },
         { type: 'agent', text: "Claude: Nova is a clinical trials research tool. You're mid-way" },
         { type: 'cont', text: 'through the data ingestion pipeline. Two open questions: the export' },
         { type: 'cont', text: 'format for regulators and whether to self-host the LLM.' },
         { type: 'divider' },
         { type: 'you', text: 'You: what did we decide about the LLM?' },
         { type: 'lookup', text: 'searched decisions · llm-hosting.md' },
         { type: 'agent', text: "Claude: Self-host on-prem. Patient data can't leave the hospital" },
         { type: 'cont', text: 'network — regulatory requirement, non-negotiable.' },
         { type: 'divider' },
         { type: 'you', text: 'You: what export format are regulators asking for?' },
         { type: 'lookup', text: 'searched questions · regulator-export-format.md' },
         { type: 'agent', text: 'Claude: Still open. Last note says FDA asked for HL7 FHIR but' },
         { type: 'cont', text: "the team hasn't confirmed feasibility yet.", cursor: true },
      ],
   },

   atlas: {
      label: '~/clients/atlas',
      lines: [
         { type: 'you', text: 'You: first day on atlas — what do I need to know?' },
         { type: 'lookup', text: 'synthesized 6 notes · 3 open questions, 4 decisions' },
         { type: 'agent', text: "Claude: Atlas is a logistics platform. They're mid-migration from" },
         { type: 'cont', text: 'monolith to services. Postgres is source of truth. Mobile app' },
         { type: 'cont', text: 'is owned by a separate vendor team.' },
         { type: 'divider' },
         { type: 'you', text: 'You: why Postgres over MongoDB?' },
         { type: 'lookup', text: 'searched decisions · database-choice.md' },
         { type: 'agent', text: 'Claude: Shipment tracking is inherently relational — joins' },
         { type: 'cont', text: 'outperformed document lookups in load tests.' },
         { type: 'divider' },
         { type: 'you', text: 'You: is the vendor team aware of the migration timeline?' },
         { type: 'lookup', text: 'searched questions · vendor-migration-sync.md' },
         { type: 'agent', text: "Claude: Open question — no record of them being looped in." },
         { type: 'cont', text: 'Flagged as a risk back in March. Still unresolved.', cursor: true },
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
   } else if (line.type === 'lookup') {
      d.className = 'lookup-line';
      d.innerHTML = `<span class="lookup-dot">·</span> ${line.text}`;
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
