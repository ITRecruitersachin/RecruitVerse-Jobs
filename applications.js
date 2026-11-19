/* RecruitVerse public candidate applications. Load after module14.js. */
(() => {
  'use strict';
  const client = () => window.RecruitVerseBackend?.client;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style = document.createElement('style');
  style.textContent = `#rvApplyDialog{width:min(620px,calc(100% - 24px));max-height:90vh;overflow:auto;background:#101c2e;color:#edf4ff;border:1px solid #38516e;border-radius:16px;padding:24px}#rvApplyDialog::backdrop{background:#020813d9;backdrop-filter:blur(4px)}#rvApplyForm{display:grid;gap:12px}#rvApplyForm label{display:grid;gap:5px;color:#c7d5e7;font-size:13px}#rvApplyForm input,#rvApplyForm textarea{width:100%;padding:11px;background:#0b1524;color:#edf4ff;border:1px solid #344a64;border-radius:8px;font:inherit}#rvApplyForm .rv-apply-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rv-apply-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.rv-apply-status{color:#9bd7f4;min-height:22px;font-size:13px}@media(max-width:520px){#rvApplyForm .rv-apply-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
  const dlg = document.createElement('dialog'); dlg.id='rvApplyDialog';
  dlg.innerHTML = `<button type="button" id="rvApplyClose" class="dialog-close" style="float:right">×</button><p class="eyebrow">CANDIDATE APPLICATION</p><h2 id="rvApplyTitle">Apply for this role</h2><p class="muted">Your details will be shared privately with the FornaxTech recruiting team for this vacancy.</p><form id="rvApplyForm"><div class="rv-apply-grid"><label>Full name *<input name="full_name" autocomplete="name" maxlength="160" required></label><label>Email *<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Phone *<input name="phone" type="tel" autocomplete="tel" maxlength="40" required></label><label>Current location *<input name="location" autocomplete="address-level2" maxlength="160" placeholder="City, State / Province, Country" required></label></div><label>LinkedIn profile (optional)<input name="linkedin_url" type="url" maxlength="500" placeholder="https://www.linkedin.com/in/..."></label><label>Resume *<input name="resume" type="file" accept=".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" required></label><small class="muted">PDF, DOC, DOCX, RTF or TXT · Maximum 5 MB. Your resume is stored in a private bucket.</small><label>Brief note (optional)<textarea name="message" rows="3" maxlength="2000" placeholder="Relevant experience, work authorization, availability…"></textarea></label><label style="display:flex;grid-template-columns:auto 1fr;align-items:start"><input name="consent" type="checkbox" required style="width:auto;margin-top:4px">I consent to FornaxTech reviewing my application and contacting me about this role. *</label><div class="rv-apply-actions"><button class="button-primary" type="submit">Submit application</button><button class="button-secondary" type="button" id="rvApplyCancel">Cancel</button></div><p id="rvApplyStatus" class="rv-apply-status" role="status" aria-live="polite"></p></form>`;
  document.body.appendChild(dlg);
  let selectedJob = null;
  const close = () => dlg.close();
  document.addEventListener('click', e => {
    const trigger=e.target.closest('[data-rv-apply]'); if(!trigger)return;
    const id=trigger.getAttribute('data-rv-apply');
    selectedJob=(window.RecruitVersePublicJobs||[]).find(j=>String(j.id)===String(id)) || null;
    if(!selectedJob){document.getElementById('rvApplyStatus').textContent='Please refresh the page and try again.';return;}
    document.getElementById('rvApplyTitle').textContent=`Apply: ${selectedJob.title}`;
    document.getElementById('rvApplyStatus').textContent=''; document.getElementById('rvApplyForm').reset(); dlg.showModal();
  });
  document.getElementById('rvApplyClose').addEventListener('click',close);
  document.getElementById('rvApplyCancel').addEventListener('click',close);
  dlg.addEventListener('click',e=>{if(e.target===dlg)close();});
  const addApplyButton = () => {
    const root=document.getElementById('dialogContent'); if(!root)return;
    const content=root.querySelector('.dialog-content'); if(!content || content.querySelector('[data-rv-apply]'))return;
    const jobId=content.querySelector('.eyebrow')?.textContent?.split(' · ')[0];
    if(!jobId)return;
    const job=(window.RecruitVersePublicJobs||[]).find(j=>String(j.id)===jobId);
    if(!job || job.applyUrl)return;
    const wrap=document.createElement('div'); wrap.className='rv-apply-actions';
    wrap.innerHTML=`<button type="button" class="button-primary dialog-apply" data-rv-apply="${esc(job.id)}">Apply Now</button>`;
    content.appendChild(wrap);
  };
  new MutationObserver(addApplyButton).observe(document.getElementById('dialogContent'),{childList:true,subtree:true});
  document.getElementById('rvApplyForm').addEventListener('submit', async e=>{
    e.preventDefault(); const form=e.currentTarget, status=document.getElementById('rvApplyStatus'), btn=form.querySelector('[type="submit"]');
    try {
      const sb=client(); if(!sb)throw new Error('Application service is temporarily unavailable. Please try again later.');
      if(!selectedJob)throw new Error('Select a vacancy before applying.');
      const fd=new FormData(form), file=fd.get('resume');
      if(!(file instanceof File)||!file.size)throw new Error('Please attach your resume.');
      if(file.size>5*1024*1024)throw new Error('Resume must be 5 MB or smaller.');
      const allowed=['pdf','doc','docx','rtf','txt']; const ext=(file.name.split('.').pop()||'').toLowerCase();
      if(!allowed.includes(ext))throw new Error('Upload a PDF, DOC, DOCX, RTF or TXT resume.');
      btn.disabled=true; status.textContent='Uploading resume and submitting application…';
      const objectPath=`${crypto.randomUUID()}.${ext}`;
      const upload=await sb.storage.from('candidate-resumes').upload(objectPath,file,{upsert:false,contentType:file.type||'application/octet-stream'});
      if(upload.error)throw upload.error;
      const applicationId=crypto.randomUUID();
      const payload={id:applicationId,job_id:selectedJob.id,job_title:selectedJob.title,candidate_name:fd.get('full_name').trim(),email:fd.get('email').trim(),phone:fd.get('phone').trim(),location:fd.get('location').trim(),linkedin_url:fd.get('linkedin_url').trim()||null,resume_path:objectPath,resume_filename:file.name,message:fd.get('message').trim()||null,status:'new'};
      const saved=await sb.from('applications').insert(payload);
      if(saved.error){await sb.storage.from('candidate-resumes').remove([objectPath]);throw saved.error;}
      // Optional Edge Function: database submission remains successful even if email delivery is not configured.
      try{await sb.functions.invoke('notify-application',{body:{application_id:applicationId}});}catch(err){console.warn('Application saved; email notification could not be sent.',err);}
      form.reset(); status.textContent='Application submitted successfully. Thank you!';
      setTimeout(close,1800);
    } catch(err){console.error(err);status.textContent=err.message||'Could not submit your application. Please try again.';}
    finally{btn.disabled=false;}
  });
  // Public job records are exposed by app.js through this narrow read-only bridge.
  const expose=()=>{if(window.RecruitVerseJobsState?.jobs)window.RecruitVersePublicJobs=window.RecruitVerseJobsState.jobs;};
  window.addEventListener('recruitverse-public-jobs-ready',expose); expose();
})();
