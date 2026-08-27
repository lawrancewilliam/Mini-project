<script>
  import { appState } from '$lib/state.svelte.js';

  let showSuccess = $state(false);
  let saving = $state(false);

  const settings = $derived(appState.systemSettings);

  function handleToggle(key) {
    appState.updateSystemSetting(key, !settings[key]);
  }

  function handleNumberInput(key, event) {
    const val = parseInt(event.target.value, 10);
    if (!isNaN(val) && val >= 0) {
      appState.updateSystemSetting(key, val);
    }
  }

  function handleSelect(key, event) {
    appState.updateSystemSetting(key, event.target.value);
  }

  function saveAll() {
    saving = true;
    appState.addAuditEntry('Settings Updated', 'All system settings saved');
    setTimeout(() => {
      saving = false;
      showSuccess = true;
      setTimeout(() => (showSuccess = false), 2500);
    }, 400);
  }
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-accent-purple/15 border border-accent-purple/20 flex items-center justify-center">
          <svg class="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold font-display text-dark-charcoal">System Settings</h2>
      </div>
      <p class="text-sm font-medium text-dark-charcoal/60">Configure application-wide preferences and security policies</p>
    </div>

    <button
      onclick={saveAll}
      disabled={saving}
      class="inline-flex items-center gap-2 bg-accent-purple text-bg-warm font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all cursor-pointer shadow-sm disabled:opacity-60 shrink-0"
    >
      {#if saving}
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Saving...
      {:else}
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Save Settings
      {/if}
    </button>
  </div>

  <!-- Success Toast -->
  {#if showSuccess}
    <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl flex items-center gap-3 animate-in fade-in">
      <svg class="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-sm font-bold text-green-600">Settings saved successfully! Changes have been logged to audit trail.</span>
    </div>
  {/if}

  <!-- General Settings -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm">
    <div class="flex items-center gap-3 mb-1">
      <svg class="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="text-lg font-bold font-display text-dark-charcoal">General Settings</h3>
    </div>
    <p class="text-xs text-dark-charcoal/50 mb-6 font-semibold pl-8">Core application behavior and user management defaults</p>

    <div class="space-y-6">
      <!-- Default Role -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-dark-charcoal/8">
        <div class="space-y-0.5 flex-1">
          <label for="default-role" class="text-sm font-bold text-dark-charcoal">Default Role</label>
          <p class="text-xs text-dark-charcoal/50 font-medium">Role assigned to newly registered users by default</p>
        </div>
        <div class="relative shrink-0">
          <select
            id="default-role"
            onchange={(e) => handleSelect('defaultRole', e)}
            class="appearance-none bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 pr-9 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all cursor-pointer min-w-[160px]"
          >
            <option value="Developer" selected={settings.defaultRole === 'Developer'}>Developer</option>
            <option value="Admin" selected={settings.defaultRole === 'Admin'}>Admin</option>
          </select>
          <svg class="w-4 h-4 text-dark-charcoal/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Allow Registration -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-dark-charcoal/8">
        <div class="space-y-0.5 flex-1">
          <span class="text-sm font-bold text-dark-charcoal">Allow Registration</span>
          <p class="text-xs text-dark-charcoal/50 font-medium">Allow new users to create accounts on the platform</p>
        </div>
        <button
          onclick={() => handleToggle('allowRegistration')}
          class="relative w-12 h-7 rounded-full transition-all cursor-pointer shrink-0 {settings.allowRegistration ? 'bg-accent-purple shadow-sm' : 'bg-dark-charcoal/20'}"
          role="switch"
          aria-checked={settings.allowRegistration}
        >
          <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out {settings.allowRegistration ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>

      <!-- Max Users -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div class="space-y-0.5 flex-1">
          <label for="max-users" class="text-sm font-bold text-dark-charcoal">Max Users</label>
          <p class="text-xs text-dark-charcoal/50 font-medium">Maximum number of user accounts allowed on the platform</p>
        </div>
        <input
          id="max-users"
          type="number"
          min="1"
          max="10000"
          value={settings.maxUsers}
          onchange={(e) => handleNumberInput('maxUsers', e)}
          class="w-28 bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal text-center focus:outline-none focus:border-accent-purple purple-glow-border transition-all shrink-0"
        />
      </div>
    </div>
  </div>

  <!-- Scan Settings -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm">
    <div class="flex items-center gap-3 mb-1">
      <svg class="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 class="text-lg font-bold font-display text-dark-charcoal">Scan Settings</h3>
    </div>
    <p class="text-xs text-dark-charcoal/50 mb-6 font-semibold pl-8">Control how scans are processed and retained</p>

    <div class="space-y-6">
      <!-- Auto-delete old scans -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-dark-charcoal/8">
        <div class="space-y-0.5 flex-1">
          <span class="text-sm font-bold text-dark-charcoal">Auto-Delete Old Scans</span>
          <p class="text-xs text-dark-charcoal/50 font-medium">Automatically remove scans older than the retention period</p>
        </div>
        <button
          onclick={() => handleToggle('scanAutoDelete')}
          class="relative w-12 h-7 rounded-full transition-all cursor-pointer shrink-0 {settings.scanAutoDelete ? 'bg-accent-purple shadow-sm' : 'bg-dark-charcoal/20'}"
          role="switch"
          aria-checked={settings.scanAutoDelete}
        >
          <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out {settings.scanAutoDelete ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>

      <!-- Scan Retention Days -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-dark-charcoal/8">
        <div class="space-y-0.5 flex-1">
          <label for="retention-days" class="text-sm font-bold text-dark-charcoal">Scan Retention Days</label>
          <p class="text-xs text-dark-charcoal/50 font-medium">Number of days to keep scan results before auto-deletion</p>
        </div>
        <input
          id="retention-days"
          type="number"
          min="1"
          max="3650"
          value={settings.scanRetentionDays}
          onchange={(e) => handleNumberInput('scanRetentionDays', e)}
          class="w-28 bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal text-center focus:outline-none focus:border-accent-purple purple-glow-border transition-all shrink-0"
        />
      </div>

      <!-- Critical Alert Threshold -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div class="space-y-0.5 flex-1">
          <label for="critical-threshold" class="text-sm font-bold text-dark-charcoal">Critical Alert Threshold</label>
          <p class="text-xs text-dark-charcoal/50 font-medium">Number of critical findings to trigger an immediate alert notification</p>
        </div>
        <input
          id="critical-threshold"
          type="number"
          min="1"
          max="100"
          value={settings.criticalAlertThreshold}
          onchange={(e) => handleNumberInput('criticalAlertThreshold', e)}
          class="w-28 bg-bg-warm border border-dark-charcoal/15 px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal text-center focus:outline-none focus:border-accent-purple purple-glow-border transition-all shrink-0"
        />
      </div>
    </div>
  </div>

  <!-- Security Settings -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm">
    <div class="flex items-center gap-3 mb-1">
      <svg class="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 class="text-lg font-bold font-display text-dark-charcoal">Security Settings</h3>
    </div>
    <p class="text-xs text-dark-charcoal/50 mb-6 font-semibold pl-8">Authentication and access control policies</p>

    <div class="space-y-6">
      <!-- Require MFA -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div class="space-y-0.5 flex-1">
          <span class="text-sm font-bold text-dark-charcoal">Require Multi-Factor Authentication</span>
          <p class="text-xs text-dark-charcoal/50 font-medium">Force all users to enable MFA before accessing the dashboard</p>
        </div>
        <button
          onclick={() => handleToggle('requireMfa')}
          class="relative w-12 h-7 rounded-full transition-all cursor-pointer shrink-0 {settings.requireMfa ? 'bg-accent-purple shadow-sm' : 'bg-dark-charcoal/20'}"
          role="switch"
          aria-checked={settings.requireMfa}
        >
          <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out {settings.requireMfa ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Notifications -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm">
    <div class="flex items-center gap-3 mb-1">
      <svg class="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h3 class="text-lg font-bold font-display text-dark-charcoal">Notifications</h3>
    </div>
    <p class="text-xs text-dark-charcoal/50 mb-6 font-semibold pl-8">Configure alert and notification delivery channels</p>

    <div class="space-y-6">
      <!-- Email Notifications -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
        <div class="space-y-0.5 flex-1">
          <span class="text-sm font-bold text-dark-charcoal">Email Notifications</span>
          <p class="text-xs text-dark-charcoal/50 font-medium">Send scan results and critical alerts to admin email addresses</p>
        </div>
        <button
          onclick={() => handleToggle('emailNotifications')}
          class="relative w-12 h-7 rounded-full transition-all cursor-pointer shrink-0 {settings.emailNotifications ? 'bg-accent-purple shadow-sm' : 'bg-dark-charcoal/20'}"
          role="switch"
          aria-checked={settings.emailNotifications}
        >
          <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out {settings.emailNotifications ? 'translate-x-5' : 'translate-x-0'}"></span>
        </button>
      </div>
    </div>
  </div>
</div>
