<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let step = $state(1);
  let firstName = $state('');
  let lastName = $state('');
  let username = $state('');
  let email = $state('');
  let password = $state('');
  let errorMsg = $state('');
  let isLoading = $state(false);
  let mounted = $state(false);

  let emailFocused = $state(false);
  let passwordFocused = $state(false);
  let firstNameFocused = $state(false);
  let lastNameFocused = $state(false);
  let usernameFocused = $state(false);

  onMount(() => {
    setTimeout(() => mounted = true, 50);
  });

  function getPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function getStrengthLabel(score) {
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-400', width: 'w-[20%]' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', text: 'text-orange-400', width: 'w-[40%]' };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', text: 'text-yellow-400', width: 'w-[60%]' };
    if (score <= 4) return { label: 'Strong', color: 'bg-green-500', text: 'text-green-400', width: 'w-[80%]' };
    return { label: 'Very Strong', color: 'bg-emerald-400', text: 'text-emerald-400', width: 'w-full' };
  }

  let strengthScore = $derived(getPasswordStrength(password));
  let strengthInfo = $derived(getStrengthLabel(strengthScore));

  function hasMinLength(pw) { return pw.length >= 8; }
  function hasUpperCase(pw) { return /[A-Z]/.test(pw); }
  function hasNumber(pw) { return /[0-9]/.test(pw); }
  function hasSymbol(pw) { return /[^A-Za-z0-9]/.test(pw); }

  function nextStep() {
    errorMsg = '';
    if (step === 1) {
      if (!email || !password) {
        errorMsg = 'Please fill in both fields.';
        return;
      }
      if (password.length < 6) {
        errorMsg = 'Password must be at least 6 characters long.';
        return;
      }
      step = 2;
    }
  }

  function prevStep() {
    errorMsg = '';
    step = 1;
  }

  async function handleRegister(e) {
    if (e) e.preventDefault();
    errorMsg = '';

    if (!firstName || !lastName || !username) {
      errorMsg = 'Please fill in all required fields.';
      return;
    }

    isLoading = true;

    const fullName = `${firstName} ${lastName}`.trim();
    const result = await appState.register(fullName, email, username, password);
    isLoading = false;

    if (result.success) {
      goto('/dashboard');
    } else {
      errorMsg = result.error || 'Registration failed. Please try again.';
    }
  }
</script>

