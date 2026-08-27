<script>
  import { appState } from '$lib/state.svelte';

  let searchQuery = $state('');
  let activeFilter = $state('All');

  const filters = ['All', 'Login', 'Scan', 'User Management', 'Settings', 'System'];

  function classifyAction(action) {
    const lower = action.toLowerCase();
    if (lower.includes('login')) return 'Login';
    if (lower.includes('scan')) return 'Scan';
    if (lower.includes('user') || lower.includes('role') || lower.includes('register')) return 'User Management';
    if (lower.includes('setting')) return 'Settings';
    return 'System';
  }

  function getActionStyle(category) {
    switch (category) {
      case 'Login':
        return { dot: 'bg-emerald-500', icon: 'login', ring: 'ring-emerald-500/20' };
      case 'Scan':
        return { dot: 'bg-blue-500', icon: 'scan', ring: 'ring-blue-500/20' };
      case 'User Management':
        return { dot: 'bg-orange-500', icon: 'user', ring: 'ring-orange-500/20' };
      case 'Settings':
        return { dot: 'bg-purple-500', icon: 'settings', ring: 'ring-purple-500/20' };
      default:
        return { dot: 'bg-red-500', icon: 'alert', ring: 'ring-red-500/20' };
    }
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${year} \u2022 ${hours}:${minutes} ${ampm}`;
  }

  const filteredEntries = $derived(() => {
    let entries = [...(appState.auditLog || [])];

    if (activeFilter !== 'All') {
      entries = entries.filter(e => classifyAction(e.action) === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q)
      );
    }

    return entries;
  });
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-accent-purple/10 flex items-center justify-center">
          <svg class="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold font-display text-dark-charcoal">Audit Log</h1>
          <p class="text-xs text-dark-charcoal/60 font-semibold mt-0.5">Complete timeline of all user actions and system events</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[10px] font-extrabold text-dark-charcoal/50 uppercase tracking-wider">
          {filteredEntries().length} of {appState.auditLog?.length || 0} entries
        </span>
      </div>
    </div>
  </div>

  <!-- Filters & Search -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm space-y-5">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Search -->
      <div class="relative max-w-sm w-full">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-dark-charcoal/40">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search actions, details, users..."
          class="w-full bg-bg-warm border border-dark-charcoal/15 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
        />
      </div>

      <!-- Filter pills -->
      <div class="flex items-center gap-1.5 bg-bg-warm border border-dark-charcoal/10 p-1 rounded-xl w-fit flex-wrap">
        {#each filters as filter}
          <button
            onclick={() => activeFilter = filter}
            class="px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer uppercase tracking-wider {activeFilter === filter ? 'bg-accent-purple text-bg-warm' : 'text-dark-charcoal/60 hover:text-dark-charcoal'}"
          >
            {filter}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Timeline -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
    {#if filteredEntries().length > 0}
      <div class="relative">
        <!-- Timeline vertical line -->
        <div class="absolute left-[19px] top-0 bottom-0 w-px bg-dark-charcoal/10"></div>

        <div class="space-y-1">
          {#each filteredEntries() as entry, i (entry.id)}
            {@const style = getActionStyle(classifyAction(entry.action))}
            <div class="relative flex gap-4 group">
              <!-- Timeline dot -->
              <div class="relative z-10 flex-shrink-0 mt-1">
                <div class="w-[10px] h-[10px] rounded-full {style.dot} ring-4 {style.ring} transition-all group-hover:scale-125"></div>
              </div>

              <!-- Entry card -->
              <div class="flex-1 pb-5">
                <div class="bg-bg-warm border border-dark-charcoal/8 rounded-2xl p-4 hover:border-accent-purple/30 hover:shadow-md transition-all duration-200 group-hover:translate-x-0.5">
                  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-extrabold text-dark-charcoal">{entry.action}</span>
                        <span class="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border inline-flex items-center gap-1
                          {classifyAction(entry.action) === 'Login' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                           classifyAction(entry.action) === 'Scan' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                           classifyAction(entry.action) === 'User Management' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                           classifyAction(entry.action) === 'Settings' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                           'bg-red-50 text-red-600 border-red-200'}">
                          {#if classifyAction(entry.action) === 'Login'}
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                          {:else if classifyAction(entry.action) === 'Scan'}
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                          {:else if classifyAction(entry.action) === 'User Management'}
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                          {:else if classifyAction(entry.action) === 'Settings'}
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          {:else}
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
                          {/if}
                          {classifyAction(entry.action)}
                        </span>
                      </div>
                      <p class="text-xs text-dark-charcoal/70 font-semibold mt-1.5 leading-relaxed">{entry.details}</p>
                      <div class="flex items-center gap-3 mt-2.5">
                        <span class="text-[10px] font-bold text-dark-charcoal/40 flex items-center gap-1">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                          {entry.user}
                        </span>
                        {#if entry.role && entry.role !== 'system'}
                          <span class="px-1.5 py-0.5 text-[9px] font-bold text-dark-charcoal/40 border border-dark-charcoal/10 rounded uppercase tracking-wider">
                            {entry.role}
                          </span>
                        {/if}
                      </div>
                    </div>
                    <span class="text-[10px] font-bold text-dark-charcoal/40 whitespace-nowrap flex-shrink-0">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Empty state -->
      <div class="py-16 text-center">
        <div class="w-16 h-16 rounded-3xl bg-bg-warm border border-dark-charcoal/10 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-dark-charcoal/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-sm font-bold text-dark-charcoal/50">No matching entries</h3>
        <p class="text-xs text-dark-charcoal/35 mt-1 font-semibold">Try adjusting your search query or filter selection.</p>
      </div>
    {/if}
  </div>
</div>
