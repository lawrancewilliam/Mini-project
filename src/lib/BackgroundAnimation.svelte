<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { appState } from '$lib/state.svelte.js';

  let canvas;
  let ctx;
  let animationFrameId;
  let width = 0;
  let height = 0;
  let mouse = { x: -1000, y: -1000, radius: 150 };

  const PARTICLE_COUNT = 45;

  class Particle {
    constructor(w, h) {
      this.reset(w, h, true);
    }

    reset(w, h, initial = false) {
      this.x = Math.random() * w;
      this.y = initial ? Math.random() * h : (Math.random() < 0.5 ? -10 : h + 10);
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = (Math.random() - 0.5) * 0.6;
      this.radius = Math.random() * 2 + 1.2;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.pulseSpeed = Math.random() * 0.02 + 0.008;
      this.pulseAngle = Math.random() * Math.PI * 2;
    }

    update(w, h) {
      this.x += this.vx;
      this.y += this.vy;

      // Mouse displacement
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouse.radius && dist > 0) {
        const force = (mouse.radius - dist) / mouse.radius;
        this.x -= (dx / dist) * force * 1.5;
        this.y -= (dy / dist) * force * 1.5;
      }

      // Wrap around bounds softly
      if (this.x < -20) this.x = w + 20;
      if (this.x > w + 20) this.x = -20;
      if (this.y < -20) this.y = h + 20;
      if (this.y > h + 20) this.y = -20;

      // Pulse opacity
      this.pulseAngle += this.pulseSpeed;
      this.currentAlpha = this.alpha + Math.sin(this.pulseAngle) * 0.15;
    }

    draw(ctx, isDark) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

      if (isDark) {
        ctx.fillStyle = `rgba(167, 139, 250, ${Math.max(0.1, this.currentAlpha)})`; // Purple glow
        ctx.shadowColor = 'rgba(124, 58, 237, 0.6)';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = `rgba(99, 102, 241, ${Math.max(0.15, this.currentAlpha)})`; // Indigo glow
        ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
        ctx.shadowBlur = 4;
      }

      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  let particles = [];

  function initParticles() {
    if (!width || !height) return;
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(width, height));
    }
  }

  function render() {
    if (!ctx || !width || !height) return;

    ctx.clearRect(0, 0, width, height);

    const isDark = browser ? (appState.theme === 'dark' || document.documentElement.classList.contains('dark')) : true;

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(width, height);
      particles[i].draw(ctx, isDark);
    }

    // Draw connecting lines between close particles
    const maxDistance = 130;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          const alpha = (1 - dist / maxDistance) * (isDark ? 0.25 : 0.2);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);

          if (isDark) {
            ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
          } else {
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
          }

          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    animationFrameId = requestAnimationFrame(render);
  }

  function handleResize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    }
  }

  function handleMouseMove(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function handleMouseLeave() {
    mouse.x = -1000;
    mouse.y = -1000;
  }

  onMount(() => {
    if (!browser || !canvas) return;
    ctx = canvas.getContext('2d');
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (browser) {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  });
</script>

<div class="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
  <!-- Glowing Ambient Blur Mesh Blobs -->
  <div class="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full filter blur-[140px] opacity-35 dark:opacity-30 bg-gradient-to-r from-purple-600 to-indigo-600 animate-float-slow"></div>
  <div class="absolute top-1/3 -right-24 w-[450px] h-[450px] rounded-full filter blur-[130px] opacity-30 dark:opacity-25 bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 animate-float-reverse"></div>
  <div class="absolute bottom-10 left-1/3 w-[550px] h-[550px] rounded-full filter blur-[160px] opacity-25 dark:opacity-20 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-800 animate-pulse-glow"></div>

  <!-- Cyber Grid Pattern Layer -->
  <div class="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-40"></div>

  <!-- Interactive Particles Canvas -->
  <canvas bind:this={canvas} class="absolute inset-0 w-full h-full"></canvas>
</div>