<div class="min-h-screen flex relative overflow-hidden bg-black login-register-page">
  <!-- Left Form Panel -->
  <div class="flex-1 flex items-center justify-center p-6 sm:p-10 relative login-form-panel">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/8 rounded-full filter blur-[120px]"></div>
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
        <!-- Step Indicator -->
        <div class="flex items-center gap-3 mb-8">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 {step >= 1 ? 'bg-accent-purple text-white' : 'bg-white/[0.06] text-white/30'}">1</div>
            <span class="text-xs font-bold {step >= 1 ? 'text-white/70' : 'text-white/20'}">Account</span>
          </div>
          <div class="flex-1 h-px {step >= 2 ? 'bg-accent-purple' : 'bg-white/[0.06]'} transition-colors duration-300"></div>
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 {step >= 2 ? 'bg-accent-purple text-white' : 'bg-white/[0.06] text-white/30'}">2</div>
            <span class="text-xs font-bold {step >= 2 ? 'text-white/70' : 'text-white/20'}">Profile</span>
          </div>
        </div>

        {#if step === 1}
          <div class="transition-all duration-300">
            <h2 class="text-3xl font-extrabold font-display text-white mb-2">Create account</h2>
            <p class="text-sm text-white/40 font-medium mb-8">Start your free security scan in seconds</p>

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

            <div class="relative mb-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-white/[0.06]"></div>
              </div>
              <div class="relative flex justify-center text-xs">
                <span class="px-3 text-white/30 font-semibold uppercase tracking-wider">or register with email</span>
              </div>
            </div>

            <form onsubmit={(e) => { e.preventDefault(); nextStep(); }} class="space-y-5">
              <!-- Email -->
              <div class="relative">
                <input
                  type="email"
                  id="reg-email"
                  bind:value={email}
                  required
                  placeholder=" "
                  onfocus={() => emailFocused = true}
                  onblur={() => emailFocused = false}
                  class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
                />
                <label
                  for="reg-email"
                  class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                    {emailFocused || email ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
                >
                  Email Address
                </label>
              </div>

              <!-- Password -->
              <div>
                <div class="relative">
                  <input
                    type="password"
                    id="reg-password"
                    bind:value={password}
                    required
                    placeholder=" "
                    onfocus={() => passwordFocused = true}
                    onblur={() => passwordFocused = false}
                    class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
                  />
                  <label
                    for="reg-password"
                    class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                      {passwordFocused || password ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
                  >
                    Password
                  </label>
                </div>

                <!-- Strength Meter -->
                {#if password.length > 0}
                  <div class="mt-3 transition-all duration-300">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[10px] font-bold text-white/70 uppercase tracking-wider">Strength</span>
                      <span class="text-[10px] font-bold {strengthInfo.text}">{strengthInfo.label}</span>
                    </div>
                    <div class="h-1 bg-white/[0.15] rounded-full overflow-hidden">
                      <div class="h-full {strengthInfo.color} {strengthInfo.width} rounded-full transition-all duration-500 ease-out"></div>
                    </div>

                    <div class="mt-3 grid grid-cols-2 gap-1.5">
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full transition-colors duration-200 {hasMinLength(password) ? 'bg-green-400' : 'bg-white/30'}"></div>
                        <span class="text-[11px] font-medium {hasMinLength(password) ? 'text-green-400 font-semibold' : 'text-white/70'}">8+ characters</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full transition-colors duration-200 {hasUpperCase(password) ? 'bg-green-400' : 'bg-white/30'}"></div>
                        <span class="text-[11px] font-medium {hasUpperCase(password) ? 'text-green-400 font-semibold' : 'text-white/70'}">Uppercase letter</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full transition-colors duration-200 {hasNumber(password) ? 'bg-green-400' : 'bg-white/30'}"></div>
                        <span class="text-[11px] font-medium {hasNumber(password) ? 'text-green-400 font-semibold' : 'text-white/70'}">Number</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full transition-colors duration-200 {hasSymbol(password) ? 'bg-green-400' : 'bg-white/30'}"></div>
                        <span class="text-[11px] font-medium {hasSymbol(password) ? 'text-green-400 font-semibold' : 'text-white/70'}">Special symbol</span>
                      </div>
                    </div>
                  </div>
                {/if}
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

              <button
                type="submit"
                class="w-full bg-accent-purple text-white font-bold py-3.5 rounded-xl hover:bg-accent-purple/90 transition-all duration-200 shadow-lg shadow-accent-purple/20 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Continue
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path>
                </svg>
              </button>
            </form>
          </div>

        {:else}
          <!-- Step 2: Profile -->
          <div class="transition-all duration-300">
            <h2 class="text-3xl font-extrabold font-display text-white mb-2">Your profile</h2>
            <p class="text-sm text-white/40 font-medium mb-8">Tell us a bit about yourself</p>

            <form onsubmit={handleRegister} class="space-y-5">
              <!-- Name Fields -->
              <div class="grid grid-cols-2 gap-4">
                <div class="relative">
                  <input
                    type="text"
                    id="first-name"
                    bind:value={firstName}
                    required
                    placeholder=" "
                    onfocus={() => firstNameFocused = true}
                    onblur={() => firstNameFocused = false}
                    class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
                  />
                  <label
                    for="first-name"
                    class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                      {firstNameFocused || firstName ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
                  >
                    First Name
                  </label>
                </div>
                <div class="relative">
                  <input
                    type="text"
                    id="last-name"
                    bind:value={lastName}
                    required
                    placeholder=" "
                    onfocus={() => lastNameFocused = true}
                    onblur={() => lastNameFocused = false}
                    class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
                  />
                  <label
                    for="last-name"
                    class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                      {lastNameFocused || lastName ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
                  >
                    Last Name
                  </label>
                </div>
              </div>

              <!-- Username -->
              <div class="relative">
                <input
                  type="text"
                  id="username"
                  bind:value={username}
                  required
                  placeholder=" "
                  onfocus={() => usernameFocused = true}
                  onblur={() => usernameFocused = false}
                  class="peer w-full bg-white/[0.03] border border-white/[0.08] px-4 pt-5 pb-2 rounded-xl text-white font-medium focus:outline-none focus:border-accent-purple focus:bg-white/[0.05] transition-all duration-200 placeholder-transparent"
                />
                <label
                  for="username"
                  class="absolute left-4 text-sm font-semibold pointer-events-none transition-all duration-200
                    {usernameFocused || username ? 'top-1.5 text-[10px] text-accent-purple tracking-wider uppercase' : 'top-3.5 text-white/30'}"
                >
                  Username
                </label>
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

              <div class="flex gap-3">
                <button
                  type="button"
                  onclick={prevStep}
                  class="flex-1 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 text-white/60 font-bold py-3.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  class="flex-[2] bg-accent-purple text-white font-bold py-3.5 rounded-xl hover:bg-accent-purple/90 transition-all duration-200 shadow-lg shadow-accent-purple/20 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {#if isLoading}
                    <span class="inline-flex items-center gap-2">
                      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  {:else}
                    Create Account
                  {/if}
                </button>
              </div>
            </form>
          </div>
        {/if}

        <!-- Login Link -->
        <div class="mt-6 text-center text-sm text-white/30">
          Already have an account?
          <a href="/login" class="text-accent-purple font-bold hover:text-accent-purple/80 ml-1 transition-colors">Sign in</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Branding Panel -->
  <div class="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] border-l border-white/5 login-branding-panel">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-20 left-10 w-72 h-72 bg-accent-purple/15 rounded-full filter blur-[100px] animate-[float_8s_ease-in-out_infinite] login-blob-purple"></div>
      <div class="absolute bottom-32 right-10 w-60 h-60 bg-accent-purple/10 rounded-full filter blur-[80px] animate-[float_10s_ease-in-out_infinite_reverse] login-blob-purple"></div>
      <svg class="absolute inset-0 w-full h-full opacity-[0.04] login-grid-pattern" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="regGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" stroke-width="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#regGrid)" />
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

    <div class="relative z-10 max-w-md">
      <h1 class="text-4xl font-extrabold font-display text-white leading-tight mb-4">
        Start scanning your<br />
        <span class="text-accent-purple">codebase today</span>
      </h1>
      <p class="text-white/50 text-base leading-relaxed mb-10">
        Join thousands of developers who trust SecureGuard to keep their secrets out of production.
      </p>

      <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
        <div class="flex items-center gap-1 mb-3">
          {#each Array(5) as _}
            <svg class="w-4 h-4 text-accent-purple" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          {/each}
        </div>
        <p class="text-sm text-white/60 leading-relaxed italic mb-4">
          "SecureGuard caught 3 leaked AWS keys that our previous scanner completely missed. The AI analysis saved us from a potential breach."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center text-xs font-bold text-accent-purple">SR</div>
          <div>
            <div class="text-xs font-bold text-white/70">Sarah Rodriguez</div>
            <div class="text-[10px] text-white/30">Lead DevOps Engineer</div>
          </div>
        </div>
      </div>
    </div>

    <div class="relative z-10 flex items-center gap-10 text-xs font-bold text-white/30 uppercase tracking-wider login-stats">
      <div><span class="text-white text-lg font-extrabold">2.4M+</span><br>Repos Scanned</div>
      <div><span class="text-white text-lg font-extrabold">15s</span><br>Avg Scan Time</div>
      <div><span class="text-white text-lg font-extrabold">10K+</span><br>Developers</div>
    </div>
  </div>
</div>

<style>
  @keyframes float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-30px) scale(1.05); }
  }
</style>
