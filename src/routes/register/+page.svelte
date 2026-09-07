<script>
  import { appState, authErrorMessage } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let password = $state('');
  let role = $state('Developer'); // Default
  let errorMsg = $state('');
  let isLoading = $state(false);

  async function handleRegister(e) {
    if (e) e.preventDefault();
    errorMsg = '';

    if (!firstName || !lastName || !email || !password || !role) {
      errorMsg = 'Please complete all required fields.';
      return;
    }

    if (password.length < 6) {
      errorMsg = 'Password must be at least 6 characters long.';
      return;
    }

    isLoading = true;

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      // Supabase signUp hands full_name via user metadata. The DB trigger on
      // auth.users creates the profiles row automatically.
      const data = await appState.register(fullName, email, password, role);

      if (data.session) {
        goto('/dashboard');
      } else if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        errorMsg = 'An account with this email already exists. Please sign in instead.';
      } else {
        errorMsg = 'Registration received. If this email is new, check your inbox to confirm your email, then sign in.';
        email = '';
        password = '';
      }
    } catch (err) {
      errorMsg = authErrorMessage(err);
    } finally {
      isLoading = false;
    }
  }

  const benefits = [
    {
      title: 'Find leaks in seconds',
      desc: 'Upload a ZIP of your repo and the scanner flags hardcoded keys, tokens and credentials instantly.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`
    },
    {
      title: 'Zero false-positive noise',
      desc: 'Context-aware AI distinguishes real production secrets from mock and placeholder values.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    },
    {
      title: 'Role-based workspaces',
      desc: 'Admins monitor users and scan history while developers run scans and review findings.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`
    },
    {
      title: 'Audit-ready reporting',
      desc: 'Generate compliance PDFs with findings, risk scores and rotation guidelines for your team.',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
    }
  ];

  const steps = [
    { num: '01', label: 'Create your account' },
    { num: '02', label: 'Pick your access role' },
    { num: '03', label: 'Start scanning' }
  ];
</script>

<div class="min-h-screen flex bg-bg-warm relative overflow-hidden lg:flex-row-reverse">
  <!-- Ambient Glow -->
  <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
    <div class="absolute top-1/4 -right-20 w-[420px] h-[420px] bg-accent-purple rounded-full filter blur-[140px]"></div>
    <div class="absolute bottom-0 -left-10 w-[380px] h-[380px] bg-accent-purple rounded-full filter blur-[140px]"></div>
  </div>

  <!-- Right: Why SecurAI Panel -->
  <div class="vt-auth-brand hidden lg:flex w-[45%] xl:w-[46%] bg-dark-charcoal text-bg-warm flex-col justify-between p-12 xl:p-14 relative overflow-hidden shrink-0">
    <div class="absolute -right-32 -top-32 w-96 h-96 bg-accent-purple rounded-full filter blur-[140px] opacity-40 pointer-events-none"></div>
    <div class="absolute -left-20 -bottom-28 w-80 h-80 bg-accent-purple rounded-full filter blur-[130px] opacity-25 pointer-events-none"></div>

    <!-- Brand -->
    <a href="/" class="relative z-10 inline-flex items-center gap-2 text-2xl font-bold font-display tracking-tight">
      <svg class="w-8 h-8 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      <span>Secur<span class="text-accent-purple">AI</span></span>
    </a>

    <!-- Pitch -->
    <div class="relative z-10">
      <div class="inline-flex items-center gap-2 bg-bg-warm/10 border border-accent-purple/40 px-4 py-1.5 rounded-full text-xs font-bold text-accent-purple tracking-wider uppercase mb-6">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-purple"></span>
        </span>
        Join SecurAI — it takes 30 seconds
      </div>

      <h1 class="text-4xl xl:text-5xl font-extrabold font-display leading-tight tracking-tight mb-6">
        Keep secrets<br />
        <span class="text-accent-purple">out of source.</span>
      </h1>
      <p class="text-bg-warm/70 font-medium max-w-md leading-relaxed mb-10">
        Hardcoded credentials cause most data breaches. SecurAI scans your codebases with AI to catch them before they reach production.
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

    <!-- Steps strip -->
    <div class="relative z-10 border-t border-bg-warm/10 pt-8 grid grid-cols-3 gap-6">
      {#each steps as s}
        <div>
          <div class="text-accent-purple font-extrabold font-display text-lg">{s.num}</div>
          <div class="text-[11px] font-bold text-bg-warm/50 uppercase tracking-wider mt-1">{s.label}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Left: Form Panel -->
  <div class="vt-auth-form flex-1 flex items-center justify-center p-6 lg:p-10 relative z-10">
    <div class="w-full max-w-md">
      <!-- Compact brand for mobile -->
      <a href="/" class="lg:hidden inline-flex items-center gap-2 text-xl font-bold font-display text-dark-charcoal mb-8">
        <svg class="w-7 h-7 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
        <span>Secur<span class="text-accent-purple">AI</span></span>
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
          </div>
          <h2 class="text-3xl font-bold font-display text-dark-charcoal">Create Account</h2>
          <p class="text-sm font-medium text-dark-charcoal/60 mt-1">Register for a SecurAI console sandbox session</p>
        </div>

        <form onsubmit={handleRegister} class="space-y-5">
          <!-- Names -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="first-name" class="block text-sm font-bold text-dark-charcoal/70 mb-2">First Name</label>
              <input
                type="text"
                id="first-name"
                bind:value={firstName}
                required
                placeholder="Jane"
                class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
              />
            </div>
            <div>
              <label for="last-name" class="block text-sm font-bold text-dark-charcoal/70 mb-2">Last Name</label>
              <input
                type="text"
                id="last-name"
                bind:value={lastName}
                required
                placeholder="Doe"
                class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
              />
            </div>
          </div>

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
            <label for="password" class="block text-sm font-bold text-dark-charcoal/70 mb-2">Password</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              required
              placeholder="•••••••• (Min 6 chars)"
              class="w-full bg-bg-warm border border-dark-charcoal/15 px-4 py-3 rounded-xl text-dark-charcoal font-semibold focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
            />
          </div>

          <!-- Role Selector -->
          <div>
            <label class="block text-sm font-bold text-dark-charcoal/70 mb-2">Access Role</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                onclick={() => role = 'Developer'}
                class="border rounded-xl p-3 text-center cursor-pointer transition-all font-bold text-xs {role === 'Developer' ? 'bg-accent-purple border-accent-purple text-bg-warm' : 'bg-bg-warm border-dark-charcoal/15 text-dark-charcoal hover:border-accent-purple/30'}"
              >
                Developer
              </button>

              <button
                type="button"
                onclick={() => role = 'Admin'}
                class="border rounded-xl p-3 text-center cursor-pointer transition-all font-bold text-xs {role === 'Admin' ? 'bg-accent-purple border-accent-purple text-bg-warm' : 'bg-bg-warm border-dark-charcoal/15 text-dark-charcoal hover:border-accent-purple/30'}"
              >
                Administrator
              </button>
            </div>
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
            class="w-full bg-accent-purple text-bg-warm font-bold py-3.5 rounded-xl hover:bg-dark-charcoal hover:text-bg-warm transition-all duration-300 shadow-md purple-glow cursor-pointer disabled:opacity-50"
          >
            {#if isLoading}
              <span class="inline-flex items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-bg-warm" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            {:else}
              Create Free Account
            {/if}
          </button>
        </form>

        <!-- Redirect to Sign In -->
        <div class="mt-6 text-center text-xs font-bold text-dark-charcoal/50">
          Already have an account? 
          <a href="/login" class="text-accent-purple hover:underline ml-1">Sign In</a>
        </div>
      </div>
    </div>
  </div>
</div>
