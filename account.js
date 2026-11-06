document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const status = $("rvConnectionStatus");
  const message = $("rvLoginMessage");
  const form = $("rvLoginForm");
  const logout = $("rvLogout");
  if (!window.RecruitVerseBackend || !window.RecruitVerseBackend.configured) {
    status.textContent = "Supabase configuration not detected. Check supabase-config.js and the Project URL / publishable key.";
    return;
  }
  const api = window.RecruitVerseBackend;
  status.textContent = "Supabase connection configured. Sign in to access recruiter tools.";
  async function refresh() {
    try {
      const session = await api.getSession();
      if (!session) {
        $("rvProfileSummary").textContent = "Not signed in.";
        logout.hidden = true;
        return;
      }
      const profile = await api.getProfile();
      $("rvProfileSummary").textContent = `Signed in as ${profile.full_name || session.user.email} · Role: ${profile.role}`;
      logout.hidden = false;
      message.textContent = "Authentication successful.";
    } catch (e) {
      message.textContent = e.message || "Could not load recruiter profile.";
    }
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    message.textContent = "Signing in…";
    try {
      await api.signIn($("rvLoginEmail").value.trim(), $("rvLoginPassword").value);
      $("rvLoginPassword").value = "";
      await refresh();
    } catch (err) {
      message.textContent = err.message || "Sign-in failed.";
    }
  });
  logout.addEventListener("click", async () => {
    try { await api.signOut(); message.textContent = "Signed out."; await refresh(); }
    catch (e) { message.textContent = e.message || "Sign-out failed."; }
  });
  await refresh();
});