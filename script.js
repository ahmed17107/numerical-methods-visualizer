// ─── Shared helpers ───
function fEval(expr, x) {
  return math.evaluate(expr, { x });
}

function fmt(n, digits) {
  return n.toFixed(digits);
}

// ─── Solver functions ───
function solveBracket(method, funcExpr, xlInit, xuInit, epsilon) {
  const rows = [];
  let xl = xlInit, xu = xuInit, prevXr = 0;
  for (let i = 1; i <= 1000; i++) {
    const fxl = fEval(funcExpr, xl);
    const fxu = fEval(funcExpr, xu);
    let xr = method === "bisection" ? (xl + xu) / 2 : (xl * fxu - xu * fxl) / (fxu - fxl);
    const fxr = fEval(funcExpr, xr);
    const err = i === 1 ? 0 : Math.abs((xr - prevXr) / xr) * 100;
    rows.push({ iteration: i, xl, xu, xr, f_xl: fxl, f_xu: fxu, f_xr: fxr, error: err });
    if (err < epsilon && i > 1) break;
    if (fxl * fxr < 0) xu = xr; else xl = xr;
    prevXr = xr;
  }
  return rows;
}

// Fixed Point: derive g(x) from f(x)=0. For x³+ax+b=0 → g(x)=(4x+9)^(1/3)
// e.g. x³−4x−9=0 → x³=4x+9 → g(x)=nthRoot(4x+9, 3)
function deriveFixedPointG(funcExpr) {
  const s = String(funcExpr).replace(/\s/g, "").replace(/\*\*/g, "^");
  // Match x^3 ± a*x ± b  or  x^3 ± a*x ± b  (allow 1 as coefficient: x^3-4x-9)
  const m = s.match(/x\^3\s*([+-]?\d+(?:\.\d+)?)\s*\*?\s*x\s*([+-]?\d+(?:\.\d+)?)/) ||
            s.match(/x\^3([+-]\d+(?:\.\d+)?)\*?x([+-]\d+(?:\.\d+)?)/);
  if (m) {
    const aNum = parseFloat((m[1] || "0").replace(/\s/g, ""));
    const bNum = parseFloat((m[2] || "0").replace(/\s/g, ""));
    if (!isNaN(aNum) && !isNaN(bNum)) {
      const coef = -aNum;
      const cnst = -bNum;
      const inner = cnst >= 0 ? coef + "*x+" + cnst : coef + "*x" + cnst;
      return "(" + inner + ")^(1/3)";
    }
  }
  return null;
}

function solveFixedPoint(funcExpr, x0, epsilon, userG) {
  let gExpr = userG || deriveFixedPointG(funcExpr);
  if (!gExpr) gExpr = "x - (" + funcExpr + ")";
  const rows = [];
  let xi = x0;
  for (let i = 1; i <= 1000; i++) {
    const fxi = fEval(funcExpr, xi);
    const xiPlus1 = fEval(gExpr, xi);
    if (!isFinite(xiPlus1) || (typeof xiPlus1 === "number" && isNaN(xiPlus1))) break;
    const err = i === 1 ? 0 : (xiPlus1 === 0 ? 0 : Math.abs((xiPlus1 - xi) / xiPlus1) * 100);
    rows.push({ iteration: i, xi, fxi, xiPlus1, error: err });
    if (err < epsilon && i > 1) break;
    xi = xiPlus1;
  }
  return rows;
}

function solveNewton(funcExpr, dfExpr, x0, epsilon) {
  const rows = [];
  let xi = x0;
  for (let i = 1; i <= 1000; i++) {
    const fxi = fEval(funcExpr, xi);
    const fpxi = fEval(dfExpr, xi);
    if (Math.abs(fpxi) < 1e-15) break;
    const xiPlus1 = xi - fxi / fpxi;
    const err = i === 1 ? 0 : Math.abs((xiPlus1 - xi) / xiPlus1) * 100;
    rows.push({ iteration: i, xi, fxi, fpxi, xiPlus1, error: err });
    if (err < epsilon && i > 1) break;
    xi = xiPlus1;
  }
  return rows;
}

// ─── Detect page ───
const isOutputPage = !!document.getElementById("tableBody");

