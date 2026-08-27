<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { appState } from '$lib/state.svelte';

	let { children } = $props();

	onMount(() => {
		appState.applyTheme();
	});

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>SecureGuard | AI-Assisted Sensitive Data Leakage Detection</title>
	<meta name="description" content="Identify hardcoded API keys, tokens, database credentials, and secret leaks with real-time AI security analysis." />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-bg-warm text-dark-charcoal selection:bg-accent-purple selection:text-white">
	{@render children()}
</div>

<style>
	:global(::view-transition-old(root)),
	:global(::view-transition-new(root)) {
		animation-duration: 0.3s;
		animation-timing-function: ease-in-out;
	}
</style>
