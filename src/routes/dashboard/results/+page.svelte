<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  const project = $derived(appState.selectedScan);

  // Filter states
  let searchQuery = $state('');
  let selectedSeverity = $state('All');
  let selectedStatus = $state('All');
  let sortField = $state('file');
  let sortOrder = $state('asc'); // asc or desc

  // Derived filtered findings
  const filteredFindings = $derived(() => {
    if (!project || !project.findings) return [];
    
    let result = [...project.findings];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.file.toLowerCase().includes(q) || 
        f.secretType.toLowerCase().includes(q)
      );
    }

    // Filter by severity
    if (selectedSeverity !== 'All') {
      result = result.filter(f => f.severity === selectedSeverity);
    }

    // Filter by status
    if (selectedStatus !== 'All') {
      result = result.filter(f => f.status === selectedStatus);
    }

    // Sort findings
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Custom severity ordering
      if (sortField === 'severity') {
        const priority = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        valA = priority[a.severity] || 0;
        valB = priority[b.severity] || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  });

  function toggleSort(field) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
  }

  function getSeverityClass(sev) {
    switch (sev) {
      case 'Critical': return 'bg-red-100 text-red-600 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-600 border-blue-200';
      default: return 'bg-green-100 text-green-600 border-green-200';
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case 'Active': return 'bg-red-50 text-red-600 border-red-100';
      case 'Revoked': return 'bg-green-50 text-green-600 border-green-100';
      case 'False Positive': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-bg-warm text-dark-charcoal';
    }
  }

  function handleRowClick(findingId) {
    // We can store the selected finding ID in localStorage or state to pre-select it on AI Analysis page
    if (browser) {
      localStorage.setItem('selected_finding_id', findingId);
    }
    goto('/dashboard/ai-analysis');
  }

  import { browser } from '$app/environment';
</script>

