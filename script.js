// Create ambient floating hearts background
function createAmbientHearts() {
  const bg = document.getElementById('ambient-bg');
  const heartSymbols = ['❤️', '💖', '💝', '💕', '🌸', '✨'];
  const maxHearts = 15;

  setInterval(() => {
    // Limit maximum background hearts to avoid performance issues
    if (bg.children.length >= maxHearts) return;

    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.innerText = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
    
    // Random placement and sizes
    heart.style.left = Math.random() * 100 + 'vw';
    heart.style.fontSize = (Math.random() * 1.5 + 0.8) + 'rem';
    
    // Random duration and delay
    const duration = Math.random() * 4 + 6; // 6s to 10s
    heart.style.animationDuration = duration + 's';
    
    bg.appendChild(heart);

    // Remove element after animation completes
    setTimeout(() => {
      heart.remove();
    }, duration * 1000);
  }, 800);
}

// Custom rose-petal confetti burst using canvas-confetti
function triggerRosePetalsConfetti() {
  const duration = 3.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 25, spread: 360, ticks: 80, zIndex: 10000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Initial big burst from center
  confetti({
    particleCount: 100,
    spread: 90,
    origin: { y: 0.6 },
    colors: ['#ff4d6d', '#ff758f', '#ff8fa3', '#ffccd5', '#ffffff']
  });

  // Continuous gentle stream from sides
  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 30 * (timeLeft / duration);
    
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#ff4d6d', '#ff758f', '#ff8fa3', '#ffccd5', '#ffffff']
    }));
    
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#ff4d6d', '#ff758f', '#ff8fa3', '#ffccd5', '#ffffff']
    }));
  }, 200);
}

