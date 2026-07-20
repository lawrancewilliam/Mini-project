<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  const project = $derived(appState.selectedScan);
  const riskScore = $derived(project ? project.riskScore : 0);

  // semi-circle gauge calculation
  // We can use a stroke Dasharray on a half-circle to represent a speedometre!
  // Radius: 50. Circumference of full circle: 314.16. Half circle arc: 157.08.
  // We can rotate the circle by 180deg (or start at -180deg).
  const halfCircumference = 157.08;
  const strokeDashoffset = $derived(halfCircumference - (riskScore / 100) * halfCircumference);

  function getRiskLevelText(score) {
    if (score >= 75) return { text: 'CRITICAL HAZARD', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (score >= 40) return { text: 'HIGH RISK', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (score > 0) return { text: 'MEDIUM / LOW RISK', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    return { text: 'SECURE / CLEAR', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  }

  const riskLevel = $derived(getRiskLevelText(riskScore));

  // Sort findings by severity priority for Top Risks list
  const topRisks = $derived(() => {
    if (!project || !project.findings) return [];
    const priority = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    return [...project.findings].sort((a, b) => priority[b.severity] - priority[a.severity]);
  });

  function getSeverityBadge(sev) {
    switch (sev) {
      case 'Critical': return 'bg-red-100 text-red-600 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default: return 'bg-blue-100 text-blue-600 border-blue-200';
    }
  }
</script>

<div class="space-y-8">
  {#if project}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left Column: Big Risk Dial Gauge -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between items-center text-center lg:col-span-1">
        <div class="w-full">
          <h3 class="text-lg font-bold font-display text-dark-charcoal">Overall Risk Rating</h3>
          <p class="text-xs text-dark-charcoal/60 mt-1 font-semibold">Simulated leak exposure metric</p>
        </div>

        <div class="my-8 relative w-56 h-36 flex items-center justify-center overflow-hidden">
          <!-- Semi circle gauge -->
          <svg class="w-full h-full absolute top-0 left-0" viewBox="0 0 120 70">
            <!-- Background Arc -->
            <path
              d="M 10,60 A 50,50 0 0,1 110,60"
              fill="none"
              stroke="#E5D5B3"
              stroke-width="12"
              stroke-linecap="round"
            />
            <!-- Fill Arc -->
            <path
              d="M 10,60 A 50,50 0 0,1 110,60"
              fill="none"
              stroke={riskScore >= 75 ? '#EF4444' : riskScore >= 40 ? '#F59E0B' : '#10B981'}
              stroke-width="12"
              stroke-linecap="round"
              stroke-dasharray={halfCircumference}
              stroke-dashoffset={strokeDashoffset}
              class="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <!-- Text readout at center-bottom -->
          <div class="absolute bottom-2 text-center">
            <div class="text-4xl font-extrabold font-display text-dark-charcoal">{riskScore}</div>
            <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider mt-0.5">Risk Score Index</div>
          </div>
        </div>

        <div class="w-full space-y-4">
          <div class="border rounded-2xl p-4 {riskLevel.bg} {riskLevel.border} transition-colors">
            <div class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">Calculated Severity</div>
            <div class="text-base font-extrabold mt-1 {riskLevel.color} tracking-tight">
              {riskLevel.text}
            </div>
          </div>
          
          <p class="text-xs text-dark-charcoal/60 leading-relaxed font-medium">
            Based on hardcoded secret volume, access privileges, and matching context entropy.
          </p>
        </div>
      </div>

      <!-- Right Column: Severity Breakdown & Algorithm explanation -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm lg:col-span-2 flex flex-col justify-between space-y-6">
        <div>
          <h3 class="text-xl font-bold font-display text-dark-charcoal">Severity Breakdown</h3>
          <p class="text-sm text-dark-charcoal/60 mt-1 font-medium">How the risk score is evaluated</p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div class="bg-bg-warm/60 border border-dark-charcoal/5 rounded-2xl p-4 text-center">
              <div class="text-xs font-extrabold text-red-500">Critical</div>
              <div class="text-3xl font-extrabold text-dark-charcoal mt-1">{project.criticalCount}</div>
              <div class="text-[10px] text-dark-charcoal/50 mt-1">25 pts/each</div>
            </div>

            <div class="bg-bg-warm/60 border border-dark-charcoal/5 rounded-2xl p-4 text-center">
              <div class="text-xs font-extrabold text-orange-500">High</div>
              <div class="text-3xl font-extrabold text-dark-charcoal mt-1">{project.highCount}</div>
              <div class="text-[10px] text-dark-charcoal/50 mt-1">15 pts/each</div>
            </div>

            <div class="bg-bg-warm/60 border border-dark-charcoal/5 rounded-2xl p-4 text-center">
              <div class="text-xs font-extrabold text-yellow-600">Medium</div>
              <div class="text-3xl font-extrabold text-dark-charcoal mt-1">{project.mediumCount}</div>
              <div class="text-[10px] text-dark-charcoal/50 mt-1">8 pts/each</div>
            </div>

            <div class="bg-bg-warm/60 border border-dark-charcoal/5 rounded-2xl p-4 text-center">
              <div class="text-xs font-extrabold text-blue-500">Low</div>
              <div class="text-3xl font-extrabold text-dark-charcoal mt-1">{project.lowCount}</div>
              <div class="text-[10px] text-dark-charcoal/50 mt-1">2 pts/each</div>
            </div>
          </div>
        </div>

        <div class="border-t border-dark-charcoal/10 pt-6">
          <h4 class="text-sm font-bold text-dark-charcoal uppercase tracking-wider mb-2">Exposure Impact Metrics</h4>
          <div class="space-y-3 text-xs font-medium text-dark-charcoal/70">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-accent-purple"></span>
              <span><strong>Credential Scope:</strong> Keys granting access to production databases or cloud platforms elevate score exponentially.</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-accent-purple"></span>
              <span><strong>AI Verification:</strong> Active leaks validated by AST environments carry 2x weight over unconfirmed matching.</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-accent-purple"></span>
              <span><strong>Containment Status:</strong> Revoking credentials or flagging them as sandbox test keys reduces calculated hazard levels.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Risk Items List -->
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
      <h3 class="text-lg font-bold font-display text-dark-charcoal mb-4">Prioritized Action Items</h3>
      <p class="text-xs text-dark-charcoal/60 mt-0.5 mb-6 font-semibold">Immediate attention items ordered by hazardous impact rating</p>

      <div class="space-y-3.5">
        {#if topRisks().length > 0}
          {#each topRisks() as risk, index}
            <div class="bg-bg-warm border border-dark-charcoal/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-start gap-4">
                <span class="w-7 h-7 rounded-lg bg-dark-charcoal text-bg-warm flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  #{index + 1}
                </span>
                
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-extrabold text-sm text-dark-charcoal">{risk.secretType}</span>
                    <span class="px-2 py-0.5 text-[9px] border rounded font-bold uppercase tracking-wider {getSeverityBadge(risk.severity)}">
                      {risk.severity}
                    </span>
                  </div>
                  <div class="font-mono text-[10px] text-dark-charcoal/60 mt-1 break-all">{risk.file} (Line {risk.line})</div>
                </div>
              </div>

              <div class="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onclick={() => {
                    localStorage.setItem('selected_finding_id', risk.id);
                    goto('/dashboard/ai-analysis');
                  }}
                  class="flex-1 sm:flex-initial text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-4 py-2 rounded-xl text-dark-charcoal hover:bg-accent-purple hover:text-bg-warm hover:border-accent-purple transition-colors cursor-pointer"
                >
                  Investigate
                </button>
                
                <button
                  onclick={() => goto('/dashboard/recommendations')}
                  class="flex-1 sm:flex-initial text-xs font-bold bg-accent-purple text-bg-warm border border-accent-purple px-4 py-2 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm hover:border-dark-charcoal transition-colors cursor-pointer"
                >
                  View Fix
                </button>
              </div>
            </div>
          {/each}
        {:else}
          <div class="text-center py-10 text-xs font-bold text-dark-charcoal/40">
            No active leaks in this codebase. No risk assessment actions required.
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-12 text-center shadow-sm">
      <h3 class="text-xl font-bold text-dark-charcoal">No Data Available</h3>
      <p class="text-sm text-dark-charcoal/60 mt-2">Run a scan of your codebase to view the risk assessment matrix.</p>
    </div>
  {/if}
</div>
