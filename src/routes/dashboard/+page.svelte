<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  // Gather global widgets data
  const totalProjects = $derived(appState.scans.length);
  const totalSecrets = $derived(appState.scans.reduce((sum, s) => sum + s.secretsFound, 0));
  const totalCritical = $derived(appState.scans.reduce((sum, s) => sum + s.criticalCount, 0));
  
  // Selected project details
  const project = $derived(appState.selectedScan);
  const riskScore = $derived(project ? project.riskScore : 0);
  
  // Gauge details
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // 314.159
  const strokeDashoffset = $derived(circumference - (riskScore / 100) * circumference);

  // Group current project secrets by type
  const secretTypeCounts = $derived(() => {
    if (!project || !project.findings) return [];
    const counts = {};
    project.findings.forEach(f => {
      counts[f.secretType] = (counts[f.secretType] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  });

  function getRiskBadgeClass(score) {
    if (score >= 75) return 'bg-red-100 text-red-600 border-red-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    if (score > 0) return 'bg-blue-100 text-blue-600 border-blue-200';
    return 'bg-green-100 text-green-600 border-green-200';
  }

  function getRiskText(score) {
    if (score >= 75) return 'CRITICAL';
    if (score >= 40) return 'MEDIUM / HIGH';
    if (score > 0) return 'LOW RISK';
    return 'SECURE';
  }
</script>

<div class="space-y-8">
  <!-- Widgets Row -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Projects Scanned -->
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

    <!-- Secrets Found -->
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

    <!-- Critical Findings -->
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

    <!-- Selected Project Risk -->
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
    <!-- Main Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Target Project Details & Risk Gauge -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
        <div>
          <h3 class="text-lg font-bold font-display text-dark-charcoal">Target Project Risk</h3>
          <p class="text-xs text-dark-charcoal/60 mt-1">Deep contextual score breakdown</p>
          
          <div class="mt-6 flex flex-col items-center justify-center">
            <!-- Radial Gauge -->
            <div class="relative w-40 h-40 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <!-- Track -->
                <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#E5D5B3" stroke-width="10" />
                <!-- Fill -->
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
              <!-- Center Text -->
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

      <!-- Severity Distribution -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
        <div>
          <h3 class="text-lg font-bold font-display text-dark-charcoal">Severity Distribution</h3>
          <p class="text-xs text-dark-charcoal/60 mt-1">Number of leaks classified by impact</p>
          
          <div class="mt-6 space-y-4">
            <!-- Critical -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-red-500"></span>Critical</span>
                <span>{project.criticalCount}</span>
              </div>
              <div class="w-full bg-bg-warm rounded-full h-2">
                <div class="bg-red-500 h-2 rounded-full transition-all duration-500" style="width: {project.secretsFound > 0 ? (project.criticalCount / project.secretsFound) * 100 : 0}%"></div>
              </div>
            </div>

            <!-- High -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-orange-500"></span>High</span>
                <span>{project.highCount}</span>
              </div>
              <div class="w-full bg-bg-warm rounded-full h-2">
                <div class="bg-orange-500 h-2 rounded-full transition-all duration-500" style="width: {project.secretsFound > 0 ? (project.highCount / project.secretsFound) * 100 : 0}%"></div>
              </div>
            </div>

            <!-- Medium -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-yellow-500"></span>Medium</span>
                <span>{project.mediumCount}</span>
              </div>
              <div class="w-full bg-bg-warm rounded-full h-2">
                <div class="bg-yellow-500 h-2 rounded-full transition-all duration-500" style="width: {project.secretsFound > 0 ? (project.mediumCount / project.secretsFound) * 100 : 0}%"></div>
              </div>
            </div>

            <!-- Low -->
            <div>
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-blue-500"></span>Low</span>
                <span>{project.lowCount}</span>
              </div>
              <div class="w-full bg-bg-warm rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all duration-500" style="width: {project.secretsFound > 0 ? (project.lowCount / project.secretsFound) * 100 : 0}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-6 border-t border-dark-charcoal/10 flex items-center justify-between">
          <div class="text-xs font-extrabold text-dark-charcoal">Total Findings:</div>
          <div class="text-sm font-extrabold text-accent-purple">{project.secretsFound} Secrets</div>
        </div>
      </div>

      <!-- Secret Types Breakdown -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
        <div>
          <h3 class="text-lg font-bold font-display text-dark-charcoal">Secret Types</h3>
          <p class="text-xs text-dark-charcoal/60 mt-1">Identified signature formats</p>
          
          <div class="mt-6 space-y-4">
            {#if secretTypeCounts().length > 0}
              {#each secretTypeCounts() as item}
                <div>
                  <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span>{item.type}</span>
                    <span>{item.count}</span>
                  </div>
                  <div class="w-full bg-bg-warm rounded-full h-2">
                    <div class="bg-accent-purple h-2 rounded-full transition-all duration-500" style="width: {project.secretsFound > 0 ? (item.count / project.secretsFound) * 100 : 0}%"></div>
                  </div>
                </div>
              {/each}
            {:else}
              <div class="text-center py-10 text-xs font-bold text-dark-charcoal/40">
                No secrets detected in this target codebase.
              </div>
            {/if}
          </div>
        </div>

        <div class="mt-6 pt-6 border-t border-dark-charcoal/10 text-center">
          <a href="/dashboard/results" class="text-xs font-bold text-accent-purple hover:underline inline-flex items-center gap-1">
            View full details table
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Recent Scan History Table -->
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
</div>
