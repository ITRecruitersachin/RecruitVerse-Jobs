/* RecruitVerse Module 13 — Supabase-backed job and candidate management.
   Requires backend.js to expose window.RecruitVerseBackend.client. RLS remains authoritative. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const client = () => window.RecruitVerseBackend?.client;
  let jobsCache = [], candidatesCache = [];
  const say = (id, message) => { const el=$(id); if(el) el.textContent=message; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const csvCell = value => '"' + String(value ?? '').replace(/"/g,'""') + '"';
  function download(name, content, type) {
    const blob=new Blob([content],{type}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function identity() {
    if(!client()) throw new Error('Supabase is not configured. Check supabase-config.js.');
    const {data:{user},error}=await client().auth.getUser(); if(error) throw error;
    if(!user) throw new Error('Please sign in to access cloud management.');
    const {data:profile,error:pe}=await client().from('profiles').select('role,full_name').eq('id',user.id).single();
    if(pe) throw pe; if(!['admin','recruiter'].includes(profile.role)) throw new Error('Recruiter or admin access is required.');
    return {user,profile};
  }
  function filteredJobs(){
    const q=($('cloudJobSearch')?.value||'').trim().toLowerCase(), status=$('cloudJobStatus')?.value||'';
    return jobsCache.filter(j=>(!status||j.status===status)&&(!q||[j.title,j.company,j.location,j.country,j.category].join(' ').toLowerCase().includes(q)));
  }
  function renderJobs(){
    const box=$('adminJobList'); if(!box)return; const rows=filteredJobs();
    say('cloudJobCount',`${rows.length} of ${jobsCache.length} cloud jobs`);
    box.innerHTML=rows.map(j=>{
      const action=j.status==='draft'?['open','Publish']:j.status==='open'?['closed','Close']:['open','Reopen'];
      return `<article class="admin-job-row"><div><strong>${esc(j.title)}</strong><span>${esc(j.company)} · ${esc(j.location||j.country||'')}</span><small>Status: ${esc(j.status)} · Added ${j.created_at?new Date(j.created_at).toLocaleDateString():''}</small></div><div class="admin-job-actions"><button type="button" class="button-primary" data-cloud-job="${esc(j.id)}" data-next-status="${action[0]}">${action[1]}</button></div></article>`;
    }).join('')||'<p class="muted">No jobs match this search or status filter.</p>';
  }
  async function loadJobs(){
    const box=$('adminJobList'); if(!box||!client())return;
    box.innerHTML='<p class="muted">Loading cloud jobs…</p>';
    try{await identity();const {data,error}=await client().from('jobs').select('id,title,company,country,location,status,category,created_at').order('created_at',{ascending:false});if(error)throw error;jobsCache=data||[];renderJobs();updateStats();}
    catch(e){box.textContent=e.message||'Could not load cloud jobs.';}
  }
  function filteredCandidates(){
    const q=($('candidateSearch')?.value||'').trim().toLowerCase();
    return candidatesCache.filter(c=>[c.full_name,c.email,c.location,c.target_role,...(c.skills||[])].join(' ').toLowerCase().includes(q));
  }
  function renderCandidates(){
    const box=$('candidateList'); if(!box)return; const rows=filteredCandidates();
    say('candidateCount',`${rows.length} of ${candidatesCache.length} cloud candidates`);
    box.innerHTML=rows.map(c=>`<article class="candidate-row"><div><strong>${esc(c.full_name)}</strong><span>${esc(c.target_role||'Target role not specified')} · ${esc(c.location||'Location not specified')}</span><small>${esc(c.email||'No email')} · Added ${c.created_at?new Date(c.created_at).toLocaleDateString():''}</small><div class="skill-list">${(c.skills||[]).map(s=>`<span>${esc(s)}</span>`).join('')}</div></div><button type="button" class="button-secondary" data-cloud-candidate-delete="${esc(c.id)}">Delete</button></article>`).join('')||'<p class="muted">No cloud candidates match your search.</p>';
  }
  async function loadCandidates(){
    const box=$('candidateList'); if(!box||!client())return;
    box.innerHTML='<p class="muted">Loading private candidate records…</p>';
    try{await identity();const {data,error}=await client().from('candidates').select('id,full_name,email,location,target_role,skills,created_at').order('created_at',{ascending:false});if(error)throw error;candidatesCache=data||[];renderCandidates();updateStats();}
    catch(e){box.textContent=e.message||'Could not load cloud candidates.';}
  }
  function updateStats(){
    const put=(id,val)=>{const el=$(id);if(el)el.textContent=String(val);};
    put('adminTotalJobs',jobsCache.length);put('adminCountries',new Set(jobsCache.map(j=>j.country).filter(Boolean)).size);
    put('adminCandidates',candidatesCache.length);put('adminOpenJobs',jobsCache.filter(j=>j.status==='open').length);
    say('rvCloudStatus',`Connected · ${jobsCache.length} jobs (${jobsCache.filter(j=>j.status==='open').length} open, ${jobsCache.filter(j=>j.status==='draft').length} drafts, ${jobsCache.filter(j=>j.status==='closed').length} closed) · ${candidatesCache.length} candidates`);
  }
  async function saveJob(form){
    const {user}=await identity(), f=new FormData(form), country=f.get('country'), region=String(f.get('region')||'').trim(), city=String(f.get('city')||'').trim();
    const row={title:String(f.get('title')||'').trim(),company:String(f.get('company')||'').trim(),country,state:country==='USA'?region:'',province:country==='Canada'?region:'',city,location:`${city}, ${region}`,category:String(f.get('category')||'').trim(),work_mode:f.get('workMode')||'',employment_type:f.get('employmentType')||'',seniority:f.get('seniority')||'',experience_years:Number(f.get('experienceYears')||0),skills:String(f.get('skills')||'').split(',').map(x=>x.trim()).filter(Boolean),description:String(f.get('description')||'').trim(),apply_url:String(f.get('applyUrl')||'').trim(),status:'draft',posted_by:user.id};
    const {error}=await client().from('jobs').insert(row);if(error)throw error;
  }
  async function saveCandidate(form){
    const {user}=await identity(),f=new FormData(form);
    const row={full_name:String(f.get('name')||'').trim(),email:String(f.get('email')||'').trim()||null,location:String(f.get('location')||'').trim(),target_role:String(f.get('role')||'').trim(),skills:String(f.get('skills')||'').split(',').map(x=>x.trim()).filter(Boolean),owner_id:user.id};
    const {error}=await client().from('candidates').insert(row);if(error)throw error;
  }
  async function changeJob(id,status){
    await identity();const {error}=await client().from('jobs').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    await loadJobs();if(window.RecruitVerseRefreshPublicJobs)await window.RecruitVerseRefreshPublicJobs();
  }
  async function deleteCandidate(id){
    await identity();if(!confirm('Delete this candidate record from Supabase? This cannot be undone.'))return;
    const {error}=await client().from('candidates').delete().eq('id',id);if(error)throw error;await loadCandidates();
  }
  function exportJobs(){
    const cols=['id','title','company','country','location','category','work_mode','employment_type','seniority','experience_years','skills','status','created_at'];
    const rows=[cols.join(','),...jobsCache.map(j=>cols.map(k=>csvCell(Array.isArray(j[k])?j[k].join('; '):j[k])).join(','))];download('recruitverse-cloud-jobs.csv',rows.join('\n'),'text/csv;charset=utf-8');
  }
  function exportCandidates(){
    const cols=['id','full_name','email','location','target_role','skills','created_at'];
    const rows=[cols.join(','),...candidatesCache.map(c=>cols.map(k=>csvCell(Array.isArray(c[k])?c[k].join('; '):c[k])).join(','))];download('recruitverse-cloud-candidates.csv',rows.join('\n'),'text/csv;charset=utf-8');
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const jobForm=$('jobPostForm');if(jobForm)jobForm.addEventListener('submit',async e=>{if(!client())return;e.preventDefault();e.stopImmediatePropagation();say('postStatus','Saving job to Supabase…');try{await saveJob(jobForm);jobForm.reset();say('postStatus','Job saved as Draft in Supabase. Publish it from Manage Jobs when ready.');await loadJobs();}catch(err){say('postStatus',err.message||'Could not save job.');}},true);
    const candidateForm=$('candidateForm');if(candidateForm)candidateForm.addEventListener('submit',async e=>{if(!client())return;e.preventDefault();e.stopImmediatePropagation();say('candidateCloudStatus','Saving candidate to Supabase…');try{await saveCandidate(candidateForm);candidateForm.reset();say('candidateCloudStatus','Candidate saved securely to Supabase.');await loadCandidates();}catch(err){say('candidateCloudStatus',err.message||'Could not save candidate.');}},true);
    $('adminJobList')?.addEventListener('click',async e=>{const b=e.target.closest('[data-cloud-job]');if(!b)return;b.disabled=true;b.textContent='Saving…';try{await changeJob(b.dataset.cloudJob,b.dataset.nextStatus);}catch(err){say('rvCloudStatus',err.message||'Could not update job.');b.disabled=false;b.textContent='Retry';}});
    $('candidateList')?.addEventListener('click',async e=>{const b=e.target.closest('[data-cloud-candidate-delete]');if(!b)return;b.disabled=true;try{await deleteCandidate(b.dataset.cloudCandidateDelete);}catch(err){say('candidateCloudStatus',err.message||'Could not delete candidate.');b.disabled=false;}});
    $('cloudJobSearch')?.addEventListener('input',renderJobs);$('cloudJobStatus')?.addEventListener('change',renderJobs);
    $('candidateSearch')?.addEventListener('input',renderCandidates);
    $('refreshCloudJobs')?.addEventListener('click',loadJobs);$('refreshCloudCandidates')?.addEventListener('click',loadCandidates);
    $('exportJobs')?.addEventListener('click',exportJobs);$('exportCandidates')?.addEventListener('click',exportCandidates);
    document.querySelector('[data-module-tab="manage"]')?.addEventListener('click',loadJobs);
    document.querySelector('[data-module-tab="candidates"]')?.addEventListener('click',loadCandidates);
    window.addEventListener('recruitverse-backend-ready',()=>{loadJobs();loadCandidates();});
    if(client()){loadJobs();loadCandidates();}else say('rvCloudStatus','Waiting for Supabase configuration…');
    client()?.auth.onAuthStateChange(()=>{loadJobs();loadCandidates();});
  });
  window.RecruitVerseCloud={refresh:async()=>{await loadJobs();await loadCandidates();},refreshJobs:loadJobs,refreshCandidates:loadCandidates};
})();
