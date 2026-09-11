<script>
  import { fade, scale } from 'svelte/transition';

  let {
    options = [], // [{ value: '...', label: '...' }, ...] or ['...', ...]
    value = $bindable(''),
    onChange = null,
    placeholder = 'Select...',
    buttonClass = '',
    menuClass = ''
  } = $props();

  let isOpen = $state(false);
  let container = $state(null);

  const normalizedOptions = $derived(() => {
    return options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value ?? opt.id ?? opt.label,
          label: opt.label ?? opt.name ?? opt.projectName ?? String(opt.value),
          sub: opt.sub || ''
        };
      }
      return { value: opt, label: String(opt), sub: '' };
    });
  });

  const selectedOption = $derived(() => {
    return normalizedOptions().find(o => String(o.value) === String(value)) || null;
  });

  function toggleOpen(e) {
    if (e) e.stopPropagation();
    isOpen = !isOpen;
  }

  function selectItem(val, e) {
    if (e) e.stopPropagation();
    value = val;
    isOpen = false;
    if (onChange) onChange(val);
  }

  function handleWindowClick(e) {
    if (container && !container.contains(e.target)) {
      isOpen = false;
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeyDown} />

<div bind:this={container} class="relative inline-block text-left select-none">
  <!-- Trigger Button -->
  <button
    type="button"
    onclick={toggleOpen}
    class="flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-purple/20 {buttonClass || 'bg-bg-warm border border-dark-charcoal/15 px-3 py-1.5 rounded-xl text-xs font-semibold text-dark-charcoal shadow-sm hover:border-dark-charcoal/30'}"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    <span class="truncate">
      {#if selectedOption()}
        {selectedOption().label}
      {:else}
        <span class="text-dark-charcoal/50">{placeholder}</span>
      {/if}
    </span>

    <svg
      class="w-3.5 h-3.5 text-dark-charcoal/50 transition-transform duration-200 shrink-0 {isOpen ? 'rotate-180 text-accent-purple' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  </button>

  <!-- Animated Menu Popover -->
  {#if isOpen}
    <div
      in:scale={{ duration: 120, start: 0.96 }}
      out:fade={{ duration: 80 }}
      class="absolute right-0 sm:right-auto left-0 mt-1.5 min-w-[150px] max-h-56 overflow-y-auto z-[100] bg-card-warm border border-dark-charcoal/15 rounded-2xl shadow-xl p-1.5 backdrop-blur-md space-y-0.5 {menuClass}"
      role="listbox"
    >
      {#each normalizedOptions() as opt}
        {@const isSelected = String(opt.value) === String(value)}
        <button
          type="button"
          onclick={(e) => selectItem(opt.value, e)}
          class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer {isSelected ? 'bg-accent-purple/10 text-accent-purple font-bold' : 'text-dark-charcoal hover:bg-dark-charcoal/5'}"
          role="option"
          aria-selected={isSelected}
        >
          <div class="flex flex-col min-w-0">
            <span class="truncate">{opt.label}</span>
            {#if opt.sub}
              <span class="text-[10px] font-normal text-dark-charcoal/50 truncate">{opt.sub}</span>
            {/if}
          </div>

          {#if isSelected}
            <svg class="w-3.5 h-3.5 text-accent-purple shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