// ═══════════════════════════════════════════
// INDEX PAGE LOGIC
// ═══════════════════════════════════════════
if (!isOutputPage) {
  const methodSelect = document.getElementById("methodSelect");
  const methodBadge = document.getElementById("methodBadge");
  const inputSection = document.getElementById("inputSection");
  const errorBox = document.getElementById("errorBox");

  const funcRow = document.getElementById("funcRow");
  const gRow = document.getElementById("gRow");
  const dfRow = document.getElementById("dfRow");
  const xlRow = document.getElementById("xlRow");
  const xuRow = document.getElementById("xuRow");
  const x0Row = document.getElementById("x0Row");

  const methodNames = {
    bisection: "Bisection",
    falseposition: "False Position",
    fixedpoint: "Simple Fixed Point",
    newton: "Newton-Raphson",
  };

  methodSelect.addEventListener("change", function () {
    const m = this.value;
    errorBox.classList.add("hidden");

    if (!m) {
      inputSection.classList.add("hidden");
      methodBadge.classList.add("hidden");
      return;
    }

    inputSection.classList.remove("hidden");
    methodBadge.textContent = methodNames[m];
    methodBadge.classList.remove("hidden");

    const isBracket = m === "bisection" || m === "falseposition";
    const isFP = m === "fixedpoint";
    const isN = m === "newton";

    funcRow.classList.remove("hidden");
    gRow.classList.toggle("hidden", !isFP);
    dfRow.classList.toggle("hidden", !isN);
    xlRow.classList.toggle("hidden", !isBracket);
    xuRow.classList.toggle("hidden", !isBracket);
    x0Row.classList.toggle("hidden", isBracket);
  });

  document.getElementById("solveBtn").addEventListener("click", function () {
    const m = methodSelect.value;
    const eps = parseFloat(document.getElementById("epsilonInput").value);
    const digits = parseInt(document.getElementById("digitsInput").value) || 6;

    if (!m || isNaN(eps)) {
      errorBox.textContent = "Please fill all fields with valid numbers.";
      errorBox.classList.remove("hidden");
      return;
    }

    // Gather params and store in sessionStorage
    const params = { method: m, epsilon: eps, digits };

    try {
      if (m === "bisection" || m === "falseposition") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        const xl = parseFloat(document.getElementById("xlInput").value);
        const xu = parseFloat(document.getElementById("xuInput").value);
        if (!funcExpr || [xl, xu].some(isNaN)) { errorBox.textContent = "Please fill all fields."; errorBox.classList.remove("hidden"); return; }
        const fxl = fEval(funcExpr, xl);
        const fxu = fEval(funcExpr, xu);
        if (fxl * fxu >= 0) { errorBox.textContent = "Invalid interval: f(xl) and f(xu) must have opposite signs."; errorBox.classList.remove("hidden"); return; }
        params.funcExpr = funcExpr;
        params.xl = xl;
        params.xu = xu;
      } else if (m === "fixedpoint") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        const gExpr = document.getElementById("gExpr").value.trim();
        const x0 = parseFloat(document.getElementById("x0Input").value);
        if (!funcExpr || isNaN(x0)) { errorBox.textContent = "Please fill f(x) and x₀."; errorBox.classList.remove("hidden"); return; }
        params.funcExpr = funcExpr;
        params.gExpr = gExpr || null;
        params.x0 = x0;
      } else if (m === "newton") {
        const funcExpr = document.getElementById("funcExpr").value.trim();
        const dfExpr = document.getElementById("dfExpr").value.trim();
        const x0 = parseFloat(document.getElementById("x0Input").value);
        if (!funcExpr || !dfExpr || isNaN(x0)) { errorBox.textContent = "Please fill f(x), f'(x) and x₀."; errorBox.classList.remove("hidden"); return; }
        params.funcExpr = funcExpr;
        params.dfExpr = dfExpr;
        params.x0 = x0;
      }

      if (params.funcExpr) fEval(params.funcExpr, 1);
      if (params.gExpr) fEval(params.gExpr, 1);
      if (params.dfExpr) fEval(params.dfExpr, 1);

      sessionStorage.setItem("nmvParams", JSON.stringify(params));
      window.location.href = "output.html";
    } catch {
      errorBox.textContent = "Invalid expression. Use math.js syntax, e.g. x^3 - 4*x - 9";
      errorBox.classList.remove("hidden");
    }
  });
}

