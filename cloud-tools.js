/* RecruitVerse Module 11.2 — cloud persistence for recruiter tools.
   Loads after app.js, backend.js and account.js. RLS remains the security boundary. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const client = () => window.RecruitVerseBackend?.client;
  const say = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  async function identity() {
    if (!client()) throw new Error("Supabase is not configured. Check supabase-config.js.");
    const {data:{user},error} = await client().auth.getUser();
    if (error) throw error;
    if (!user) throw new Error("Please sign in first.");
    const {data:profile,error:pe} = await client().from("profiles").select("role,full_name").eq("id",user.id).single();
    if (pe) throw pe;
    if (!["admin","recruiter"].includes(profile.role)) throw new Error("Recruiter or admin role required.");
    return {user,profile};
  }
  async function loadCounts() {
    if (!client()) return;
    try {
      const {profile} = await identity();
      const [j,c,a] = await Promise.all([
        client().from("jobs").select("id,status"),
        client().from("candidates").select("id"),
        client().from("job_alerts").select("id")
      ]);
      for (const r of [j,c,a]) if (r.error) throw r.error;
      const jobs=j.data||[], candidates=c.data||[], alerts=a.data||[];
      const open=jobs.filter(x=>x.status==="open").length;
      const drafts=jobs.filter(x=>x.status==="draft").length;
      const closed=jobs.filter(x=>x.status==="closed").length;
      say("rvCloudStatus",`Connected · ${profile.role} · ${jobs.length} jobs (${open} open, ${drafts} drafts, ${closed} closed) · ${candidates.length} candidates · ${alerts.length} alerts`);
    } catch(e) { say("rvCloudStatus",e.message||"Could not load cloud data."); }
  }
  async function saveJob(form) {
    const {user}=await identity(), f=new FormData(form), country=f.get("country");
    const region=String(f.get("region")||"").trim(), city=String(f.get("city")||"").trim();
    const row={
      title:String(f.get("title")||"").trim(), company:String(f.get("company")||"").trim(),
      country, state:country==="USA"?region:"", province:country==="Canada"?region:"",
      city, location:`${city}, ${region}`, category:String(f.get("category")||"").trim(),
      work_mode:f.get("workMode")||"", employment_type:f.get("employmentType")||"",
      seniority:f.get("seniority")||"", experience_years:Number(f.get("experienceYears")||0),
      skills:String(f.get("skills")||"").split(",").map(x=>x.trim()).filter(Boolean),
      description:String(f.get("description")||"").trim(), apply_url:String(f.get("applyUrl")||"").trim(),
      status:"draft", posted_by:user.id
    };
    const {error}=await client().from("jobs").insert(row); if(error) throw error;
  }
  async function saveCandidate(form) {
    const {user}=await identity(), f=new FormData(form);
    const row={
      full_name:String(f.get("name")||"").trim(), email:String(f.get("email")||"").trim()||null,
      location:String(f.get("location")||"").trim(), target_role:String(f.get("role")||"").trim(),
      skills:String(f.get("skills")||"").split(",").map(x=>x.trim()).filter(Boolean), owner_id:user.id
    };
    const {error}=await client().from("candidates").insert(row); if(error) throw error;
  }
  async function saveAlert(form) {
    const {user}=await identity(), f=new FormData(form);
    const row={owner_id:user.id,alert_name:String(f.get("name")||"").trim(),country:f.get("country")||"",
      keyword:String(f.get("keyword")||"").trim(),work_mode:f.get("workMode")||"",enabled:true};
    const {error}=await client().from("job_alerts").insert(row); if(error) throw error;
  }
  document.addEventListener("DOMContentLoaded",()=>{
    if (!$("rvCloudStatus")) {
      const root=document.querySelector(".recruiter-tools")||document.querySelector("#recruiterTools")||document.body;
      const panel=document.createElement("section");
      panel.className="module-pane active";
      panel.innerHTML='<div class="section-heading"><p class="eyebrow">MODULE 11.2 · CLOUD</p><h2>Cloud database status</h2><p id="rvCloudStatus">Checking session…</p></div>';
      root.appendChild(panel);
    }
    [["jobPostForm","postStatus"],["candidateForm","candidateCloudStatus"],["alertForm","alertCloudStatus"]].forEach(([formId,statusId])=>{
      const form=$(formId); if(!form)return;
      const msg=document.createElement("p"); msg.id=statusId; msg.className="muted"; form.appendChild(msg);
      form.addEventListener("submit",async e=>{
        if(!client())return;
        e.preventDefault(); e.stopImmediatePropagation();
        say(statusId,"Saving to cloud…");
        try {
          if(formId==="jobPostForm") await saveJob(form);
          if(formId==="candidateForm") await saveCandidate(form);
          if(formId==="alertForm") await saveAlert(form);
          form.reset(); say(statusId,"Saved successfully to Supabase.");
          await loadCounts();
        } catch(err) { say(statusId,err.message||"Cloud save failed."); }
      },true);
    });
    loadCounts();
    window.addEventListener("recruitverse-backend-ready",loadCounts);
    client()?.auth.onAuthStateChange(()=>setTimeout(loadCounts,0));
  });
  window.RecruitVerseCloud={refresh:loadCounts};
})();