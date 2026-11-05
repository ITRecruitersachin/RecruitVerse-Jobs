const state = { jobs: [], search: "", country: "", mode: "", type: "", seniority: "" };
const $ = (id) => document.getElementById(id);

async function loadJobs() {
  try {
    const response = await fetch("jobs.json");
    if (!response.ok) throw new Error("Could not load jobs.json");
    state.jobs = await response.json();
    renderJobs();
  } catch (error) {
    $("jobGrid").innerHTML = '<p class="muted">Unable to load job listings. Check that jobs.json is in the project root and the site is being served through GitHub Pages or a local web server.</p>';
    console.error(error);
  }
}

function matches(job, query) {
  if (!query) return true;
  const searchable = [job.id, job.title, job.company, job.country, job.state, job.city, job.location,
    job.workMode, job.employmentType, job.seniority, job.experience, ...(job.skills || [])].join(" ").toLowerCase();
  return searchable.includes(query.toLowerCase());
}

function filteredJobs() {
  return state.jobs.filter(job =>
    job.status === "open" &&
    matches(job, state.search) &&
    (!state.country || job.country === state.country) &&
    (!state.mode || job.workMode === state.mode) &&
    (!state.type || job.employmentType === state.type) &&
    (!state.seniority || job.seniority === state.seniority)
  );
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}

function renderJobs() {
  const jobs = filteredJobs();
  $("jobCount").textContent = state.jobs.filter(j => j.status === "open").length;
  $("resultsCount").textContent = `${jobs.length} matching ${jobs.length === 1 ? "role" : "roles"}`;
  $("emptyState").hidden = jobs.length !== 0;
  $("jobGrid").innerHTML = jobs.map(job => `
    <article class="job-card">
      <div class="card-top"><span class="job-id">${escapeHTML(job.id)}</span><span class="status">● Open</span></div>
      <h3>${escapeHTML(job.title)}</h3>
      <div class="company">${escapeHTML(job.company)} · ${escapeHTML(job.location)}</div>
      <div class="job-meta"><span>${escapeHTML(job.country)}</span><span>${escapeHTML(job.workMode)}</span><span>${escapeHTML(job.employmentType)}</span><span>${escapeHTML(job.seniority)}</span></div>
      <p class="muted">${escapeHTML(job.description)}</p>
      <div class="skill-list">${(job.skills || []).slice(0,6).map(skill => `<span>${escapeHTML(skill)}</span>`).join("")}</div>
      <div class="card-bottom"><span class="job-id">${escapeHTML(job.experience || "")}</span><button class="text-button" data-job-id="${escapeHTML(job.id)}">View details →</button></div>
    </article>`).join("");
}

function relatedJobs(selected) {
  return state.jobs.filter(job => job.id !== selected.id && job.status === "open")
    .map(job => ({ job, score: job.skills.filter(skill => selected.skills.includes(skill)).length }))
    .filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0,3);
}

function openJob(jobId) {
  const job = state.jobs.find(item => item.id === jobId);
  if (!job) return;
  const related = relatedJobs(job);
  const requirements = (job.requirements || []).map(item => `<li>${escapeHTML(item)}</li>`).join("");
  const relatedMarkup = related.length ? related.map(item =>
    `<li><button class="text-button" data-job-id="${escapeHTML(item.job.id)}">${escapeHTML(item.job.title)}</button> — ${item.score} shared skills</li>`
  ).join("") : "<li>No similar openings currently listed.</li>";
  const apply = job.applyUrl
    ? `<a class="button-primary dialog-apply" href="${escapeHTML(job.applyUrl)}" target="_blank" rel="noopener">Apply / express interest ↗</a>`
    : `<p class="muted">Application link not configured yet. Add the employer-approved application URL to this job's applyUrl field in jobs.json.</p>`;
  $("dialogContent").innerHTML = `
    <div class="dialog-content">
      <span class="eyebrow">${escapeHTML(job.id)} · ${escapeHTML(job.country)}</span>
      <h2>${escapeHTML(job.title)}</h2><p>${escapeHTML(job.company)} · ${escapeHTML(job.location)}</p>
      <div class="job-meta"><span>${escapeHTML(job.workMode)}</span><span>${escapeHTML(job.employmentType)}</span><span>${escapeHTML(job.experience)}</span></div>
      <h3>Role overview</h3><p>${escapeHTML(job.description)}</p>
      <h3>Key skills</h3><p>${(job.skills || []).map(escapeHTML).join(" · ")}</p>
      <h3>Requirements</h3><ul>${requirements}</ul>
      <h3>Work authorization</h3><p>${escapeHTML(job.authorization || "Confirm with the employer.")}</p>
      <h3>Related opportunities</h3><ul>${relatedMarkup}</ul>${apply}
    </div>`;
  $("jobDialog").showModal();
}

function syncFilters() {
  state.search = $("filterSearch").value.trim();
  state.country = $("countryFilter").value;
  state.mode = $("modeFilter").value;
  state.type = $("typeFilter").value;
  state.seniority = $("seniorityFilter").value;
  renderJobs();
}

["filterSearch","countryFilter","modeFilter","typeFilter","seniorityFilter"].forEach(id =>
  $(id).addEventListener(id === "filterSearch" ? "input" : "change", syncFilters)
);
$("heroSearch").addEventListener("submit", event => {
  event.preventDefault();
  $("filterSearch").value = $("searchInput").value;
  syncFilters();
  $("jobs").scrollIntoView({behavior:"smooth"});
});
$("jobGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-job-id]");
  if (button) openJob(button.dataset.jobId);
});
$("dialogContent").addEventListener("click", event => {
  const button = event.target.closest("[data-job-id]");
  if (button) openJob(button.dataset.jobId);
});
$("closeDialog").addEventListener("click", () => $("jobDialog").close());
$("jobDialog").addEventListener("click", event => {
  if (event.target === $("jobDialog")) $("jobDialog").close();
});
$("clearFilters").addEventListener("click", () => {
  ["filterSearch","countryFilter","modeFilter","typeFilter","seniorityFilter"].forEach(id => $(id).value = "");
  $("searchInput").value = "";
  syncFilters();
});
$("year").textContent = new Date().getFullYear();
loadJobs();
