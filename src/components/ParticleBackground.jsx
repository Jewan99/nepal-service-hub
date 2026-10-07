import React, { useEffect, useRef } from 'react';

export default function ParticleBackground({ color = '231, 162, 61' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx, w, h, particles, raf;
    let alive = true;

    try {
      ctx = canvas.getContext('2d');
      const COUNT = 42;

      function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = canvas.width = rect.width;
        h = canvas.height = rect.height;
      }
      function init() {
        particles = Array.from({ length: COUNT }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
        }));
      }
      function step() {
        if (!alive) return;
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 120) {
              ctx.strokeStyle = `rgba(${color}, ${0.16 * (1 - dist / 120)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        for (const p of particles) {
          ctx.fillStyle = `rgba(${color}, 0.6)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        raf = requestAnimationFrame(step);
      }

      resize();
      init();
      step();
      const onResize = () => { resize(); init(); };
      window.addEventListener('resize', onResize);
      return () => {
        alive = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
      };
    } catch (e) {
    }
  }, [color]);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}
