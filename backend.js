/* RecruitVerse Module 11 — Supabase browser integration.
   Requires Supabase JS v2 and supabase-config.js to load before this file.
   Browser-safe: use only the publishable key, never a service-role/secret key. */
(function () {
  "use strict";
  const cfg = window.RECRUITVERSE_SUPABASE || {};
  const valid = cfg.url && cfg.publishableKey &&
    !String(cfg.url).includes("PASTE_YOUR") &&
    !String(cfg.publishableKey).includes("PASTE_YOUR");
  const sdk = window.supabase;
  const client = valid && sdk && typeof sdk.createClient === "function"
    ? sdk.createClient(cfg.url, cfg.publishableKey)
    : null;

  const api = {
    client,
    configured: Boolean(client),
    async getSession() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    async signUp(email, password, fullName) {
      if (!client) throw new Error("Supabase is not configured. Check supabase-config.js.");
      const { data, error } = await client.auth.signUp({
        email, password,
        options: { data: { full_name: fullName || "" } }
      });
      if (error) throw error;
      return data;
    },
    async signIn(email, password) {
      if (!client) throw new Error("Supabase is not configured. Check supabase-config.js.");
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    async getProfile() {
      if (!client) return null;
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;
      const { data, error } = await client.from("profiles")
        .select("id, full_name, role").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    async listOpenJobs() {
      if (!client) return null;
      const { data, error } = await client.from("jobs")
        .select("*").eq("status", "open").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        id: row.external_id || row.id,
        workMode: row.work_mode,
        employmentType: row.employment_type,
        experienceYears: row.experience_years,
        applyUrl: row.apply_url,
        postedDate: row.created_at
      }));
    },
    async createJob(job) {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Sign in is required to post a job.");
      const row = {
        external_id: job.external_id || job.id || null,
        title: job.title, company: job.company,
        country: job.country, state: job.state || "",
        province: job.province || "", city: job.city || "",
        location: job.location || "", category: job.category || "",
        work_mode: job.workMode || job.work_mode || "",
        employment_type: job.employmentType || job.employment_type || "",
        seniority: job.seniority || "",
        experience_years: Number(job.experienceYears || job.experience_years || 0),
        skills: job.skills || [], description: job.description || "",
        apply_url: job.applyUrl || job.apply_url || "",
        status: job.status || "draft", posted_by: user.id
      };
      const { data, error } = await client.from("jobs").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async saveCandidate(candidate) {
      if (!client) throw new Error("Supabase is not configured.");
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Sign in is required to save candidate records.");
      const row = {
        full_name: candidate.full_name || candidate.name,
        email: candidate.email || null,
        location: candidate.location || "",
        target_role: candidate.target_role || candidate.targetRole || "",
        skills: candidate.skills || [],
        notes: candidate.notes || "",
        owner_id: user.id
      };
      const { data, error } = await client.from("candidates").insert(row).select().single();
      if (error) throw error;
      return data;
    }
  };
  window.RecruitVerseBackend = api;
  window.dispatchEvent(new CustomEvent("recruitverse-backend-ready", {
    detail: { configured: api.configured }
  }));
})();