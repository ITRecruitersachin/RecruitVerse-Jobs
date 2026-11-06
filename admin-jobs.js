(() => {
"use strict";
const $ = id => document.getElementById(id);
const cfg = window.RECRUITVERSE_SUPABASE || {};
const sdk = window.supabase;
const configured = Boolean(cfg.url && cfg.publishableKey && sdk?.createClient);
const client = configured ? sdk.createClient(cfg.url, cfg.publishableKey) : null;
let jobs = [];
const say = (id, message) => { $(id).textContent = message || ""; };
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formFields = ["title","company","country","state","province","city","location","category","workMode","employmentType","seniority","experienceYears","skills","applyUrl","description","status"];
function clearForm(){
  $("jobForm").reset(); $("jobId").value=""; $("experienceYears").value=0;
  $("formHeading").textContent="Add a job"; $("saveJob").textContent="Save job";
}
function valuesToRow(){
  return {
    title:$("title").value.trim(), company:$("company").value.trim(),
    country:$("country").value, state:$("state").value.trim(), province:$("province").value.trim(),
    city:$("city").value.trim(), location:$("location").value.trim(), category:$("category").value,
    work_mode:$("workMode").value, employment_type:$("employmentType").value,
    seniority:$("seniority").value, experience_years:Number($("experienceYears").value||0),
    skills:$("skills").value.split(",").map(x=>x.trim()).filter(Boolean),
    apply_url:$("applyUrl").value.trim(), description:$("description").value.trim(),
    status:$("status").value, updated_at:new Date().toISOString()
  };
}
function rowToForm(j){
  $("jobId").value=j.id;
  const map={title:j.title,company:j.company,country:j.country,state:j.state,province:j.province,city:j.city,location:j.location,category:j.category,workMode:j.work_mode,employmentType:j.employment_type,seniority:j.seniority,experienceYears:j.experience_years,skills:(j.skills||[]).join(", "),applyUrl:j.apply_url,description:j.description,status:j.status};
  Object.entries(map).forEach(([k,v])=>{if($(k))$(k).value=v??"";});
  $("formHeading").textContent="Edit job"; $("saveJob").textContent="Update job";
  $("jobForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function filteredJobs(){
  const q=$("searchJobs").value.trim().toLowerCase(), st=$("filterStatus").value, co=$("filterCountry").value;
  return jobs.filter(j=>(!st||j.status===st)&&(!co||j.country===co)&&(!q||[j.title,j.company,j.city,j.state,j.province,j.location,...(j.skills||[])].join(" ").toLowerCase().includes(q)));
}
function render(){
  $("totalCount").textContent=jobs.length;
  $("openCount").textContent=jobs.filter(j=>j.status==="open").length;
  $("draftCount").textContent=jobs.filter(j=>j.status==="draft").length;
  $("closedCount").textContent=jobs.filter(j=>j.status==="closed").length;
  const list=filteredJobs();
  $("jobsList").innerHTML=list.length?list.map(j=>`<article class="job-card">
    <div class="job-top"><div><h3>${safe(j.title)}</h3><div class="job-meta">${safe(j.company)} · ${safe(j.city||j.location||"Location not set")} · ${safe(j.country)}</div></div><span class="tag ${safe(j.status)}">${safe(j.status.toUpperCase())}</span></div>
    <div>${(j.skills||[]).slice(0,8).map(s=>`<span class="tag">${safe(s)}</span>`).join("")}</div>
    <div class="job-meta">${safe(j.work_mode||"Work mode not set")} · ${safe(j.employment_type||"Employment type not set")} · ${Number(j.experience_years||0)}+ years</div>
    <div class="job-actions"><button class="btn ghost" data-action="edit" data-id="${safe(j.id)}">Edit</button>
    <button class="btn ghost" data-action="status" data-id="${safe(j.id)}" data-status="${j.status==="open"?"closed":"open"}">${j.status==="open"?"Close job":"Publish / reopen"}</button>
    <button class="btn danger" data-action="delete" data-id="${safe(j.id)}">Delete</button></div>
  </article>`).join(""):'<div class="empty">No jobs match these filters. Add a job above or change your filters.</div>';
  say("listMessage",`${list.length} of ${jobs.length} jobs shown.`);
}
async function loadJobs(){
  say("listMessage","Loading jobs…");
  const {data,error}=await client.from("jobs").select("*").order("created_at",{ascending:false});
  if(error){say("listMessage",error.message);return;}
  jobs=data||[];render();
}
async function ensureAdmin(){
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return false;
  const {data:profile,error:pErr}=await client.from("profiles").select("full_name,role").eq("id",user.id).single();
  if(pErr)throw pErr;
  if(profile.role!=="admin")throw new Error("This page is restricted to RecruitVerse administrators. Your current role is "+profile.role+".");
  $("whoami").textContent=(profile.full_name||user.email)+" · admin";
  $("authPanel").hidden=true; $("adminPanel").hidden=false;
  await loadJobs(); return true;
}
async function start(){
  if(!configured){say("connectionMessage","Supabase configuration missing. Check supabase-config.js and the Project URL / publishable key.");return;}
  say("connectionMessage","Supabase configured. Sign in with your administrator account.");
  const {data:{session}}=await client.auth.getSession();
  if(session){try{await ensureAdmin();}catch(e){say("authMessage",e.message);}}
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();say("authMessage","Signing in…");
  try{
    const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
    if(error)throw error;
    $("password").value="";await ensureAdmin();say("authMessage","Administrator access confirmed.");
  }catch(err){say("authMessage",err.message||"Sign-in failed.");}
});
$("signOut").addEventListener("click",async()=>{await client.auth.signOut();jobs=[];$("adminPanel").hidden=true;$("authPanel").hidden=false;say("authMessage","Signed out.");});
$("jobForm").addEventListener("submit",async e=>{
  e.preventDefault();say("formMessage","Saving…");
  const row=valuesToRow(), id=$("jobId").value;
  if(!row.title||!row.company){say("formMessage","Job title and company are required.");return;}
  try{
    let result;
    if(id) result=await client.from("jobs").update(row).eq("id",id).select().single();
    else {
      const {data:{user}}=await client.auth.getUser();
      result=await client.from("jobs").insert({...row,posted_by:user.id}).select().single();
    }
    if(result.error)throw result.error;
    say("formMessage",id?"Job updated.":"Job saved.");
    clearForm();await loadJobs();
  }catch(err){say("formMessage",err.message||"Could not save job.");}
});
$("jobsList").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-action]");if(!b)return;
  const j=jobs.find(x=>x.id===b.dataset.id);if(!j)return;
  try{
    if(b.dataset.action==="edit")rowToForm(j);
    if(b.dataset.action==="status"){
      const {error}=await client.from("jobs").update({status:b.dataset.status,updated_at:new Date().toISOString()}).eq("id",j.id);
      if(error)throw error;await loadJobs();
    }
    if(b.dataset.action==="delete"){
      if(!confirm(`Delete "${j.title}" at ${j.company}? This cannot be undone.`))return;
      const {error}=await client.from("jobs").delete().eq("id",j.id);
      if(error)throw error;await loadJobs();
    }
  }catch(err){say("listMessage",err.message||"Action failed.");}
});
$("resetForm").addEventListener("click",clearForm);
$("refreshJobs").addEventListener("click",loadJobs);
["searchJobs","filterStatus","filterCountry"].forEach(id=>$(id).addEventListener("input",render));
start();
})();