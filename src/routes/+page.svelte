<script>
  import { appState } from '$lib/state.svelte';
  
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<!-- Navigation -->
<header class="sticky top-0 z-50 bg-bg-warm/80 backdrop-blur-md border-b border-dark-charcoal/10 px-6 py-4">
  <div class="max-w-7xl mx-auto flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 text-2xl font-bold font-display tracking-tight text-dark-charcoal">
      <svg class="w-8 h-8 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      <span>Secur<span class="text-accent-orange">AI</span></span>
    </a>
    
    <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-dark-charcoal/80">
      <button onclick={() => scrollToId('home')} class="hover:text-accent-orange transition-colors cursor-pointer">Home</button>
      <button onclick={() => scrollToId('features')} class="hover:text-accent-orange transition-colors cursor-pointer">Features</button>
      <button onclick={() => scrollToId('workflow')} class="hover:text-accent-orange transition-colors cursor-pointer">Workflow</button>
      <button onclick={() => scrollToId('about')} class="hover:text-accent-orange transition-colors cursor-pointer">About</button>
      <button onclick={() => scrollToId('contact')} class="hover:text-accent-orange transition-colors cursor-pointer">Contact</button>
    </nav>

    <div class="flex items-center gap-5">
      {#if appState.currentUser}
        <a href="/dashboard" class="inline-flex items-center gap-2 bg-dark-charcoal text-bg-warm px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-orange hover:text-bg-warm transition-all duration-300 shadow-md">
          Dashboard
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
          </svg>
        </a>
      {:else}
        <a href="/login" class="text-sm font-bold text-dark-charcoal hover:text-accent-orange transition-colors">
          Sign In
        </a>
        <a href="/register" class="inline-flex items-center gap-2 bg-accent-orange text-bg-warm px-5 py-2.5 rounded-xl font-bold hover:bg-dark-charcoal hover:text-bg-warm transition-all duration-300 shadow-md orange-glow">
          Register
        </a>
      {/if}
    </div>
  </div>
</header>

<main id="home">
  <!-- Hero Section -->
  <section class="relative pt-20 pb-24 px-6 overflow-hidden">
    <div class="absolute inset-0 z-0 opacity-15 pointer-events-none">
      <!-- Grid Background Pattern -->
      <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222222" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <!-- Glow Ball -->
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-orange rounded-full filter blur-[120px]"></div>
    </div>

    <div class="max-w-5xl mx-auto text-center relative z-10">
      <div class="inline-flex items-center gap-2 bg-card-warm/80 border border-accent-orange/30 px-4 py-1.5 rounded-full text-xs font-bold text-accent-orange mb-8 tracking-wider uppercase">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-orange"></span>
        </span>
        v2.4 Release: Deep Neural Credential Matching
      </div>
      
      <h1 class="text-5xl md:text-7xl font-extrabold font-display leading-tight tracking-tight text-dark-charcoal mb-6">
        AI-Assisted Sensitive <br />
        <span class="text-accent-orange">Data Leakage Detection</span>
      </h1>
      
      <p class="text-xl md:text-2xl font-medium text-dark-charcoal/70 max-w-3xl mx-auto mb-10">
        Detect Secrets Before Attackers Do. Find hardcoded passwords, tokens, API keys, and certificates embedded in code.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        {#if appState.currentUser}
          <a href="/dashboard" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-accent-orange text-bg-warm font-extrabold text-lg px-8 py-4 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all duration-300 shadow-lg orange-glow-lg">
            Start Scanning
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </a>
        {:else}
          <a href="/register" class="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-accent-orange text-bg-warm font-extrabold text-lg px-8 py-4 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all duration-300 shadow-lg orange-glow-lg">
            Start Scanning
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </a>
        {/if}
        <button onclick={() => scrollToId('features')} class="w-full sm:w-auto inline-flex items-center justify-center bg-card-warm border border-dark-charcoal/20 text-dark-charcoal font-bold text-lg px-8 py-4 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm hover:border-dark-charcoal transition-all duration-300 cursor-pointer">
          Learn More
        </button>
      </div>
    </div>
  </section>

  <!-- Interactive Stats Tracker -->
  <section class="py-12 bg-card-warm/50 border-y border-dark-charcoal/10 px-6">
    <div class="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div>
        <div class="text-4xl md:text-5xl font-extrabold font-display text-accent-orange mb-1">2.4M+</div>
        <div class="text-xs md:text-sm font-semibold text-dark-charcoal/70 uppercase tracking-wider">Repos Scanned</div>
      </div>
      <div>
        <div class="text-4xl md:text-5xl font-extrabold font-display text-dark-charcoal mb-1">150+</div>
        <div class="text-xs md:text-sm font-semibold text-dark-charcoal/70 uppercase tracking-wider">Secret Formats</div>
      </div>
      <div>
        <div class="text-4xl md:text-5xl font-extrabold font-display text-accent-orange mb-1">99.2%</div>
        <div class="text-xs md:text-sm font-semibold text-dark-charcoal/70 uppercase tracking-wider">AI Accuracy</div>
      </div>
      <div>
        <div class="text-4xl md:text-5xl font-extrabold font-display text-dark-charcoal mb-1">&lt; 15s</div>
        <div class="text-xs md:text-sm font-semibold text-dark-charcoal/70 uppercase tracking-wider">Average Scan</div>
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="py-24 px-6 max-w-7xl mx-auto">
    <div class="text-center max-w-2xl mx-auto mb-16">
      <h2 class="text-4xl font-extrabold font-display text-dark-charcoal mb-4">Enterprise Grade Intelligence</h2>
      <p class="text-lg font-medium text-dark-charcoal/70">
        Engineered to identify hardcoded secrets with precision, minimizing developer noise.
      </p>
    </div>

    <div class="grid md:grid-cols-3 gap-8">
      <!-- AI Detection -->
      <div class="bg-card-warm p-8 rounded-2xl border border-dark-charcoal/5 shadow-sm hover:translate-y-[-4px] hover:border-accent-orange/30 transition-all duration-300">
        <div class="w-12 h-12 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center mb-6">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal mb-3">AI Context Heuristics</h3>
        <p class="text-dark-charcoal/70">
          Our specialized neural engine evaluates code surrounding identified items to determine whether they are active, dummy, or false positives.
        </p>
      </div>

      <!-- Regex Scanner -->
      <div class="bg-card-warm p-8 rounded-2xl border border-dark-charcoal/5 shadow-sm hover:translate-y-[-4px] hover:border-accent-orange/30 transition-all duration-300">
        <div class="w-12 h-12 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center mb-6">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal mb-3">Multi-Pattern Regex Engine</h3>
        <p class="text-dark-charcoal/70">
          Scans for over 150 unique credential syntax patterns, from cloud services (AWS, Azure, GCP) to SaaS integration tokens.
        </p>
      </div>

      <!-- Risk Assessment -->
      <div class="bg-card-warm p-8 rounded-2xl border border-dark-charcoal/5 shadow-sm hover:translate-y-[-4px] hover:border-accent-orange/30 transition-all duration-300">
        <div class="w-12 h-12 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center mb-6">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal mb-3">Risk Assessment Models</h3>
        <p class="text-dark-charcoal/70">
          Provides comprehensive severity levels (Critical, High, Medium, Low) paired with dynamic hazard scores based on repository public access details.
        </p>
      </div>

      <!-- PDF Reports -->
      <div class="bg-card-warm p-8 rounded-2xl border border-dark-charcoal/5 shadow-sm hover:translate-y-[-4px] hover:border-accent-orange/30 transition-all duration-300">
        <div class="w-12 h-12 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center mb-6">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal mb-3">One-Click PDF Reports</h3>
        <p class="text-dark-charcoal/70">
          Generate auditing compliance documents containing findings, location details, recommended rotation practices, and status.
        </p>
      </div>

      <!-- Multi-Language Support -->
      <div class="bg-card-warm p-8 rounded-2xl border border-dark-charcoal/5 shadow-sm hover:translate-y-[-4px] hover:border-accent-orange/30 transition-all duration-300">
        <div class="w-12 h-12 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center mb-6">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal mb-3">Multi-Language Code Parsing</h3>
        <p class="text-dark-charcoal/70">
          Direct support for Python, JavaScript, TypeScript, Go, Java, PHP, YAML configurations, environment parameters, and bash files.
        </p>
      </div>

      <!-- Silent Operations -->
      <div class="bg-card-warm p-8 rounded-2xl border border-dark-charcoal/5 shadow-sm hover:translate-y-[-4px] hover:border-accent-orange/30 transition-all duration-300">
        <div class="w-12 h-12 bg-accent-orange/10 text-accent-orange rounded-xl flex items-center justify-center mb-6">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold font-display text-dark-charcoal mb-3">Instant Feedback Loops</h3>
        <p class="text-dark-charcoal/70">
          Simulates complex pipeline builds and checks code repositories under 15 seconds to minimize deployment bottlenecks.
        </p>
      </div>
    </div>
  </section>

  <!-- Workflow Steps -->
  <section id="workflow" class="py-24 bg-card-warm/40 border-y border-dark-charcoal/10 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center max-w-2xl mx-auto mb-20">
        <h2 class="text-4xl font-extrabold font-display text-dark-charcoal mb-4">How SecurAI Protects You</h2>
        <p class="text-lg font-medium text-dark-charcoal/70">
          A seamless pipeline designed to highlight risks and suggest concrete actions.
        </p>
      </div>
      
      <div class="grid md:grid-cols-5 gap-8 relative">
        <!-- Connecting Line for larger screens -->
        <div class="hidden md:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-dark-charcoal/10 z-0"></div>
        
        <!-- Step 1 -->
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 bg-bg-warm border-2 border-accent-orange text-accent-orange rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-md">1</div>
          <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">Upload</h4>
          <p class="text-sm text-dark-charcoal/70">Zip your codebase repository and drop it onto the dashboard scanner.</p>
        </div>

        <!-- Step 2 -->
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 bg-bg-warm border-2 border-dark-charcoal/20 text-dark-charcoal rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-md">2</div>
          <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">Scan</h4>
          <p class="text-sm text-dark-charcoal/70">Our high-speed parser filters credentials against 150+ regex standards.</p>
        </div>

        <!-- Step 3 -->
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 bg-bg-warm border-2 border-accent-orange text-accent-orange rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-md">3</div>
          <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">AI Analysis</h4>
          <p class="text-sm text-dark-charcoal/70">Smart neural networks evaluate surrounding variables for confirmation.</p>
        </div>

        <!-- Step 4 -->
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 bg-bg-warm border-2 border-dark-charcoal/20 text-dark-charcoal rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-md">4</div>
          <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">Risk Score</h4>
          <p class="text-sm text-dark-charcoal/70">Calculates a composite rating to prioritize remediation.</p>
        </div>

        <!-- Step 5 -->
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 bg-bg-warm border-2 border-accent-orange text-accent-orange rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-md">5</div>
          <h4 class="text-lg font-bold font-display text-dark-charcoal mb-2">Report</h4>
          <p class="text-sm text-dark-charcoal/70">Export findings, rotation guidelines, and compliance records.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- About Section -->
  <section id="about" class="py-24 px-6 max-w-6xl mx-auto">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div>
        <div class="inline-block bg-accent-orange/10 text-accent-orange font-bold px-4 py-1 rounded-full text-sm mb-4">OUR MISSION</div>
        <h3 class="text-3xl md:text-4xl font-extrabold font-display text-dark-charcoal mb-6">
          Stopping credential leakage before the commit reaches production.
        </h3>
        <p class="text-lg text-dark-charcoal/70 mb-6 leading-relaxed">
          Hardcoded credentials remain one of the top causes of data breaches globally. Once committed, credentials can be cached, indexed, and scraped by malicious actors in seconds.
        </p>
        <p class="text-lg text-dark-charcoal/70 leading-relaxed">
          SecurAI was developed by developers, for developers, to bring AI-powered context validation to regular static scanners. By combining pattern-matching speed with context-aware model checks, we reduce noisy false positives and give you clean, actionable remediation guidelines immediately.
        </p>
      </div>
      <div class="relative">
        <div class="absolute inset-0 bg-accent-orange rounded-3xl rotate-3 scale-95 opacity-10"></div>
        <div class="bg-card-warm border border-dark-charcoal/10 p-8 rounded-3xl relative z-10 shadow-lg">
          <div class="text-xs font-bold text-accent-orange uppercase tracking-wider mb-2">REAL-TIME MONITORING</div>
          <h4 class="text-2xl font-bold font-display text-dark-charcoal mb-4">Protecting Global Teams</h4>
          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <svg class="w-5 h-5 text-accent-orange mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm text-dark-charcoal/80 font-medium">Automatic integration into your local workspace setup.</span>
            </li>
            <li class="flex items-start gap-3">
              <svg class="w-5 h-5 text-accent-orange mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm text-dark-charcoal/80 font-medium">Understands mock values versus production accounts.</span>
            </li>
            <li class="flex items-start gap-3">
              <svg class="w-5 h-5 text-accent-orange mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm text-dark-charcoal/80 font-medium">Comprehensive audit trail history with filtering tags.</span>
            </li>
          </ul>
          
          <div class="mt-8 border-t border-dark-charcoal/10 pt-6 flex items-center gap-4">
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100" alt="CTO" class="w-12 h-12 rounded-full object-cover" />
            <div>
              <div class="font-bold text-dark-charcoal text-sm">Elena Rostova</div>
              <div class="text-xs text-dark-charcoal/60 font-semibold">Chief of Security Research</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact / Get Started CTA -->
  <section id="contact" class="py-20 px-6 max-w-5xl mx-auto mb-16">
    <div class="bg-dark-charcoal text-bg-warm rounded-3xl p-12 text-center relative overflow-hidden shadow-xl">
      <!-- Glow -->
      <div class="absolute -right-24 -bottom-24 w-96 h-96 bg-accent-orange rounded-full filter blur-[150px] opacity-30"></div>
      
      <h3 class="text-3xl md:text-5xl font-extrabold font-display mb-6">Ready to secure your codebase?</h3>
      <p class="text-lg text-bg-warm/75 max-w-2xl mx-auto mb-8">
        Start scanning instantly. No credit card required. Test our credential matching systems with our sandbox simulation.
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
        {#if appState.currentUser}
          <a href="/dashboard" class="bg-accent-orange text-bg-warm px-8 py-3.5 rounded-xl font-bold hover:bg-bg-warm hover:text-dark-charcoal transition-all duration-300 shadow-md">
            Go to Dashboard
          </a>
        {:else}
          <a href="/login" class="bg-accent-orange text-bg-warm px-8 py-3.5 rounded-xl font-bold hover:bg-bg-warm hover:text-dark-charcoal transition-all duration-300 shadow-md">
            Sign In Now
          </a>
        {/if}
        <button onclick={() => alert('Support ticket system simulation! Write to support@secur.ai')} class="bg-transparent border border-bg-warm/30 text-bg-warm px-8 py-3.5 rounded-xl font-semibold hover:bg-bg-warm/10 transition-all duration-300 cursor-pointer">
          Contact Sales
        </button>
      </div>
    </div>
  </section>
</main>

<!-- Footer -->
<footer class="bg-card-warm border-t border-dark-charcoal/10 py-12 px-6">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-2 text-xl font-bold font-display text-dark-charcoal">
      <svg class="w-6 h-6 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      <span>Secur<span class="text-accent-orange">AI</span></span>
    </div>
    
    <div class="flex items-center gap-8 text-xs font-semibold text-dark-charcoal/60">
      <a href="#home" class="hover:text-accent-orange transition-colors">Privacy Policy</a>
      <a href="#home" class="hover:text-accent-orange transition-colors">Terms of Service</a>
      <a href="#home" class="hover:text-accent-orange transition-colors">GDPR Compliance</a>
    </div>

    <div class="text-xs font-bold text-dark-charcoal/40">
      &copy; 2026 SecurAI Inc. All rights reserved.
    </div>
  </div>
</footer>
