<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let { children } = $props();
  let showLogoutModal = $state(false);
  let isMobileMenuOpen = $state(false);

  // Check auth on mount and whenever user state changes
  onMount(() => {
    if (!appState.currentUser) {
      goto('/login');
    }
  });

  // Watch user state reactively
  $effect(() => {
    if (!appState.currentUser) {
      goto('/login');
    }
  });

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"></path></svg>`
    },
    {
      name: 'Upload',
      path: '/dashboard/upload',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>`
    },
    {
      name: 'Scan Results',
      path: '/dashboard/results',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
    },
    {
      name: 'AI Analysis',
      path: '/dashboard/ai-analysis',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`
    },
    {
      name: 'Risk Assessment',
      path: '/dashboard/risk-assessment',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`
    },
    {
      name: 'Recommendations',
      path: '/dashboard/recommendations',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    },
    {
      name: 'Reports',
      path: '/dashboard/reports',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
    },
    {
      name: 'History',
      path: '/dashboard/history',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    },
    {
      name: 'Profile',
      path: '/dashboard/profile',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`
    }
  ];

  function isActive(path) {
    const currentPath = page.url.pathname;
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  }

  function handleLogout() {
    appState.logout();
    showLogoutModal = false;
    goto('/');
  }
</script>

{#if appState.currentUser}
<div class="min-h-screen flex flex-col md:flex-row bg-bg-warm">
  <!-- Mobile Header -->
  <div class="md:hidden flex items-center justify-between bg-card-warm border-b border-dark-charcoal/10 px-6 py-4">
    <div class="flex items-center gap-2 text-xl font-bold font-display text-dark-charcoal">
      <svg class="w-6 h-6 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      <span>Secur<span class="text-accent-purple">AI</span></span>
    </div>
    
    <button onclick={() => isMobileMenuOpen = !isMobileMenuOpen} class="text-dark-charcoal p-1 focus:outline-none">
      {#if isMobileMenuOpen}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      {:else}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      {/if}
    </button>
  </div>

  <!-- Sidebar Panel -->
  <aside class="w-full md:w-64 bg-card-warm border-r border-dark-charcoal/10 flex-col justify-between p-6 shrink-0 md:flex {isMobileMenuOpen ? 'flex' : 'hidden md:flex'}">
    <div>
      <!-- Brand Logo -->
      <a href="/" class="hidden md:flex items-center gap-2 text-2xl font-bold font-display tracking-tight text-dark-charcoal mb-8">
        <svg class="w-8 h-8 text-accent-purple animate-pulse-glow rounded-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
        <span>Secur<span class="text-accent-purple">AI</span></span>
      </a>

      <!-- Navigation links -->
      <nav class="space-y-1.5">
        {#each navItems as item}
          <a
            href={item.path}
            onclick={() => isMobileMenuOpen = false}
            class="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 {isActive(item.path) ? 'bg-accent-purple text-bg-warm shadow-md' : 'text-dark-charcoal/70 hover:text-dark-charcoal hover:bg-bg-warm/75'}"
          >
            {@html item.icon}
            <span>{item.name}</span>
          </a>
        {/each}
      </nav>
    </div>

    <!-- User Profile & Logout -->
    <div class="mt-8 border-t border-dark-charcoal/10 pt-6 space-y-4">
      <div class="flex items-center gap-3">
        <img src={appState.currentUser.avatar} alt="User avatar" class="w-10 h-10 rounded-xl object-cover border border-accent-purple/20" />
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm text-dark-charcoal truncate">{appState.currentUser.name}</div>
          <div class="text-[10px] bg-dark-charcoal/10 border border-dark-charcoal/15 text-dark-charcoal/70 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider inline-block mt-0.5">
            {appState.currentUser.role}
          </div>
        </div>
      </div>
      
      <button
        onclick={() => showLogoutModal = true}
        class="w-full flex items-center justify-center gap-2 border border-dark-charcoal/15 text-dark-charcoal font-bold py-2.5 rounded-xl text-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        Sign Out
      </button>
    </div>
  </aside>

  <!-- Main Content Space -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Header Topbar -->
    <header class="bg-card-warm border-b border-dark-charcoal/10 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-extrabold font-display text-dark-charcoal tracking-tight">
          {#if page.url.pathname === '/dashboard'}
            Security Dashboard
          {:else if page.url.pathname.includes('/upload')}
            Upload Codebase Archive
          {:else if page.url.pathname.includes('/scanning')}
            Analyzing Codebase...
          {:else if page.url.pathname.includes('/results')}
            Detection Results
          {:else if page.url.pathname.includes('/ai-analysis')}
            AI Assisted Verification
          {:else if page.url.pathname.includes('/risk-assessment')}
            Risk Impact Assessment
          {:else if page.url.pathname.includes('/recommendations')}
            Remediation Guidelines
          {:else if page.url.pathname.includes('/reports')}
            Compliance Reports
          {:else if page.url.pathname.includes('/history')}
            Scan Archives
          {:else if page.url.pathname.includes('/profile')}
            Console Profile
          {:else}
            Console
          {/if}
        </h2>
      </div>

      <!-- Active Scan Project Selector -->
      <div class="flex items-center gap-3 bg-bg-warm px-4 py-2 border border-accent-purple/30 focus-within:border-accent-purple focus-within:ring-2 focus-within:ring-accent-purple/20 rounded-2xl max-w-xs w-full sm:w-auto transition-all purple-glow">
        <span class="text-xs font-bold text-accent-purple uppercase tracking-wider whitespace-nowrap">Target:</span>
        {#if appState.scans.length > 0}
          <select
            value={appState.selectedScanId}
            onchange={(e) => appState.setSelectedScan(e.target.value)}
            class="bg-transparent text-sm font-bold text-dark-charcoal border-none focus:outline-none w-full cursor-pointer"
          >
            {#each appState.scans as s}
              <option value={s.id} class="bg-card-warm font-semibold text-dark-charcoal">{s.projectName}</option>
            {/each}
          </select>
        {:else}
          <span class="text-sm font-bold text-dark-charcoal/50">No scans available</span>
        {/if}
      </div>
    </header>

    <!-- Subpage Container -->
    <main class="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
      {@render children()}
    </main>
  </div>
</div>

<!-- Logout Confirmation Dialog -->
{#if showLogoutModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-dark-charcoal/40 backdrop-blur-sm">
    <div class="bg-card-warm border border-dark-charcoal/10 p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
      <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center mb-6">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      
      <h3 class="text-2xl font-bold font-display text-dark-charcoal">Confirm Logout</h3>
      <p class="text-sm text-dark-charcoal/70 mt-2">Are you sure you want to end your current session and exit the console?</p>
      
      <div class="mt-8 flex items-center gap-3">
        <button
          onclick={handleLogout}
          class="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
        >
          Yes, Sign Out
        </button>
        <button
          onclick={() => showLogoutModal = false}
          class="flex-1 bg-bg-warm border border-dark-charcoal/10 text-dark-charcoal font-bold py-3 rounded-xl hover:bg-dark-charcoal/10 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
{/if}
