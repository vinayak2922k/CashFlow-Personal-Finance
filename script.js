'use strict';

let state = {
  salary: parseFloat(localStorage.getItem('cf_salary')) || 0,
  expenses: JSON.parse(localStorage.getItem('cf_expenses') || '[]'),
  currency: 'INR',
  usdRate: null,
};

const $ = id => document.getElementById(id);
const salaryInput = $('salary-input'), salaryMsg = $('salary-msg');
const nameInput = $('expense-name'), amtInput = $('expense-amount'), expenseMsg = $('expense-msg');
const dispSalary = $('display-salary'), dispExpenses = $('display-expenses'), dispBalance = $('display-balance');
const balanceBar = $('balance-bar'), balanceIcon = $('balance-icon');
const alertEl = $('low-balance-alert'), alertMsg = $('low-balance-msg');
const listEl = $('expense-list'), emptyEl = $('expenses-empty');
const chartCanvas = $('expense-chart'), chartEmpty = $('chart-empty');
const pdfMsg = $('pdf-msg');
const btnINR = $('btn-inr'), btnUSD = $('btn-usd'), currStatus = $('currency-status');

const COLORS = ['#FF8C42','#4ECDC4','#FFD166','#E63946','#6A8EAE','#A8DADC','#F4A261','#2EC4B6'];
let chart = null;

function fmt(n) {
  if (state.currency === 'USD' && state.usdRate)
    return '$ ' + (n * state.usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function save() {
  localStorage.setItem('cf_salary', state.salary);
  localStorage.setItem('cf_expenses', JSON.stringify(state.expenses));
}

function showMsg(el, text, type = 'success') {
  el.textContent = text;
  el.className = 'form-msg form-msg--' + type;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.textContent = '';
    el.className = 'form-msg';
  }, 3500);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function total() {
  return state.expenses.reduce((s, e) => s + e.amount, 0);
}

function balance() {
  return state.salary - total();
}

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderSummary() {
  const bal = balance();

  dispSalary.textContent = fmt(state.salary);
  dispExpenses.textContent = fmt(total());
  dispBalance.textContent = fmt(bal);

  dispBalance.classList.remove('card-value--red', 'card-value--mint');
  balanceIcon.classList.remove('card-icon--red');

  if (bal < 0) {
    dispBalance.classList.add('card-value--red');
    balanceIcon.classList.add('card-icon--red');
  } else {
    dispBalance.classList.add('card-value--mint');
  }

  const pct = state.salary > 0 ? Math.max(0, Math.min(100, (bal / state.salary) * 100)) : 0;
  balanceBar.style.width = pct + '%';
  balanceBar.classList.remove('balance-bar--low', 'balance-bar--critical');

  if (pct <= 10) balanceBar.classList.add('balance-bar--critical');
  else if (pct <= 30) balanceBar.classList.add('balance-bar--low');

  if (state.salary > 0 && bal < state.salary * 0.1) {
    alertEl.classList.remove('hidden');
    alertMsg.textContent = bal < 0
      ? `Balance is negative (${fmt(bal)}). Salary exceeded!`
      : `Low balance: ${fmt(bal)} — only ${((bal / state.salary) * 100).toFixed(1)}% left.`;
  } else {
    alertEl.classList.add('hidden');
  }
}

function renderList() {
  listEl.innerHTML = '';

  if (!state.expenses.length) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  [...state.expenses]
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach(e => {
      const li = document.createElement('li');
      li.className = 'expense-item';
      const d = new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      li.innerHTML = `
        <div class="expense-info">
          <span class="expense-name">${esc(e.name)}</span>
          <span class="expense-date">${d}</span>
        </div>
        <div class="expense-right">
          <span class="expense-amount">${fmt(e.amount)}</span>
          <button class="btn-delete" data-id="${e.id}" aria-label="Delete ${esc(e.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>`;
      listEl.appendChild(li);
    });
}

function renderChart() {
  const hasData = state.salary > 0;
  chartEmpty.classList.toggle('hidden', hasData);
  chartCanvas.classList.toggle('hidden', !hasData);

  if (!hasData) {
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  const bal = Math.max(0, balance());
  const labels = [...state.expenses.map(e => e.name), 'Balance'];
  const data = [...state.expenses.map(e => e.amount), bal];
  const colors = [...state.expenses.map((_, i) => COLORS[i % COLORS.length]), '#1e3554'];

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: colors.map(c => c + '99'),
      borderWidth: 1.5,
      hoverOffset: 6,
    }],
  };

  if (chart) {
    chart.data = chartData;
    chart.update('active');
    return;
  }

  chart = new Chart(chartCanvas, {
    type: 'doughnut',
    data: chartData,
    options: {
      cutout: '62%',
      animation: { duration: 450 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8BA3BE', font: { family: "'Inter',sans-serif", size: 12 }, padding: 12, boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => `  ${fmt(ctx.parsed)}  (${((ctx.parsed / (state.salary || 1)) * 100).toFixed(1)}%)`,
          },
          backgroundColor: '#132338',
          borderColor: '#1e3554',
          borderWidth: 1,
          titleColor: '#E8F0FE',
          bodyColor: '#8BA3BE',
          padding: 10,
        },
      },
    },
  });
}

