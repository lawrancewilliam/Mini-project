<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let searchQuery = $state('');
  let roleFilter = $state('All');
  let confirmDeleteUser = $state(null);

  onMount(() => {
    if (appState.currentUser?.role !== 'Admin') {
      goto('/dashboard');
    }
  });

  const processedUsers = $derived(() => {
    let result = [...appState.users];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'All') {
      result = result.filter(u => u.role === roleFilter);
    }

    return result;
  });

  function userScans(email) {
    return appState.scans.filter(s => s.scannedBy === email);
  }

  function lastScanDate(email) {
    const scans = userScans(email);
    if (scans.length === 0) return null;
    return scans.map(s => s.date).sort().reverse()[0];
  }

  function handleDelete(email) {
    if (appState.currentUser?.email === email) return;
    const deleted = appState.deleteUser(email);
    if (deleted) {
      confirmDeleteUser = null;
    }
  }

  function getRoleBadge(role) {
    return role === 'Admin'
      ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
      : 'bg-blue-100 text-blue-600 border-blue-200';
  }

  const totalScans = $derived(appState.scans.length);
  const activeUsers = $derived(
    appState.users.filter(u => userScans(u.email).length > 0).length
  );
</script>

<div class="space-y-8">
  <!-- Summary Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
      <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Users</div>
      <div class="mt-2 text-4xl font-extrabold font-display text-dark-charcoal">{appState.users.length}</div>
      <div class="mt-1 text-xs font-semibold text-dark-charcoal/60">Registered accounts</div>
    </div>
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
      <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Active Users</div>
      <div class="mt-2 text-4xl font-extrabold font-display text-accent-purple">{activeUsers}</div>
      <div class="mt-1 text-xs font-semibold text-dark-charcoal/60">Users with at least one scan</div>
    </div>
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
      <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Scans</div>
      <div class="mt-2 text-4xl font-extrabold font-display text-dark-charcoal">{totalScans}</div>
      <div class="mt-1 text-xs font-semibold text-dark-charcoal/60">Across all users</div>
    </div>
  </div>

  <!-- Users Panel -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm space-y-6">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Search -->
      <div class="relative max-w-sm w-full">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-dark-charcoal/40">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search by name or email..."
          class="w-full bg-bg-warm border border-dark-charcoal/15 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
        />
      </div>

      <!-- Role Filter -->
      <div class="flex items-center gap-1.5 bg-bg-warm border border-dark-charcoal/10 p-1 rounded-xl w-fit">
        {#each ['All', 'Admin', 'Developer'] as filter}
          <button
            onclick={() => roleFilter = filter}
            class="px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer uppercase tracking-wider {roleFilter === filter ? 'bg-accent-purple text-bg-warm' : 'text-dark-charcoal/60 hover:text-dark-charcoal'}"
          >
            {filter}
          </button>
        {/each}
      </div>
    </div>

    <!-- Users Table -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider select-none">
            <th class="py-3 px-4">User</th>
            <th class="py-3 px-4">Role</th>
            <th class="py-3 px-4">Registered</th>
            <th class="py-3 px-4 text-center">Scans</th>
            <th class="py-3 px-4">Last Scan</th>
            <th class="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {#if processedUsers().length > 0}
            {#each processedUsers() as user}
              <tr class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors">
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <img src={user.avatar} alt="User avatar" class="w-10 h-10 rounded-xl object-cover border border-accent-purple/20" />
                    <div class="min-w-0">
                      <div class="font-bold truncate">
                        {user.name}
                        {#if appState.currentUser?.email === user.email}
                          <span class="ml-1 text-[10px] bg-accent-purple/10 text-accent-purple border border-accent-purple/30 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">You</span>
                        {/if}
                      </div>
                      <div class="text-xs font-semibold text-dark-charcoal/60 truncate">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span class="px-2 py-0.5 border text-[10px] font-bold rounded uppercase tracking-wider inline-block {getRoleBadge(user.role)}">
                    {user.role}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-xs font-semibold text-dark-charcoal/70">{user.registeredAt || '—'}</td>
                <td class="py-3.5 px-4 text-center">
                  <span class="inline-flex items-center justify-center min-w-6 px-1.5 h-6 rounded-full {userScans(user.email).length > 0 ? 'bg-accent-purple/10 text-accent-purple' : 'bg-dark-charcoal/5 text-dark-charcoal/40'} text-xs font-bold">
                    {userScans(user.email).length}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-xs font-semibold text-dark-charcoal/70">
                  {lastScanDate(user.email) || 'No scans yet'}
                </td>
                <td class="py-3.5 px-4 text-right">
                  {#if appState.currentUser?.email !== user.email}
                    <button
                      onclick={() => confirmDeleteUser = user}
                      class="text-xs text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  {:else}
                    <span class="text-xs font-semibold text-dark-charcoal/30">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6" class="py-12 text-center text-sm font-bold text-dark-charcoal/40">
                No registered users meet this criteria.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Delete User Confirmation -->
{#if confirmDeleteUser}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-dark-charcoal/40 backdrop-blur-sm">
    <div class="bg-card-warm border border-dark-charcoal/10 p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
      <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center mb-6">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>

      <h3 class="text-2xl font-bold font-display text-dark-charcoal">Remove User</h3>
      <p class="text-sm text-dark-charcoal/70 mt-2">
        Remove <span class="font-bold text-dark-charcoal">{confirmDeleteUser.name}</span> ({confirmDeleteUser.email}) from the console. Their scan history remains archived but the account can no longer sign in.
      </p>

      <div class="mt-8 flex items-center gap-3">
        <button
          onclick={() => handleDelete(confirmDeleteUser.email)}
          class="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
        >
          Yes, Remove User
        </button>
        <button
          onclick={() => confirmDeleteUser = null}
          class="flex-1 bg-bg-warm border border-dark-charcoal/10 text-dark-charcoal font-bold py-3 rounded-xl hover:bg-dark-charcoal/10 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