<div class="space-y-8">
  {#if project}
    <!-- Summary Counter Cards -->
    <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
      <!-- Files Scanned -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-2xl p-4 text-center shadow-sm">
        <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Files Scanned</div>
        <div class="text-2xl font-extrabold text-dark-charcoal mt-1">{project.filesScanned}</div>
      </div>

      <!-- Total Leaks -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-2xl p-4 text-center shadow-sm">
        <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider">Total Leaks</div>
        <div class="text-2xl font-extrabold text-dark-charcoal mt-1">{project.secretsFound}</div>
      </div>

      <!-- Critical -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-red-500">
        <div class="text-[10px] font-bold text-red-600/70 uppercase tracking-wider">Critical</div>
        <div class="text-2xl font-extrabold text-red-600 mt-1">{project.criticalCount}</div>
      </div>

      <!-- High -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-orange-500">
        <div class="text-[10px] font-bold text-orange-600/70 uppercase tracking-wider">High</div>
        <div class="text-2xl font-extrabold text-orange-600 mt-1">{project.highCount}</div>
      </div>

      <!-- Medium -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-yellow-500">
        <div class="text-[10px] font-bold text-yellow-600/70 uppercase tracking-wider">Medium</div>
        <div class="text-2xl font-extrabold text-yellow-600 mt-1">{project.mediumCount}</div>
      </div>

      <!-- Low -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-2xl p-4 text-center shadow-sm border-l-4 border-l-blue-500">
        <div class="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider">Low</div>
        <div class="text-2xl font-extrabold text-blue-600 mt-1">{project.lowCount}</div>
      </div>
    </div>

    <!-- Interactive Detections Board -->
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm space-y-6">
      
      <!-- Filter Controls Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-dark-charcoal/10 pb-6">
        <!-- Left: Search input -->
        <div class="relative max-w-md w-full">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-dark-charcoal/40">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </span>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by file path or secret type..."
            class="w-full bg-bg-warm border border-dark-charcoal/15 pl-10 pr-4 py-2.5 rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-orange orange-glow-border transition-all"
          />
        </div>

        <!-- Right: Toggles -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Severity Filter -->
          <div class="flex items-center gap-1.5 bg-bg-warm border border-dark-charcoal/10 p-1 rounded-xl">
            {#each ['All', 'Critical', 'High', 'Medium', 'Low'] as sev}
              <button
                onclick={() => selectedSeverity = sev}
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedSeverity === sev ? 'bg-accent-orange text-bg-warm shadow-sm' : 'text-dark-charcoal/60 hover:text-dark-charcoal'}"
              >
                {sev}
              </button>
            {/each}
          </div>

          <!-- Status Filter -->
          <select
            bind:value={selectedStatus}
            class="bg-bg-warm border border-accent-orange/30 px-4 py-2 rounded-2xl text-xs font-bold text-dark-charcoal focus:outline-none focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/20 transition-all orange-glow cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Revoked">Revoked</option>
            <option value="False Positive">False Positive</option>
          </select>
        </div>
      </div>

      <!-- Detections Table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider select-none">
              <th onclick={() => toggleSort('file')} class="py-3 px-4 cursor-pointer hover:text-accent-orange transition-colors">
                <div class="flex items-center gap-1">
                  File Location
                  {#if sortField === 'file'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
                </div>
              </th>
              <th onclick={() => toggleSort('line')} class="py-3 px-4 text-center cursor-pointer hover:text-accent-orange transition-colors w-20">
                <div class="flex items-center justify-center gap-1">
                  Line
                  {#if sortField === 'line'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
                </div>
              </th>
              <th onclick={() => toggleSort('secretType')} class="py-3 px-4 cursor-pointer hover:text-accent-orange transition-colors">
                <div class="flex items-center gap-1">
                  Secret Type
                  {#if sortField === 'secretType'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
                </div>
              </th>
              <th onclick={() => toggleSort('severity')} class="py-3 px-4 cursor-pointer hover:text-accent-orange transition-colors w-28">
                <div class="flex items-center gap-1">
                  Severity
                  {#if sortField === 'severity'}{sortOrder === 'asc' ? '↑' : '↓'}{/if}
                </div>
              </th>
              <th class="py-3 px-4 w-32">Status</th>
              <th class="py-3 px-4 text-right w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {#if filteredFindings().length > 0}
              {#each filteredFindings() as finding}
                <tr
                  onclick={() => handleRowClick(finding.id)}
                  class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors cursor-pointer"
                >
                  <td class="py-3.5 px-4 font-mono text-xs text-dark-charcoal break-all">{finding.file}</td>
                  <td class="py-3.5 px-4 text-center text-dark-charcoal/60">{finding.line}</td>
                  <td class="py-3.5 px-4 font-bold">{finding.secretType}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 text-[10px] border rounded font-bold uppercase tracking-wider inline-block {getSeverityClass(finding.severity)}">
                      {finding.severity}
                    </span>
                  </td>
                  <td class="py-3.5 px-4" onclick={(e) => e.stopPropagation()}>
                    <select
                      value={finding.status}
                      onchange={(e) => finding.status = e.target.value}
                      class="bg-bg-warm border border-accent-orange/30 rounded-xl px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase focus:outline-none focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/20 transition-all cursor-pointer {getStatusClass(finding.status)}"
                    >
                      <option value="Active">Active</option>
                      <option value="Revoked">Revoked</option>
                      <option value="False Positive">False Positive</option>
                    </select>
                  </td>
                  <td class="py-3.5 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                    <button
                      onclick={() => handleRowClick(finding.id)}
                      class="text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-3 py-1.5 rounded-lg text-dark-charcoal hover:bg-accent-orange hover:text-bg-warm transition-all cursor-pointer"
                    >
                      AI Check
                    </button>
                  </td>
                </tr>
              {/each}
            {:else}
              <tr>
                <td colspan="6" class="py-12 text-center text-sm font-bold text-dark-charcoal/40">
                  No matching secrets found. Try adjusting your query or filters.
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-12 text-center shadow-sm">
      <h3 class="text-xl font-bold text-dark-charcoal">No Active Scans</h3>
      <p class="text-sm text-dark-charcoal/60 mt-2">Create a new scan from the Upload menu to view leak details.</p>
    </div>
  {/if}
</div>