function render() {
  renderSummary();
  renderList();
  renderChart();
}

if (state.salary > 0) salaryInput.value = state.salary;

$('salary-form').addEventListener('submit', e => {
  e.preventDefault();
  const v = parseFloat(salaryInput.value);
  if (!salaryInput.value.trim() || isNaN(v) || v <= 0) {
    showMsg(salaryMsg, 'Enter a valid salary.', 'error');
    return;
  }
  state.salary = v;
  save();
  render();
  showMsg(salaryMsg, `Salary saved: ${fmt(v)}`);
});

$('expense-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const v = parseFloat(amtInput.value);

  if (!name) { showMsg(expenseMsg, 'Name cannot be empty.', 'error'); return; }
  if (isNaN(v) || v <= 0) { showMsg(expenseMsg, 'Enter a valid amount.', 'error'); return; }

  state.expenses.push({ id: uid(), name, amount: v, createdAt: Date.now() });
  save();
  render();
  $('expense-form').reset();
  showMsg(expenseMsg, `Added: "${name}" — ${fmt(v)}`);
  nameInput.focus();
});

listEl.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const exp = state.expenses.find(x => x.id === btn.dataset.id);
  if (!exp) return;
  state.expenses = state.expenses.filter(x => x.id !== btn.dataset.id);
  save();
  render();
  showMsg(expenseMsg, `Deleted: "${exp.name}"`);
});

$('download-report-btn').addEventListener('click', () => {
  if (typeof window.jspdf === 'undefined') {
    showMsg(pdfMsg, 'PDF library not loaded.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  const now = new Date();
  let y = 20;

  doc.setFillColor(13, 27, 42);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(78, 205, 196);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CashFlow — Financial Report', M, 16);
  doc.setTextColor(139, 163, 190);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Know where your money goes.', M, 23);
  y = 46;

  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${now.toLocaleString('en-IN')}`, W - M, y, { align: 'right' });
  y += 8;

  const bal = balance();
  const tot = total();

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(M, y, W - M * 2, 34, 3, 3, 'FD');
  doc.setTextColor(13, 27, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', M + 4, y + 7);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text('Monthly Salary:', M + 4, y + 16);
  doc.text(fmt(state.salary), W - M - 4, y + 16, { align: 'right' });
  doc.text('Total Expenses:', M + 4, y + 23);
  doc.setTextColor(200, 80, 20);
  doc.text(fmt(tot), W - M - 4, y + 23, { align: 'right' });
  doc.setTextColor(bal < 0 ? 180 : 20, bal < 0 ? 20 : 130, bal < 0 ? 20 : 80);
  doc.text('Available Balance:', M + 4, y + 30);
  doc.text(fmt(bal), W - M - 4, y + 30, { align: 'right' });
  y += 42;

  doc.setTextColor(13, 27, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Details', M, y);
  y += 5;
  doc.setDrawColor(78, 205, 196);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('#', M, y);
  doc.text('Expense', M + 8, y);
  doc.text('Date', W - M - 38, y);
  doc.text('Amount', W - M, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, W - M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');

  if (!state.expenses.length) {
    doc.setTextColor(140, 140, 140);
    doc.text('No expenses recorded.', M, y);
  } else {
    [...state.expenses]
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((e, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y - 3, W - M * 2, 7, 'F');
        }
        const d = new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.setTextColor(30, 30, 30);
        doc.text(String(i + 1), M, y);
        doc.text(e.name.substring(0, 32), M + 8, y);
        doc.text(d, W - M - 38, y);
        doc.setTextColor(180, 70, 10);
        doc.text(fmt(e.amount), W - M, y, { align: 'right' });
        y += 7;
      });
  }

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text('CashFlow — Sprint 02 | Prodesk IT', M, doc.internal.pageSize.getHeight() - 8);
  doc.text(`Page 1`, W - M, doc.internal.pageSize.getHeight() - 8, { align: 'right' });

  const fn = `CashFlow_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fn);
  showMsg(pdfMsg, `Downloaded: ${fn}`);
});

async function fetchRate() {
  currStatus.textContent = 'Fetching…';
  currStatus.className = 'currency-status currency-status--loading';
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
    if (!r.ok) throw 0;
    state.usdRate = (await r.json()).rates.USD;
    currStatus.textContent = `1 ₹ = ${state.usdRate.toFixed(4)} $`;
    currStatus.className = 'currency-status currency-status--ok';
    return true;
  } catch {
    currStatus.textContent = 'Rate unavailable';
    currStatus.className = 'currency-status currency-status--error';
    return false;
  }
}

function setCurrency(c) {
  state.currency = c;
  btnINR.classList.toggle('active', c === 'INR');
  btnINR.setAttribute('aria-pressed', c === 'INR');
  btnUSD.classList.toggle('active', c === 'USD');
  btnUSD.setAttribute('aria-pressed', c === 'USD');
  render();
}

btnINR.addEventListener('click', () => setCurrency('INR'));
btnUSD.addEventListener('click', async () => {
  if (!state.usdRate && !await fetchRate()) return;
  setCurrency('USD');
});

render();
