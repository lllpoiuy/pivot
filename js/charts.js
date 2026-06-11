/* ============================================================
   PIVOT — animated experiment-result charts
   Self-contained: vanilla JS + inline SVG, no external resources.
   Bars grow sequentially when each figure scrolls into view.
   Data, colors and axes mirror result_fig{1,2,3}.py exactly.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // --- shared palette (identical hues across the three figures) -------------
  var C = {
    blue:   '#2e6f95',  // Laundry
    orange: '#b5651d',  // Zip-tie
    green:  '#4f8a4a',  // Paper box
    wine:   '#8a3b5c',  // Sachet / hero
    slate:  '#6c7a89',  // neutral (base / single-task)
    ablDeep:  '#3f4751', // no-clip (collapsed)
    ablLight: '#a9b1bb', // A>0 (muted)
    ablText:  '#7d8893', // readable label for the light ablation
    ink:    '#222222',
    grid:   '#888888',
    spine:  '#444444',
    na:     '#888888'
  };

  // --- stat helpers (match the python scripts) ------------------------------
  function rate(s, t) { var p = s / t; return { v: p, sem: Math.sqrt(p * (1 - p) / t) }; }
  function val(m, sem) { return { v: m, sem: sem }; }

  // Fig1 per-panel alpha gradient (base lightest -> last iter solid)
  function ramp(n) {
    var a = []; for (var i = 0; i < n; i++) a.push(0.55 + (1.0 - 0.55) * (n === 1 ? 1 : i / (n - 1))); return a;
  }
  var R4 = ramp(4), R3 = ramp(3);

  // =========================================================================
  // FIGURE SPECS
  // =========================================================================
  // panel = { title, ylabel, rate, ymin, ymax, yticks, xmin, xmax,
  //           seps:[x..], bars:[{x,w,fill,alpha,v,sem,label,labelColor,
  //           labelBold,zero}], xticks:[{x,lines:[..]}] }

  function fig1Panel(title, color, isRate, ymin, ymax, yticks, items) {
    // items: [ [label, stat, alpha], ... ]
    var n = items.length, bars = [], xt = [], names = ['base', 'iter1', 'iter2', 'iter3'];
    for (var i = 0; i < n; i++) {
      var it = items[i];
      bars.push({ x: i, w: 0.62, fill: color, alpha: it[2], v: it[1].v, sem: it[1].sem,
                  label: it[0], labelColor: C.ink });
      xt.push({ x: i, lines: [names[i]] });
    }
    return { title: title, ylabel: isRate ? 'Success rate' : 'Throughput (items / h)',
             rate: isRate, ymin: ymin, ymax: ymax, yticks: yticks,
             xmin: -0.6, xmax: (n - 1) + 0.6, seps: [], bars: bars, xticks: xt };
  }

  var FIG1 = { panels: [
    fig1Panel('Laundry', C.blue, false, 40, 80, [40, 50, 60, 70, 80], [
      ['56.2', val(56.25, 5.18), R4[0]], ['65.1', val(65.12, 5.17), R4[1]],
      ['70.5', val(70.52, 5.91), R4[2]], ['70.9', val(70.95, 5.16), R4[3]]
    ]),
    fig1Panel('Zip-tie', C.orange, true, 0, 1, [0, .25, .5, .75, 1], [
      ['49%', rate(69, 140), R4[0]], ['64%', rate(65, 101), R4[1]],
      ['73%', rate(51, 70), R4[2]], ['86%', rate(60, 70), R4[3]]
    ]),
    fig1Panel('Paper box', C.green, true, 0, 1, [0, .25, .5, .75, 1], [
      ['60%', rate(24, 40), R3[0]], ['72%', rate(29, 40), R3[1]], ['82%', rate(33, 40), R3[2]]
    ]),
    fig1Panel('Sachet', C.wine, true, 0, 1, [0, .25, .5, .75, 1], [
      ['32%', rate(16, 50), R3[0]], ['58%', rate(29, 50), R3[1]], ['76%', rate(76, 100), R3[2]]
    ])
  ] };

  // ---- Fig 2 -------------------------------------------------------------
  // triplet order HG-DAgger, RECAP, Ours; offsets -0.24, 0, +0.24
  function f2bars(spec) {
    // spec.base = stat ; spec.methods = {color, iters:[s1,s2,s3], label3}
    // spec.abl = [{x, color, stat|zero, label}]
    var bars = [];
    bars.push({ x: 0, w: 0.55, fill: C.slate, alpha: 0.28, v: spec.base.v, sem: spec.base.sem,
                label: spec.baseLabel, labelColor: C.slate, labelBold: true });
    var offs = [-0.24, 0, 0.24];
    spec.methods.forEach(function (m, j) {
      for (var k = 0; k < 3; k++) {
        var st = m.iters[k];
        bars.push({ x: (k + 1) + offs[j], w: 0.22, fill: m.color, alpha: 0.55, v: st.v, sem: st.sem,
                    label: (k === 2 ? m.label3 : null), labelColor: m.color, labelBold: true });
      }
    });
    spec.abl.forEach(function (a) {
      bars.push({ x: a.x, w: 0.36, fill: a.color, alpha: 0.55, v: a.zero ? 0 : a.stat.v,
                  sem: a.zero ? 0 : a.stat.sem, label: a.label, labelColor: a.textColor || a.color,
                  labelBold: true, zero: !!a.zero });
    });
    return bars;
  }
  var F2_XT = [{ x: 0, lines: ['base'] }, { x: 1, lines: ['iter1'] }, { x: 2, lines: ['iter2'] },
               { x: 3, lines: ['iter3'] }, { x: 4, lines: ['no clip'] }, { x: 5, lines: ['A>0 only'] }];

  var FIG2 = { panels: [
    { title: 'Laundry', ylabel: 'Throughput (items / h)', rate: false, ymin: 45, ymax: 80,
      yticks: [50, 60, 70, 80], xmin: -0.7, xmax: 5.7, seps: [0.5, 3.5], xticks: F2_XT,
      bars: f2bars({
        base: val(56.25, 5.18), baseLabel: '56',
        methods: [
          { color: C.orange, label3: '59', iters: [val(58.26, 4.69), val(58.79, 5.30), val(59.37, 5.28)] },
          { color: C.blue,   label3: '65', iters: [val(60.99, 5.55), val(65.65, 4.51), val(64.81, 4.67)] },
          { color: C.wine,   label3: '71', iters: [val(65.12, 5.17), val(70.52, 5.91), val(70.95, 5.16)] }
        ],
        abl: [
          { x: 4, color: C.ablDeep, zero: true, label: '0' },
          { x: 5, color: C.ablLight, textColor: C.ablText, stat: val(61.54, 4.36), label: '62' }
        ]
      }) },
    { title: 'Zip-tie', ylabel: 'Success rate', rate: true, ymin: 0.2, ymax: 1.0,
      yticks: [.2, .4, .6, .8, 1], xmin: -0.7, xmax: 5.7, seps: [0.5, 3.5], xticks: F2_XT,
      bars: f2bars({
        base: rate(69, 140), baseLabel: '49%',
        methods: [
          { color: C.orange, label3: '51%', iters: [rate(32, 63), rate(38, 70), rate(41, 80)] },
          { color: C.blue,   label3: '55%', iters: [rate(14, 39), rate(45, 70), rate(34, 62)] },
          { color: C.wine,   label3: '86%', iters: [rate(65, 101), rate(51, 70), rate(60, 70)] }
        ],
        abl: [
          { x: 4, color: C.ablDeep, zero: true, label: '0%' },
          { x: 5, color: C.ablLight, textColor: C.ablText, stat: rate(42, 70), label: '60%' }
        ]
      }) }
  ], legend: {
    items: [
      { color: C.slate, alpha: 0.28, label: 'Base SFT' },
      { color: C.orange, alpha: 0.55, label: 'HG-DAgger' },
      { color: C.blue, alpha: 0.55, label: 'RECAP' },
      { color: C.wine, alpha: 0.55, label: 'Ours', bold: true },
      { color: C.ablDeep, alpha: 0.55, label: 'no clip', italic: true },
      { color: C.ablLight, alpha: 0.55, label: 'A>0 data only', italic: true }
    ], note: 'Error bars: ±1 SEM.'
  } };

  // ---- Fig 3 -------------------------------------------------------------
  var F3_X = [0, 1, 2.18, 3.18];
  var F3_XT = [{ x: 0, lines: ['ST', 'base'] }, { x: 1, lines: ['Uni.', 'base'] },
               { x: 2.18, lines: ['ST', 'PIVOT'] }, { x: 3.18, lines: ['Uni.', 'PIVOT'] }];
  function f3Panel(title, accent, isRate, ymin, ymax, yticks, stats, labels) {
    // stats aligned: [ST base, Uni base, ST PIVOT, Uni PIVOT]
    var cols = [C.slate, accent, C.slate, accent], alphas = [0.38, 0.38, 1.0, 1.0], bars = [];
    for (var i = 0; i < 4; i++) {
      bars.push({ x: F3_X[i], w: 0.6, fill: cols[i], alpha: alphas[i], v: stats[i].v,
                  sem: stats[i].sem, label: labels[i], labelColor: C.ink });
    }
    return { title: title, ylabel: isRate ? 'Success rate' : 'Throughput (items / h)',
             rate: isRate, ymin: ymin, ymax: ymax, yticks: yticks, xmin: -0.7, xmax: 3.88,
             seps: [1.59], xticks: F3_XT, bars: bars };
  }
  var FIG3 = { panels: [
    f3Panel('Laundry', C.blue, false, 30, 85, [30, 40, 50, 60, 70, 80],
      [val(56.25, 5.18), val(53.94, 5.66), val(70.95, 5.16), val(67.22, 5.66)],
      ['56.2', '53.9', '70.9', '67.2']),
    f3Panel('Zip-tie', C.orange, true, 0, 1, [0, .25, .5, .75, 1],
      [rate(69, 140), rate(44, 80), rate(60, 70), rate(61, 70)],
      ['49%', '55%', '86%', '87%']),
    f3Panel('Sachet', C.wine, true, 0, 1, [0, .25, .5, .75, 1],
      [rate(16, 50), rate(17, 50), rate(76, 100), rate(78, 100)],
      ['32%', '34%', '76%', '78%'])
  ], legend: {
    items: [
      { color: C.slate, alpha: 0.38, label: 'Single-task  (base)' },
      { color: '#3f3f3f', alpha: 0.38, label: 'Unified  (base)' },
      { color: C.slate, alpha: 1.0, label: 'Single-task  (+ PIVOT)' },
      { color: '#3f3f3f', alpha: 1.0, label: 'Unified  (+ PIVOT)', bold: true }
    ], note: 'Error bars: ±1 SEM.'
  } };

  var FIGS = { fig1: FIG1, fig2: FIG2, fig3: FIG3 };

  // =========================================================================
  // RENDERER
  // =========================================================================
  var ML = 46, MR = 12, MT = 28, MB = 42, PH = 168, PXX = 58; // layout (viewBox units)

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pct(t) { return Math.round(t * 100) + '%'; }

  // returns { node: <div.chart-panel>, anim: [{bar, err, label}...] (reading order) }
  function renderPanel(p) {
    var pw = (p.xmax - p.xmin) * PXX;
    var VBW = ML + pw + MR, VBH = MT + PH + MB;
    var svg = el('svg', { viewBox: '0 0 ' + VBW + ' ' + VBH, class: 'chart-svg',
                          role: 'img', 'aria-label': p.title });
    function px(x) { return ML + (x - p.xmin) / (p.xmax - p.xmin) * pw; }
    function py(y) { return MT + PH - (y - p.ymin) / (p.ymax - p.ymin) * PH; }
    var base = MT + PH;

    // gridlines + y ticks
    p.yticks.forEach(function (t) {
      var y = py(t);
      svg.appendChild(el('line', { x1: ML, y1: y, x2: ML + pw, y2: y, stroke: C.grid,
        'stroke-width': 0.6, 'stroke-dasharray': '1,3', 'stroke-opacity': 0.6 }));
      var tl = el('text', { x: ML - 6, y: y + 3, class: 'tick', 'text-anchor': 'end' });
      tl.textContent = p.rate ? pct(t) : t;
      svg.appendChild(tl);
    });
    // spines
    svg.appendChild(el('line', { x1: ML, y1: MT, x2: ML, y2: base, stroke: C.spine, 'stroke-width': 0.7 }));
    svg.appendChild(el('line', { x1: ML, y1: base, x2: ML + pw, y2: base, stroke: C.spine, 'stroke-width': 0.7 }));
    // region separators
    (p.seps || []).forEach(function (sx) {
      svg.appendChild(el('line', { x1: px(sx), y1: MT, x2: px(sx), y2: base, stroke: '#bbbbbb',
        'stroke-width': 0.6, 'stroke-dasharray': '1,2.5' }));
    });
    // title
    var ti = el('text', { x: ML + pw / 2, y: 16, class: 'ptitle', 'text-anchor': 'middle' });
    ti.textContent = p.title; svg.appendChild(ti);
    // y label (rotated)
    var yl = el('text', { x: 13, y: MT + PH / 2, class: 'ylabel', 'text-anchor': 'middle',
      transform: 'rotate(-90 13 ' + (MT + PH / 2) + ')' });
    yl.textContent = p.ylabel; svg.appendChild(yl);
    // x tick labels
    p.xticks.forEach(function (xt) {
      xt.lines.forEach(function (ln, i) {
        var t = el('text', { x: px(xt.x), y: base + 15 + i * 11, class: 'tick', 'text-anchor': 'middle' });
        t.textContent = ln; svg.appendChild(t);
      });
    });

    var anim = [];
    p.bars.forEach(function (b) {
      var cx = px(b.x), x0 = px(b.x - b.w / 2), x1 = px(b.x + b.w / 2), w = x1 - x0;
      var top, h;
      if (b.zero) { h = 4; top = base - h; }
      else { top = py(b.v); h = base - top; }
      var rect = el('rect', { x: x0, y: top, width: w, height: Math.max(h, 0.5),
        fill: b.fill, 'fill-opacity': b.alpha, stroke: b.fill, 'stroke-width': 1, class: 'bar' });
      svg.appendChild(rect);

      // error whisker (skip for zero glyph)
      var errG = null;
      if (!b.zero && b.sem > 0) {
        errG = el('g', { class: 'err' });
        var yTop = py(b.v + b.sem), yBot = py(Math.max(b.v - b.sem, p.ymin));
        errG.appendChild(el('line', { x1: cx, y1: yTop, x2: cx, y2: yBot, stroke: C.ink, 'stroke-width': 0.9 }));
        errG.appendChild(el('line', { x1: cx - 3, y1: yTop, x2: cx + 3, y2: yTop, stroke: C.ink, 'stroke-width': 0.9 }));
        errG.appendChild(el('line', { x1: cx - 3, y1: yBot, x2: cx + 3, y2: yBot, stroke: C.ink, 'stroke-width': 0.9 }));
        svg.appendChild(errG);
      }
      // value label
      var lbl = null;
      if (b.label) {
        var ly = (b.zero ? base - h : py(b.v + b.sem)) - 5;
        lbl = el('text', { x: cx, y: ly, 'text-anchor': 'middle', class: 'vlabel',
          fill: b.labelColor || C.ink });
        if (b.labelBold) lbl.setAttribute('font-weight', '700');
        lbl.textContent = b.label;
        svg.appendChild(lbl);
      }
      anim.push({ bar: rect, err: errG, label: lbl });
    });

    var wrap = document.createElement('div');
    wrap.className = 'chart-panel';
    wrap.style.flex = VBW + ' 1 0';
    wrap.appendChild(svg);
    return { node: wrap, anim: anim, vbw: VBW };
  }

  function renderLegend(L) {
    var box = document.createElement('div');
    box.className = 'chart-legend';
    L.items.forEach(function (it) {
      var row = document.createElement('div'); row.className = 'leg-row';
      var sw = document.createElement('span'); sw.className = 'leg-swatch';
      sw.style.background = it.color; sw.style.opacity = it.alpha;
      sw.style.borderColor = it.color;
      var tx = document.createElement('span'); tx.className = 'leg-label'; tx.textContent = it.label;
      if (it.bold) tx.style.fontWeight = '700';
      if (it.italic) tx.style.fontStyle = 'italic';
      row.appendChild(sw); row.appendChild(tx); box.appendChild(row);
    });
    if (L.note) {
      var n = document.createElement('div'); n.className = 'leg-note'; n.textContent = L.note;
      box.appendChild(n);
    }
    return box;
  }

  // --- animation timing ----------------------------------------------------
  var STAGGER = 85, LABEL_OFFSET = 360;
  function wire(anim, startOrder) {
    var order = startOrder;
    anim.forEach(function (a) {
      var d = order * STAGGER;
      a.bar.style.transitionDelay = d + 'ms';
      if (a.err) a.err.style.transitionDelay = (d + LABEL_OFFSET) + 'ms';
      if (a.label) a.label.style.transitionDelay = (d + LABEL_OFFSET) + 'ms';
      order++;
    });
    return order;
  }

  function build(row) {
    var spec = FIGS[row.getAttribute('data-fig')];
    if (!spec) return;
    var order = 0;
    spec.panels.forEach(function (p) {
      var r = renderPanel(p);
      row.appendChild(r.node);
      order = wire(r.anim, order);
    });
    if (spec.legend) row.appendChild(renderLegend(spec.legend));
  }

  function init() {
    var rows = document.querySelectorAll('.figrow[data-fig]');
    rows.forEach(build);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.2) e.target.classList.add('run');
        else if (!e.isIntersecting) e.target.classList.remove('run'); // replay on re-entry
      });
    }, { threshold: [0, 0.2, 0.5] });
    rows.forEach(function (r) { io.observe(r); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
