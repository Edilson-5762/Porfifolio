document.addEventListener('DOMContentLoaded', () => {
    // Menu mobile
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    if (burger && nav) {
        burger.addEventListener('click', () => {
            const open = nav.classList.toggle('nav-active');
            burger.setAttribute('aria-expanded', String(open));
            burger.querySelector('i').className = open ? 'ph ph-x' : 'ph ph-list';
        });
    }

    // Borda do header ao rolar (IntersectionObserver, sem listener de scroll)
    const header = document.querySelector('.main-header');
    if (header && 'IntersectionObserver' in window) {
        const sentinel = document.createElement('div');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
        document.body.prepend(sentinel);
        new IntersectionObserver(([e]) => header.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);
    }

    // Revelar ao entrar na tela
    const items = document.querySelectorAll('[data-reveal]');
    const nth = new Map();
    items.forEach((el) => {
        if (el.style.getPropertyValue('--i')) return;
        const n = nth.get(el.parentElement) || 0;
        nth.set(el.parentElement, n + 1);
        el.style.setProperty('--i', Math.min(n, 5));
    });
    // rede de segurança: nada fica invisível se o observador falhar
    setTimeout(() => items.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-visible'); }), 3500);
    if ('IntersectionObserver' in window) {
        // entra: constrói; sai da tela: desfaz, para construir de novo na próxima vez
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                const need = Math.min(e.boundingClientRect.height * 0.12, 90);
                if (e.isIntersecting && e.intersectionRect.height >= need) e.target.classList.add('is-visible');
                else if (!e.isIntersecting) e.target.classList.remove('is-visible');
            });
        }, { threshold: Array.from({ length: 11 }, (_, i) => i / 10), rootMargin: '0px 0px -40px 0px' });
        items.forEach((el) => io.observe(el));
    } else {
        items.forEach((el) => el.classList.add('is-visible'));
    }

    // Retângulo em cache (coordenadas da página, renovado a cada 400 ms ou ao redimensionar): ler a posição a cada movimento do mouse forçava layout em todo evento
    const rectCache = new WeakMap();
    let rectEpoch = 0;
    addEventListener('resize', () => { rectEpoch++; });
    const cachedRect = (el, fixed) => {
        const now = performance.now();
        let c = rectCache.get(el);
        if (!c || now - c.t > 400 || c.epoch !== rectEpoch) {
            const r = el.getBoundingClientRect();
            c = { t: now, epoch: rectEpoch, l: r.left + (fixed ? 0 : scrollX), tp: r.top + (fixed ? 0 : scrollY), width: r.width, height: r.height };
            rectCache.set(el, c);
        }
        return { left: c.l - (fixed ? 0 : scrollX), top: c.tp - (fixed ? 0 : scrollY), width: c.width, height: c.height };
    };
    // Profundidade e rastro de luz. Só com mouse (hover: hover) e sem prefers-reduced-motion.
    // Estado de profundidade (-1..1, suavizado) aplicado em fotos, textos, monitores, estante e fotos de perfil.
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const scene = document.querySelector('.scene-bg.layered');
        const photo = scene && scene.querySelector('.photo');
        // Profundidade: grava translate/transform direto nos alvos (não usa variável herdada em <html>, que invalidava o estilo da página toda)
        const depthDefs = [
            ['.scene-bg .ph-back', -10, -6, 'transform'], ['.scene-bg .ph-front', 22, 14, 'transform'],
            ['.has-scene .hero-text, .has-scene .hero-content', -9, -5], ['.section h2, .section .lead', -6, -3],
            ['.m-portfolio-0', 16, 9], ['.m-portfolio-1, .m-portfolio-2', -12, -7],
            ['.bookcase', 12, 7], ['.shelf-frame', 5, 3],
            ['.service-icon, .polaroid-stack', 8, 5], ['.main-footer .footer-text', -5, 0],
        ];
        const depth = [];
        depthDefs.forEach(([sel, ax, ay, prop]) => document.querySelectorAll(sel).forEach((el) => depth.push({ el, ax, ay, prop, vis: false })));
        let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
        const write = (d) => {
            const x = (cx * d.ax).toFixed(2), y = (cy * d.ay).toFixed(2);
            if (d.prop) d.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            else d.el.style.translate = `${x}px ${y}px`;
        };
        // só move quem está na tela (antes eram ~30 elementos por quadro, a maioria fora da janela)
        if ('IntersectionObserver' in window) {
            const byEl = new Map(depth.map((d) => [d.el, d]));
            const io = new IntersectionObserver((es) => es.forEach((e) => { const d = byEl.get(e.target); d.vis = e.isIntersecting; if (d.vis) write(d); }), { rootMargin: '120px' });
            depth.forEach((d) => io.observe(d.el));
        } else depth.forEach((d) => { d.vis = true; });
        const tick = () => {
            cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
            depth.forEach((d) => { if (d.vis) write(d); });
            raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(tick) : 0;
        };

        // Rastro de luz: canvas de tela cheia, luz suave no cursor + fita que some.
        // Luzes pré-renderizadas em sprites (drawImage), DPR 1, no máx. 56 pontos e limpeza só da área suja.
        const cvs = document.createElement('canvas');
        cvs.id = 'cursor-trail';
        cvs.setAttribute('aria-hidden', 'true');
        cvs.hidden = true;
        document.body.appendChild(cvs);
        const ctx = cvs.getContext('2d');
        const sprite = (size, stops) => {
            const s = document.createElement('canvas');
            s.width = s.height = size;
            const c = s.getContext('2d'), g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
            stops.forEach(([o, col]) => g.addColorStop(o, col));
            c.fillStyle = g;
            c.fillRect(0, 0, size, size);
            return s;
        };
        const glowSpr = sprite(128, [[0, 'rgba(70, 211, 127, 0.15)'], [1, 'rgba(70, 211, 127, 0)']]);
        const dotSpr = sprite(64, [[0, 'rgba(190, 255, 215, 0.24)'], [0.5, 'rgba(70, 211, 127, 0.11)'], [1, 'rgba(70, 211, 127, 0)']]);
        let W = 0, H = 0;
        // canvas em meia resolução (a luz é suave): 4x menos pixels para pintar e enviar ao compositor a cada quadro
        const K = 0.5;
        const resize = () => { W = innerWidth; H = innerHeight; cvs.width = Math.ceil(W * K); cvs.height = Math.ceil(H * K); ctx.setTransform(K, 0, 0, K, 0, 0); };
        resize();
        addEventListener('resize', resize);
        const pts = [];
        let mx = -999, my = -999, sx = -999, sy = -999, trailRaf = 0, inside = false;
        let dirty = null;
        const frame = () => {
            if (inside) {
                if (sx < -900) { sx = mx; sy = my; }
                sx += (mx - sx) * 0.28; sy += (my - sy) * 0.28;
                const last = pts[pts.length - 1];
                if (!last) pts.push({ x: sx, y: sy, life: 1 });
                else {
                    const d = Math.hypot(sx - last.x, sy - last.y), n = Math.floor(d / 5);
                    for (let k = 1; k <= n; k++) pts.push({ x: last.x + (sx - last.x) * k / n, y: last.y + (sy - last.y) * k / n, life: 1 });
                }
                if (pts.length > 56) pts.splice(0, pts.length - 56);
            }
            if (dirty) ctx.clearRect(dirty.x, dirty.y, dirty.w, dirty.h);
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            const mark = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1;
            if (inside) { ctx.drawImage(glowSpr, sx - 240, sy - 240, 480, 480); mark(sx, sy, 240); }
            for (let i = pts.length - 1; i >= 0; i--) { pts[i].life -= 0.04; if (pts[i].life <= 0) pts.splice(i, 1); }
            for (const p of pts) {
                const r = 8 + p.life * 20;
                ctx.globalAlpha = p.life;
                ctx.drawImage(dotSpr, p.x - r, p.y - r, r * 2, r * 2);
                mark(p.x, p.y, r + 2);
            }
            ctx.globalAlpha = 1;
            ctx.lineCap = 'round';
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                if (Math.hypot(b.x - a.x, b.y - a.y) > 8) continue;
                ctx.strokeStyle = `rgba(236, 255, 242, ${(b.life * 0.45).toFixed(3)})`;
                ctx.lineWidth = 0.8 + b.life * 2.4;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            dirty = x1 > x0 ? { x: Math.max(0, Math.floor(x0)), y: Math.max(0, Math.floor(y0)), w: Math.ceil(x1 - x0) + 2, h: Math.ceil(y1 - y0) + 2 } : null;
            // para o loop quando parado (o último quadro, com a luz no cursor, fica na tela); sem luz nem pontos, o canvas some
            trailRaf = (pts.length || (inside && Math.hypot(mx - sx, my - sy) > 0.5)) ? requestAnimationFrame(frame) : 0;
            if (!trailRaf && !inside && !pts.length) cvs.hidden = true;
        };

        // Itens atraídos pelo cursor (efeito magnético, vale na tela toda): só movem quando o mouse chega perto
        const magnets = [...document.querySelectorAll('.btn, .nav-links a, .social-links a, .logo, .nav-count, .wa-fab')];
        magnets.forEach((el) => el.classList.add('magnet'));
        let magRaf = 0, lastE = null, magCache = [], magT = -1e9;
        // posições dos ímãs em cache (coordenadas da página): ler 25 retângulos a cada movimento forçava layout dezenas de vezes por quadro
        const refreshMag = () => {
            magT = performance.now();
            magCache = magnets.map((el) => {
                const r = el.getBoundingClientRect();
                return { el, x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY, reach: 70 + Math.max(r.width, r.height) / 2 };
            });
        };
        const magnetize = () => {
            magRaf = 0;
            if (performance.now() - magT > 600) refreshMag();
            const px = lastE.clientX + scrollX, py = lastE.clientY + scrollY;
            magCache.forEach((m) => {
                const dx = px - m.x, dy = py - m.y;
                if (Math.hypot(dx, dy) < m.reach) {
                    m.el.style.setProperty('--tx', (dx * 0.22).toFixed(1) + 'px');
                    m.el.style.setProperty('--ty', (dy * 0.22).toFixed(1) + 'px');
                    m.el.classList.add('mag-on');
                } else if (m.el.classList.contains('mag-on')) {
                    m.el.classList.remove('mag-on');
                }
            });
        };

        window.addEventListener('pointermove', (e) => {
            tx = (e.clientX / innerWidth - 0.5) * 2;
            ty = (e.clientY / innerHeight - 0.5) * 2;
            if (!raf) raf = requestAnimationFrame(tick);
            if (photo) {
                const r = cachedRect(photo, true);
                scene.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
                scene.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
                scene.style.setProperty('--glow', '1');
            }
            mx = e.clientX; my = e.clientY; inside = true; cvs.hidden = false;
            if (!trailRaf) trailRaf = requestAnimationFrame(frame);
            lastE = e;
            if (!magRaf) magRaf = requestAnimationFrame(magnetize);
        }, { passive: true });
        document.addEventListener('pointerleave', () => {
            tx = 0; ty = 0; inside = false;
            if (scene) scene.style.setProperty('--glow', '0');
            if (!raf) raf = requestAnimationFrame(tick);
            if (!trailRaf) trailRaf = requestAnimationFrame(frame);
            magnets.forEach((el) => el.classList.remove('mag-on'));
        });

        // Inclinação 3D + brilho que segue o cursor nos cartões e itens
        document.querySelectorAll('.project-card, .cert-card, .service-item, .skill-group, .cta-panel, .contact-info, .contact-form, .story-item, .info-item, .chips li, .stat, .dash-kpi, .dash-panel').forEach((el) => {
            el.classList.add('tilt');
            const glow = document.createElement('span');
            glow.className = 'tilt-glow';
            glow.setAttribute('aria-hidden', 'true');
            el.appendChild(glow);
            el.addEventListener('pointermove', (e) => {
                const r = cachedRect(el);
                const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                const amp = r.width > 600 ? 3 : 9;
                el.style.setProperty('--rx', ((0.5 - py) * amp).toFixed(2) + 'deg');
                el.style.setProperty('--ry', ((px - 0.5) * amp).toFixed(2) + 'deg');
                el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
                el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
                el.classList.add('tilt-on');
            });
            el.addEventListener('pointerleave', () => { el.classList.remove('tilt-on'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
        });
    }
    // Títulos interativos: letras reagem ao mouse (proximidade), clique faz onda + anel de luz, e um brilho varre o título de tempos em tempos.
    // Hover só com mouse; clique/toque e varredura valem em qualquer dispositivo; tudo desligado com prefers-reduced-motion.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
        document.querySelectorAll('.page-hero h1, .hero h1').forEach((h1) => {
            const text = h1.textContent.trim();
            h1.setAttribute('aria-label', text);
            h1.classList.add('title-fx');
            h1.textContent = '';
            const chars = [];
            text.split(/(\s+)/).forEach((part) => {
                if (/^\s+$/.test(part)) { h1.appendChild(document.createTextNode(' ')); return; }
                const word = document.createElement('span');
                word.className = 'tw';
                word.setAttribute('aria-hidden', 'true');
                [...part].forEach((ch) => {
                    const c = document.createElement('span');
                    c.className = 'tc';
                    c.textContent = ch;
                    word.appendChild(c);
                    chars.push(c);
                });
                h1.appendChild(word);
            });
            const intro = () => chars.forEach((c, i) => c.animate([{ transform: 'translateY(70%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 750, delay: 150 + i * 45, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
            intro();
            if ('IntersectionObserver' in window) {
                let out = false;
                new IntersectionObserver(([e]) => { if (!e.isIntersecting) out = true; else if (out) { out = false; intro(); } }).observe(h1);
            }
            const centers = () => chars.map((c) => { const r = c.getBoundingClientRect(); return { c, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });

            if (fine) {
                let raf = 0, last = null;
                const paint = () => {
                    raf = 0;
                    if (!last) return;
                    const R = Math.max(120, h1.getBoundingClientRect().height * 1.1);
                    centers().forEach(({ c, x, y }) => {
                        const f = Math.max(0, 1 - Math.hypot(last.clientX - x, last.clientY - y) / R);
                        c.style.setProperty('--f', (f * f).toFixed(3));
                    });
                };
                h1.addEventListener('pointermove', (e) => { last = e; if (!raf) raf = requestAnimationFrame(paint); });
                h1.addEventListener('pointerleave', () => { last = null; chars.forEach((c) => c.style.setProperty('--f', '0')); });
            }

            h1.addEventListener('pointerdown', (e) => {
                const ring = document.createElement('span');
                const hr = h1.getBoundingClientRect();
                ring.className = 'title-ring';
                ring.setAttribute('aria-hidden', 'true');
                ring.style.left = (e.clientX - hr.left) + 'px';
                ring.style.top = (e.clientY - hr.top) + 'px';
                h1.appendChild(ring);
                ring.addEventListener('animationend', () => ring.remove());
                centers().forEach(({ c, x, y }) => {
                    const d = Math.hypot(e.clientX - x, e.clientY - y);
                    const rot = (Math.random() - 0.5) * 22;
                    c.animate([
                        { transform: 'translateY(0) rotate(0deg) scale(1)', color: 'var(--accent)' },
                        { transform: `translateY(-34px) rotate(${rot}deg) scale(1.28)`, color: 'var(--accent)', offset: 0.35 },
                        { transform: 'translateY(0) rotate(0deg) scale(1)', color: 'var(--text)' },
                    ], { duration: 760, delay: Math.min(d * 0.7, 700), easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
                });
            });

            // varredura de brilho: a cada ~7 s, da esquerda para a direita
            setInterval(() => {
                if (document.hidden || h1.matches(':hover')) return;
                chars.forEach((c, i) => c.animate([
                    { color: 'var(--text)', textShadow: '0 0 0 rgba(70, 211, 127, 0)' },
                    { color: 'var(--accent)', textShadow: '0 0 22px rgba(70, 211, 127, 0.55)', offset: 0.4 },
                    { color: 'var(--text)', textShadow: '0 0 0 rgba(70, 211, 127, 0)' },
                ], { duration: 900, delay: i * 55, easing: 'ease-in-out' }));
            }, 7000);
        });
    }
    // Construção por rolagem: títulos de seção por linha, contadores e barra de progresso. Desligado com prefers-reduced-motion
    // (sem JS ou com movimento reduzido tudo aparece pronto: nada fica escondido).
    {
        const root = document.documentElement;
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

        // barra de progresso da página
        const bar = document.createElement('div');
        bar.className = 'scroll-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
        let barRaf = 0;
        const updateBar = () => {
            barRaf = 0;
            const max = document.documentElement.scrollHeight - innerHeight;
            bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
        };
        addEventListener('scroll', () => { if (!barRaf) barRaf = requestAnimationFrame(updateBar); }, { passive: true });
        updateBar();

        if (!reduce && 'IntersectionObserver' in window) {
            // contadores: contam de novo toda vez que entram na tela
            const counters = document.querySelectorAll('[data-count]');
            const cio = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    const el = e.target;
                    if (!e.isIntersecting) { el._tok = (el._tok || 0) + 1; el.textContent = '0'; el._run = false; const st = el.closest('.stat'); if (st) st.classList.remove('done'); return; }
                    if (el._run || e.intersectionRatio < 0.6) return;
                    el._run = true;
                    const end = Number(el.dataset.count), t0 = performance.now(), tok = ++el._tok;
                    const step = (t) => {
                        if (el._tok !== tok) return;
                        const k = Math.min(1, (t - t0) / 1600);
                        el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
                        if (k < 1) requestAnimationFrame(step); else { const st = el.closest('.stat'); if (st) st.classList.add('done'); }
                    };
                    requestAnimationFrame(step);
                });
            }, { threshold: [0, 0.6] });
            counters.forEach((el) => { el.textContent = '0'; cio.observe(el); });

            // títulos de seção por linha: sobem ao entrar, descem ao sair, repetem a cada vez
            const heads = [...document.querySelectorAll('main h2')];
            const build = (h) => {
                h.textContent = '';
                const words = h._text.split(' ').map((w, i, arr) => {
                    const s = document.createElement('span');
                    s.style.display = 'inline-block';
                    s.textContent = w;
                    h.appendChild(s);
                    if (i < arr.length - 1) h.appendChild(document.createTextNode(' '));
                    return s;
                });
                const lines = [];
                let top = null;
                words.forEach((w) => {
                    if (top === null || Math.abs(w.offsetTop - top) > 4) { lines.push([]); top = w.offsetTop; }
                    lines[lines.length - 1].push(w.textContent);
                });
                h.textContent = '';
                lines.forEach((l, i) => {
                    const ln = document.createElement('span');
                    ln.className = 'ln';
                    ln.setAttribute('aria-hidden', 'true');
                    const inner = document.createElement('span');
                    inner.className = 'ln-in';
                    inner.style.setProperty('--l', i);
                    inner.textContent = l.join(' ');
                    ln.appendChild(inner);
                    h.appendChild(ln);
                });
            };
            const split = () => {
                try {
                    heads.forEach((h) => {
                        h._text = h.textContent.trim().replace(/\s+/g, ' ');
                        h.removeAttribute('data-reveal');
                        h.setAttribute('aria-label', h._text);
                        build(h);
                    });
                } finally {
                    root.classList.remove('lines-pending');
                }
                const hio = new IntersectionObserver((entries) => {
                    entries.forEach((e) => {
                        const h = e.target;
                        if (e.isIntersecting && e.intersectionRect.height >= Math.min(e.boundingClientRect.height * 0.5, 60)) h.classList.add('lines-in');
                        else if (!e.isIntersecting) h.classList.remove('lines-in');
                    });
                }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20), rootMargin: '0px 0px -40px 0px' });
                heads.forEach((h) => hio.observe(h));
                let rt = 0;
                addEventListener('resize', () => {
                    clearTimeout(rt);
                    rt = setTimeout(() => heads.forEach((h) => {
                        const on = h.classList.contains('lines-in');
                        h.classList.add('no-tr');
                        build(h);
                        if (on) h.classList.add('lines-in');
                        void h.offsetWidth;
                        h.classList.remove('no-tr');
                    }), 250);
                });
            };
            (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(split);
        } else {
            root.classList.remove('lines-pending');
        }
    }
    // Globo de habilidades: ícones numa esfera 3D. Parado e sem cor no início; gira quando há movimento (mouse, toque, rolagem).
    // Passar o mouse destaca com a cor natural; clicar fixa o ícone na frente. Arrastar gira. Sem JS ou com movimento reduzido fica a grade.
    {
        const box = document.getElementById('skill-globe');
        if (box && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const stage = box.querySelector('.globe-stage');
            const items = [...box.querySelectorAll('.skill-tiles li')];
            const N = items.length;
            const touch = matchMedia('(hover: none)').matches;
            // ícones cinza pré-renderizados (sem filter: grayscale em tempo real): a versão colorida aparece em fade no destaque
            items.forEach((li) => {
                const img = li.querySelector('.gi img');
                if (!img || img.classList.contains('gi-gray')) return;
                const g = img.cloneNode();
                g.className = 'gi-gray';
                g.src = img.getAttribute('src').replace('/icons/', '/icons/gray/');
                g.loading = 'lazy';
                img.after(g);
            });
            box.classList.add('is-globe');
            const hint = box.querySelector('.globe-hint');
            if (hint) hint.textContent = touch ? 'O globo gira sozinho e destaca a ferramenta que passa pelo centro. Arraste para girar e toque numa ferramenta para fixar.' : 'O globo gira sozinho e destaca a ferramenta que passa pelo centro. Passe o mouse para girar mais rápido e destacar você mesmo.';

            // pontos na esfera (espiral de Fibonacci)
            const pts = items.map((_, i) => {
                const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), t = i * 2.399963;
                return { x: Math.cos(t) * r, y, z: Math.sin(t) * r };
            });
            const wrap = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
            let yaw = 0.5, pitch = 0.28, vy = 0, vp = 0, tvy = 0, tvp = 0;
            let dimK = 0, moveT = -1e9, ptr = null, gi = 72, R = 200, awake = true, mouseIn = false, spot = null, pinTimer = 0, t0 = performance.now(), visible = false, dragging = false, moved = 0, focus = null, hovered = null, pinned = null, raf = 0, last = 0, inside = false;

            const size = () => {
                const w = stage.clientWidth;
                R = w * 0.4;
                gi = Math.max(50, Math.min(78, w * 0.12));
                stage.style.setProperty('--gi', gi.toFixed(0) + 'px');
            };
            const render = () => {
                const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
                items.forEach((el, i) => {
                    const p = pts[i];
                    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
                    const y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
                    const d = (z2 + 1) / 2, k = 1 / (1 - z2 * 0.32);
                    el._sx = x1 * R * k; el._sy = -y2 * R * k; el._d = d; el._s = 0.6 + 0.52 * d;
                    // só grava o que mudou
                    const tr = `translate(-50%, -50%) translate(${el._sx.toFixed(1)}px, ${el._sy.toFixed(1)}px) scale(${el._s.toFixed(3)})`;
                    if (tr !== el._tr) { el._tr = tr; el.style.transform = tr; }
                    // com um ícone em destaque os outros escurecem pela opacidade do próprio <li> (GPU), sem repintar as imagens
                    const hot = el === hovered || el === pinned || el === spot;
                    const op = ((0.3 + 0.7 * Math.pow(d, 0.8)) * (hot ? 1 : 1 - 0.45 * dimK)).toFixed(2);
                    if (op !== el._op) { el._op = op; el.style.opacity = op; }
                    const z = Math.round(d * 100);
                    if (z !== el._z) { el._z = z; el.style.zIndex = z; }
                });
            };
            const frame = (t) => {
                raf = 0;
                const dt = Math.min(0.1, ((t - last) / 1000) || 0.016); // teto de 0,1 s: em máquina lenta o giro não perde velocidade
                last = t;
                if (focus) {
                    const dy = wrap(focus.yaw - yaw), dp = focus.pitch - pitch;
                    yaw += dy * Math.min(1, dt * 5); pitch += dp * Math.min(1, dt * 5);
                    vy = vp = 0;
                    if (Math.abs(dy) + Math.abs(dp) < 0.003) focus = null;
                } else if (!dragging) {
                    // o cursor só dirige/freia o globo enquanto se mexe; parado há 1,5 s, volta o giro automático (sem paradas nem disparos)
                    const steer = mouseIn && t - moveT < 1500;
                    const slow = pinned ? 0 : hovered && steer ? 0.4 : 1;
                    const k = Math.min(1, dt * (steer ? 1.8 : mouseIn ? 0.8 : 1.2)); // acelera/freia com suavidade; ao parar o mouse a velocidade volta devagar, sem queda brusca
                    vy += ((steer ? tvy : 0.45) * slow - vy) * k;
                    vp += ((steer ? tvp : 0) * slow - vp) * k;
                    yaw += vy * dt; pitch += vp * dt;
                    // sem mouse: a inclinação oscila devagar para todas as ferramentas passarem pelo ponto X
                    if (!mouseIn && !pinned) pitch += (0.75 * Math.sin((t - t0) / 1000 * 0.14) - pitch) * Math.min(1, dt * 0.9);
                    else if (Math.abs(pitch) > 1) pitch += (Math.sign(pitch) - pitch) * Math.min(1, dt * 2);
                }
                dimK += ((hovered || pinned || spot ? 1 : 0) - dimK) * Math.min(1, dt * 9);
                render();
                hitTest();
                if (visible && (awake || focus || dragging || Math.abs(vy) + Math.abs(vp) > 0.003)) raf = requestAnimationFrame(frame);
            };
            // destaque por posição do cursor (os ícones se movem, então não dá para depender de mouseenter)
            const hitTest = () => {
                let best = null, bd = 0.35;
                if (ptr && !dragging) {
                    items.forEach((el) => {
                        if (el._d > bd && Math.hypot(ptr.x - el._sx, ptr.y - el._sy) < (gi / 2) * el._s * 1.1) { best = el; bd = el._d; }
                    });
                }
                let hit = false;
                if (best !== hovered) { hovered = best; hit = true; }
                // ponto X (centro do globo): só vale sem mouse no globo, sem arrastar e sem ícone fixado
                let sp = null;
                if (!mouseIn && !pinned && !dragging) {
                    const near = (el) => el._d > 0.72 ? Math.hypot(el._sx, el._sy) : 1e9;
                    let cand = null, cd = Math.max(gi * 1.6, R * 0.5);
                    items.forEach((el) => { const d = near(el); if (d < cd) { cand = el; cd = d; } });
                    sp = cand;
                    if (spot && spot !== cand) {
                        const sd = near(spot);
                        if (sd < Math.max(gi * 1.8, R * 0.6) && (!cand || cd > sd - 10)) sp = spot;
                    }
                }
                if (sp !== spot) { spot = sp; hit = true; }
                if (hit) paint();
            };
            const go = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };

            // movimento do mouse na tela: acorda o globo; perto dele, a direção do cursor manda no giro
            const wake = () => { awake = true; go(); };
            // mouse entra no globo: o ponto X desliga; mouse sai: solta o fixado e o ponto X volta
            const mouseState = () => {
                box.classList.toggle('is-mouse', mouseIn);
                clearTimeout(pinTimer);
                if (mouseIn) { spot = null; } else { pinned = null; hovered = null; focus = null; ptr = null; }
                paint(); go();
            };
            document.documentElement.addEventListener('mouseleave', () => { if (mouseIn) { mouseIn = false; mouseState(); } });
            window.addEventListener('pointermove', (e) => {
                if (e.pointerType === 'touch') return;
                moveT = performance.now();
                const r = cachedRect(stage);
                const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
                const was = mouseIn;
                mouseIn = was ? (Math.abs(nx) < 1.12 && Math.abs(ny) < 1.12) : (Math.abs(nx) < 1 && Math.abs(ny) < 1);
                ptr = mouseIn ? { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) } : null;
                if (mouseIn) { tvy = Math.max(0.45, 0.35 + nx * 1.6); tvp = ny * 0.8; } // nunca inverte nem fica abaixo do giro automático: o cursor só acelera
                if (mouseIn !== was) mouseState();
                hitTest();
                go();
            }, { passive: true });
            window.addEventListener('scroll', wake, { passive: true });
            window.addEventListener('touchstart', wake, { passive: true });

            // arrastar para girar
            let px = 0, py = 0, pt = 0;
            stage.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                dragging = true; moved = 0; focus = null; px = e.clientX; py = e.clientY; pt = performance.now();
                stage.classList.add('dragging');
                awake = true; go();
            });
            window.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const now = performance.now(), dt = Math.max(0.008, (now - pt) / 1000);
                const dx = e.clientX - px, dy = e.clientY - py;
                moved += Math.abs(dx) + Math.abs(dy);
                yaw += dx * 0.009; pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.009));
                vy = Math.max(-5, Math.min(5, (dx * 0.009) / dt)); vp = Math.max(-3, Math.min(3, (dy * 0.009) / dt));
                px = e.clientX; py = e.clientY; pt = now;
                render();
            }, { passive: true });
            const endDrag = () => { if (!dragging) return; dragging = false; stage.classList.remove('dragging'); go(); };
            window.addEventListener('pointerup', endDrag);
            window.addEventListener('pointercancel', endDrag);

            // destaque (hover/foco) e fixar (clique)
            const paint = () => {
                items.forEach((el) => el.classList.toggle('is-hot', el === hovered || el === pinned || el === spot));
                box.classList.toggle('has-hot', !!(hovered || pinned || spot));
                box.classList.toggle('has-spot', !!spot);
            };
            const burst = (el) => {
                const ring = document.createElement('span');
                ring.className = 'globe-ring';
                el.appendChild(ring);
                ring.animate([{ transform: 'scale(1)', opacity: 0.95 }, { transform: 'scale(11)', opacity: 0 }], { duration: 750, easing: 'ease-out' }).onfinish = () => ring.remove();
                for (let i = 0; i < 10; i++) {
                    const dot = document.createElement('span'), a = (i / 10) * Math.PI * 2 + Math.random() * 0.4, dist = 60 + Math.random() * 50;
                    dot.className = 'globe-dot';
                    el.appendChild(dot);
                    dot.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist}px) scale(0.2)`, opacity: 0 }], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }).onfinish = () => dot.remove();
                }
            };
            const pin = (el) => {
                clearTimeout(pinTimer);
                if (pinned === el) { pinned = null; paint(); go(); return; }
                pinned = el;
                if (!mouseIn) pinTimer = setTimeout(() => { pinned = null; paint(); go(); }, 5000);
                const p = pts[items.indexOf(el)], rho = Math.hypot(p.x, p.z);
                focus = { yaw: yaw + wrap(Math.atan2(-p.x, p.z) - yaw), pitch: Math.atan2(p.y, rho) };
                paint(); burst(el); wake();
            };
            items.forEach((el) => {
                el.addEventListener('focus', () => { hovered = el; paint(); });
                el.addEventListener('blur', () => { if (hovered === el) { hovered = null; paint(); } });
                el.addEventListener('click', (e) => { e.stopPropagation(); if (moved > 6) { moved = 0; return; } pin(el); });
                el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pin(el); } });
            });
            stage.addEventListener('click', () => { if (moved > 6) { moved = 0; return; } if (pinned) { pinned = null; paint(); go(); } });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) { pinned = null; paint(); go(); } });

            const xm = document.createElement('div');
            xm.className = 'globe-x';
            xm.setAttribute('aria-hidden', 'true');
            stage.insertBefore(xm, stage.querySelector('.skill-tiles'));
            size();
            render();
            addEventListener('resize', () => { size(); render(); });
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) go(); }).observe(stage);
            } else { visible = true; }
        }
    }
});

// Formulário de contato: abre o WhatsApp com a mensagem pronta
document.addEventListener('submit', (e) => {
    const f = e.target;
    if (!f || f.id !== 'wa-form') return;
    e.preventDefault();
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : '');
    const texto = `Olá, Edilson! Sou ${v('name')} (${v('email')}).
