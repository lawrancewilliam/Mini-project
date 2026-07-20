<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  let projectName = $state('');
  let projectDescription = $state('');
  let regexScan = $state(true);
  let aiAnalysis = $state(true);
  let generatePdf = $state(true);

  let zipFile = $state(null);
  let isDragging = $state(false);
  let errorMsg = $state('');

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        zipFile = file;
        errorMsg = '';
        if (!projectName) {
          projectName = file.name.replace('.zip', '');
        }
      } else {
        errorMsg = 'Please upload a valid .zip archive containing codebase files.';
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        zipFile = file;
        errorMsg = '';
        if (!projectName) {
          projectName = file.name.replace('.zip', '');
        }
      } else {
        errorMsg = 'Please upload a valid .zip archive containing codebase files.';
      }
    }
  }

  function removeFile() {
    zipFile = null;
  }

  function handleStartScan(e) {
    if (e) e.preventDefault();
    errorMsg = '';

    if (!projectName) {
      errorMsg = 'Please specify a project name.';
      return;
    }
    if (!zipFile) {
      errorMsg = 'Please upload or drop a ZIP archive first.';
      return;
    }

    // Launch simulation
    appState.triggerSimulatedScan(projectName, projectDescription, {
      regex: regexScan,
      aiAnalysis: aiAnalysis,
      pdfReport: generatePdf
    });
    
    goto('/dashboard/scanning');
  }

  // Pre-fill a sandbox mock project for quick test clicks
  function quickFill() {
    projectName = 'payment-microservice-node';
    projectDescription = 'Staging payment service, written in Node JS/Express with Stripe webhooks and JWT middlewares.';
    zipFile = { name: 'payment-microservice-node.zip', size: 1048576 };
    errorMsg = '';
  }
</script>