// ═══════════════════════════════════════════
// OUTPUT PAGE LOGIC
// ═══════════════════════════════════════════
if (isOutputPage) {
  const params = JSON.parse(sessionStorage.getItem("nmvParams") || "null");
  if (!params) { window.location.href = "index.html"; }

  const { method, epsilon, digits } = params;
  const methodNames = { bisection: "Bisection", falseposition: "False Position", fixedpoint: "Simple Fixed Point", newton: "Newton-Raphson" };
  document.getElementById("methodLabel").textContent = `Method: ${methodNames[method]}`;

  Chart.defaults.color = "hsl(215, 20%, 65%)";
  Chart.defaults.borderColor = "hsl(217, 33%, 25%)";

  let iterations = [];
  let visibleCount = 0;
  let finished = false;
  let funcChartInst = null, convChartInst = null, errChartInst = null;

  const isBracket = method === "bisection" || method === "falseposition";
  const isFP = method === "fixedpoint";
  const isN = method === "newton";

  // Build table header
  const tableHead = document.getElementById("tableHead");
  if (isBracket) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xl</th><th>f(xl)</th><th>xu</th><th>f(xu)</th><th>xr</th><th>f(xr)</th><th>Error %</th></tr>";
  } else if (isFP) {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ</th><th>f(xᵢ)</th><th>xᵢ₊₁</th><th>Error %</th></tr>";
  } else {
    tableHead.innerHTML = "<tr><th>Iter</th><th>xᵢ</th><th>f(xᵢ)</th><th>f'(xᵢ)</th><th>xᵢ₊₁</th><th>Error %</th></tr>";
  }

  // Solve
  if (isBracket) {
    iterations = solveBracket(method, params.funcExpr, params.xl, params.xu, epsilon);
  } else if (isFP) {
    iterations = solveFixedPoint(params.funcExpr, params.x0, epsilon, params.gExpr);
  } else {
    iterations = solveNewton(params.funcExpr, params.dfExpr, params.x0, epsilon);
  }

  if (!iterations.length && isFP) {
    document.body.innerHTML = "<div class=\"container\"><h1 class=\"title\">Error</h1><p class=\"error-box\">Fixed Point did not converge. Try different x₀.</p><a href=\"index.html\" class=\"back-link\">← Back</a></div>";
    throw new Error("No iterations");
  }

  // Render row
  function renderRow(row) {
    const tr = document.createElement("tr");
    if (isBracket) {
      tr.innerHTML = `<td>${row.iteration}</td><td>${fmt(row.xl, digits)}</td><td>${fmt(row.f_xl, digits)}</td><td>${fmt(row.xu, digits)}</td><td>${fmt(row.f_xu, digits)}</td><td class="highlight">${fmt(row.xr, digits)}</td><td>${fmt(row.f_xr, digits)}</td><td>${fmt(row.error, digits)}</td>`;
    } else if (isFP) {
      tr.innerHTML = `<td>${row.iteration}</td><td>${fmt(row.xi, digits)}</td><td>${fmt(row.fxi, digits)}</td><td class="highlight">${fmt(row.xiPlus1, digits)}</td><td>${fmt(row.error, digits)}</td>`;
    } else {
      tr.innerHTML = `<td>${row.iteration}</td><td>${fmt(row.xi, digits)}</td><td>${fmt(row.fxi, digits)}</td><td>${fmt(row.fpxi, digits)}</td><td class="highlight">${fmt(row.xiPlus1, digits)}</td><td>${fmt(row.error, digits)}</td>`;
    }
    document.getElementById("tableBody").appendChild(tr);
  }

  // Show first row
  renderRow(iterations[0]);
  visibleCount = 1;
  if (iterations.length === 1) { finished = true; showResult(); }

  // Get convergence value for a row
  function getXr(row) {
    if (isBracket) return row.xr;
    if (isFP) return row.xiPlus1;
    return row.xiPlus1;
  }

  // Charts
  const tooltipOpts = {
    backgroundColor: "hsl(217, 33%, 17%)",
    borderColor: "hsl(217, 33%, 25%)",
    borderWidth: 1,
    titleColor: "hsl(210, 40%, 98%)",
    bodyColor: "hsl(210, 40%, 98%)",
  };
  const gridColor = "hsl(217, 33%, 25%)";
  const tickColor = "hsl(215, 20%, 65%)";

  function updateCharts() {
    const visible = iterations.slice(0, visibleCount);
    const labels = visible.map(r => r.iteration);
    const xrData = visible.map(r => parseFloat(getXr(r).toFixed(digits)));
    const errData = visible.map(r => parseFloat(r.error.toFixed(digits)));

    // f(x) graph (all methods that have funcExpr)
    if (params.funcExpr) {
      const allX = isBracket
        ? visible.flatMap(r => [r.xl, r.xu, r.xr])
        : visible.flatMap(r => [r.xi, r.xiPlus1]);
      const minX = Math.min(...allX), maxX = Math.max(...allX);
      const pad = (maxX - minX) * 0.3 || 1;
      const lo = minX - pad, hi = maxX + pad, step = (hi - lo) / 200;
      const curve = [];
      for (let x = lo; x <= hi; x += step) {
        try { curve.push({ x: +x.toFixed(6), y: +fEval(params.funcExpr, x).toFixed(6) }); } catch {}
      }
      const roots = visible.map(r => ({
        x: +getXr(r).toFixed(digits),
        y: +fEval(params.funcExpr, getXr(r)).toFixed(digits),
      }));
      if (funcChartInst) funcChartInst.destroy();
      funcChartInst = new Chart(document.getElementById("functionChart"), {
        type: "scatter",
        data: {
          datasets: [
            { label: "f(x)", data: curve, showLine: true, borderColor: "hsl(187,92%,69%)", backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, order: 2 },
            { label: "xr approx", data: roots, borderColor: "hsl(0,84%,60%)", backgroundColor: "hsl(0,84%,60%)", pointRadius: 5, showLine: false, order: 1 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { tooltip: tooltipOpts },
          scales: { x: { grid: { color: gridColor }, ticks: { color: tickColor } }, y: { grid: { color: gridColor }, ticks: { color: tickColor } } },
        },
      });
    }

    // Convergence
    if (convChartInst) convChartInst.destroy();
    convChartInst = new Chart(document.getElementById("convergenceChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Root approximation", data: xrData, borderColor: "hsl(187,92%,69%)", backgroundColor: "hsl(187,92%,69%)", borderWidth: 2, pointRadius: 4, tension: 0.2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: tooltipOpts },
        scales: { x: { title: { display: true, text: "Iteration", color: tickColor }, grid: { color: gridColor }, ticks: { color: tickColor } }, y: { grid: { color: gridColor }, ticks: { color: tickColor } } },
      },
    });

    // Error
    if (errChartInst) errChartInst.destroy();
    errChartInst = new Chart(document.getElementById("errorChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Error %", data: errData, borderColor: "hsl(142,71%,45%)", backgroundColor: "hsl(142,71%,45%)", borderWidth: 2, pointRadius: 4, tension: 0.2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: tooltipOpts },
        scales: { x: { title: { display: true, text: "Iteration", color: tickColor }, grid: { color: gridColor }, ticks: { color: tickColor } }, y: { grid: { color: gridColor }, ticks: { color: tickColor } } },
      },
    });
  }

  updateCharts();

  function showResult() {
    document.getElementById("enterHint").classList.add("hidden");
    const root = getXr(iterations[iterations.length - 1]);
    document.getElementById("rootValue").textContent = "Root ≈ " + fmt(root, digits);
    document.getElementById("resultBox").classList.remove("hidden");
  }

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });

  // Enter key
  window.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !finished) {
      e.preventDefault();
      if (visibleCount < iterations.length) {
        renderRow(iterations[visibleCount]);
        visibleCount++;
        updateCharts();
        if (visibleCount >= iterations.length) {
          finished = true;
          showResult();
        }
      }
    }
  });
}