Assunto: ${v('subject')}

${v('message')}`;
    window.open('https://api.whatsapp.com/send?phone=5561993998764&text=' + encodeURIComponent(texto), '_blank', 'noopener');
});

// Quadros de foto polaroid: ao entrar/sair o mouse (ou tocar), o cartão da frente é empurrado na direção do movimento, volta com mola e vai para trás
document.querySelectorAll('.polaroid-stack').forEach((st) => {
    const cards = [st.querySelector('.pol-a'), st.querySelector('.pol-b')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let flipped = false, last = 0;
    const kick = (card, dx, dy) => {
        if (reduce || !card.animate) return;
        const N = 30, dur = 760, w = 20, z = 0.5, frames = [];
        for (let i = 0; i <= N; i++) {
            const t = (i / N) * dur / 1000, k = Math.exp(-z * w * t) * Math.cos(w * t);
            frames.push({ translate: `${(dx * k).toFixed(2)}px ${(dy * k).toFixed(2)}px`, offset: i / N });
        }
        card.animate(frames, { duration: dur, easing: 'linear' });
    };
    const flip = (dx, dy) => {
        const now = performance.now();
        if (now - last < 250) return;
        last = now;
        kick(cards[flipped ? 1 : 0], dx, dy);
        flipped = !flipped;
        st.classList.toggle('is-flipped', flipped);
    };
    const dir = (e) => {
        const mx = e.movementX || 0, my = e.movementY || 0, l = Math.hypot(mx, my);
        return l > 0.5 ? [mx / l * 58, my / l * 58] : [46, -26];
    };
    st.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') flip(...dir(e)); });
    st.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') flip(...dir(e)); });
    st.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') flip(46, -26); });
    st.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(46, -26); } });
});
