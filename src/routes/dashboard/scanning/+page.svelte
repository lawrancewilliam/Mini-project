<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { create3DFloatingLock } from '$lib/3d-cube.js';

  const scan = $derived(appState.activeScan);
  let terminalLogs = $state([]);
  let terminalContainer = $state(null);
  let cubeContainer = $state(null);
  let cubeInstance = $state(null);

  // Simulated log entries based on progress percentage
  const logBlueprints = [
    { pct: 0, text: '[SYSTEM] Initializing scanning runner sandbox...' },
    { pct: 5, text: '[EXTRACT] Decompressing repository ZIP archive...' },
    { pct: 10, text: '[EXTRACT] Found 84 files in archive structure. Commencing extraction...' },
    { pct: 15, text: '[EXTRACT] Extraction completed. 8.4MB of raw assets parsed.' },
    { pct: 20, text: '[AST] Generating Abstract Syntax Trees (AST) for JavaScript/TypeScript files...' },
    { pct: 25, text: '[AST] Indexing configuration variables and environment mappings...' },
    { pct: 30, text: '[SCANNER] Launching Regex Signature Engine (150+ rules loaded)...' },
    { pct: 35, text: '[SCANNER] Scanning public templates and scripts...' },
    { pct: 40, text: '[SCANNER] Scanning configuration directories...' },
    { pct: 45, text: '[WARN] High-entropy string matching PostgreSQL pattern detected in src/config/db.js:12.' },
    { pct: 50, text: '[SCANNER] Scanning source middleware folders...' },
    { pct: 55, text: '[AI] Commencing Deep Contextual Heuristics Validation...' },
    { pct: 60, text: '[AI] Submitting suspect code contexts to local analysis model...' },
    { pct: 65, text: '[AI] Context verification: Confirming database URL validity...' },
    { pct: 70, text: '[WARN] Potential GitHub Client Secret match discovered in services/auth.ts:5.' },
    { pct: 75, text: '[AI] Heuristic assessment complete. 3 leaks confirmed. 4 false positives discarded.' },
    { pct: 80, text: '[RISK] Running risk scoring metrics calculations...' },
    { pct: 85, text: '[RISK] Score generated: 84 / 100. Classification: CRITICAL.' },
    { pct: 90, text: '[REPORT] Building PDF compliance report file...' },
    { pct: 95, text: '[REPORT] Saving report to database archives...' },
    { pct: 99, text: '[SYSTEM] Cleaning up scanning workspace directory...' },
    { pct: 100, text: '[SYSTEM] Scanning operation finished. All results compiled.' }
  ];

  // Reactively add logs as progress increases
  $effect(() => {
    const currentProgress = scan.progress;
    
    // Update 3D cube color based on progress
    if (cubeInstance && scan.status === 'scanning') {
      cubeInstance.updateProgress(currentProgress);
    }
    
    // Add logs that match the current progress trigger
    logBlueprints.forEach(log => {
      if (currentProgress >= log.pct && !terminalLogs.some(l => l.text === log.text)) {
        const timestamp = new Date().toLocaleTimeString();
        terminalLogs = [...terminalLogs, { time: timestamp, text: log.text }];
        
        // Auto-scroll terminal container
        setTimeout(() => {
          if (terminalContainer) {
            terminalContainer.scrollTop = terminalContainer.scrollHeight;
          }
        }, 50);
      }
    });

    // Auto-redirect when scan completes
    if (scan.status === 'done') {
      const redirectTimer = setTimeout(() => {
        appState.resetActiveScan();
        goto('/dashboard/results');
      }, 2000);
      return () => clearTimeout(redirectTimer);
    }
  });

  // Guard against navigating directly here without an active scan
  onMount(() => {
    if (scan.status === 'idle') {
      // Direct load, pre-populate a simulation just in case
      appState.triggerSimulatedScan('quantum-payment-gateway', 'Core payment api gateway', { regex: true, aiAnalysis: true });
    }
    
    // Initialize 3D cube
    if (cubeContainer) {
      cubeInstance = create3DFloatingLock(cubeContainer, true);
    }
    
    return () => {
      if (cubeInstance) {
        cubeInstance.dispose();
        cubeInstance = null;
      }
    };
  });
