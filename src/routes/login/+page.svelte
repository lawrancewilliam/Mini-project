<script>
  import { appState, authErrorMessage } from '$lib/state.svelte';
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let errorMsg = $state('');
  let isLoading = $state(false);

  async function handleLogin(e) {
    if (e) e.preventDefault();
    errorMsg = '';
    isLoading = true;

    try {
      await appState.login(email, password);
      // Route by database role (public.profiles.role), never by email address.
      if (appState.currentUser?.role === 'Admin') {
        goto('/dashboard/users');
      } else {
        goto('/dashboard');
      }
    } catch (err) {
      errorMsg = authErrorMessage(err);
    } finally {
      isLoading = false;
    }
  }

  async function handleForgotPassword() {
    errorMsg = '';
    if (!email) {
      errorMsg = 'Enter your email address above to request a password reset link.';
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      errorMsg = authErrorMessage(error);
    } else {
      errorMsg = 'Password reset link sent. Check your inbox to continue.';
    }
  }

  const benefits = [
    {
      title: 'AI Context Heuristics',
      desc: 'Neural engine separates real credentials from placeholders, killing noisy false positives.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>`
    },
    {
      title: '150+ Secret Formats',
      desc: 'AWS, Azure, GCP, Stripe, Slack, Telegram, database URLs and more — matched instantly.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`
    },
    {
      title: 'Live Risk Scoring',
      desc: 'Critical, high, medium and low severities with composite hazard ratings to prioritize fixes.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`
    },
    {
      title: 'One-Click Compliance PDFs',
      desc: 'Export audit-ready reports with findings, rotation guidelines and remediation status.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
    }
  ];

  const stats = [
    { value: '2.4M+', label: 'Repos Scanned' },
    { value: '99.2%', label: 'AI Accuracy' },
    { value: '< 15s', label: 'Avg. Scan' }
  ];
</script>

