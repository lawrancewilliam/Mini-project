<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  
  let severityChart = $state(null);
  let typesChart = $state(null);
  let userSearchQuery = $state('');
  let showRoleDropdown = $state(null);

  const isAdmin = $derived(appState.currentUser?.role === 'Admin');

  const totalProjects = $derived(appState.scans.length);
  const totalSecrets = $derived(appState.scans.reduce((sum, s) => sum + s.secretsFound, 0));
  const totalCritical = $derived(appState.scans.reduce((sum, s) => sum + s.criticalCount, 0));
  
  const project = $derived(appState.selectedScan);
  const riskScore = $derived(project ? project.riskScore : 0);
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = $derived(circumference - (riskScore / 100) * circumference);

  const filteredUsers = $derived(
    userSearchQuery
      ? appState.allUsers.filter(u =>
          u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(userSearchQuery.toLowerCase())
        )
      : appState.allUsers
  );

  const adminCount = $derived(appState.allUsers.filter(u => u.role === 'Admin').length);
  const developerCount = $derived(appState.allUsers.filter(u => u.role === 'Developer').length);

  const secretTypeCounts = $derived(() => {
    if (!project || !project.findings) return [];
    const counts = {};
    project.findings.forEach(f => {
      counts[f.secretType] = (counts[f.secretType] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  });

  const severityChartData = $derived(() => {
    if (!project) return { labels: [], data: [] };
    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      data: [project.criticalCount, project.highCount, project.mediumCount, project.lowCount],
      backgroundColor: ['#EF4444', '#F97316', '#EAB308', '#22C55E']
    };
  });

  const secretTypesChartData = $derived(() => {
    if (!project || !project.findings || project.findings.length === 0) return { labels: [], data: [], backgroundColor: [] };
    const counts = {};
    project.findings.forEach(f => {
      counts[f.secretType] = (counts[f.secretType] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    const colors = ['#EF4444', '#F97316', '#EAB308', '#8B5CF6', '#F472B6', '#60A5FA', '#34D399', '#FBBF24'];
    return {
      labels,
      data,
      backgroundColor: labels.map((_, i) => colors[i % colors.length])
    };
  });

  function getRiskBadgeClass(score) {
    if (score >= 75) return 'bg-red-100 text-red-600 border-red-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    if (score > 0) return 'bg-blue-100 text-blue-600 border-blue-200';
    return 'bg-green-100 text-green-600 border-green-200';
  }

  function getRiskText(score) {
    if (score >= 75) return 'CRITICAL';
    if (score >= 40) return 'HIGH / MEDIUM';
    if (score > 0) return 'LOW RISK';
    return 'SECURE';
  }

  function getRoleBadgeClass(role) {
    if (role === 'Admin') return 'bg-accent-purple/15 text-accent-purple border-accent-purple/30';
    return 'bg-dark-charcoal/5 text-dark-charcoal/70 border-dark-charcoal/15';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function handleDeleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) return;
    await appState.deleteUser(userId);
  }

  async function handleRoleChange(userId, newRole) {
    await appState.updateUserRole(userId, newRole);
    showRoleDropdown = null;
  }

  function getChartColors() {
    const isDark = appState.theme === 'dark';
    return {
      legend: isDark ? '#6B7280' : '#6B7280',
      tooltipBg: isDark ? '#1a1a1a' : '#ffffff',
      tooltipTitle: isDark ? '#ffffff' : '#1a1a1a',
      tooltipBody: isDark ? '#cccccc' : '#4B5563',
      tooltipBorder: isDark ? '#2a2a2a' : '#E5E7EB'
    };
  }

  function renderSeverityChart() {
    if (!severityChart || !project) return;
    const ctx = severityChart;
    if (window.__severityChartInstance) {
      window.__severityChartInstance.destroy();
    }
    const c = getChartColors();
    window.__severityChartInstance = new Chart(ctx, {
      type: 'pie',
      data: severityChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: c.legend, padding: 16 } },
          tooltip: { backgroundColor: c.tooltipBg, titleColor: c.tooltipTitle, bodyColor: c.tooltipBody, borderColor: c.tooltipBorder, borderWidth: 1, padding: 12, cornerRadius: 10 }
        }
      }
    });
  }

  function renderTypesChart() {
    if (!typesChart || !project) return;
    const ctx = typesChart;
    if (window.__typesChartInstance) {
      window.__typesChartInstance.destroy();
    }
    const c = getChartColors();
    window.__typesChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: secretTypesChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: c.legend, padding: 16 } },
          tooltip: { backgroundColor: c.tooltipBg, titleColor: c.tooltipTitle, bodyColor: c.tooltipBody, borderColor: c.tooltipBorder, borderWidth: 1, padding: 12, cornerRadius: 10 }
        }
      }
    });
  }

  onMount(() => {
    if (isAdmin) {
      appState.fetchAllUsers();
    }
  });

  $effect(() => {
    const _theme = appState.theme;
    if (project && !isAdmin) {
      setTimeout(() => {
        renderSeverityChart();
        renderTypesChart();
      }, 100);
    }
  });
