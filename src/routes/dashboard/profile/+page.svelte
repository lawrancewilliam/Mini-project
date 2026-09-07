<script>
  import { appState, authErrorMessage } from '$lib/state.svelte';
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  // Profile fields state
  let profileName = $state('');
  let updateSuccess = $state(false);
  let updateError = $state('');

  // Password fields state
  let oldPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordSuccess = $state(false);
  let passwordError = $state('');
  let passwordLoading = $state(false);

  // Derived user statistics
  const userScansCount = $derived(appState.scans.length);
  const totalSecretsResolved = $derived(appState.scans.reduce((sum, s) => sum + s.secretsFound, 0));

  // Keep the forms in sync once the Supabase session/profile resolves (e.g. on refresh)
  $effect(() => {
    const user = appState.currentUser;
    if (user) {
      profileName = user.name || user.full_name || '';
    }
  });

  async function handleUpdateProfile(e) {
    if (e) e.preventDefault();
    updateError = '';
    try {
      await appState.updateProfile(profileName);
      updateSuccess = true;
      setTimeout(() => updateSuccess = false, 2000);
    } catch (err) {
      updateError = authErrorMessage(err);
    }
  }

  function initials(name = '') {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  async function handleChangePassword(e) {
    if (e) e.preventDefault();
    passwordError = '';
    passwordSuccess = false;

    if (!oldPassword || !newPassword || !confirmPassword) {
      passwordError = 'All password fields are required.';
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordError = 'New password and confirmation do not match.';
      return;
    }

    if (newPassword.length < 6) {
      passwordError = 'New password must be at least 6 characters long.';
      return;
    }

    passwordLoading = true;
    try {
      // Verify the current password against Supabase before changing it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: appState.currentUser?.email || '',
        password: oldPassword
      });
      if (verifyError) {
        passwordError = 'Current password is incorrect.';
        return;
      }

      const { error: updateError2 } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError2) {
        passwordError = authErrorMessage(updateError2);
        return;
      }

      passwordSuccess = true;
      oldPassword = '';
      newPassword = '';
      confirmPassword = '';
      setTimeout(() => passwordSuccess = false, 3000);
    } catch (err) {
      passwordError = authErrorMessage(err);
    } finally {
      passwordLoading = false;
    }
  }
</script>

<div class="space-y-8">
  <!-- Profile Header Card -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6">
    <div class="w-24 h-24 rounded-3xl bg-accent-purple/15 text-accent-purple border-2 border-accent-purple/30 shadow-md shrink-0 flex items-center justify-center font-extrabold font-display text-3xl">
      {initials(appState.currentUser?.name)}
    </div>
    
    <div class="text-center sm:text-left space-y-2 flex-1">
      <div class="inline-block bg-accent-purple/15 border border-accent-purple/20 text-accent-purple font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
        {appState.currentUser?.role} Console Access
      </div>
      <h3 class="text-2xl font-bold font-display text-dark-charcoal">{appState.currentUser?.name}</h3>
      <p class="text-sm font-medium text-dark-charcoal/60">{appState.currentUser?.email}</p>
    </div>

    <!-- Quick stats grid -->
    <div class="grid grid-cols-2 gap-4 border-t sm:border-t-0 sm:border-l border-dark-charcoal/10 pt-4 sm:pt-0 sm:pl-6 shrink-0 w-full sm:w-auto">
      <div class="text-center">
        <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Scans Conducted</div>
        <div class="text-2xl font-extrabold text-dark-charcoal mt-1">{userScansCount}</div>
      </div>
      
      <div class="text-center">
        <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Secrets Detected</div>
        <div class="text-2xl font-extrabold text-dark-charcoal mt-1">{totalSecretsResolved}</div>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    
    <!-- Edit Profile Form -->
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">Edit Account Information</h4>
        <p class="text-xs text-dark-charcoal/60 mb-6 font-semibold">Change the display name used across the console</p>
        
        <form onsubmit={handleUpdateProfile} class="space-y-4">
          <div>
            <label for="prof-name" class="block text-xs font-bold text-dark-charcoal/70 mb-1.5">Display Name</label>
            <input
              type="text"
              id="prof-name"
              bind:value={profileName}
              required
              class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
            />
          </div>

          <div>
            {#if updateError}
            <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-xs font-bold text-red-600 animate-in fade-in">
              {updateError}
            </div>
          {/if}

          {#if updateSuccess}
            <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-xl text-xs font-bold text-green-600 animate-in fade-in">
              Profile details updated successfully!
            </div>
          {/if}

          <div class="pt-4">
            <button
              type="submit"
              class="bg-accent-purple text-bg-warm font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-colors cursor-pointer shadow-sm"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Change Password Form -->
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">Modify Security Password</h4>
        <p class="text-xs text-dark-charcoal/60 mb-6 font-semibold">Change credentials required to authenticate this active user</p>
        
        <form onsubmit={handleChangePassword} class="space-y-4">
          <div>
            <label for="old-pass" class="block text-xs font-bold text-dark-charcoal/70 mb-1.5">Current Password</label>
            <input
              type="password"
              id="old-pass"
              bind:value={oldPassword}
              required
              placeholder="••••••••"
              class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="new-pass" class="block text-xs font-bold text-dark-charcoal/70 mb-1.5">New Password</label>
              <input
                type="password"
                id="new-pass"
                bind:value={newPassword}
                required
                placeholder="Min 6 chars"
                class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
              />
            </div>
            
            <div>
              <label for="conf-pass" class="block text-xs font-bold text-dark-charcoal/70 mb-1.5">Confirm Password</label>
              <input
                type="password"
                id="conf-pass"
                bind:value={confirmPassword}
                required
                placeholder="Re-type password"
                class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
              />
            </div>
          </div>

          {#if passwordError}
            <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-xs font-bold text-red-600 animate-in fade-in">
              {passwordError}
            </div>
          {/if}

          {#if passwordSuccess}
            <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-xl text-xs font-bold text-green-600 animate-in fade-in">
              Security password changed successfully!
            </div>
          {/if}

          <div class="pt-4">
            <button
              type="submit"
              disabled={passwordLoading}
              class="bg-accent-purple text-bg-warm font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
    
  </div>
</div>
