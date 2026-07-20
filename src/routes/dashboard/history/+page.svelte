<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  let searchQuery = $state('');
  let riskFilter = $state('All');
  let sortBy = $state('date'); // date, projectName, riskScore
  let sortOrder = $state('desc'); // desc, asc
  let selectedScanIds = $state([]);

  const processedScans = $derived(() => {
    let result = [...appState.scans];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.projectName.toLowerCase().includes(q));
    }

    // Risk Filter
    if (riskFilter !== 'All') {
      if (riskFilter === 'Critical') {
        result = result.filter(s => s.riskScore >= 75);
      } else if (riskFilter === 'High/Medium') {
        result = result.filter(s => s.riskScore >= 40 && s.riskScore < 75);
      } else if (riskFilter === 'Low') {
        result = result.filter(s => s.riskScore > 0 && s.riskScore < 40);
      } else if (riskFilter === 'Clear') {
        result = result.filter(s => s.riskScore === 0);
      }
    }

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  });

  function toggleSort(field) {
    if (sortBy === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortOrder = 'desc';
    }
  }

  function handleSelectAll(e) {
    if (e.target.checked) {
      selectedScanIds = processedScans().map(s => s.id);
    } else {
      selectedScanIds = [];
    }
  }

  function toggleSelect(id) {
    if (selectedScanIds.includes(id)) {
      selectedScanIds = selectedScanIds.filter(x => x !== id);
    } else {
      selectedScanIds = [...selectedScanIds, id];
    }
  }

  function batchDelete() {
    if (selectedScanIds.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedScanIds.length} selected scan logs?`)) {
      selectedScanIds.forEach(id => appState.deleteScan(id));
      selectedScanIds = [];
    }
  }

  function handleInspect(id) {
    appState.setSelectedScan(id);
    goto('/dashboard');
  }

  function getRiskBadge(score) {
    if (score >= 75) return 'bg-red-100 text-red-600 border-red-200';
    if (score >= 40) return 'bg-orange-100 text-orange-600 border-orange-200';
    if (score > 0) return 'bg-blue-100 text-blue-600 border-blue-200';
    return 'bg-green-100 text-green-600 border-green-200';
  }
</script>

<div class="space-y-8">
  <!-- Top bar actions description -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h3 class="text-xl font-bold font-display text-dark-charcoal">Historical Scan Logs</h3>
      <p class="text-xs text-dark-charcoal/60 mt-1 font-semibold">Search, sort, filter, and manage previous execution profiles</p>
    </div>

    <!-- Batch action delete -->
    {#if selectedScanIds.length > 0}
      <button
        onclick={batchDelete}
        class="bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm animate-in zoom-in"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        Delete Selected ({selectedScanIds.length})
      </button>
    {/if}
  </div>

  <!-- Filters panel -->
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
          placeholder="Search by project name..."
          class="w-full bg-bg-warm border border-dark-charcoal/15 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
        />
      </div>

      <!-- Risk Filter pills -->
      <div class="flex items-center gap-1.5 bg-bg-warm border border-dark-charcoal/10 p-1 rounded-xl w-fit">
        {#each ['All', 'Critical', 'High/Medium', 'Clear'] as filter}
          <button
            onclick={() => riskFilter = filter}
            class="px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer uppercase tracking-wider {riskFilter === filter ? 'bg-accent-purple text-bg-warm' : 'text-dark-charcoal/60 hover:text-dark-charcoal'}"
          >
            {filter}
          </button>
        {/each}
      </div>
    </div>

    <!-- History Table -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider select-none">
            <th class="py-3 px-4 w-12 text-center">
              <input
                type="checkbox"
                checked={processedScans().length > 0 && selectedScanIds.length === processedScans().length}
                onchange={handleSelectAll}
                class="rounded border-dark-charcoal/20 text-accent-purple focus:ring-accent-purple w-4 h-4 cursor-pointer accent-accent-purple"
              />
            </th>
            <th onclick={() => toggleSort('projectName')} class="py-3 px-4 cursor-pointer hover:text-accent-purple transition-colors">
              <div class="flex items-center gap-1">
                Project Name
                {#if sortBy === 'projectName'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
              </div>
            </th>
            <th onclick={() => toggleSort('date')} class="py-3 px-4 cursor-pointer hover:text-accent-purple transition-colors w-32">
              <div class="flex items-center gap-1">
                Scan Date
                {#if sortBy === 'date'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
              </div>
            </th>
            <th onclick={() => toggleSort('filesScanned')} class="py-3 px-4 text-center cursor-pointer hover:text-accent-purple transition-colors w-24">
              <div class="flex items-center justify-center gap-1">
                Files
                {#if sortBy === 'filesScanned'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
              </div>
            </th>
            <th onclick={() => toggleSort('secretsFound')} class="py-3 px-4 text-center cursor-pointer hover:text-accent-purple transition-colors w-28">
              <div class="flex items-center justify-center gap-1">
                Secrets Found
                {#if sortBy === 'secretsFound'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
              </div>
            </th>
            <th onclick={() => toggleSort('riskScore')} class="py-3 px-4 cursor-pointer hover:text-accent-purple transition-colors w-32">
              <div class="flex items-center gap-1">
                Risk Rating
                {#if sortBy === 'riskScore'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
              </div>
            </th>
            <th class="py-3 px-4 text-right w-24">Action</th>
          </tr>
        </thead>
        <tbody>
          {#if processedScans().length > 0}
            {#each processedScans() as item}
              <tr class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors">
                <td class="py-3.5 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedScanIds.includes(item.id)}
                    onchange={() => toggleSelect(item.id)}
                    class="rounded border-dark-charcoal/20 text-accent-purple focus:ring-accent-purple w-4 h-4 cursor-pointer accent-accent-purple"
                  />
                </td>
                <td class="py-3.5 px-4 font-bold cursor-pointer" onclick={() => handleInspect(item.id)}>
                  {item.projectName}
                </td>
                <td class="py-3.5 px-4 text-xs font-semibold text-dark-charcoal/70">{item.date}</td>
                <td class="py-3.5 px-4 text-center">{item.filesScanned}</td>
                <td class="py-3.5 px-4 text-center">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-full {item.secretsFound > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} text-xs font-bold">
                    {item.secretsFound}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <span class="px-2 py-0.5 border text-[10px] font-bold rounded uppercase tracking-wider inline-block {getRiskBadge(item.riskScore)}">
                    {item.riskScore}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      onclick={() => handleInspect(item.id)}
                      class="text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-2.5 py-1 rounded-md text-dark-charcoal hover:bg-accent-purple hover:text-bg-warm transition-colors cursor-pointer"
                    >
                      Load
                    </button>
                    
                    <button
                      onclick={() => {
                        if (confirm('Delete this scan file from archive?')) {
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
          {:else}
            <tr>
              <td colspan="7" class="py-12 text-center text-sm font-bold text-dark-charcoal/40">
                No archived scan history meets this criteria.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
