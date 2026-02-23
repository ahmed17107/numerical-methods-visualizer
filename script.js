// ─── State ───
let method = "";
let iterations = [];
let visibleCount = 0;
let solved = false;
let finished = false;

// ─── DOM Elements ───
const methodSelect = document.getElementById("methodSelect");
const methodBadge = document.getElementById("methodBadge");
const inputSection = document.getElementById("inputSection");
const funcExprInput = document.getElementById("funcExpr");
const xlInput = document.getElementById("xlInput");
const xuInput = document.getElementById("xuInput");
const epsilonInput = document.getElementById("epsilonInput");
const digitsInput = document.getElementById("digitsInput");
const solveBtn = document.getElementById("solveBtn");
const enterHint = document.getElementById("enterHint");
const errorBox = document.getElementById("errorBox");
const tableCard = document.getElementById("tableCard");
const tableBody = document.getElementById("tableBody");
const resultBox = document.getElementById("resultBox");
const rootValue = document.getElementById("rootValue");

// ─── Helpers ───
function f(expr, x) {
  return math.evaluate(expr, { x });
}

function fmt(n, digits) {
  return n.toFixed(digits);
}

function reset() {
  iterations = [];
  visibleCount = 0;
  solved = false;
  finished = false;
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
  tableCard.classList.add("hidden");
  tableBody.innerHTML = "";
  resultBox.classList.add("hidden");
  enterHint.classList.add("hidden");
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function getDigits() {
  return parseInt(digitsInput.value) || 6;
}

// ─── Solve ───
function solveMethod(method, funcExpr, xlInit, xuInit, epsilon) {
  const rows = [];
  let xlVal = xlInit;
  let xuVal = xuInit;
  let prevXr = 0;

  for (let i = 1; i <= 1000; i++) {
    const fxlCur = f(funcExpr, xlVal);
    const fxuCur = f(funcExpr, xuVal);

    let xr;
    if (method === "bisection") {
      xr = (xlVal + xuVal) / 2;
    } else {
      xr = (xlVal * fxuCur - xuVal * fxlCur) / (fxuCur - fxlCur);
    }

    const fxr = f(funcExpr, xr);
    const err = i === 1 ? 0 : Math.abs((xr - prevXr) / xr) * 100;

    rows.push({
      iteration: i,
      xl: xlVal,
      xu: xuVal,
      xr,
      f_xl: fxlCur,
      f_xu: fxuCur,
      f_xr: fxr,
      error: err,
    });

    if (err < epsilon && i > 1) break;

    if (fxlCur * fxr < 0) {
      xuVal = xr;
    } else {
      xlVal = xr;
    }
    prevXr = xr;
  }

  return rows;
}

function renderRow(row) {
  const digits = getDigits();
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${row.iteration}</td>
    <td>${fmt(row.xl, digits)}</td>
    <td>${fmt(row.f_xl, digits)}</td>
    <td>${fmt(row.xu, digits)}</td>
    <td>${fmt(row.f_xu, digits)}</td>
    <td class="xr-cell">${fmt(row.xr, digits)}</td>
    <td>${fmt(row.f_xr, digits)}</td>
    <td>${fmt(row.error, digits)}</td>
  `;
  tableBody.appendChild(tr);
}

function handleSolve() {
  reset();

  const funcExpr = funcExprInput.value.trim();
  const xlVal = parseFloat(xlInput.value);
  const xuVal = parseFloat(xuInput.value);
  const eps = parseFloat(epsilonInput.value);

  if (!funcExpr || [xlVal, xuVal, eps].some(isNaN)) {
    showError("Please fill all fields with valid numbers.");
    return;
  }

  try {
    const fxl = f(funcExpr, xlVal);
    const fxu = f(funcExpr, xuVal);

    if (fxl * fxu >= 0) {
      showError("Invalid interval: f(xl) and f(xu) must have opposite signs.");
      return;
    }

    iterations = solveMethod(method, funcExpr, xlVal, xuVal, eps);
    visibleCount = 1;
    solved = true;

    tableCard.classList.remove("hidden");
    renderRow(iterations[0]);
    enterHint.classList.remove("hidden");

    if (iterations.length === 1) {
      finished = true;
      showResult();
}
  } catch {
    showError("Invalid function expression. Use math.js syntax, e.g. x^3 - 4*x - 9");
  }
}

function showResult() {
  enterHint.classList.add("hidden");
  const digits = getDigits();
  const finalRoot = iterations[iterations.length - 1].xr;
  rootValue.textContent = "Root ≈ " + fmt(finalRoot, digits);
  resultBox.classList.remove("hidden");
}

// ─── Events ───
methodSelect.addEventListener("change", function () {
  method = this.value;
  reset();

  if (method) {
    inputSection.classList.remove("hidden");
    methodBadge.textContent = method === "bisection" ? "Bisection" : "False Position";
    methodBadge.classList.remove("hidden");
  } else {
    inputSection.classList.add("hidden");
    methodBadge.classList.add("hidden");
  }
});

solveBtn.addEventListener("click", handleSolve);

window.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && solved && !finished) {
    e.preventDefault();
    if (visibleCount < iterations.length) {
      renderRow(iterations[visibleCount]);
      visibleCount++;
      if (visibleCount >= iterations.length) {
        finished = true;
        showResult();
      }
    }
  }
});
