<script>
  import { appState } from '$lib/state.svelte';
  import { goto } from '$app/navigation';

  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let password = $state('');
  let role = $state('Developer'); // Default
  let errorMsg = $state('');
  let isLoading = $state(false);

  function handleRegister(e) {
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
    
    // Simulate server delay
    setTimeout(() => {
      const fullName = `${firstName} ${lastName}`.trim();
      appState.register(fullName, email, role);
      isLoading = false;
      goto('/dashboard');
    }, 800);
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
            Sign Up
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
