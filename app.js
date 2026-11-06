const state={jobs:[],search:"",country:"",region:"",city:"",category:"",skill:"",mode:"",type:"",seniority:"",experience:"",sort:"relevance"};
const $=id=>document.getElementById(id);
async function loadJobs(){try{const r=await fetch("jobs.json");if(!r.ok)throw Error("jobs.json unavailable");state.jobs=await r.json();populateOptions();renderJobs();}catch(e){$("jobGrid").innerHTML='<p class="muted">Could not load job data. Check that jobs.json is in the repository root.</p>';console.error(e);}}
function escapeHTML(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function unique(values){return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
function setOptions(id,values,label){const el=$(id);el.innerHTML=`<option value="">${label}</option>`+unique(values).map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");}
function populateOptions(){setOptions("regionFilter",state.jobs.map(j=>j.country==="USA"?j.state:j.province),"All states / provinces");setOptions("cityFilter",state.jobs.map(j=>j.city),"All cities");setOptions("categoryFilter",state.jobs.map(j=>j.category),"All categories");setOptions("skillFilter",state.jobs.flatMap(j=>j.skills||[]),"All skills");}
function score(job,q){if(!q)return 0;const fields=[job.title,job.company,job.country,job.state,job.province,job.city,job.location,job.category,...(job.skills||[])].join(" ").toLowerCase();return fields.includes(q.toLowerCase())?1:0;}
function getFiltered(){let list=state.jobs.filter(j=>j.status==="open");list=list.filter(j=>{const region=j.country==="USA"?j.state:j.province;return (!state.search||score(j,state.search))&&(!state.country||j.country===state.country)&&(!state.region||region===state.region)&&(!state.city||j.city===state.city)&&(!state.category||j.category===state.category)&&(!state.skill||(j.skills||[]).includes(state.skill))&&(!state.mode||j.workMode===state.mode)&&(!state.type||j.employmentType===state.type)&&(!state.seniority||j.seniority===state.seniority)&&(!state.experience||Number(j.experienceYears||0)>=Number(state.experience));});
if(state.sort==="newest")list.sort((a,b)=>b.postedDate.localeCompare(a.postedDate));if(state.sort==="title")list.sort((a,b)=>a.title.localeCompare(b.title));return list;}
function renderJobs(){const list=getFiltered();$("jobCount").textContent=state.jobs.filter(j=>j.status==="open").length;$("resultsCount").textContent=`${list.length} matching ${list.length===1?"role":"roles"}`;$("emptyState").hidden=list.length>0;$("activeFilterText").textContent=list.length===state.jobs.filter(j=>j.status==="open").length?"Showing all open jobs":"Filters applied";$("jobGrid").innerHTML=list.map(j=>`<article class="job-card"><div class="card-top"><span class="job-id">${escapeHTML(j.id)}</span><span class="status">● Open</span></div><h3>${escapeHTML(j.title)}</h3><div class="company">${escapeHTML(j.company)} · ${escapeHTML(j.location)}</div><div class="job-meta"><span>${escapeHTML(j.country)}</span><span>${escapeHTML(j.workMode)}</span><span>${escapeHTML(j.employmentType)}</span><span>${escapeHTML(j.seniority)}</span></div><p class="muted">${escapeHTML(j.description)}</p><div class="skill-list">${(j.skills||[]).slice(0,6).map(s=>`<span>${escapeHTML(s)}</span>`).join("")}</div><div class="card-bottom"><span class="job-id">${escapeHTML(j.experience||"")}</span><button class="text-button" data-job-id="${escapeHTML(j.id)}">View details →</button></div></article>`).join("");}
function relatedJobs(selected){return state.jobs.filter(j=>j.id!==selected.id&&j.status==="open").map(j=>({job:j,score:(j.skills||[]).filter(s=>(selected.skills||[]).includes(s)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);}
function openJob(id){const j=state.jobs.find(x=>x.id===id);if(!j)return;const related=relatedJobs(j);const req=(j.requirements||[]).map(x=>`<li>${escapeHTML(x)}</li>`).join("");const rec=related.length?related.map(x=>`<li><button class="text-button" data-job-id="${escapeHTML(x.job.id)}">${escapeHTML(x.job.title)}</button> — ${x.score} shared skills</li>`).join(""):"<li>No similar openings currently listed.</li>";const salary=j.salaryMin&&j.salaryMax?`<p>${escapeHTML(j.salaryCurrency)} ${Number(j.salaryMin).toLocaleString()} – ${Number(j.salaryMax).toLocaleString()}</p>`:"<p>Not disclosed</p>";const apply=j.applyUrl?`<a class="button-primary dialog-apply" href="${escapeHTML(j.applyUrl)}" target="_blank" rel="noopener">Apply / express interest ↗</a>`:"<p class='muted'>Application link not configured yet. Add an approved URL to applyUrl in jobs.json.</p>";$("dialogContent").innerHTML=`<div class="dialog-content"><span class="eyebrow">${escapeHTML(j.id)} · ${escapeHTML(j.country)}</span><h2>${escapeHTML(j.title)}</h2><p>${escapeHTML(j.company)} · ${escapeHTML(j.location)}</p><div class="job-meta"><span>${escapeHTML(j.workMode)}</span><span>${escapeHTML(j.employmentType)}</span><span>${escapeHTML(j.experience)}</span></div><h3>Role overview</h3><p>${escapeHTML(j.description)}</p><h3>Compensation</h3>${salary}<h3>Key skills</h3><p>${(j.skills||[]).map(escapeHTML).join(" · ")}</p><h3>Requirements</h3><ul>${req}</ul><h3>Work authorization</h3><p>${escapeHTML(j.authorization||"Confirm with employer.")}</p><h3>Related opportunities</h3><ul>${rec}</ul>${apply}</div>`;$("jobDialog").showModal();}
function runSkillMatch(){
 const raw=document.getElementById("candidateSkills").value;
 const skills=[...new Set(raw.split(/[,;\n]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))];
 const country=document.getElementById("matchCountry").value;
 const box=document.getElementById("matchResults");
 if(!skills.length){box.innerHTML='<p class="match-empty">Enter at least one skill to calculate matches.</p>';return;}
 const ranked=state.jobs.filter(j=>j.status==="open"&&(!country||j.country===country)).map(job=>{
  const required=[...new Set((job.skills||[]).map(x=>x.trim().toLowerCase()))];
  const matched=required.filter(req=>skills.some(s=>s===req||req.includes(s)||s.includes(req)));
  const missing=required.filter(req=>!matched.includes(req));
  return {job,matched,missing,pct:required.length?Math.round(matched.length/required.length*100):0};
 }).sort((a,b)=>b.pct-a.pct||b.matched.length-a.matched.length);
 box.innerHTML=`<div class="match-summary"><strong>${ranked.length}</strong><span>jobs evaluated against ${skills.length} entered skills</span></div>`+ranked.map(x=>`<article class="match-card"><div class="match-card-head"><div><span class="job-id">${escapeHTML(x.job.id)}</span><h3>${escapeHTML(x.job.title)}</h3><p>${escapeHTML(x.job.location)} · ${escapeHTML(x.job.workMode)}</p></div><div class="match-score"><strong>${x.pct}%</strong><span>skill match</span></div></div><div class="match-meter"><span style="width:${x.pct}%"></span></div><div class="match-skill-lines"><p><b>Matched skills:</b> ${x.matched.length?x.matched.map(escapeHTML).join(", "):"No listed skill overlap"}</p><p><b>Skills not listed in your profile:</b> ${x.missing.length?x.missing.map(escapeHTML).join(", "):"None"}</p></div><button class="text-button" data-job-id="${escapeHTML(x.job.id)}">View job details →</button></article>`).join("");
}
const ids={filterSearch:"search",countryFilter:"country",regionFilter:"region",cityFilter:"city",categoryFilter:"category",skillFilter:"skill",modeFilter:"mode",typeFilter:"type",seniorityFilter:"seniority",experienceFilter:"experience",sortFilter:"sort"};
Object.entries(ids).forEach(([id,key])=>$(id).addEventListener(key==="search"?"input":"change",()=>{state[key]=$(id).value.trim();if(key==="country"){state.region="";state.city="";$("regionFilter").value="";$("cityFilter").value="";}renderJobs();}));
function clearAll(){$("filterSearch").value="";Object.entries(ids).forEach(([id,key])=>{if(key!=="search")$(id).value="";state[key]="";});state.search="";renderJobs();}
$("heroSearch").addEventListener("submit",e=>{e.preventDefault();$("filterSearch").value=$("searchInput").value;state.search=$("searchInput").value.trim();renderJobs();$("jobs").scrollIntoView({behavior:"smooth"});});
$("jobGrid").addEventListener("click",e=>{const b=e.target.closest("[data-job-id]");if(b)openJob(b.dataset.jobId);});$("dialogContent").addEventListener("click",e=>{const b=e.target.closest("[data-job-id]");if(b)openJob(b.dataset.jobId);});
$("clearFilters").addEventListener("click",clearAll);$("emptyClear").addEventListener("click",clearAll);$("closeDialog").addEventListener("click",()=>$("jobDialog").close());$("jobDialog").addEventListener("click",e=>{if(e.target===$("jobDialog"))$("jobDialog").close();});$("runMatch").addEventListener("click",runSkillMatch);
$("year").textContent=new Date().getFullYear();loadJobs();


// Module 4: local resume parsing. The selected file is processed in-browser only.
const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const KNOWN_SKILLS = [
 "Java","Spring Boot","Microservices","REST APIs","SQL","AWS","Azure","GCP","Docker","Kubernetes",
 "Terraform","Jenkins","GitHub Actions","CI/CD","Python","Machine Learning","LLM","RAG","LangChain",
 "React","Angular","JavaScript","TypeScript","Node.js","C#",".NET","C++","C","Go","Ruby","PHP",
 "Selenium","Cypress","Playwright","Jest","PostgreSQL","MySQL","MongoDB","Redis","Kafka","Spark",
 "Databricks","Snowflake","Power BI","Tableau","Salesforce","Dynamics 365 F&O","SAP","Linux",
 "Ansible","CloudFormation","Prometheus","Grafana","SRE","DevOps","Agile","Scrum","Data Engineering",
 "ETL","PyTorch","TensorFlow","FastAPI","Flask","Django","GraphQL","HTML","CSS","OAuth","REST"
];
function detectSkills(text) {
  const haystack = " " + text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ") + " ";
  return KNOWN_SKILLS.filter(skill => {
    const needle = " " + skill.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ") + " ";
    return haystack.includes(needle);
  });
}
async function readResumeFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (file.size > RESUME_MAX_BYTES) throw new Error("File is larger than 5 MB. Please choose a smaller resume.");
  if (ext === "txt") return await file.text();
  if (ext === "docx") {
    if (!window.mammoth) throw new Error("DOCX reader could not load. Check your internet connection and try again.");
    const buffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({arrayBuffer: buffer});
    return result.value || "";
  }
  if (ext === "pdf") {
    if (!window.pdfjsLib) throw new Error("PDF reader could not load. Check your internet connection and try again.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({data: buffer}).promise;
    let text = "";
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str || "").join(" ") + "\n";
    }
    return text;
  }
  throw new Error("Unsupported file type. Please upload a PDF, DOCX or TXT file.");
}
const resumeInput = document.getElementById("resumeFile");
if (resumeInput) {
  resumeInput.addEventListener("change", async () => {
    const file = resumeInput.files && resumeInput.files[0];
    const status = document.getElementById("resumeStatus");
    const wrap = document.getElementById("resumeSkillsWrap");
    wrap.hidden = true;
    if (!file) { status.textContent = "No resume selected."; return; }
    status.textContent = `Reading ${file.name} locally…`;
    status.className = "resume-status";
    try {
      const text = await readResumeFile(file);
      if (!text.trim()) throw new Error("No readable text found. If this is a scanned PDF, use a text-based PDF or TXT file.");
      const skills = detectSkills(text);
      if (!skills.length) throw new Error("No skills from our current technology dictionary were detected. You can still enter skills manually in the Skill Match section.");
      document.getElementById("resumeSkillCount").textContent = `${skills.length} detected`;
      document.getElementById("resumeSkillTags").innerHTML = skills.map(s => `<span>${escapeHTML(s)}</span>`).join("");
      document.getElementById("candidateSkills").value = skills.join(", ");
      wrap.hidden = false;
      status.textContent = `Resume read successfully: ${file.name}. The file itself is not uploaded.`;
      status.className = "resume-status success";
      // Do not retain the extracted full resume text or file contents.
    } catch (err) {
      status.textContent = err.message || "Unable to read this resume.";
      status.className = "resume-status error";
    } finally {
      resumeInput.value = "";
    }
  });
}
const matchResumeButton = document.getElementById("matchResumeSkills");
if (matchResumeButton) {
  matchResumeButton.addEventListener("click", () => {
    runSkillMatch();
    document.getElementById("matcher").scrollIntoView({behavior:"smooth"});
  });
}
