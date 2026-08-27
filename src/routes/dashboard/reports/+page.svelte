<script>
  import { appState } from '$lib/state.svelte';
  import { browser } from '$app/environment';
  import { maskPII } from '$lib/state.svelte.js';
  import jsPDF from 'jspdf';
  import html2canvas from 'html2canvas';

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

  function getRiskLevel(score) {
    if (score >= 75) return { label: 'CRITICAL', color: '#EF4444' };
    if (score >= 40) return { label: 'HIGH', color: '#F97316' };
    if (score > 0) return { label: 'MEDIUM', color: '#EAB308' };
    return { label: 'LOW', color: '#22C55E' };
  }

  function buildReportHTML(project) {
    const risk = getRiskLevel(project.riskScore);
    const findingsRows = project.findings.map((f, i) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #2a2a2a; font-size: 11px; color: #cccccc; font-family: monospace;">${f.file}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #2a2a2a; font-size: 11px; color: #888888; text-align: center; font-family: monospace;">${f.line}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #2a2a2a; font-size: 11px; color: #ffffff; font-weight: 600;">${f.secretType}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #2a2a2a; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: ${f.severity === 'Critical' ? '#FEE2E2' : f.severity === 'High' ? '#FFF7ED' : f.severity === 'Medium' ? '#FEFCE8' : '#EFF6FF'}; color: ${f.severity === 'Critical' ? '#DC2626' : f.severity === 'High' ? '#EA580C' : f.severity === 'Medium' ? '#CA8A04' : '#2563EB'};">${f.severity}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #2a2a2a; font-size: 10px; color: ${f.decision === 'Leak Confirmed' ? '#F87171' : f.decision === 'Suspicious' ? '#FB923C' : '#6B7280'}; font-weight: 600; text-align: center;">${f.decision}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #2a2a2a; font-size: 11px; color: #ffffff; text-align: center; font-weight: 700;">${f.confidence}%</td>
      </tr>
    `).join('');

const detailsSection = project.findings.map((f, i) => {
      const maskedCode = maskPII(f.codeContext, f.secretType);
      return `
      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #2a2a2a;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span style="width: 32px; height: 32px; background: #7C3AED; color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">${i + 1}</span>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #ffffff;">${f.secretType}</div>
            <div style="font-size: 10px; color: #888888; font-family: monospace;">${f.file} : ${f.line}</div>
          </div>
          <span style="margin-left: auto; padding: 3px 10px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${f.severity === 'Critical' ? '#FEE2E2' : f.severity === 'High' ? '#FFF7ED' : f.severity === 'Medium' ? '#FEFCE8' : '#EFF6FF'}; color: ${f.severity === 'Critical' ? '#DC2626' : f.severity === 'High' ? '#EA580C' : f.severity === 'Medium' ? '#CA8A04' : '#2563EB'};">${f.severity}</span>
        </div>
        <div style="background: #0a0a0a; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 10px; color: #aaaaaa; margin-bottom: 12px; border: 1px solid #2a2a2a; white-space: pre-wrap;">
          <span style="color: #7C3AED;">>> </span>${maskedCode}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <div style="font-size: 9px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">AI Verdict</div>
            <div style="font-size: 11px; color: #cccccc;">${f.decision} (${f.confidence}% confidence)</div>
            <div style="font-size: 10px; color: #888888; margin-top: 4px;">${f.reason}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Remediation</div>
            <div style="font-size: 10px; color: #cccccc;">${f.fix}</div>
          </div>
        </div>
      </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; 
      background: #0a0a0a; 
      color: #ffffff; 
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1, h2, h3, h4 { font-family: 'Outfit', sans-serif; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .logo { width: 40px; height: 40px; background: #7C3AED; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .divider { height: 1px; background: linear-gradient(to right, #7C3AED, transparent); margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px 12px; font-size: 9px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #7C3AED; text-align: left; }
    .pdf-page { border: 2px solid #7C3AED; border-radius: 16px; padding: 40px; background: #0a0a0a; margin-bottom: 32px; min-height: 1273px; }
  </style>
</head>
<body>
  <div class="pdf-page">
    <div class="header">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
      </div>
      <div>
        <div style="font-size: 22px; font-weight: 800; font-family: 'Outfit', sans-serif;">SecureGuard</div>
        <div style="font-size: 10px; color: #888888;">Security Compliance Audit Report</div>
      </div>
      <div style="margin-left: auto; text-align: right;">
        <div style="font-size: 11px; color: #888888;">${project.date}</div>
        <div style="font-size: 10px; color: #555555;">Report ID: SEC-${project.id}</div>
      </div>
    </div>

    <div class="divider"></div>

      <div style="display: flex; gap: 24px; margin-bottom: 20px;">
        <div style="flex: 1; background: #161616; border-radius: 16px; padding: 20px; border: 1px solid #2a2a2a;">
          <div style="font-size: 10px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Project</div>
          <div style="font-size: 18px; font-weight: 700; font-family: 'Outfit', sans-serif;">${project.projectName.toUpperCase()}</div>
          <div style="font-size: 11px; color: #888888; margin-top: 4px;">${project.projectDescription}</div>
        </div>
        <div style="flex: 1; background: #161616; border-radius: 16px; padding: 20px; border: 1px solid #2a2a2a; text-align: center;">
          <div style="font-size: 10px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Risk Score</div>
          <div style="font-size: 42px; font-weight: 800; font-family: 'Outfit', sans-serif; color: ${risk.color};">${project.riskScore}</div>
          <div style="font-size: 11px; color: ${risk.color}; font-weight: 700;">${risk.label}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
      <div style="background: #161616; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #2a2a2a;">
        <div style="font-size: 10px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Files</div>
        <div style="font-size: 24px; font-weight: 800; font-family: 'Outfit', sans-serif; margin-top: 4px;">${project.filesScanned}</div>
      </div>
      <div style="background: #161616; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #2a2a2a;">
        <div style="font-size: 10px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Leaks</div>
        <div style="font-size: 24px; font-weight: 800; font-family: 'Outfit', sans-serif; margin-top: 4px; color: #EF4444;">${project.secretsFound}</div>
      </div>
      <div style="background: #161616; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #2a2a2a;">
        <div style="font-size: 10px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Critical</div>
        <div style="font-size: 24px; font-weight: 800; font-family: 'Outfit', sans-serif; margin-top: 4px; color: #EF4444;">${project.criticalCount}</div>
      </div>
      <div style="background: #161616; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #2a2a2a;">
        <div style="font-size: 10px; color: #888888; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Status</div>
        <div style="font-size: 14px; font-weight: 800; font-family: 'Outfit', sans-serif; margin-top: 4px; color: ${project.secretsFound > 0 ? '#EF4444' : '#22C55E'};">${project.secretsFound > 0 ? 'FAIL' : 'PASS'}</div>
      </div>
    </div>
  </div>

  <div class="pdf-page">
    <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Detection Findings Summary</h2>
    <table style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>File</th>
          <th style="text-align: center;">Line</th>
          <th>Secret Type</th>
          <th style="text-align: center;">Severity</th>
          <th style="text-align: center;">Status</th>
          <th style="text-align: center;">Conf.</th>
        </tr>
      </thead>
      <tbody>
        ${findingsRows || '<tr><td colspan="6" style="padding: 24px; text-align: center; font-size: 12px; color: #888888;">No sensitive data leaks detected in this codebase.</td></tr>'}
      </tbody>
    </table>
  </div>

  ${project.findings.length > 0 ? `
  <div class="pdf-page">
    <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Detailed Analysis</h2>
      ${detailsSection}
    </div>
    ` : ''}

    <div class="pdf-page">
      <div class="divider" style="margin-top: 20px;"></div>
      <div style="text-align: center; padding: 20px; font-size: 10px; color: #555555;">
      <div style="font-weight: 700; color: #888888; margin-bottom: 4px;">SecureGuard Credential Scanner</div>
      <div>Generated dynamically by SecureGuard Security Analysis Engine</div>
      <div style="margin-top: 8px;">AI-Assisted Sensitive Data Leakage Detection and Risk Assessment</div>
    </div>
  </div>
</body>
</html>`;
  }

  async function triggerDownload(project) {
    if (!browser || isGenerating) return;
    isGenerating = true;
    showToast('Generating PDF report...', 'info');

    try {
      const html = buildReportHTML(project);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '900px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      await new Promise(r => setTimeout(r, 2000));

      const pages = iframeDoc.querySelectorAll('.pdf-page');
      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#0a0a0a'
        });
        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL('image/png');
        const imgW = 210;
        const imgH = (canvas.height * imgW) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH, undefined, 'FAST');
      }

      document.body.removeChild(iframe);
      pdf.save(`secureguard_report_${project.projectName}.pdf`);
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
            <div class="text-lg font-bold font-display text-white">SecureGuard</div>
            <div class="text-[10px] text-gray-500">Security Compliance Audit Report</div>
          </div>
          <div class="ml-auto text-right text-[10px] text-gray-500">
            <div>{selectedProject.date}</div>
            <div class="text-gray-600">ID: SEC-{selectedProject.id}</div>
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
          Generated by SecureGuard Credential Scanner &mdash; AI-Assisted Data Leakage Detection
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