</script>

<div class="space-y-8">
  {#if isAdmin}
    <!-- ADMIN DASHBOARD -->
    <div class="flex items-center gap-3 mb-2">
      <div class="w-10 h-10 rounded-2xl bg-accent-purple/15 flex items-center justify-center">
        <svg class="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-extrabold font-display text-dark-charcoal">Admin Control Panel</h1>
        <p class="text-sm text-dark-charcoal/60">Manage users, monitor activity, and control access</p>
      </div>
    </div>

    <!-- Admin Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Users</div>
          <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{appState.allUsers.length}</div>
          <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Registered accounts</div>
        </div>
        <div class="p-4 bg-accent-purple/10 text-accent-purple rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Admins</div>
          <div class="text-4xl font-extrabold font-display text-accent-purple mt-2">{adminCount}</div>
          <div class="text-xs font-semibold text-accent-purple/70 mt-1">Full access accounts</div>
        </div>
        <div class="p-4 bg-accent-purple/10 text-accent-purple rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Developers</div>
          <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{developerCount}</div>
          <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Standard access accounts</div>
        </div>
        <div class="p-4 bg-dark-charcoal/5 text-dark-charcoal rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Scans</div>
          <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{totalProjects}</div>
          <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Across all projects</div>
        </div>
        <div class="p-4 bg-dark-charcoal/5 text-dark-charcoal rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- User Management Table -->
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 class="text-lg font-bold font-display text-dark-charcoal">User Management</h3>
          <p class="text-xs text-dark-charcoal/60 mt-1">View and manage all registered user accounts</p>
        </div>
        <div class="relative">
          <svg class="w-4 h-4 text-dark-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            bind:value={userSearchQuery}
            placeholder="Search users..."
            class="bg-bg-warm border border-dark-charcoal/10 pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 w-full sm:w-64 transition-all"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">
              <th class="py-3 px-4">User</th>
              <th class="py-3 px-4">Email</th>
              <th class="py-3 px-4">Username</th>
              <th class="py-3 px-4">Role</th>
              <th class="py-3 px-4">Joined</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredUsers as user}
              <tr class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors">
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-accent-purple/15 text-accent-purple border border-accent-purple/20 flex items-center justify-center font-bold text-xs shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div class="font-bold text-sm">{user.name}</div>
                      <div class="text-[10px] text-dark-charcoal/50">{user.id?.slice(0, 8)}...</div>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/70">{user.email}</td>
                <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/70">@{user.username}</td>
                <td class="py-3.5 px-4">
                  <div class="relative">
                    <button
                      onclick={() => showRoleDropdown = showRoleDropdown === user.id ? null : user.id}
                      class="px-2.5 py-1 text-[10px] border rounded-lg font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity {getRoleBadgeClass(user.role)}"
                    >
                      {user.role}
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    {#if showRoleDropdown === user.id}
                      <div class="absolute top-full left-0 mt-1 bg-card-warm border border-dark-charcoal/10 rounded-xl shadow-lg z-10 min-w-[140px]">
                        <button
                          onclick={() => handleRoleChange(user.id, 'Admin')}
                          class="w-full text-left px-4 py-2 text-xs font-bold text-dark-charcoal hover:bg-bg-warm transition-colors rounded-t-xl {user.role === 'Admin' ? 'text-accent-purple' : ''}"
                        >
                          Admin
                        </button>
                        <button
                          onclick={() => handleRoleChange(user.id, 'Developer')}
                          class="w-full text-left px-4 py-2 text-xs font-bold text-dark-charcoal hover:bg-bg-warm transition-colors rounded-b-xl {user.role === 'Developer' ? 'text-accent-purple' : ''}"
                        >
                          Developer
                        </button>
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/60">{formatDate(user.createdAt)}</td>
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    {#if user.id !== appState.currentUser?.id}
                      <button
                        onclick={() => handleDeleteUser(user.id, user.name)}
                        class="text-xs text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    {:else}
                      <span class="text-[10px] text-dark-charcoal/30 font-bold uppercase tracking-wider">You</span>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        {#if filteredUsers.length === 0}
          <div class="text-center py-12">
            <p class="text-sm font-bold text-dark-charcoal/40">No users found matching "{userSearchQuery}"</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Scan Overview for Admin -->
    {#if appState.scans.length > 0}
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold font-display text-dark-charcoal">Scan Activity Overview</h3>
            <p class="text-xs text-dark-charcoal/60 mt-1">All recent scanning activity across the platform</p>
          </div>
          <a href="/dashboard/history" class="text-xs font-bold bg-bg-warm border border-dark-charcoal/15 px-3 py-1.5 rounded-lg text-dark-charcoal hover:bg-dark-charcoal hover:text-bg-warm transition-all">
            View All History
          </a>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">
                <th class="py-3 px-4">Project Name</th>
                <th class="py-3 px-4">Scan Date</th>
                <th class="py-3 px-4 text-center">Files</th>
                <th class="py-3 px-4 text-center">Secrets Found</th>
                <th class="py-3 px-4">Risk Rating</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each appState.scans.slice(0, 5) as item}
                <tr
                  onclick={() => appState.setSelectedScan(item.id)}
                  class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors cursor-pointer {appState.selectedScanId === item.id ? 'bg-bg-warm/75 border-l-4 border-l-accent-purple' : ''}"
                >
                  <td class="py-3.5 px-4 font-bold">{item.projectName}</td>
                  <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/70">{item.date}</td>
                  <td class="py-3.5 px-4 text-center">{item.filesScanned}</td>
                  <td class="py-3.5 px-4 text-center">
                    {#if item.secretsFound > 0}
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                        {item.secretsFound}
                      </span>
                    {:else}
                      <span class="text-green-600 font-bold">0</span>
                    {/if}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 text-[10px] border rounded font-bold uppercase tracking-wider inline-block {getRiskBadgeClass(item.riskScore)}">
                      {item.riskScore} - {getRiskText(item.riskScore)}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                    <div class="flex items-center justify-end gap-2">
                      <button
                        onclick={() => appState.setSelectedScan(item.id)}
                        class="text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-2.5 py-1 rounded-md text-dark-charcoal hover:bg-accent-purple hover:text-bg-warm transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                      <button
                        onclick={() => {
                          if (confirm('Delete this scan?')) {
                            appState.deleteScan(item.id);
                          }
                        }}
                        class="text-xs text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

  {:else}
    <!-- DEVELOPER DASHBOARD (original) -->
    <div class="flex items-center gap-3 mb-2">
      <div class="w-10 h-10 rounded-2xl bg-accent-purple/15 flex items-center justify-center">
        <svg class="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-extrabold font-display text-dark-charcoal">Security Dashboard</h1>
        <p class="text-sm text-dark-charcoal/60">Overview of your codebase security status</p>
      </div>
    </div>

    <!-- Widgets Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Projects Scanned</div>
          <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{totalProjects}</div>
          <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Total active repositories</div>
        </div>
        <div class="p-4 bg-accent-purple/10 text-accent-purple rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Secrets Found</div>
          <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{totalSecrets}</div>
          <div class="text-xs font-semibold text-dark-charcoal/60 mt-1">Across all historical archives</div>
        </div>
        <div class="p-4 bg-dark-charcoal/5 text-dark-charcoal rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Critical Leaks</div>
          <div class="text-4xl font-extrabold font-display text-red-600 mt-2">{totalCritical}</div>
          <div class="text-xs font-semibold text-red-600/70 mt-1">Immediate rotation required</div>
        </div>
        <div class="p-4 bg-red-100 text-red-600 rounded-2xl">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex items-center justify-between shadow-sm">
        {#if project}
          <div>
            <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Overall Risk Score</div>
            <div class="text-4xl font-extrabold font-display text-dark-charcoal mt-2">{riskScore}<span class="text-sm font-semibold text-dark-charcoal/50">/100</span></div>
            <div class="text-xs mt-1.5 px-2 py-0.5 border rounded-md font-bold uppercase tracking-wider inline-block {getRiskBadgeClass(riskScore)}">
              {getRiskText(riskScore)}
            </div>
          </div>
          <div class="p-4 bg-dark-charcoal/5 text-dark-charcoal rounded-2xl">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
        {:else}
          <div class="text-sm font-bold text-dark-charcoal/50 py-3">No project loaded</div>
        {/if}
      </div>
    </div>

    {#if project}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 class="text-lg font-bold font-display text-dark-charcoal">Target Project Risk</h3>
            <p class="text-xs text-dark-charcoal/60 mt-1">Deep contextual score breakdown</p>
            
            <div class="mt-6 flex flex-col items-center justify-center">
              <div class="relative w-40 h-40 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={radius} fill="transparent" stroke={appState.theme === 'dark' ? '#E5D5B3' : '#D1D5DB'} stroke-width="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke={riskScore >= 75 ? '#EF4444' : riskScore >= 40 ? '#F59E0B' : '#10B981'}
                    stroke-width="10"
                    stroke-dasharray={circumference}
                    stroke-dashoffset={strokeDashoffset}
                    stroke-linecap="round"
                    class="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div class="absolute text-center">
                  <div class="text-3xl font-extrabold font-display text-dark-charcoal">{riskScore}</div>
                  <div class="text-[10px] font-bold text-dark-charcoal/50 tracking-wider">RISK RATING</div>
                </div>
              </div>
              
              <div class="text-center mt-4">
                <h4 class="font-bold text-dark-charcoal text-base">{project.projectName}</h4>
                <p class="text-xs text-dark-charcoal/70 mt-1 max-w-xs">{project.projectDescription}</p>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-dark-charcoal/10 flex items-center justify-between text-xs font-bold text-dark-charcoal/60">
            <span>Date: {project.date}</span>
            <span>Files: {project.filesScanned}</span>
          </div>
        </div>

        <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex flex-col shadow-sm">
          <div class="mb-4">
            <h3 class="text-lg font-bold font-display text-dark-charcoal">Severity Distribution</h3>
            <p class="text-xs text-dark-charcoal/60 mt-1">Pie chart of findings by severity level</p>
          </div>
          <div class="h-64">
            <canvas bind:this={severityChart}></canvas>
          </div>
        </div>

        <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex flex-col shadow-sm">
          <div class="mb-4">
            <h3 class="text-lg font-bold font-display text-dark-charcoal">Secret Types Breakdown</h3>
            <p class="text-xs text-dark-charcoal/60 mt-1">Doughnut chart of identified secret types</p>
          </div>
          <div class="h-64">
            <canvas bind:this={typesChart}></canvas>
          </div>
          <div class="mt-6 pt-6 border-t border-dark-charcoal/10 text-center">
            <a href="/dashboard/results" class="text-xs font-bold text-accent-purple hover:underline inline-flex items-center gap-1">
              View full details table
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
          </div>
        </div>
      </div>

      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold font-display text-dark-charcoal">Recent Scan History</h3>
            <p class="text-xs text-dark-charcoal/60 mt-1">Manage and preview past runs</p>
          </div>
          <a href="/dashboard/history" class="text-xs font-bold bg-bg-warm border border-dark-charcoal/15 px-3 py-1.5 rounded-lg text-dark-charcoal hover:bg-dark-charcoal hover:text-bg-warm transition-all">
            View All History
          </a>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">
                <th class="py-3 px-4">Project Name</th>
                <th class="py-3 px-4">Scan Date</th>
                <th class="py-3 px-4 text-center">Files</th>
                <th class="py-3 px-4 text-center">Secrets Found</th>
                <th class="py-3 px-4">Risk Rating</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each appState.scans.slice(0, 5) as item}
                <tr
                  onclick={() => appState.setSelectedScan(item.id)}
                  class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors cursor-pointer {appState.selectedScanId === item.id ? 'bg-bg-warm/75 border-l-4 border-l-accent-purple' : ''}"
                >
                  <td class="py-3.5 px-4 font-bold">{item.projectName}</td>
                  <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/70">{item.date}</td>
                  <td class="py-3.5 px-4 text-center">{item.filesScanned}</td>
                  <td class="py-3.5 px-4 text-center">
                    {#if item.secretsFound > 0}
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                        {item.secretsFound}
                      </span>
                    {:else}
                      <span class="text-green-600 font-bold">0</span>
                    {/if}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 text-[10px] border rounded font-bold uppercase tracking-wider inline-block {getRiskBadgeClass(item.riskScore)}">
                      {item.riskScore} - {getRiskText(item.riskScore)}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                    <div class="flex items-center justify-end gap-2">
                      <button
                        onclick={() => appState.setSelectedScan(item.id)}
                        class="text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-2.5 py-1 rounded-md text-dark-charcoal hover:bg-accent-purple hover:text-bg-warm transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                      <button
                        onclick={() => {
                          if (confirm('Delete this scan?')) {
                            appState.deleteScan(item.id);
                          }
                        }}
                        class="text-xs text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-12 text-center shadow-sm">
        <div class="w-16 h-16 rounded-3xl bg-accent-purple/10 text-accent-purple flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal">No Scans Recorded</h3>
        <p class="text-sm text-dark-charcoal/60 mt-2 max-w-sm mx-auto">Upload and scan your codebase archives to start seeing results in your dashboard.</p>
        <a href="/dashboard/upload" class="inline-flex items-center gap-2 bg-accent-purple text-bg-warm font-bold px-6 py-3 rounded-xl mt-6 hover:bg-dark-charcoal hover:text-bg-warm transition-colors">
          Upload Project
        </a>
      </div>
    {/if}
  {/if}
</div>
