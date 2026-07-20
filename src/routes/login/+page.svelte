<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let errorMsg = $state('');
  let isLoading = $state(false);

  function handleLogin(e) {
    if (e) e.preventDefault();
    errorMsg = '';
    isLoading = true;

    // Small timeout to simulate authentication check
    setTimeout(() => {
      const success = appState.login(email, password);
      isLoading = false;
      if (success) {
        goto('/dashboard');
      } else {
        errorMsg = 'Invalid email or password. Please use the demo accounts.';
      }
    }, 800);
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

<div class="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-bg-warm">
  <!-- Glowing Background Effect -->
  <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-purple rounded-full filter blur-[150px]"></div>
  </div>

  <div class="w-full max-w-md relative z-10">
    <!-- Back Link -->
    <a href="/" class="inline-flex items-center gap-2 text-sm font-semibold text-dark-charcoal/60 hover:text-accent-purple transition-colors mb-8">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
      </svg>
      Back to Home
    </a>

    <!-- Card Wrapper -->
    <div class="bg-card-warm rounded-3xl p-8 border border-dark-charcoal/10 shadow-xl purple-glow">
      <div class="text-center mb-8">
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
          <label for="password" class="block text-sm font-bold text-dark-charcoal/70 mb-2">Password</label>
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
          
          <button type="button" onclick={() => alert('Demo account reset: Use one of the quick autofill credentials below.')} class="font-bold text-accent-purple hover:underline cursor-pointer">
            Forgot Password?
          </button>
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

      <!-- Quick Demo Credentials -->
      <div class="mt-8 border-t border-dark-charcoal/10 pt-6">
        <div class="text-xs font-bold text-dark-charcoal/50 text-center uppercase tracking-wider mb-4">
          Quick Autofill Demo Accounts
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            onclick={() => autofill('admin')}
            class="bg-bg-warm border border-dark-charcoal/10 hover:border-accent-purple/40 rounded-xl p-2.5 text-center cursor-pointer transition-colors"
          >
            <div class="text-xs font-extrabold text-dark-charcoal">Admin Role</div>
            <div class="text-[10px] text-dark-charcoal/60 mt-0.5">admin@gmail.com</div>
          </button>
          
          <button
            type="button"
            onclick={() => autofill('developer')}
            class="bg-bg-warm border border-dark-charcoal/10 hover:border-accent-purple/40 rounded-xl p-2.5 text-center cursor-pointer transition-colors"
          >
            <div class="text-xs font-extrabold text-dark-charcoal">Developer Role</div>
            <div class="text-[10px] text-dark-charcoal/60 mt-0.5">developer@gmail.com</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
