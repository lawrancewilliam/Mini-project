<script>
  import { appState } from '$lib/state.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  const project = $derived(appState.selectedScan);
  let selectedFindingId = $state(null);

  // Deriving active finding
  const selectedFinding = $derived(() => {
    if (!project || !project.findings || project.findings.length === 0) return null;
    return project.findings.find(f => f.id === selectedFindingId) || project.findings[0];
  });

  onMount(() => {
    // Check if a finding was clicked from the results table
    if (browser) {
      const savedId = localStorage.getItem('selected_finding_id');
      if (savedId) {
        selectedFindingId = savedId;
        localStorage.removeItem('selected_finding_id'); // consume it
      }
    }
  });

  // Watch project switch and auto-select its first finding
  $effect(() => {
    if (project && project.findings && project.findings.length > 0) {
      const ids = project.findings.map(f => f.id);
      if (!ids.includes(selectedFindingId)) {
        selectedFindingId = ids[0];
      }
    } else {
      selectedFindingId = null;
    }
  });

  function getSeverityColor(sev) {
    switch (sev) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-blue-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  }

  function getConfidenceColor(score) {
    if (score >= 90) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-blue-500';
  }

  let copySuccess = $state(false);
  function copyFixText(text) {
    navigator.clipboard.writeText(text);
    copySuccess = true;
    setTimeout(() => copySuccess = false, 2000);
  }
</script>

<div class="space-y-8">
  {#if project && project.findings && project.findings.length > 0}
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      <!-- Left Panel: Findings Master List -->
      <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-5 lg:col-span-1 shadow-sm h-[600px] flex flex-col">
        <h4 class="text-sm font-extrabold text-dark-charcoal uppercase tracking-wider mb-4">Leaks Found ({project.findings.length})</h4>
        
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          {#each project.findings as item}
            <button
              onclick={() => selectedFindingId = item.id}
              class="w-full text-left p-3.5 rounded-2xl border transition-all text-xs font-semibold flex flex-col gap-1.5 cursor-pointer {selectedFindingId === item.id ? 'bg-bg-warm border-accent-orange shadow-sm' : 'bg-bg-warm/50 border-dark-charcoal/5 hover:border-dark-charcoal/15'}"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold truncate text-dark-charcoal max-w-[120px]">{item.secretType}</span>
                <span class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide {getSeverityColor(item.severity)}">
                  {item.severity}
                </span>
              </div>
              <div class="font-mono text-[10px] text-dark-charcoal/60 truncate">{item.file}</div>
              <div class="text-[9px] text-dark-charcoal/50">Line: {item.line}</div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Right Panel: AI Deep Analysis Detail -->
      <div class="lg:col-span-3 space-y-6">
        {#if selectedFinding()}
          <!-- Top summary -->
          <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-charcoal/10 pb-5">
              <div>
                <span class="text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider font-mono">Location: {selectedFinding().file} (Line {selectedFinding().line})</span>
                <h3 class="text-2xl font-bold font-display text-dark-charcoal mt-1">{selectedFinding().secretType}</h3>
              </div>
              
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-dark-charcoal/60">AI Verdict:</span>
                <span class="bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider">
                  {selectedFinding().decision}
                </span>
              </div>
            </div>

            <!-- Code Context Codeblock -->
            <div class="mt-6 space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-dark-charcoal/60">
                <span>Code Context</span>
                <span class="text-accent-orange font-mono">⚠️ Confirmed hardcoded secret</span>
              </div>
              
              <div class="relative bg-dark-charcoal rounded-2xl p-5 overflow-hidden shadow-inner text-bg-warm font-mono text-xs leading-relaxed">
                <!-- Line Number gutter -->
                <div class="flex gap-4">
                  <div class="text-bg-warm/30 text-right select-none w-6 border-r border-bg-warm/15 pr-2.5">
                    {selectedFinding().line}
                  </div>
                  <pre class="flex-1 overflow-x-auto whitespace-pre-wrap select-all font-mono text-bg-warm/85">{selectedFinding().codeContext}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Assessment Card & Score -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Confidence score -->
            <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-bold text-dark-charcoal uppercase tracking-wider">AI Confidence</h4>
                <p class="text-xs text-dark-charcoal/60 mt-0.5">Calculated model matching probability</p>
                
                <div class="mt-6 text-center">
                  <div class="text-5xl font-extrabold font-display text-dark-charcoal">{selectedFinding().confidence}%</div>
                  <div class="w-full bg-bg-warm rounded-full h-2 mt-4 overflow-hidden border border-dark-charcoal/10">
                    <div class="h-2 rounded-full {getConfidenceColor(selectedFinding().confidence)}" style="width: {selectedFinding().confidence}%"></div>
                  </div>
                </div>
              </div>
              
              <div class="text-[10px] text-dark-charcoal/50 font-bold uppercase tracking-wider mt-4">
                Analysis Model: SEC_AGENT_V3
              </div>
            </div>

            <!-- Reasoning explanation -->
            <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm md:col-span-2 flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-bold text-dark-charcoal uppercase tracking-wider">AI Analysis Reason</h4>
                <p class="text-xs text-dark-charcoal/60 mt-0.5">Logic behind this risk assessment decision</p>
                
                <p class="text-sm text-dark-charcoal/80 font-semibold mt-4 leading-relaxed">
                  {selectedFinding().reason}
                </p>
              </div>
              
              <div class="text-[10px] text-accent-orange font-bold uppercase tracking-wider mt-4">
                Verified: Heuristic signature matching & AST analysis check
              </div>
            </div>
          </div>

          <!-- Remediation card -->
          <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-dark-charcoal/10 pb-4">
              <div>
                <h4 class="text-base font-bold font-display text-dark-charcoal">Recommended Remediation</h4>
                <p class="text-xs text-dark-charcoal/60 mt-0.5">Steps to neutralize and rotate coordinates</p>
              </div>
              
              <button
                onclick={() => copyFixText(selectedFinding().fix)}
                class="bg-bg-warm border border-dark-charcoal/15 text-dark-charcoal font-bold text-xs px-3.5 py-2 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {#if copySuccess}
                  <svg class="w-4 h-4 text-green-600 animate-in zoom-in" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                  Copied!
                {:else}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                  Copy Fix Instruction
                {/if}
              </button>
            </div>

            <div class="text-sm font-semibold text-dark-charcoal/80 space-y-3 leading-relaxed">
              <p>{selectedFinding().fix}</p>
              <div class="bg-bg-warm border-l-4 border-l-accent-orange p-3.5 rounded-r-xl">
                <span class="text-xs font-bold text-accent-orange block uppercase tracking-wider">SecurAI Best Practice:</span>
                <p class="text-xs text-dark-charcoal/70 mt-1 font-semibold">{selectedFinding().bestPractice}</p>
              </div>
            </div>
          </div>
        {/if}
      </div>

    </div>
  {:else}
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-12 text-center shadow-sm">
      <div class="w-16 h-16 rounded-3xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold font-display text-dark-charcoal">Clean Codebase</h3>
      <p class="text-sm text-dark-charcoal/60 mt-2 max-w-sm mx-auto">No sensitive data leaks or hardcoded secrets detected in this project codebase repository.</p>
    </div>
  {/if}
</div>
