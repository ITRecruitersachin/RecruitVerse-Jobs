/* RecruitVerse Module 14 — cloud recruitment pipeline
   Corrected initialization: this script is loaded at the end of index.html,
   so DOMContentLoaded may already have fired. Initialize immediately when ready.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const db = () => window.RecruitVerseBackend?.client || null;
  const stages = ['new', 'contacted', 'submitted', 'interview', 'offer', 'placed', 'rejected', 'withdrawn'];
  const labels = {
    new: 'New', contacted: 'Contacted', submitted: 'Submitted', interview: 'Interview',
    offer: 'Offer', placed: 'Placed', rejected: 'Rejected', withdrawn: 'Withdrawn'
  };

  let jobs = [];
  let candidates = [];
  let rows = [];
  let loading = false;
  let loadAgain = false;
  let initialized = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const csv = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  const msg = text => { const el = $('pipelineStatus'); if (el) el.textContent = text; };

  async function signedInUser() {
    const client = db();
    if (!client) throw new Error('Supabase client is not initialized. Check backend.js and supabase-config.js.');
    const { data, error } = await client.auth.getUser();
    if (error) throw new Error('Could not verify your sign-in: ' + error.message);
    if (!data?.user) throw new Error('Please sign in with your RecruitVerse recruiter/admin account.');
    return data.user;
  }

  function setSelect(selectId, placeholder, items, makeLabel) {
    const select = $(selectId);
    if (!select) return;
    const previous = select.value;
    select.innerHTML = `<option value="">${esc(placeholder)}</option>` + items.map(item =>
      `<option value="${esc(item.id)}">${esc(makeLabel(item))}</option>`
    ).join('');
    if (items.some(item => String(item.id) === previous)) select.value = previous;
    if (!items.length) select.innerHTML = `<option value="">${esc(placeholder)} — no records available</option>`;
  }

  async function loadPickers() {
    const client = db();
    await signedInUser();

    msg('Loading jobs and candidates from Supabase…');
    const [jobResult, candidateResult] = await Promise.all([
      client.from('jobs')
        .select('id,title,company,location,status,created_at')
        .order('created_at', { ascending: false }),
      client.from('candidates')
        .select('id,full_name,email,target_role,location,skills,created_at')
        .order('created_at', { ascending: false })
    ]);

    if (jobResult.error) throw new Error('Could not load jobs: ' + jobResult.error.message);
    if (candidateResult.error) throw new Error('Could not load candidates: ' + candidateResult.error.message);

    jobs = jobResult.data || [];
    candidates = candidateResult.data || [];

    setSelect('pipelineJob', 'Select a job', jobs, job =>
      `${job.title || 'Untitled job'} — ${job.company || 'Company not specified'} (${job.status || 'no status'})`
    );
    setSelect('pipelineCandidate', 'Select a candidate', candidates, candidate =>
      `${candidate.full_name || 'Candidate'} — ${candidate.target_role || candidate.email || 'Profile'}`
    );

    if (!jobs.length || !candidates.length) {
      msg(`Loaded ${jobs.length} jobs and ${candidates.length} candidates. If records are expected, check the signed-in user's Supabase access policies.`);
    }
  }

  function filteredRows() {
    const query = ($('pipelineSearch')?.value || '').trim().toLowerCase();
    const stage = $('pipelineFilter')?.value || '';
    return rows.filter(row => {
      const searchable = [
        row.candidates?.full_name, row.candidates?.email,
        row.jobs?.title, row.jobs?.company, row.client_name, row.stage
      ].join(' ').toLowerCase();
      return (!stage || row.stage === stage) && (!query || searchable.includes(query));
    });
  }

  function render() {
    const list = $('pipelineList');
    if (!list) return;
    const visibleRows = filteredRows();
    const count = stage => rows.filter(row => row.stage === stage).length;

    if ($('pipeTotal')) $('pipeTotal').textContent = rows.length;
    if ($('pipeInterview')) $('pipeInterview').textContent = count('interview');
    if ($('pipeOffer')) $('pipeOffer').textContent = count('offer');
    if ($('pipePlaced')) $('pipePlaced').textContent = count('placed');

    list.innerHTML = visibleRows.map(row => `
      <article class="pipeline-row">
        <div class="pipeline-info">
          <strong>${esc(row.candidates?.full_name || 'Candidate')}</strong>
          <span>${esc(row.jobs?.title || 'Job')} · ${esc(row.jobs?.company || '')}</span>
          <small>${esc(row.candidates?.email || '')} · ${esc(row.candidates?.location || '')}${row.client_name ? ' · Client: ' + esc(row.client_name) : ''}</small>
          ${row.recruiter_notes ? `<p>${esc(row.recruiter_notes)}</p>` : ''}
          <small>Added ${row.created_at ? new Date(row.created_at).toLocaleDateString() : ''}</small>
        </div>
        <div class="pipeline-actions">
          <label class="sr-only" for="stage-${esc(row.id)}">Recruitment stage</label>
          <select id="stage-${esc(row.id)}" data-stage-id="${esc(row.id)}">
            ${stages.map(stage => `<option value="${stage}" ${row.stage === stage ? 'selected' : ''}>${labels[stage]}</option>`).join('')}
          </select>
        </div>
      </article>`).join('') || '<p class="muted">No submissions found. Add a candidate to a job above.</p>';
  }

  async function load() {
    if (loading) { loadAgain = true; return; }
    loading = true;
    try {
      if ($('pipelineList')) $('pipelineList').innerHTML = '<p class="muted">Loading cloud pipeline…</p>';
      await loadPickers();

      const { data, error } = await db().from('candidate_submissions')
        .select('id,job_id,candidate_id,stage,client_name,recruiter_notes,created_at,submitted_at,jobs(title,company),candidates(full_name,email,location,target_role)')
        .order('created_at', { ascending: false });
      if (error) throw new Error('Could not load pipeline records: ' + error.message);

      rows = data || [];
      render();
      msg(`Loaded ${jobs.length} jobs, ${candidates.length} candidates and ${rows.length} tracked submissions.`);
    } catch (error) {
      const message = error?.message || 'Unable to load the recruitment pipeline.';
      if ($('pipelineList')) $('pipelineList').textContent = message;
      msg(message);
    } finally {
      loading = false;
      if (loadAgain) { loadAgain = false; load(); }
    }
  }

  async function add(event) {
    event.preventDefault();
    try {
      const user = await signedInUser();
      const jobId = $('pipelineJob')?.value;
      const candidateId = $('pipelineCandidate')?.value;
      if (!jobId || !candidateId) throw new Error('Select both a job and a candidate.');

      const stage = $('pipelineStage')?.value || 'new';
      if (!stages.includes(stage)) throw new Error('Select a valid recruitment stage.');
      msg('Saving submission to Supabase…');

      const { error } = await db().from('candidate_submissions').insert({
        job_id: jobId,
        candidate_id: candidateId,
        owner_id: user.id,
        stage,
        client_name: $('pipelineClient')?.value.trim() || '',
        recruiter_notes: $('pipelineNotes')?.value.trim() || '',
        submitted_at: stage === 'submitted' ? new Date().toISOString() : null
      });

      if (error?.code === '23505') throw new Error('This candidate is already linked to this job.');
      if (error) throw new Error('Could not save submission: ' + error.message);

      $('pipelineForm')?.reset();
      msg('Candidate added to the recruitment pipeline.');
      await load();
    } catch (error) {
      msg(error?.message || 'Could not save submission.');
    }
  }

  async function updateStage(id, stage) {
    try {
      await signedInUser();
      if (!stages.includes(stage)) throw new Error('Select a valid recruitment stage.');
      const current = rows.find(row => String(row.id) === String(id));
      if (!current) return;

      const { error } = await db().from('candidate_submissions')
        .update({
          stage,
          submitted_at: stage === 'submitted' ? (current.submitted_at || new Date().toISOString()) : current.submitted_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw new Error('Could not update stage: ' + error.message);
      msg('Recruitment stage updated.');
      await load();
    } catch (error) {
      msg(error?.message || 'Could not update stage.');
      await load();
    }
  }

  function exportCsv() {
    const columns = ['candidate', 'email', 'job', 'company', 'stage', 'client_name', 'recruiter_notes', 'created_at'];
    const lines = [columns.join(',')];
    filteredRows().forEach(row => lines.push([
      row.candidates?.full_name, row.candidates?.email, row.jobs?.title,
      row.jobs?.company, row.stage, row.client_name, row.recruiter_notes, row.created_at
    ].map(csv).join(',')));

    const blobUrl = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = 'recruitverse-recruitment-pipeline.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  function init() {
    if (initialized) return;
    initialized = true;

    $('pipelineForm')?.addEventListener('submit', add);
    $('pipelineList')?.addEventListener('change', event => {
      const select = event.target.closest('[data-stage-id]');
      if (select) updateStage(select.dataset.stageId, select.value);
    });
    $('pipelineSearch')?.addEventListener('input', render);
    $('pipelineFilter')?.addEventListener('change', render);
    $('pipelineRefresh')?.addEventListener('click', load);
    $('pipelineExport')?.addEventListener('click', exportCsv);
    document.querySelector('[data-module-tab="pipeline"]')?.addEventListener('click', load);

    // Critical fix: index.html loads this script at the end of <body>.
    // DOMContentLoaded may already have fired, so call load immediately.
    load();

    window.addEventListener('recruitverse-backend-ready', load);
    const client = db();
    if (client?.auth?.onAuthStateChange) {
      client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') load();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