// Bounding-box-restricted button evasion — reads target position to avoid animation lag loops
function initButtonEvasion(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.setAttribute('tabindex', '-1');
  btn.originalParent = btn.parentElement;

  const TRIGGER_RADIUS = 130; // px — starts evading earlier to keep distance
  const PUSH_DIST      = 160; // px — target distance from cursor to button centre
  const PADDING        = 20;  // px — safe gap from each viewport edge

  function evade(mx, my) {
    // Stop evading if the transition has already started (Yes button is disabled)
    const yesBtnId = btnId === 'no-btn-1' ? 'yes-btn-1' : 'yes-btn-2';
    const yesBtn = document.getElementById(yesBtnId);
    if (yesBtn && yesBtn.disabled) return;

    // Only evade when this button's parent card is the currently visible one
    const parentCardId = btnId === 'no-btn-1' ? 'state-1' : 'state-2';
    const parentCard = document.getElementById(parentCardId);
    if (!parentCard || !parentCard.classList.contains('active')) return;

    // Seed target coordinates and move to body on first evasion trigger
    if (!btn.classList.contains('evading')) {
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Create transparent placeholder to maintain card layout and prevent Yes button from shifting
      const placeholder = btn.cloneNode(true);
      placeholder.id = btnId + '-placeholder';
      placeholder.style.visibility = 'hidden';
      placeholder.style.pointerEvents = 'none';
      placeholder.classList.remove('evading');
      btn.parentNode.insertBefore(placeholder, btn);

      btn.targetX = rect.left;
      btn.targetY = rect.top;
      
      // Apply initial fixed position styles matching its current position
      btn.style.left = rect.left + 'px';
      btn.style.top  = rect.top  + 'px';
      
      // Move to document.body to bypass transformed ancestors/backdrop-filters
      document.body.appendChild(btn);
      btn.classList.add('evading');
    }

    const w = btn.offsetWidth;
    const h = btn.offsetHeight;

    // Bounding rect for live checking
    const rect = btn.getBoundingClientRect();
    const liveBx = rect.left + w / 2;
    const liveBy = rect.top + h / 2;
    const liveDx = liveBx - mx;
    const liveDy = liveBy - my;
    const liveDist = Math.sqrt(liveDx * liveDx + liveDy * liveDy);

    // Distance from cursor to target button centre
    const bx = btn.targetX + w / 2;
    const by = btn.targetY + h / 2;
    const dx = bx - mx;
    const dy = by - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const checkDist = Math.min(dist, liveDist);

    // Only act when cursor is within trigger radius
    if (checkDist > TRIGGER_RADIUS) return;

    // Dynamic transition speed: if the user moves their mouse extremely fast and gets close (< 85px),
    // disable the CSS transition entirely so the button snaps away instantly and is catch-proof.
    if (liveDist < 85) {
      btn.style.transition = 'none';
    } else {
      btn.style.transition = 'top 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }

    // Get boundaries
    const minX = PADDING,  maxX = window.innerWidth  - w - PADDING;
    const minY = PADDING,  maxY = window.innerHeight - h - PADDING;

    // Calculate proposed position (pushing away from cursor)
    const len = dist < 0.001 ? 1 : dist;
    let tx = mx + (dx / len) * PUSH_DIST - w / 2;
    let ty = my + (dy / len) * PUSH_DIST - h / 2;

    // Clamp to viewport bounds
    tx = Math.max(minX, Math.min(maxX, tx));
    ty = Math.max(minY, Math.min(maxY, ty));

    // Yes button collision check
    let yesRect = null;
    if (yesBtn) {
      yesRect = yesBtn.getBoundingClientRect();
    }

    function intersectsYes(x, y) {
      if (!yesRect) return false;
      const margin = 25; // safe separation distance
      return !(x + w < yesRect.left - margin || 
               x > yesRect.right + margin || 
               y + h < yesRect.top - margin || 
               y > yesRect.bottom + margin);
    }

    // If clamping reduced the distance too much, or if it collides with the Yes button, sweep 16 angles
    const cdist = Math.sqrt((tx + w / 2 - mx) ** 2 + (ty + h / 2 - my) ** 2);
    if (cdist < 85 || intersectsYes(tx, ty)) {
      let bestX = tx, bestY = ty, bestD = 0;
      for (let i = 0; i < 16; i++) {
        const theta = (i / 16) * Math.PI * 2;
        let ex = mx + Math.cos(theta) * PUSH_DIST - w / 2;
        let ey = my + Math.sin(theta) * PUSH_DIST - h / 2;
        ex = Math.max(minX, Math.min(maxX, ex));
        ey = Math.max(minY, Math.min(maxY, ey));
        
        // Skip directions that collide with the Yes button
        if (intersectsYes(ex, ey)) continue;

        const d = Math.sqrt((ex + w / 2 - mx) ** 2 + (ey + h / 2 - my) ** 2);
        if (d > bestD) {
          bestD = d;
          bestX = ex;
          bestY = ey;
        }
      }
      tx = bestX;
      ty = bestY;
    }

    // Save target coordinates and apply position styles
    btn.targetX = tx;
    btn.targetY = ty;
    btn.style.left = tx + 'px';
    btn.style.top  = ty + 'px';
  }

  window.addEventListener('mousemove',   (e) => evade(e.clientX, e.clientY));
  window.addEventListener('pointermove', (e) => evade(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) evade(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) evade(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
}

// Reset button positions on window resize to keep layout consistent
window.addEventListener('resize', () => {
  const buttons = document.querySelectorAll('.btn-no');
  buttons.forEach(btn => {
    btn.classList.remove('evading');
    btn.style.left = '';
    btn.style.top = '';
    btn.style.transition = '';
    btn.targetX = undefined;
    btn.targetY = undefined;
    if (btn.originalParent) {
      btn.originalParent.appendChild(btn);
    }
    const placeholder = document.getElementById(btn.id + '-placeholder');
    if (placeholder) placeholder.remove();
  });
});

// Setup state navigation and button actions
function setupProposalFlow() {
  const state1 = document.getElementById('state-1');
  const state2 = document.getElementById('state-2');
  const state3 = document.getElementById('state-3');

  const yesBtn1 = document.getElementById('yes-btn-1');
  const yesBtn2 = document.getElementById('yes-btn-2');

  const loveVideo = document.getElementById('love-video');

  // Transition helper (updated to prevent transform translate offset overrides)
  function transitionCards(fromCard, toCard) {
    fromCard.style.opacity = '0';
    fromCard.style.transform = 'scale(0.92)';
    fromCard.style.pointerEvents = 'none';

    setTimeout(() => {
      fromCard.classList.remove('active');
      toCard.classList.add('active');
      
      // Allow DOM repaint for active state
      setTimeout(() => {
        toCard.style.opacity = '1';
        toCard.style.transform = 'scale(1)';
        toCard.style.pointerEvents = 'auto';
      }, 50);
    }, 600); // Matches transition-duration in CSS
  }

  // Yes button 1 triggers State 2 transition
  yesBtn1.addEventListener('click', () => {
    triggerRosePetalsConfetti();
    yesBtn1.disabled = true; // prevent double triggers

    // Reset No button back to its card parent so it hides automatically
    const noBtn1 = document.getElementById('no-btn-1');
    if (noBtn1 && noBtn1.originalParent) {
      noBtn1.classList.remove('evading');
      noBtn1.style.left = '';
      noBtn1.style.top = '';
      noBtn1.style.transition = '';
      noBtn1.targetX = undefined;
      noBtn1.targetY = undefined;
      noBtn1.originalParent.appendChild(noBtn1);
      
      const placeholder = document.getElementById('no-btn-1-placeholder');
      if (placeholder) placeholder.remove();
    }

    setTimeout(() => {
      transitionCards(state1, state2);
    }, 1200);
  });

  // Yes button 2 triggers State 3 (Finale)
  yesBtn2.addEventListener('click', () => {
    triggerRosePetalsConfetti();
    yesBtn2.disabled = true; // prevent double triggers

    // Reset No button back to its card parent so it hides automatically
    const noBtn2 = document.getElementById('no-btn-2');
    if (noBtn2 && noBtn2.originalParent) {
      noBtn2.classList.remove('evading');
      noBtn2.style.left = '';
      noBtn2.style.top = '';
      noBtn2.style.transition = '';
      noBtn2.targetX = undefined;
      noBtn2.targetY = undefined;
      noBtn2.originalParent.appendChild(noBtn2);
      
      const placeholder = document.getElementById('no-btn-2-placeholder');
      if (placeholder) placeholder.remove();
    }

    setTimeout(() => {
      transitionCards(state2, state3);
      
      // Play video with audio enabled
      if (loveVideo) {
        loveVideo.muted = false;
        loveVideo.volume = 1.0;
        
        // Autoplay play call
        const playPromise = loveVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Autoplay was prevented initially. Showing controls: ", error);
            // Fallback: show standard play controls
            loveVideo.setAttribute('controls', 'true');
          });
        }
      }
    }, 1200);
  });
}

// Initial initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  createAmbientHearts();
  setupProposalFlow();
  initButtonEvasion('no-btn-1');
  initButtonEvasion('no-btn-2');
});
