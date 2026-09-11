<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onNavigate } from '$app/navigation';
	import { appState } from '$lib/state.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		appState.applyTheme(appState.theme);
	});

	// Smooth column-swap animation when navigating between /login and /register
	onNavigate(({ from, to }) => {
		if (typeof document === 'undefined' || !document.startViewTransition) return;
		const fromPath = from?.url.pathname;
		const toPath = to?.url.pathname;
		const AUTH_PATHS = ['/login', '/register'];
		if (!AUTH_PATHS.includes(fromPath) || !AUTH_PATHS.includes(toPath)) return;
		return new Promise((resolve) => {
			document.startViewTransition(() => resolve());
		});
	});
</script>

<svelte:head>
	<title>SecureGaurd | AI-Assisted Sensitive Data Leakage Detection</title>
	<meta name="description" content="Identify hardcoded API keys, tokens, database credentials, and secret leaks with real-time AI security analysis." />
	<link rel="icon" href={favicon} />
	<script>
		(function() {
			try {
				var t = localStorage.getItem('secureguard_theme') || 'dark';
				document.documentElement.setAttribute('data-theme', t);
				if (t === 'dark') {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.add('light');
				}
			} catch (e) {}
		})();
	</script>
</svelte:head>

<div class="min-h-screen bg-bg-warm text-dark-charcoal selection:bg-accent-purple selection:text-white transition-colors duration-250">
	{@render children()}
</div>

