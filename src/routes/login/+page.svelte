<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let errorMsg = $state('');
  let isLoading = $state(false);
  let showPassword = $state(false);
  let emailFocused = $state(false);
  let passwordFocused = $state(false);
  let mounted = $state(false);

  import { onMount } from 'svelte';
  onMount(() => {
    setTimeout(() => mounted = true, 50);
  });

  async function handleLogin(e) {
    if (e) e.preventDefault();
    errorMsg = '';
    isLoading = true;

    const success = await appState.login(email, password);
    isLoading = false;
    if (success) {
      goto('/dashboard');
    } else {
      errorMsg = 'Invalid email or password. Please try again.';
    }
  }

  function autofill(role) {
    if (role === 'admin') {
      email = 'admin@gmail.com';
      password = 'Admin@123';
    } else if (role === 'developer') {
      email = 'developer@gmail.com';
      password = 'Developer@123';
    }
    errorMsg = '';
  }
</script>

<div class="min-h-screen flex relative overflow-hidden bg-black login-register-page">
  <!-- Left Branding Panel -->
  <div class="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] border-r border-white/5 login-branding-panel">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-20 left-10 w-72 h-72 bg-accent-purple/15 rounded-full filter blur-[100px] animate-[float_8s_ease-in-out_infinite] login-blob-purple"></div>
      <div class="absolute bottom-32 right-10 w-60 h-60 bg-accent-purple/10 rounded-full filter blur-[80px] animate-[float_10s_ease-in-out_infinite_reverse] login-blob-purple"></div>
      <svg class="absolute inset-0 w-full h-full opacity-[0.04] login-grid-pattern" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="loginGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" stroke-width="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#loginGrid)" />
      </svg>
    </div>

    <div class="relative z-10">
      <a href="/" class="inline-flex items-center gap-3 text-2xl font-bold font-display">
        <div class="w-10 h-10 bg-accent-purple rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>
        <span class="text-white">SecureGuard</span>
      </a>
    </div>

    <div class="relative z-10 max-w-md ml-auto">
      <h1 class="text-4xl font-extrabold font-display text-white leading-tight mb-4">
        Protect your codebase from<br />
        <span class="text-accent-purple">secret leaks</span>
      </h1>
      <p class="text-white/50 text-base leading-relaxed mb-10">
        AI-powered credential scanning that finds hardcoded secrets, API keys, and sensitive data before they reach production.
      </p>

      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-9 h-9 rounded-lg bg-accent-purple/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-accent-purple" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <span class="text-sm font-semibold text-white/60">150+ secret patterns detected</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-9 h-9 rounded-lg bg-accent-purple/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-accent-purple" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <span class="text-sm font-semibold text-white/60">99.2% AI detection accuracy</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-9 h-9 rounded-lg bg-accent-purple/15 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-accent-purple" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <span class="text-sm font-semibold text-white/60">Zero false-positive noise</span>
        </div>
      </div>
    </div>

    <div class="relative z-10 flex items-center gap-10 text-xs font-bold text-white/30 uppercase tracking-wider ml-auto login-stats">
      <div><span class="text-white text-lg font-extrabold">2.4M+</span><br>Repos Scanned</div>
      <div><span class="text-white text-lg font-extrabold">15s</span><br>Avg Scan Time</div>
      <div><span class="text-white text-lg font-extrabold">10K+</span><br>Developers</div>
    </div>
  </div>

  <!-- Right Form Panel -->
  <div class="flex-1 flex items-center justify-center p-6 sm:p-10 relative login-form-panel">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-purple/8 rounded-full filter blur-[120px]"></div>
    </div>

    <div
      class="w-full max-w-md relative z-10 transition-all duration-700 ease-out"
      class:opacity-100={mounted}
      class:translate-y-0={mounted}
      class:opacity-0={!mounted}
      class:translate-y-6={!mounted}
    >
      <!-- Mobile Logo -->
      <div class="lg:hidden text-center mb-8">
        <a href="/" class="inline-flex items-center gap-2 text-xl font-bold font-display text-white">
          <div class="w-9 h-9 bg-accent-purple rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
          SecureGuard
        </a>
      </div>

      <!-- Back Link -->
      <a href="/" class="inline-flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-accent-purple transition-colors mb-8 group">
        <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        Back to Home
      </a>

      <!-- Glass Card -->
      <div class="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 login-glass-card">
        <div class="mb-8">
          <h2 class="text-3xl font-extrabold font-display text-white mb-2">Welcome back</h2>
          <p class="text-sm text-white/40 font-medium">Sign in to access the scanning console</p>
        </div>

        <!-- Social Login -->
        <div class="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            class="flex items-center justify-center gap-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-white/70 font-semibold text-sm py-3 rounded-xl transition-all duration-200 hover:bg-white/[0.07] cursor-pointer active:scale-[0.98]"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-white/70 font-semibold text-sm py-3 rounded-xl transition-all duration-200 hover:bg-white/[0.07] cursor-pointer active:scale-[0.98]"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>

        <!-- Divider -->
        <div class="relative mb-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-white/[0.06]"></div>
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="px-3 text-white/30 font-semibold uppercase tracking-wider">or continue with email</span>
          </div>
        </div>

        <form onsubmit={handleLogin} class="space-y-5">
          <!-- Email - Floating Label -->
          <div class="relative">
            <input
              type="email"
              id="email"
              bind:value={email}
              required
              placeholder=" "
              onfocus={() => emailFocused = true}
              onblur={() => emailFocused = false}
              class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
            />
            <label
              for="email"
              class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                {emailFocused || email ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
            >
              Email Address
            </label>
          </div>

          <!-- Password - Floating Label + Show/Hide -->
          <div class="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              bind:value={password}
              required
              placeholder=" "
              onfocus={() => passwordFocused = true}
              onblur={() => passwordFocused = false}
              class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 pr-12 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
            />
            <label
              for="password"
              class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                {passwordFocused || password ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
            >
              Password
            </label>
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer p-1"
            >
              {#if showPassword}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"></path>
                </svg>
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              {/if}
            </button>
          </div>

          <!-- Remember Me / Forgot Password -->
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2.5 font-medium text-white/40 cursor-pointer group">
              <input
                type="checkbox"
                bind:checked={rememberMe}
                class="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-accent-purple focus:ring-accent-purple focus:ring-offset-0 accent-[#7C3AED]"
              />
              <span class="group-hover:text-white/60 transition-colors">Remember me</span>
            </label>
            <button type="button" class="text-xs font-bold text-accent-purple/70 hover:text-accent-purple transition-colors cursor-pointer">
              Forgot password?
            </button>
          </div>

          <!-- Error Message -->
          {#if errorMsg}
            <div class="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-xs font-bold text-red-400">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"></path>
              </svg>
              {errorMsg}
            </div>
          {/if}

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={isLoading}
            class="w-full bg-accent-purple text-white font-bold py-3.5 rounded-xl hover:bg-accent-purple/90 transition-all duration-200 shadow-lg shadow-accent-purple/20 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {#if isLoading}
              <span class="inline-flex items-center gap-2">
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            {:else}
              Sign In
            {/if}
          </button>
        </form>

        <!-- Register Link -->
        <div class="mt-6 text-center text-sm text-white/30">
          Don't have an account?
          <a href="/register" class="text-accent-purple font-bold hover:text-accent-purple/80 ml-1 transition-colors">Create one</a>
        </div>

        <!-- Demo Credentials -->
        <div class="mt-8 pt-6 border-t border-white/[0.05]">
          <div class="text-[10px] font-bold text-white/20 text-center uppercase tracking-[0.15em] mb-3">
            Quick Demo Access
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onclick={() => autofill('admin')}
              class="bg-white/[0.02] border border-white/[0.06] hover:border-accent-purple/30 hover:bg-accent-purple/5 rounded-xl p-3 text-center cursor-pointer transition-all duration-200 group"
            >
              <div class="text-xs font-bold text-white/70 group-hover:text-white transition-colors">Admin</div>
              <div class="text-[10px] text-white/25 mt-0.5 font-medium">admin@gmail.com</div>
            </button>
            <button
              type="button"
              onclick={() => autofill('developer')}
              class="bg-white/[0.02] border border-white/[0.06] hover:border-accent-purple/30 hover:bg-accent-purple/5 rounded-xl p-3 text-center cursor-pointer transition-all duration-200 group"
            >
              <div class="text-xs font-bold text-white/70 group-hover:text-white transition-colors">Developer</div>
              <div class="text-[10px] text-white/25 mt-0.5 font-medium">developer@gmail.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-30px) scale(1.05); }
  }
</style>
