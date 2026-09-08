<script>
  import { appState } from '$lib/state.svelte';
  import { browser } from '$app/environment';
  import { generateReportPdf, reportFileName, reportIdFor } from '$lib/report-generator.js';

  let selectedProject = $state(null);
  let showPreviewModal = $state(false);
  let isGenerating = $state(false);
  let toast = $state(null);

  function getRiskColor(score) {
    if (score >= 75) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score > 0) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  }

  function handlePreview(project) {
    selectedProject = project;
    showPreviewModal = true;
  }

  function showToast(message, type) {
    toast = { message, type };
    setTimeout(() => toast = null, 3000);
  }

  async function triggerDownload(project) {
    if (!browser || isGenerating) return;
    isGenerating = true;
    showToast('Generating PDF report...', 'info');

    try {
      const doc = generateReportPdf(project);
      doc.save(reportFileName(project));
      showToast('PDF report downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF generation failed:', err);
      showToast('Failed to generate PDF. Check console for details.', 'error');
    } finally {
      isGenerating = false;
    }
  }
</script>

<!-- Toast Notification -->
{#if toast}
  <div class="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-4 fade-in duration-300">
    <div class="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold {toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-300' : toast.type === 'error' ? 'bg-red-900/90 border-red-700/50 text-red-300' : 'bg-card-warm border-dark-charcoal/15 text-dark-charcoal'} backdrop-blur-md">
      {#if toast.type === 'success'}
        <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {:else if toast.type === 'error'}
        <svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {:else}
        <svg class="w-5 h-5 text-accent-purple shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      {/if}
      <span>{toast.message}</span>
    </div>
  </div>
{/if}

<div class="space-y-8">
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
    <h3 class="text-xl font-bold font-display text-dark-charcoal">Security Audit Reports</h3>
    <p class="text-xs text-dark-charcoal/60 mt-1 font-semibold">Generate and download compliance records for auditing and git hygiene reviews</p>
  </div>

  <!-- Reports table -->
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 shadow-sm">
    {#if appState.scans.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-dark-charcoal/10 text-xs font-bold text-dark-charcoal/50 uppercase tracking-wider">
              <th class="py-3 px-4">Project Name</th>
              <th class="py-3 px-4">Date Compiled</th>
              <th class="py-3 px-4 text-center">Leaks</th>
              <th class="py-3 px-4">Risk score</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each appState.scans as item}
              <tr class="border-b border-dark-charcoal/5 text-sm font-semibold text-dark-charcoal hover:bg-bg-warm/40 transition-colors">
                <td class="py-3.5 px-4 font-bold">{item.projectName}</td>
                <td class="py-3.5 px-4 text-xs font-medium text-dark-charcoal/70">{item.date}</td>
                <td class="py-3.5 px-4 text-center">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-full {item.secretsFound > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} text-xs font-bold">
                    {item.secretsFound}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <span class="px-2.5 py-0.5 border text-xs font-bold rounded-lg uppercase tracking-wider inline-block {getRiskColor(item.riskScore)}">
                    {item.riskScore} / 100
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      onclick={() => handlePreview(item)}
                      class="text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-3 py-1.5 rounded-lg text-dark-charcoal hover:bg-accent-purple hover:text-bg-warm transition-all cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      onclick={() => triggerDownload(item)}
                      disabled={isGenerating}
                      class="text-xs font-bold bg-accent-purple text-bg-warm px-3 py-1.5 rounded-lg hover:bg-dark-charcoal transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? 'Generating...' : 'Download Report'}
                    </button>
                    <button
                      onclick={() => {
                        if (confirm('Delete this report?')) {
                          appState.deleteScan(item.id);
                        }
                      }}
                      class="text-xs text-red-600 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
    {:else}
      <div class="text-center py-10 text-xs font-bold text-dark-charcoal/40">
        No report records compiled yet. Run a codebase scan first.
      </div>
    {/if}
  </div>
</div>

<!-- Report Preview Modal -->
{#if showPreviewModal && selectedProject}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-dark-charcoal/40 backdrop-blur-sm">
    <div class="bg-card-warm border border-dark-charcoal/10 p-6 sm:p-8 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]">
      <div class="flex items-center justify-between border-b border-dark-charcoal/10 pb-4 mb-6">
        <div>
          <h3 class="text-xl font-bold font-display text-dark-charcoal">Report Document Preview</h3>
          <p class="text-xs text-dark-charcoal/60 mt-0.5 font-semibold">Active project: {selectedProject.projectName}</p>
        </div>
        <button
          type="button"
          aria-label="Close report preview"
          onclick={() => showPreviewModal = false}
          class="text-dark-charcoal/60 hover:text-dark-charcoal p-1 cursor-pointer"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- PDF Preview -->
      <div class="flex-1 overflow-y-auto bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-6 shadow-inner">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-8 h-8 bg-accent-purple rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <div class="text-lg font-bold font-display text-white">SecureGaurd</div>
            <div class="text-[10px] text-gray-500">Security Assessment Report</div>
          </div>
          <div class="ml-auto text-right text-[10px] text-gray-500">
            <div>{selectedProject.date}</div>
            <div class="text-gray-600">ID: {reportIdFor(selectedProject)}</div>
          </div>
        </div>

        <div class="h-px bg-gradient-to-r from-accent-purple to-transparent mb-6"></div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-2 mb-6">
          <div class="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Files</div>
            <div class="text-xl font-extrabold font-display text-white mt-1">{selectedProject.filesScanned}</div>
          </div>
          <div class="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Leaks</div>
            <div class="text-xl font-extrabold font-display text-red-500 mt-1">{selectedProject.secretsFound}</div>
          </div>
          <div class="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Critical</div>
            <div class="text-xl font-extrabold font-display text-red-500 mt-1">{selectedProject.criticalCount}</div>
          </div>
          <div class="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 text-center">
            <div class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Score</div>
            <div class="text-xl font-extrabold font-display text-white mt-1">{selectedProject.riskScore}</div>
          </div>
        </div>

        <!-- Findings Table Preview -->
        <div class="text-xs font-bold text-white mb-3">Detection Findings</div>
        <div class="overflow-x-auto">
          <table class="w-full text-[10px]">
            <thead>
              <tr class="border-b border-accent-purple text-[8px] text-gray-500 font-bold uppercase tracking-wider">
                <th class="py-2 pr-2 text-left">File</th>
                <th class="py-2 px-2 text-center">Sev</th>
                <th class="py-2 px-2 text-left">Type</th>
                <th class="py-2 pl-2 text-center">Conf</th>
              </tr>
            </thead>
            <tbody>
              {#each selectedProject.findings.slice(0, 5) as f}
                <tr class="border-b border-[#2a2a2a]">
                  <td class="py-2 pr-2 font-mono text-gray-400 truncate max-w-[120px]">{f.file}</td>
                  <td class="py-2 px-2 text-center">
                    <span class="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase {f.severity === 'Critical' ? 'bg-red-100 text-red-600' : f.severity === 'High' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}">{f.severity === 'Critical' ? 'CRIT' : f.severity === 'High' ? 'HIGH' : f.severity === 'Medium' ? 'MED' : 'LOW'}</span>
                  </td>
                  <td class="py-2 px-2 text-white font-semibold">{f.secretType}</td>
                  <td class="py-2 pl-2 text-center text-white font-bold">{f.confidence}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        {#if selectedProject.findings.length > 5}
          <div class="text-center text-[9px] text-gray-500 mt-3">+{selectedProject.findings.length - 5} more findings in full report</div>
        {/if}

        <div class="h-px bg-gradient-to-r from-accent-purple to-transparent mt-6 mb-4"></div>
        <div class="text-center text-[8px] text-gray-600">
          Generated by SecureGaurd - AI-Assisted Sensitive Data Leakage Detection
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-dark-charcoal/10 flex items-center justify-end gap-3 shrink-0">
        <button
          onclick={() => showPreviewModal = false}
          class="bg-transparent border border-dark-charcoal/15 text-dark-charcoal font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-dark-charcoal/5 transition-all cursor-pointer"
        >
          Close Preview
        </button>
        
        <button
          onclick={() => { triggerDownload(selectedProject); showPreviewModal = false; }}
          disabled={isGenerating}
          class="bg-accent-purple text-bg-warm font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-dark-charcoal transition-all shadow-md purple-glow cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Download Document'}
        </button>
      </div>
    </div>
  </div>
{/if}
