<script>
  let {
    id,
    label = '',
    value = $bindable(''),
    placeholder = '',
    required = false,
    autocomplete = 'current-password',
    labelClass = 'text-sm',
    inputClass = 'py-3',
    wrapperClass = ''
  } = $props();

  let visible = $state(false);
</script>

<div class={wrapperClass}>
  {#if label}
    <label for={id} class="block {labelClass} font-bold text-dark-charcoal/70 mb-1.5">{label}</label>
  {/if}

  <div class="relative">
    <input
      type={visible ? 'text' : 'password'}
      {id}
      bind:value
      {required}
      {placeholder}
      {autocomplete}
      aria-label={label ? undefined : placeholder}
      class="w-full bg-bg-warm border border-dark-charcoal/15 pl-4 pr-12 {inputClass} rounded-xl text-sm font-semibold text-dark-charcoal focus:outline-none focus:border-accent-purple purple-glow-border transition-all"
    />
    <button
      type="button"
      onclick={() => (visible = !visible)}
      aria-controls={id}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      title={visible ? 'Hide password' : 'Show password'}
      class="absolute inset-y-0 right-0 flex items-center justify-center w-11 rounded-l-xl text-dark-charcoal/40 hover:text-accent-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-purple/50 focus-visible:text-accent-purple transition-colors cursor-pointer"
    >
      {#if visible}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.8 9.8 0 0112 5c5 0 9 4.5 9 7a8.9 8.9 0 01-2.2 3.6M6.2 6.7A8.9 8.9 0 003 12c0 2.5 4 7 9 7 1.2 0 2.4-.3 3.4-.8"></path>
        </svg>
      {:else}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.3 12S6 5 12 5s9.7 7 9.7 7-3.7 7-9.7 7-9.7-7-9.7-7z"></path>
          <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></circle>
        </svg>
      {/if}
    </button>
  </div>
</div>
