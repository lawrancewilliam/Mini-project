<script>
  import { appState } from '$lib/state.svelte';
  import { browser } from '$app/environment';

  const project = $derived(appState.selectedScan);
  let copiedId = $state(null);

  function getSeverityColor(sev) {
    switch (sev) {
      case 'Critical': return 'bg-red-100 text-red-600 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default: return 'bg-blue-100 text-blue-600 border-blue-200';
    }
  }

  function handleCopy(text, id) {
    if (browser) {
      navigator.clipboard.writeText(text);
      copiedId = id;
      setTimeout(() => copiedId = null, 2000);
    }
  }
</script>

<div class="space-y-8">
  {#if project && project.findings && project.findings.length > 0}
    <!-- Summary Header -->
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
      <h3 class="text-xl font-bold font-display text-dark-charcoal">Vulnerability Remediation Guidelines</h3>
      <p class="text-xs text-dark-charcoal/60 mt-1 font-semibold">Step-by-step procedures to rotate leaks and patch source repositories</p>
      
      <div class="mt-4 bg-yellow-50 border-l-4 border-l-yellow-500 p-4 rounded-r-2xl text-xs font-semibold text-yellow-800 leading-relaxed max-w-3xl">
        <strong>Security Warning:</strong> Once committed to a Git repository, secrets should be considered <strong>exposed</strong>. Deleting the line or file in a subsequent commit does not purge it from Git history. Follow the guidelines below to rotate the credentials first, and then clean your repo history.
      </div>
    </div>

    <!-- Recommendations List -->
    <div class="space-y-6">
      {#each project.findings as finding}
        <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm space-y-6">
          
          <!-- Recommendation Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-charcoal/10 pb-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-accent-orange/10 text-accent-orange flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="font-extrabold text-base text-dark-charcoal">{finding.secretType} Leak</h4>
                  <span class="px-2 py-0.5 text-[9px] border rounded font-bold uppercase tracking-wider {getSeverityColor(finding.severity)}">
                    {finding.severity}
                  </span>
                </div>
                <div class="font-mono text-[10px] text-dark-charcoal/60 mt-1">{finding.file} (Line {finding.line})</div>
              </div>
            </div>
            
            <button
              onclick={() => handleCopy(finding.fix, finding.id)}
              class="bg-bg-warm border border-dark-charcoal/15 text-dark-charcoal font-bold text-xs px-4 py-2 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {#if copiedId === finding.id}
                <svg class="w-4 h-4 text-green-600 animate-in zoom-in" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                Copied Fix!
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                Copy Remediation
              {/if}
            </button>
          </div>

          <!-- Suggested Fix Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left: Step-by-step repair instruction -->
            <div class="space-y-4">
              <h5 class="text-xs font-bold text-dark-charcoal uppercase tracking-wider">Suggested Fix</h5>
              <div class="bg-bg-warm/60 border border-dark-charcoal/5 p-4 rounded-2xl text-sm font-semibold text-dark-charcoal/80 leading-relaxed">
                {finding.fix}
              </div>
            </div>

            <!-- Right: Code Remediation Best Practice -->
            <div class="space-y-4">
              <h5 class="text-xs font-bold text-dark-charcoal uppercase tracking-wider">Defensive Best Practice</h5>
              <div class="bg-bg-warm/60 border border-dark-charcoal/5 p-4 rounded-2xl text-sm font-semibold text-dark-charcoal/80 leading-relaxed">
                {finding.bestPractice}
              </div>
            </div>
          </div>

          <!-- Quick Code Snippet Example (Simulated environment variable replacement) -->
          <div class="bg-bg-warm rounded-2xl p-4 border border-dark-charcoal/10">
            <div class="text-[10px] font-bold text-dark-charcoal/50 uppercase tracking-wider mb-2 font-mono">Remediated Code Example (Environment Variables)</div>
            <pre class="bg-dark-charcoal text-bg-warm/85 font-mono text-xs p-4 rounded-xl overflow-x-auto select-all">
{#if finding.secretType.includes('AWS')}
// Load credentials securely from environment variables instead of hardcoding
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
{:else}
// Avoid hardcoding secrets. Always fetch credentials at runtime from system environment config.
const SECRET_KEY = process.env.SECURITY_SECRET_TOKEN || configure.getSecret('SECRET_KEY');
{/if}
            </pre>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-12 text-center shadow-sm">
      <div class="w-16 h-16 rounded-3xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold font-display text-dark-charcoal">Clean Codebase</h3>
      <p class="text-sm text-dark-charcoal/60 mt-2">No recommendations needed. This project code has no hardcoded credentials leaks.</p>
    </div>
  {/if}
</div>
