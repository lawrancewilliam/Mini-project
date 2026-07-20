<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>SecurAI | AI-Assisted Sensitive Data Leakage Detection</title>
	<meta name="description" content="Identify hardcoded API keys, tokens, database credentials, and secret leaks with real-time AI security analysis." />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-bg-warm text-dark-charcoal selection:bg-accent-purple selection:text-white">
	{@render children()}
</div>