<div class="min-h-screen flex bg-bg-warm relative overflow-hidden">
  <!-- Theme Toggle Floating Button -->
  <div class="absolute top-6 right-6 z-50">
    <button
      onclick={() => appState.toggleTheme()}
      class="p-2.5 rounded-2xl border border-dark-charcoal/10 bg-card-warm shadow-md hover:bg-dark-charcoal/10 transition-all duration-200 cursor-pointer"
      title={appState.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {#if appState.theme === 'dark'}
        <svg class="w-5 h-5 text-dark-charcoal" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
      {:else}
        <svg class="w-5 h-5 text-dark-charcoal" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        </svg>
      {/if}
    </button>
  </div>

  <!-- Ambient Glow -->
  <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
    <div class="absolute top-1/4 -left-20 w-[420px] h-[420px] bg-accent-purple rounded-full filter blur-[140px]"></div>
    <div class="absolute bottom-0 right-0 w-[380px] h-[380px] bg-accent-purple rounded-full filter blur-[140px]"></div>
  </div>

  <!-- Left: Brand / Why SecureGaurd Panel -->
  <div class="vt-auth-brand hidden lg:flex w-[45%] xl:w-[46%] bg-dark-charcoal text-bg-warm flex-col justify-between p-12 xl:p-14 relative overflow-hidden shrink-0">
    <div class="absolute -right-32 -top-32 w-96 h-96 bg-accent-purple rounded-full filter blur-[140px] opacity-40 pointer-events-none"></div>
    <div class="absolute -left-20 -bottom-28 w-80 h-80 bg-accent-purple rounded-full filter blur-[130px] opacity-25 pointer-events-none"></div>

    <!-- Brand -->
    <a href="/" class="relative z-10 inline-flex items-center gap-2 text-2xl font-bold font-display tracking-tight">
      <svg class="w-8 h-8 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      <span>Secure<span class="text-accent-purple">Gaurd</span></span>
    </a>

    <!-- Pitch -->
    <div class="relative z-10">
      <div class="inline-flex items-center gap-2 bg-bg-warm/10 border border-accent-purple/40 px-4 py-1.5 rounded-full text-xs font-bold text-accent-purple tracking-wider uppercase mb-6">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-purple"></span>
        </span>
        Why developers choose SecureGaurd
      </div>

      <h1 class="text-4xl xl:text-5xl font-extrabold font-display leading-tight tracking-tight mb-6">
        Scan smarter.<br />
        <span class="text-accent-purple">Ship safer.</span>
      </h1>
      <p class="text-bg-warm/70 font-medium max-w-md leading-relaxed mb-10">
        Every hardcoded secret you miss is an incident waiting to happen. SecureGaurd finds them before attackers do — with context-aware AI that understands real credentials versus test data.
      </p>

      <!-- Benefit list -->
      <div class="space-y-5">
        {#each benefits as b}
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center shrink-0 mt-0.5">
              {@html b.icon}
            </div>
            <div>
              <div class="font-bold text-bg-warm">{b.title}</div>
              <div class="text-sm text-bg-warm/60 font-medium leading-relaxed">{b.desc}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Stats strip -->
    <div class="relative z-10 border-t border-bg-warm/10 pt-8 grid grid-cols-3 gap-6">
      {#each stats as s}
        <div>
          <div class="text-2xl xl:text-3xl font-extrabold font-display text-accent-purple">{s.value}</div>
          <div class="text-[11px] font-bold text-bg-warm/50 uppercase tracking-wider mt-1">{s.label}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Right: Form Panel -->
  <div class="vt-auth-form flex-1 flex items-center justify-center p-6 lg:p-10 relative z-10">
    <div class="w-full max-w-md">
      <!-- Compact brand for mobile -->
      <a href="/" class="lg:hidden inline-flex items-center gap-2 text-xl font-bold font-display text-dark-charcoal mb-8">
        <svg class="w-7 h-7 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
        <span>Secure<span class="text-accent-purple">Gaurd</span></span>
      </a>

      <!-- Back Link -->
      <a href="/" class="inline-flex items-center gap-2 text-sm font-semibold text-dark-charcoal/60 hover:text-accent-purple transition-colors mb-8">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        Back to Home
      </a>

      <div class="bg-card-warm rounded-3xl p-8 border border-dark-charcoal/10 shadow-xl purple-glow">
        <div class="mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-purple/10 text-accent-purple mb-4">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 class="text-3xl font-bold font-display text-dark-charcoal">Welcome Back</h2>
          <p class="text-sm font-medium text-dark-charcoal/60 mt-1">Authenticate to access the scanning console</p>
        </div>

        <form onsubmit={handleLogin} class="space-y-5">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-bold text-dark-charcoal/70 mb-2">Email Address</label>
            <input
              type="email"
              id="email"
              bind:value={email}
              required
              placeholder="name@company.com"
              class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
            />
          </div>

          <!-- Password -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="password" class="block text-sm font-bold text-dark-charcoal/70">Password</label>
              <button type="button" onclick={handleForgotPassword} class="text-xs font-bold text-accent-purple hover:underline cursor-pointer">
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              id="password"
              bind:value={password}
              required
              placeholder="••••••••"
              class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
            />
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 font-semibold text-dark-charcoal/70 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={rememberMe}
                class="rounded border-dark-charcoal/20 text-accent-purple focus:ring-accent-purple w-4 h-4 accent-accent-purple"
              />
              Remember Me
            </label>
          </div>

          <!-- Error Msg -->
          {#if errorMsg}
            <div class="bg-red-950/20 border-l-4 border-red-500 p-3 rounded-r-xl text-xs font-bold text-red-400">
              {errorMsg}
            </div>
          {/if}

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={isLoading}
            class="w-full bg-accent-purple text-bg-warm font-bold py-3.5 rounded-xl hover:bg-dark-charcoal transition-all duration-300 shadow-md purple-glow cursor-pointer disabled:opacity-50"
          >
            {#if isLoading}
              <span class="inline-flex items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-bg-warm" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            {:else}
              Sign In
            {/if}
          </button>
        </form>

        <!-- Link to Register -->
        <div class="mt-4 text-center text-xs font-bold text-dark-charcoal/50">
          Don't have an account? 
          <a href="/register" class="text-accent-purple hover:underline ml-1">Sign Up</a>
        </div>
      </div>
    </div>
  </div>
</div>