<div class="max-w-4xl mx-auto space-y-8">
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm">
    <div class="flex items-center justify-between border-b border-dark-charcoal/10 pb-6 mb-6">
      <div>
        <h3 class="text-2xl font-bold font-display text-dark-charcoal">New Codebase Scan</h3>
        <p class="text-sm text-dark-charcoal/60 mt-1 font-medium">Configure scanning parameters and upload files</p>
      </div>
      
      <button
        type="button"
        onclick={quickFill}
        class="bg-bg-warm border border-accent-orange/30 text-accent-orange font-bold text-xs px-4 py-2 rounded-xl hover:bg-accent-orange hover:text-bg-warm transition-all cursor-pointer"
      >
        Autofill Sandbox Project
      </button>
    </div>

    <form onsubmit={handleStartScan} class="space-y-6">
      <!-- File upload -->
      <div>
        <label class="block text-sm font-bold text-dark-charcoal/70 mb-2">Codebase ZIP Archive</label>
        
        {#if !zipFile}
          <!-- Drag Box -->
          <div
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
            class="relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer {isDragging ? 'border-accent-orange bg-accent-orange/5' : 'border-dark-charcoal/20 bg-bg-warm/50 hover:bg-bg-warm'}"
          >
            <input
              type="file"
              accept=".zip"
              id="file-input"
              onchange={handleFileSelect}
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div class="flex flex-col items-center justify-center">
              <div class="w-16 h-16 rounded-2xl bg-accent-orange/10 text-accent-orange flex items-center justify-center mb-4">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <p class="text-base font-bold text-dark-charcoal">Drag and drop your project ZIP here</p>
              <p class="text-xs text-dark-charcoal/50 mt-1 font-semibold">Only .zip files supported (Max 150MB)</p>
              <span class="inline-block mt-4 bg-accent-orange text-bg-warm text-xs font-bold px-4 py-2 rounded-xl shadow-sm">
                Browse Files
              </span>
            </div>
          </div>
        {:else}
          <!-- File Selected Display -->
          <div class="bg-bg-warm border border-dark-charcoal/10 rounded-2xl p-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-accent-orange text-bg-warm flex items-center justify-center font-bold font-display text-lg shadow-sm">
                ZIP
              </div>
              <div>
                <div class="font-bold text-dark-charcoal text-base">{zipFile.name}</div>
                <div class="text-xs text-dark-charcoal/50 font-semibold mt-0.5">
                  Ready to scan • {zipFile.size ? (zipFile.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Sandbox Simulated'}
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onclick={removeFile}
              class="text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        {/if}
      </div>

      <!-- Project details inputs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="p-name" class="block text-sm font-bold text-dark-charcoal/70 mb-2">Project Name</label>
          <input
            type="text"
            id="p-name"
            bind:value={projectName}
            required
            placeholder="e.g. quantum-payment-gateway"
            class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-orange orange-glow-border transition-all"
          />
        </div>
        
        <div>
          <label for="p-desc" class="block text-sm font-bold text-dark-charcoal/70 mb-2">Project Description</label>
          <input
            type="text"
            id="p-desc"
            bind:value={projectDescription}
            placeholder="e.g. Core payment API and processing endpoints"
            class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-orange orange-glow-border transition-all"
          />
        </div>
      </div>

      <!-- Scan Configuration -->
      <div class="border-t border-dark-charcoal/10 pt-6">
        <label class="block text-sm font-bold text-dark-charcoal/70 mb-4">Scanning Pipelines</label>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Regex Scanner -->
          <label class="bg-bg-warm/50 border rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all hover:bg-bg-warm {regexScan ? 'border-accent-orange' : 'border-dark-charcoal/10'}">
            <input
              type="checkbox"
              bind:checked={regexScan}
              class="w-4.5 h-4.5 text-accent-orange border-dark-charcoal/20 rounded focus:ring-accent-orange accent-accent-orange mt-0.5"
            />
            <div>
              <div class="text-sm font-bold text-dark-charcoal">Regex Signature Scans</div>
              <div class="text-[11px] text-dark-charcoal/60 mt-1 font-semibold">Checks 150+ predefined cloud, API and integration patterns.</div>
            </div>
          </label>

          <!-- AI Verification -->
          <label class="bg-bg-warm/50 border rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all hover:bg-bg-warm {aiAnalysis ? 'border-accent-orange' : 'border-dark-charcoal/10'}">
            <input
              type="checkbox"
              bind:checked={aiAnalysis}
              class="w-4.5 h-4.5 text-accent-orange border-dark-charcoal/20 rounded focus:ring-accent-orange accent-accent-orange mt-0.5"
            />
            <div>
              <div class="text-sm font-bold text-dark-charcoal">Deep AI Analysis</div>
              <div class="text-[11px] text-dark-charcoal/60 mt-1 font-semibold">Uses neural heuristic verification to eliminate false positives.</div>
            </div>
          </label>

          <!-- PDF Report Generation -->
          <label class="bg-bg-warm/50 border rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all hover:bg-bg-warm {generatePdf ? 'border-accent-orange' : 'border-dark-charcoal/10'}">
            <input
              type="checkbox"
              bind:checked={generatePdf}
              class="w-4.5 h-4.5 text-accent-orange border-dark-charcoal/20 rounded focus:ring-accent-orange accent-accent-orange mt-0.5"
            />
            <div>
              <div class="text-sm font-bold text-dark-charcoal">PDF Report compilation</div>
              <div class="text-[11px] text-dark-charcoal/60 mt-1 font-semibold">Compiles compliance findings file for auditing exports.</div>
            </div>
          </label>
        </div>
      </div>

      {#if errorMsg}
        <div class="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-r-2xl text-xs font-bold text-red-600">
          {errorMsg}
        </div>
      {/if}

      <!-- Submit buttons -->
      <div class="border-t border-dark-charcoal/10 pt-6 flex items-center justify-end gap-4">
        <a href="/dashboard" class="bg-transparent border border-dark-charcoal/15 text-dark-charcoal font-bold px-6 py-3 rounded-xl hover:bg-dark-charcoal/5 transition-colors text-sm">
          Cancel
        </a>
        <button
          type="submit"
          class="bg-accent-orange text-bg-warm font-bold px-8 py-3 rounded-xl hover:bg-dark-charcoal transition-all duration-300 shadow-md orange-glow text-sm cursor-pointer"
        >
          Start Scanning
        </button>
      </div>
    </form>
  </div>
</div>
