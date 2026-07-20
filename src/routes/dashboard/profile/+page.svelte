<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  // Profile fields state
  let profileName = $state(appState.currentUser ? appState.currentUser.name : '');
  let profileAvatar = $state(appState.currentUser ? appState.currentUser.avatar : '');
  let updateSuccess = $state(false);

  // Password fields state
  let oldPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordSuccess = $state(false);
  let passwordError = $state('');

  // Derived user statistics
  const userScansCount = $derived(appState.scans.length);
  const totalSecretsResolved = $derived(appState.scans.reduce((sum, s) => sum + s.secretsFound, 0));

  function handleUpdateProfile(e) {
    if (e) e.preventDefault();
    appState.updateProfile(profileName, profileAvatar);
    updateSuccess = true;
    setTimeout(() => updateSuccess = false, 2000);
  }

  function handleChangePassword(e) {
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

    // Success simulation
    passwordSuccess = true;
    oldPassword = '';
    newPassword = '';
    confirmPassword = '';
    setTimeout(() => passwordSuccess = false, 3000);
  }
</script>

<div class="space-y-8">
  <!-- Profile Header Card -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6">
    <img
      src={appState.currentUser?.avatar}
      alt="User profile"
      class="w-24 h-24 rounded-3xl object-cover border-2 border-accent-purple/30 shadow-md shrink-0"
    />
    
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
        <p class="text-xs text-dark-charcoal/60 mb-6 font-semibold">Change display names and avatar links used in console audits</p>
        
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
            <label for="prof-avatar" class="block text-xs font-bold text-dark-charcoal/70 mb-1.5">Avatar Image URL</label>
            <input
              type="url"
              id="prof-avatar"
              bind:value={profileAvatar}
              required
              class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
            />
          </div>

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
              class="bg-accent-purple text-bg-warm font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-colors cursor-pointer shadow-sm"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
    
  </div>
</div>
