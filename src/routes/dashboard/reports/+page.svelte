<script>
  import { appState } from '$lib/state.svelte';
  import { browser } from '$app/environment';

  let selectedProject = $state(null);
  let showPreviewModal = $state(false);

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

  function triggerDownload(project) {
    if (!browser) return;

    // Generate plain text audit report mimicking a PDF contents
    const content = `=========================================================
SECURAI SECURITY COMPLIANCE AUDIT REPORT
=========================================================
Project Name:         ${project.projectName.toUpperCase()}
Scan Date:            ${project.date}
Scanned Files:        ${project.filesScanned}
Risk Assessment Index: ${project.riskScore} / 100
Confirmed Leaks:      ${project.secretsFound} (Critical: ${project.criticalCount}, High: ${project.highCount}, Medium: ${project.mediumCount}, Low: ${project.lowCount})
Status:               ${project.secretsFound > 0 ? 'FAIL - IMMEDIATE REMEDIATION NEEDED' : 'PASS - COMPLIANT'}

---------------------------------------------------------
DETAILED DETECTIONS LOG
---------------------------------------------------------
${project.findings.length > 0 ? project.findings.map((f, i) => `
[Finding #${i + 1}]
File Path:     ${f.file}
Line Number:   ${f.line}
Secret Type:   ${f.secretType}
Severity:      ${f.severity}
Status:        ${f.status}
Code context:  ${f.codeContext}
AI Verdict:    ${f.decision} (Confidence: ${f.confidence}%)
AI Logic:      ${f.reason}
Suggested Fix: ${f.fix}
`).join('\n---------------------------------------------------------') : 'No hardcoded credentials or API keys found in this codebase scan.'}

---------------------------------------------------------
END OF COMPLIANCE AUDIT REPORT
Generated dynamically by SecurAI Credential Scanner.
=========================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `securai_report_${project.projectName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

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
                      class="text-xs font-bold bg-bg-warm border border-dark-charcoal/20 px-3 py-1.5 rounded-lg text-dark-charcoal hover:bg-accent-orange hover:text-bg-warm transition-all cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      onclick={() => triggerDownload(item)}
                      class="text-xs font-bold bg-accent-orange text-bg-warm px-3 py-1.5 rounded-lg hover:bg-dark-charcoal transition-all cursor-pointer"
                    >
                      Download Report
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
          onclick={() => showPreviewModal = false}
          class="text-dark-charcoal/60 hover:text-dark-charcoal p-1 cursor-pointer"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Simulated Paper Document -->
      <div class="flex-1 overflow-y-auto bg-white border border-zinc-200 rounded-2xl p-6 font-mono text-[11px] text-zinc-900 leading-relaxed whitespace-pre shadow-inner">
=========================================================
SECURAI SECURITY COMPLIANCE AUDIT REPORT
=========================================================
Project Name:         {selectedProject.projectName.toUpperCase()}
Scan Date:            {selectedProject.date}
Scanned Files:        {selectedProject.filesScanned}
Risk Assessment Index: {selectedProject.riskScore} / 100
Confirmed Leaks:      {selectedProject.secretsFound} (Critical: {selectedProject.criticalCount}, High: {selectedProject.highCount}, Medium: {selectedProject.mediumCount})
Status:               {selectedProject.secretsFound > 0 ? 'FAIL - IMMEDIATE REMEDIATION NEEDED' : 'PASS - COMPLIANT'}

---------------------------------------------------------
DETAILED DETECTIONS LOG
---------------------------------------------------------
{#if selectedProject.findings.length > 0}
{#each selectedProject.findings as f, i}
[Finding #{i + 1}]
File Path:     {f.file}
Line Number:   {f.line}
Secret Type:   {f.secretType}
Severity:      {f.severity}
Status:        {f.status}
Code context:  {f.codeContext}
AI Verdict:    {f.decision} (Confidence: {f.confidence}%)
AI Logic:      {f.reason}
Suggested Fix: {f.fix}
---------------------------------------------------------
{/each}
{:else}
No hardcoded credentials or API keys found in this codebase scan.
{/if}
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
          class="bg-accent-orange text-bg-warm font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-dark-charcoal transition-all shadow-md orange-glow cursor-pointer"
        >
          Download Document
        </button>
      </div>
    </div>
  </div>
{/if}
