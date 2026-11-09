/* RecruitVerse account + password recovery.
   Uses the existing Supabase client from backend.js. */
document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const status = $("rvConnectionStatus");
  const message = $("rvLoginMessage");
  const form = $("rvLoginForm");
  const resetForm = $("rvResetPasswordForm");
  const forgot = $("rvForgotPassword");
  const logout = $("rvLogout");
  const api = window.RecruitVerseBackend;
  const redirectUrl = "https://itrecruitersachin.github.io/RecruitVerse-Jobs/";

  if (!api || !api.configured || !api.client) {
    status.textContent = "Supabase configuration not detected. Check supabase-config.js.";
    return;
  }

  async function refresh() {
    try {
      const session = await api.getSession();
      if (!session) {
        $("rvProfileSummary").textContent = "Not signed in.";
        logout.hidden = true;
        return;
      }
      const profile = await api.getProfile();
      $("rvProfileSummary").textContent =
        `Signed in as ${profile.full_name || session.user.email} · Role: ${profile.role}`;
      logout.hidden = false;
    } catch (e) {
      message.textContent = e.message || "Could not load recruiter profile.";
    }
  }

  function showRecoveryForm() {
    form.style.display = "none";
    resetForm.style.display = "grid";
    $("rvProfileSummary").textContent = "Password recovery verified. Enter your new password.";
    message.textContent = "Choose a new password with at least 8 characters.";
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    message.textContent = "Signing in…";
    try {
      await api.signIn($("rvLoginEmail").value.trim(), $("rvLoginPassword").value);
      $("rvLoginPassword").value = "";
      await refresh();
      message.textContent = "Authentication successful.";
    } catch (err) {
      message.textContent = err.message || "Sign-in failed.";
    }
  });

  forgot.addEventListener("click", async () => {
    const email = $("rvLoginEmail").value.trim();
    if (!email) {
      message.textContent = "Enter your registered admin email first.";
      $("rvLoginEmail").focus();
      return;
    }
    message.textContent = "Sending password recovery email…";
    try {
      const { error } = await api.client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      message.textContent = "Recovery email sent. Open the newest email and tap its reset link.";
    } catch (err) {
      message.textContent = err.message || "Could not send recovery email.";
    }
  });

  resetForm.addEventListener("submit", async e => {
    e.preventDefault();
    const password = $("rvNewPassword").value;
    const confirm = $("rvConfirmPassword").value;
    if (password.length < 8) {
      message.textContent = "Use at least 8 characters for your new password.";
      return;
    }
    if (password !== confirm) {
      message.textContent = "The passwords do not match.";
      return;
    }
    message.textContent = "Updating password…";
    try {
      const { error } = await api.client.auth.updateUser({ password });
      if (error) throw error;
      $("rvNewPassword").value = "";
      $("rvConfirmPassword").value = "";
      resetForm.style.display = "none";
      form.style.display = "grid";
      message.textContent = "Password updated successfully. Sign in using your new password.";
      await api.client.auth.signOut();
      await refresh();
    } catch (err) {
      message.textContent = err.message || "Password update failed. Request a fresh recovery email.";
    }
  });

  logout.addEventListener("click", async () => {
    try {
      await api.signOut();
      message.textContent = "Signed out.";
      await refresh();
    } catch (e) {
      message.textContent = e.message || "Sign-out failed.";
    }
  });

  api.client.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") showRecoveryForm();
    if (event === "SIGNED_IN") refresh();
  });

  await refresh();
});