</script>

<div class="max-w-4xl mx-auto space-y-8">
  <div class="bg-card-warm border border-dark-charcoal/10 rounded-3xl p-6 sm:p-8 shadow-sm">
    
    <!-- Top Progress Indicator -->
    <div class="text-center mb-8">
      <!-- 3D Cube Animation -->
      {#if scan.status === 'scanning'}
        <div
          bind:this={cubeContainer}
          class="w-24 h-24 mx-auto mb-6"
        ></div>
      {/if}
      
      <div class="inline-flex items-center gap-2 bg-accent-purple/15 text-accent-purple px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
        {#if scan.status === 'scanning'}
          <span class="flex h-2.5 w-2.5 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-purple"></span>
          </span>
          SCAN RUNNING
        {:else}
          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          ANALYSIS COMPLETED
        {/if}
      </div>
      
      <h3 class="text-2xl font-bold font-display text-dark-charcoal">
        {#if scan.status === 'scanning'}
          Analyzing Project: <span class="text-accent-purple">{scan.project?.projectName}</span>
        {:else}
          Analysis Successful!
        {/if}
      </h3>
      <p class="text-sm text-dark-charcoal/60 mt-1 font-semibold">{scan.currentStep}</p>
    </div>

    <!-- Progress Bar -->
    <div class="space-y-2 mb-8">
      <div class="flex items-center justify-between text-xs font-extrabold text-dark-charcoal/60">
        <span>Analysis Progress</span>
        <span>{scan.progress}%</span>
      </div>
      <div class="w-full bg-bg-warm rounded-full h-4 overflow-hidden border border-dark-charcoal/10 relative">
        <div
          class="bg-accent-purple h-full rounded-full transition-all duration-300 relative"
          style="width: {scan.progress}%"
        >
          <!-- Shiny flow bar -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-scan w-[50%]"></div>
        </div>
      </div>
    </div>

    <!-- Terminal Output -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs font-bold text-dark-charcoal/60">
        <span>Console Sandbox Logs</span>
        <span class="font-mono text-[10px]">Runner-id: SEC_RUN_99B</span>
      </div>
      
      <div
        bind:this={terminalContainer}
        class="bg-dark-charcoal text-bg-warm font-mono text-xs rounded-2xl p-5 h-72 overflow-y-auto border border-dark-charcoal/30 flex flex-col gap-1.5 shadow-inner relative"
      >
        <!-- Scanner lines overlay -->
        <div class="absolute inset-0 bg-gradient-to-b from-white/3 to-transparent pointer-events-none z-10"></div>
        
        {#each terminalLogs as log}
          <div class="leading-relaxed">
            <span class="text-bg-warm/40">[{log.time}]</span>
            <span class={log.text.includes('[WARN]') ? 'text-accent-purple font-bold' : log.text.includes('[SYSTEM]') ? 'text-cyan-400 font-bold' : 'text-bg-warm/85'}>
              {log.text}
            </span>
          </div>
        {/each}
        
        {#if scan.status === 'scanning'}
          <div class="flex items-center gap-1 mt-1">
            <span class="w-1.5 h-3.5 bg-accent-purple animate-pulse"></span>
            <span class="text-[10px] text-bg-warm/50 italic font-semibold">awaiting next console response...</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Manual Redirect Action -->
    {#if scan.status === 'done'}
      <div class="mt-8 pt-6 border-t border-dark-charcoal/10 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onclick={() => { appState.resetActiveScan(); goto('/dashboard/results'); }}
          class="inline-flex items-center gap-2 bg-accent-purple text-bg-warm font-extrabold px-8 py-3.5 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all duration-300 shadow-md purple-glow cursor-pointer"
        >
          View Detections
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
        </button>
        <p class="text-xs text-dark-charcoal/50 font-bold mt-2.5">Redirecting you to the results console automatically...</p>
      </div>
    {/if}
  </div>
</div>
