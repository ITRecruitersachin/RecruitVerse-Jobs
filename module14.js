/* RecruitVerse Module 14 — cloud recruitment pipeline */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const db=()=>window.RecruitVerseBackend?.client;
 const stages=['new','contacted','submitted','interview','offer','placed','rejected','withdrawn'];
 const labels={new:'New',contacted:'Contacted',submitted:'Submitted',interview:'Interview',offer:'Offer',placed:'Placed',rejected:'Rejected',withdrawn:'Withdrawn'};
 let jobs=[],candidates=[],rows=[];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const msg=s=>{if($('pipelineStatus'))$('pipelineStatus').textContent=s};
 const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 function download(){const cols=['candidate','email','job','company','stage','client_name','recruiter_notes','created_at'];const out=[cols.join(','),...filtered().map(r=>[r.candidates?.full_name,r.candidates?.email,r.jobs?.title,r.jobs?.company,r.stage,r.client_name,r.recruiter_notes,r.created_at].map(csv).join(','))];const a=document.createElement('a'),u=URL.createObjectURL(new Blob([out.join('\n')],{type:'text/csv'}));a.href=u;a.download='recruitverse-recruitment-pipeline.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 async function signed(){if(!db())throw Error('Supabase client is unavailable.');const {data:{user},error}=await db().auth.getUser();if(error)throw error;if(!user)throw Error('Please sign in first.');return user}
 async function loadPickers(){
   const user=await signed();
   const [jr,cr]=await Promise.all([db().from('jobs').select('id,title,company,location,status').order('created_at',{ascending:false}),db().from('candidates').select('id,full_name,email,target_role,location,skills').order('created_at',{ascending:false})]);
   if(jr.error)throw jr.error;if(cr.error)throw cr.error;jobs=jr.data||[];candidates=cr.data||[];
   $('pipelineJob').innerHTML='<option value="">Select a job</option>'+jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.title)} — ${esc(j.company)} (${esc(j.status)})</option>`).join('');
   $('pipelineCandidate').innerHTML='<option value="">Select a candidate</option>'+candidates.map(c=>`<option value="${esc(c.id)}">${esc(c.full_name)} — ${esc(c.target_role||c.email||'Candidate')}</option>`).join('');
 }
 function filtered(){const q=($('pipelineSearch')?.value||'').toLowerCase(),f=$('pipelineFilter')?.value||'';return rows.filter(r=>(!f||r.stage===f)&&(!q||[r.candidates?.full_name,r.candidates?.email,r.jobs?.title,r.jobs?.company,r.client_name,r.stage].join(' ').toLowerCase().includes(q)))}
 function render(){
   const list=$('pipelineList');if(!list)return;const data=filtered();
   const count=s=>rows.filter(r=>r.stage===s).length;
   $('pipeTotal').textContent=rows.length;$('pipeInterview').textContent=count('interview');$('pipeOffer').textContent=count('offer');$('pipePlaced').textContent=count('placed');
   list.innerHTML=data.map(r=>`<article class="pipeline-row"><div class="pipeline-info"><strong>${esc(r.candidates?.full_name||'Candidate')}</strong><span>${esc(r.jobs?.title||'Job')} · ${esc(r.jobs?.company||'')}</span><small>${esc(r.candidates?.email||'')} · ${esc(r.candidates?.location||'')} ${r.client_name?' · Client: '+esc(r.client_name):''}</small>${r.recruiter_notes?`<p>${esc(r.recruiter_notes)}</p>`:''}<small>Added ${r.created_at?new Date(r.created_at).toLocaleDateString():''}</small></div><div class="pipeline-actions"><label class="sr-only" for="stage-${esc(r.id)}">Recruitment stage</label><select id="stage-${esc(r.id)}" data-stage-id="${esc(r.id)}">${stages.map(s=>`<option value="${s}" ${r.stage===s?'selected':''}>${labels[s]}</option>`).join('')}</select></div></article>`).join('')||'<p class="muted">No submissions found. Add a candidate to a job above.</p>';
 }
 async function load(){
   try{await signed();$('pipelineList').innerHTML='<p class="muted">Loading cloud pipeline…</p>';await loadPickers();
    const {data,error}=await db().from('candidate_submissions').select('id,job_id,candidate_id,stage,client_name,recruiter_notes,created_at,jobs(title,company),candidates(full_name,email,location,target_role)').order('created_at',{ascending:false});
    if(error)throw error;rows=data||[];render();
   }catch(e){$('pipelineList').textContent=e.message||'Unable to load pipeline.'}
 }
 async function add(e){
  e.preventDefault();try{const user=await signed(),job=$('pipelineJob').value,candidate=$('pipelineCandidate').value;if(!job||!candidate)throw Error('Select both a job and a candidate.');
   msg('Saving submission to Supabase…');
   const {error}=await db().from('candidate_submissions').insert({job_id:job,candidate_id:candidate,owner_id:user.id,stage:$('pipelineStage').value,client_name:$('pipelineClient').value.trim(),recruiter_notes:$('pipelineNotes').value.trim(),submitted_at:$('pipelineStage').value==='submitted'?new Date().toISOString():null});
   if(error){if(error.code==='23505')throw Error('This candidate is already linked to this job.');throw error}
   $('pipelineForm').reset();msg('Candidate added to the recruitment pipeline.');await load();
  }catch(e){msg(e.message||'Could not save submission.')}
 }
 async function update(id,stage){
  try{await signed();const current=rows.find(r=>r.id===id);if(!current)return;
   const {error}=await db().from('candidate_submissions').update({stage,submitted_at:stage==='submitted'?(current.submitted_at||new Date().toISOString()):current.submitted_at,updated_at:new Date().toISOString()}).eq('id',id);
   if(error)throw error;await load();
  }catch(e){msg(e.message||'Could not update stage.');await load()}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('pipelineForm')?.addEventListener('submit',add);
  $('pipelineList')?.addEventListener('change',e=>{const s=e.target.closest('[data-stage-id]');if(s)update(s.dataset.stageId,s.value)});
  $('pipelineSearch')?.addEventListener('input',render);$('pipelineFilter')?.addEventListener('change',render);
  $('pipelineRefresh')?.addEventListener('click',load);$('pipelineExport')?.addEventListener('click',download);
  document.querySelector('[data-module-tab="pipeline"]')?.addEventListener('click',load);
  window.addEventListener('recruitverse-backend-ready',load);db()?.auth.onAuthStateChange(()=>load());
 });
})();
