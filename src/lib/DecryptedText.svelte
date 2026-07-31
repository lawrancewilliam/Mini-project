<script>
  import { onMount } from 'svelte';

  let {
    text = '',
    speed = 50,
    maxIterations = 10,
    sequential = false,
    revealDirection = 'start',
    useOriginalCharsOnly = false,
    characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
    className = '',
    parentClassName = '',
    encryptedClassName = '',
    animateOn = 'hover',
    clickMode = 'once'
  } = $props();

  let displayText = $state(text);
  let isAnimating = $state(false);
  let revealedIndices = $state(new Set());
  let hasAnimated = $state(false);
  let isDecrypted = $state(animateOn !== 'click');
  let direction = $state('forward');

  let intervalId = $state(null);
  let order = $state([]);
  let pointer = $state(0);

  let currentIteration = $state(0);

  let availableChars = $derived(
    useOriginalCharsOnly
      ? Array.from(new Set(text.split(''))).filter(char => char !== ' ')
      : characters.split('')
  );

  function shuffleText(originalText, currentRevealed) {
    return originalText
      .split('')
      .map((char, i) => {
        if (char === ' ') return ' ';
        if (currentRevealed.has(i)) return originalText[i];
        return availableChars[Math.floor(Math.random() * availableChars.length)];
      })
      .join('');
  }

  function computeOrder(len) {
    const orderArr = [];
    if (len <= 0) return orderArr;
    if (revealDirection === 'start') {
      for (let i = 0; i < len; i++) orderArr.push(i);
      return orderArr;
    }
    if (revealDirection === 'end') {
      for (let i = len - 1; i >= 0; i--) orderArr.push(i);
      return orderArr;
    }
    const middle = Math.floor(len / 2);
    let offset = 0;
    while (orderArr.length < len) {
      if (offset % 2 === 0) {
        const idx = middle + offset / 2;
        if (idx >= 0 && idx < len) orderArr.push(idx);
      } else {
        const idx = middle - Math.ceil(offset / 2);
        if (idx >= 0 && idx < len) orderArr.push(idx);
      }
      offset++;
    }
    return orderArr.slice(0, len);
  }

  function fillAllIndices() {
    const s = new Set();
    for (let i = 0; i < text.length; i++) s.add(i);
    return s;
  }

  function removeRandomIndices(set, count) {
    const arr = Array.from(set);
    for (let i = 0; i < count && arr.length > 0; i++) {
      const idx = Math.floor(Math.random() * arr.length);
      arr.splice(idx, 1);
    }
    return new Set(arr);
  }

  function getNextIndex(revealedSet) {
    const textLength = text.length;
    switch (revealDirection) {
      case 'start':
        return revealedSet.size;
      case 'end':
        return textLength - 1 - revealedSet.size;
      case 'center': {
        const middle = Math.floor(textLength / 2);
        const offset = Math.floor(revealedSet.size / 2);
        const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;
        if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
          return nextIndex;
        }
        for (let i = 0; i < textLength; i++) {
          if (!revealedSet.has(i)) return i;
        }
        return 0;
      }
      default:
        return revealedSet.size;
    }
  }

  function triggerDecrypt() {
    if (sequential) {
      order = computeOrder(text.length);
      pointer = 0;
      revealedIndices = new Set();
    } else {
      revealedIndices = new Set();
    }
    direction = 'forward';
    isAnimating = true;
    currentIteration = 0;
  }

  function triggerReverse() {
    if (sequential) {
      order = computeOrder(text.length).slice().reverse();
      pointer = 0;
      revealedIndices = fillAllIndices();
      displayText = shuffleText(text, fillAllIndices());
    } else {
      revealedIndices = fillAllIndices();
      displayText = shuffleText(text, fillAllIndices());
    }
    direction = 'reverse';
    isAnimating = true;
    currentIteration = 0;
  }

  function encryptInstantly() {
    const emptySet = new Set();
    revealedIndices = emptySet;
    displayText = shuffleText(text, emptySet);
    isDecrypted = false;
  }

  function handleClick() {
    if (animateOn !== 'click') return;

    if (clickMode === 'once') {
      if (isDecrypted) return;
      direction = 'forward';
      triggerDecrypt();
    }

    if (clickMode === 'toggle') {
      if (isDecrypted) {
        triggerReverse();
      } else {
        direction = 'forward';
        triggerDecrypt();
      }
    }
  }

  function triggerHoverDecrypt() {
    if (isAnimating) return;
    revealedIndices = new Set();
    isDecrypted = false;
    displayText = text;
    direction = 'forward';
    isAnimating = true;
    currentIteration = 0;
  }

  function resetToPlainText() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isAnimating = false;
    revealedIndices = new Set();
    displayText = text;
    isDecrypted = true;
    direction = 'forward';
    currentIteration = 0;
  }

  let containerEl = $state(null);

  onMount(() => {
    if (animateOn === 'click') {
      encryptInstantly();
    } else {
      displayText = text;
      isDecrypted = true;
    }
    revealedIndices = new Set();
    direction = 'forward';
  });

  // Animation loop
  $effect(() => {
    if (!isAnimating) return;

    const tick = () => {
      if (sequential) {
        if (direction === 'forward') {
          if (revealedIndices.size < text.length) {
            const nextIndex = getNextIndex(revealedIndices);
            revealedIndices.add(nextIndex);
            displayText = shuffleText(text, revealedIndices);
          } else {
            clearInterval(intervalId);
            isAnimating = false;
            isDecrypted = true;
          }
        } else if (direction === 'reverse') {
          if (pointer < order.length) {
            const idxToRemove = order[pointer++];
            revealedIndices.delete(idxToRemove);
            displayText = shuffleText(text, revealedIndices);
            if (revealedIndices.size === 0) {
              clearInterval(intervalId);
              isAnimating = false;
              isDecrypted = false;
            }
          } else {
            clearInterval(intervalId);
            isAnimating = false;
            isDecrypted = false;
          }
        }
      } else {
        if (direction === 'forward') {
          displayText = shuffleText(text, revealedIndices);
          currentIteration++;
          if (currentIteration >= maxIterations) {
            clearInterval(intervalId);
            isAnimating = false;
            displayText = text;
            isDecrypted = true;
          }
        } else if (direction === 'reverse') {
          let currentSet = revealedIndices;
          if (currentSet.size === 0) {
            currentSet = fillAllIndices();
          }
          const removeCount = Math.max(1, Math.ceil(text.length / Math.max(1, maxIterations)));
          const nextSet = removeRandomIndices(currentSet, removeCount);
          displayText = shuffleText(text, nextSet);
          currentIteration++;
          if (nextSet.size === 0 || currentIteration >= maxIterations) {
            clearInterval(intervalId);
            isAnimating = false;
            isDecrypted = false;
            displayText = shuffleText(text, new Set());
            revealedIndices = new Set();
          } else {
            revealedIndices = nextSet;
          }
        }
      }
    };

    intervalId = setInterval(tick, speed);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  });

  // View observer
  $effect(() => {
    if (animateOn !== 'view' && animateOn !== 'inViewHover') return;
    
    if (!containerEl) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated) {
          triggerDecrypt();
          hasAnimated = true;
        }
      });
    }, { threshold: 0.1 });

    observer.observe(containerEl);

    return () => {
      observer.unobserve(containerEl);
    };
  });
</script>

<span class={parentClassName} bind:this={containerEl}>
  <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;">
    {displayText}
  </span>
  
  <span aria-hidden="true">
    {#each displayText.split('') as char, index}
      <span class={revealedIndices.has(index) || (!isAnimating && isDecrypted) ? className : encryptedClassName}>
        {char}
      </span>
    {/each}
  </span>
</span>