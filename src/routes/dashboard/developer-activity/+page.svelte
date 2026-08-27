<script>
  import { appState } from '$lib/state.svelte.js';

  let searchQuery = $state('');
  let sortBy = $state('name');
  let showAllUsers = $state(false);

  const developers = $derived(appState.developerActivity);

  const filteredDevelopers = $derived(() => {
    let list = [...developers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'scans') list.sort((a, b) => b.scanCount - a.scanCount);
    else if (sortBy === 'findings') list.sort((a, b) => b.totalFindings - a.totalFindings);
    else if (sortBy === 'critical') list.sort((a, b) => b.criticalFindings - a.criticalFindings);
    return list;
  });

  const totalDevelopers = $derived(developers.length);
  const totalScans = $derived(developers.reduce((s, d) => s + d.scanCount, 0));
  const totalFindings = $derived(developers.reduce((s, d) => s + d.totalFindings, 0));
  const activeDevelopers = $derived(developers.filter(d => d.status === 'active').length);

  const allUsersList = $derived(
    searchQuery.trim()
      ? appState.allUsers.filter(u =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : appState.allUsers
  );

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getRoleBadgeClass(role) {
    if (role === 'Admin') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }

  function getStatusDotClass(status) {
    return status === 'active' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-dark-charcoal/30';
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="flex items-center gap-3 mb-2">
    <div class="w-10 h-10 rounded-2xl bg-accent-purple/15 flex items-center justify-center">
      <svg class="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </div>
    <div>
      <h1 class="text-2xl font-extrabold font-display text-dark-charcoal">Developer Activity</h1>
      <p class="text-sm text-dark-charcoal/60">Per-developer statistics and scan activity &mdash; {totalDevelopers} developer{totalDevelopers !== 1 ? 's' : ''}</p>
    </div>
  </div>

  <!-- Summary Stats Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
      <div>
        <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Developers</div>
        <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{totalDevelopers}</div>
        <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Registered developer accounts</div>
      </div>
      <div class="p-4 bg-blue-500/10 text-blue-500 rounded-2xl">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
        </svg>
      </div>
    </div>

    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
      <div>
        <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Scans Run</div>
        <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{totalScans}</div>
        <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Across all projects</div>
      </div>
      <div class="p-4 bg-accent-purple/10 text-accent-purple rounded-2xl">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
    </div>

    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
      <div>
        <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Findings</div>
        <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{totalFindings}</div>
        <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Secrets identified in scans</div>
      </div>
      <div class="p-4 bg-orange-500/10 text-orange-500 rounded-2xl">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
        </svg>
      </div>
    </div>

    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
      <div>
        <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Active Developers</div>
        <div class="text-4xl font-extrabold font-display text-emerald-600 mt-2">{activeDevelopers}</div>
        <div class="text-xs font-semibold text-emerald-600/70 mt-1">Currently active accounts</div>
      </div>
      <div class="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
    </div>
  </div>

  <!-- Developer Activity Cards -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h3 class="text-lg font-bold font-display text-dark-charcoal">Developer Activity</h3>
        <p class="text-xs text-dark-charcoal/60 mt-1">Individual developer scan performance and findings breakdown</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <svg class="w-4 h-4 text-dark-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search developers..."
            class="bg-bg-warm border border-dark-charcoal/10 pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 w-full sm:w-64 transition-all"
          />
        </div>
        <select
          bind:value={sortBy}
          class="bg-bg-warm border border-dark-charcoal/10 px-3 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all cursor-pointer"
        >
          <option value="name">Sort by Name</option>
          <option value="scans">Sort by Scans</option>
          <option value="findings">Sort by Findings</option>
          <option value="critical">Sort by Critical</option>
        </select>
      </div>
    </div>

    {#if filteredDevelopers().length > 0}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {#each filteredDevelopers() as dev (dev.id)}
          <div class="group bg-bg-warm border border-dark-charcoal/10 rounded-2xl p-5 hover:border-accent-purple/30 hover:shadow-md transition-all duration-200">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-accent-purple/15 text-accent-purple border border-accent-purple/20 flex items-center justify-center text-sm font-extrabold font-display">
                  {getInitials(dev.name)}
                </div>
                <div>
                  <div class="font-bold text-sm text-dark-charcoal">{dev.name}</div>
                  <div class="text-xs text-dark-charcoal/50">{dev.email}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-[10px] border rounded-lg font-bold uppercase tracking-wider {getRoleBadgeClass(dev.role)}">
                  {dev.role}
                </span>
                <div class="flex items-center gap-1.5" title={dev.status === 'active' ? 'Active' : 'Inactive'}>
                  <span class="w-2.5 h-2.5 rounded-full {getStatusDotClass(dev.status)} shadow-lg"></span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-3 mb-4">
              <div class="text-center p-2.5 bg-card-warm rounded-xl border border-dark-charcoal/5">
                <div class="text-lg font-extrabold font-display text-dark-charcoal">{dev.scanCount}</div>
                <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Scans</div>
              </div>
              <div class="text-center p-2.5 bg-card-warm rounded-xl border border-dark-charcoal/5">
                <div class="text-lg font-extrabold font-display text-orange-500">{dev.totalFindings}</div>
                <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Findings</div>
              </div>
              <div class="text-center p-2.5 bg-card-warm rounded-xl border border-dark-charcoal/5">
                <div class="text-lg font-extrabold font-display {dev.criticalFindings > 0 ? 'text-red-500' : 'text-dark-charcoal'}">
                  {dev.criticalFindings}
                </div>
                <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Critical</div>
              </div>
              <div class="text-center p-2.5 bg-card-warm rounded-xl border border-dark-charcoal/5">
                <div class="text-lg font-extrabold font-display text-dark-charcoal">
                  {dev.totalFindings > 0 ? Math.round((dev.criticalFindings / dev.totalFindings) * 100) : 0}%
                </div>
                <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Crit Ratio</div>
              </div>
            </div>

            {#if dev.criticalFindings > 0}
              <div class="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl mb-3">
                <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <span class="text-xs font-bold text-red-500">{dev.criticalFindings} critical finding{dev.criticalFindings !== 1 ? 's' : ''} require immediate attention</span>
              </div>
            {/if}

            <div class="flex items-center justify-between text-xs font-semibold text-dark-charcoal/50 pt-3 border-t border-dark-charcoal/5">
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Last active: {formatDate(dev.lastActive)}
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {dev.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12">
        <div class="w-14 h-14 rounded-2xl bg-dark-charcoal/5 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-dark-charcoal/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <p class="text-sm font-bold text-dark-charcoal/40">No developers found matching "{searchQuery}"</p>
      </div>
    {/if}
  </div>

  <!-- All Users Table -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-bold font-display text-dark-charcoal">All Users</h3>
        <p class="text-xs text-dark-charcoal/60 mt-1">Complete roster of registered accounts and their roles</p>
      </div>
      <button
        onclick={() => showAllUsers = !showAllUsers}
        class="text-xs font-bold bg-bg-warm border border-dark-charcoal/15 px-3 py-1.5 rounded-lg text-dark-charcoal hover:bg-dark-charcoal hover:text-bg-warm transition-all cursor-pointer"
      >
        {showAllUsers ? 'Collapse' : 'Expand All'}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">
            <th class="py-3 px-4">User</th>
            <th class="py-3 px-4">Email</th>
            <th class="py-3 px-4">Role</th>
            <th class="py-3 px-4">Joined</th>
            <th class="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each (showAllUsers ? allUsersList : allUsersList.slice(0, 5)) as user (user.id)}
            <tr class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors">
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-accent-purple/15 text-accent-purple border border-accent-purple/20 flex items-center justify-center text-xs font-extrabold font-display">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <div class="font-bold text-sm">{user.name}</div>
                    <div class="text-[10px] text-dark-charcoal/50">@{user.username}</div>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/70">{user.email}</td>
              <td class="py-3.5 px-4">
                <span class="px-2.5 py-1 text-[10px] border rounded-lg font-bold uppercase tracking-wider inline-flex items-center gap-1.5 {getRoleBadgeClass(user.role)}">
                  {#if user.role === 'Admin'}
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  {/if}
                  {user.role}
                </span>
              </td>
              <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/60">{formatDate(user.createdAt)}</td>
              <td class="py-3.5 px-4">
                <span class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
                  <span class="text-xs font-bold text-dark-charcoal/60">Active</span>
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      {#if !showAllUsers && allUsersList.length > 5}
        <div class="text-center pt-4">
          <button
            onclick={() => showAllUsers = true}
            class="text-xs font-bold text-accent-purple hover:underline cursor-pointer"
          >
            Show all {allUsersList.length} users
          </button>
        </div>
      {/if}

      {#if allUsersList.length === 0}
        <div class="text-center py-12">
          <p class="text-sm font-bold text-dark-charcoal/40">No users found</p>
        </div>
      {/if}
    </div>
  </div>
</div>
