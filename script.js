// Tracks Yes/No toggle state for Diabetes and Obesity
const state = { diab: null, obes: null };

/**
 * Handles Yes / No toggle buttons.
 * @param {string} field - 'diab' or 'obes'
 * @param {string} val   - 'yes' or 'no'
 */
function toggleSelect(field, val) {
  state[field] = val;
  const yes = document.getElementById(field + '-yes');
  const no  = document.getElementById(field + '-no');
  yes.className = 'toggle-btn' + (val === 'yes' ? ' sel-yes' : '');
  no.className  = 'toggle-btn' + (val === 'no'  ? ' sel-no'  : '');
}

// ── Risk scoring helpers ──────────────────────────────────────────────────────

function getAge(v) {
  if (v < 40)  return { level: 'low',    label: 'Age', reason: v + ' years — under 40, low risk range' };
  if (v <= 55) return { level: 'medium', label: 'Age', reason: v + ' years — 40–55, medium risk range' };
  return             { level: 'high',   label: 'Age', reason: v + ' years — over 55, high risk range' };
}

function getCholesterol(v) {
  if (v < 100)  return { level: 'low',    label: 'Cholesterol', reason: v + ' mg/dL — below 100, low risk' };
  if (v <= 159) return { level: 'medium', label: 'Cholesterol', reason: v + ' mg/dL — 100–159, medium risk' };
  return              { level: 'high',   label: 'Cholesterol', reason: v + ' mg/dL — 160 or above, high risk' };
}

function getBP(sys, dia) {
  if (sys >= 140 || dia >= 90)
    return { level: 'high',        label: 'Blood pressure', reason: sys + '/' + dia + ' mmHg — Hypertension Stage 2 (high risk)' };
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89))
    return { level: 'medium-high', label: 'Blood pressure', reason: sys + '/' + dia + ' mmHg — Hypertension Stage 1 (medium–high risk)' };
  if (sys >= 120 && sys <= 129 && dia < 80)
    return { level: 'medium',      label: 'Blood pressure', reason: sys + '/' + dia + ' mmHg — Elevated (medium risk)' };
  return   { level: 'low',         label: 'Blood pressure', reason: sys + '/' + dia + ' mmHg — Normal range (low risk)' };
}

function getHeartRate(v) {
  if (v >= 60 && v <= 70) return { level: 'low',    label: 'Heart rate', reason: v + ' bpm — 60–70, low risk range' };
  if (v >= 71 && v <= 85) return { level: 'medium', label: 'Heart rate', reason: v + ' bpm — 71–85, medium risk range' };
  return                        { level: 'high',   label: 'Heart rate', reason: v + ' bpm — above 85, high risk range' };
}

function levelScore(l) {
  return { low: 0, medium: 1, 'medium-high': 2, high: 3 }[l] || 0;
}

function overallLevel(score, maxScore) {
  if (maxScore >= 3 || score >= 6) return 'high';
  if (score >= 3  || maxScore >= 2) return 'medium';
  return 'low';
}

// ── Main prediction function ──────────────────────────────────────────────────

function predict() {
  const errorEl = document.getElementById('error');
  errorEl.style.display = 'none';
  document.getElementById('result-wrap').style.display = 'none';

  // Read masked inputs (password type) — strip any non-digit chars just in case
  const age  = parseInt(document.getElementById('age').value.replace(/\D/g, ''));
  const sys  = parseInt(document.getElementById('bp-sys').value.replace(/\D/g, ''));
  const dia  = parseInt(document.getElementById('bp-dia').value.replace(/\D/g, ''));
  const chol = parseInt(document.getElementById('cholesterol').value.replace(/\D/g, ''));
  const hr   = parseInt(document.getElementById('heartrate').value.replace(/\D/g, ''));

  // Require at least one valid input
  const anyFilled =
    (!isNaN(age)  && age  >= 1   && age  <= 120) ||
    (!isNaN(sys)  && sys  >= 60  && sys  <= 220) ||
    (!isNaN(chol) && chol >= 0   && chol <= 500) ||
    (!isNaN(hr)   && hr   >= 30  && hr   <= 200) ||
    state.diab !== null || state.obes !== null;

  if (!anyFilled) {
    errorEl.textContent = 'Please fill in at least one attribute to get a prediction.';
    errorEl.style.display = 'block';
    return;
  }

  const factors = [];

  if (!isNaN(age) && age >= 1 && age <= 120) factors.push(getAge(age));

  const sysOk = !isNaN(sys) && sys >= 60  && sys <= 220;
  const diaOk = !isNaN(dia) && dia >= 40  && dia <= 140;
  if (sysOk && diaOk)     factors.push(getBP(sys, dia));
  else if (sysOk || diaOk) factors.push(getBP(sysOk ? sys : 119, diaOk ? dia : 79));

  if (!isNaN(chol) && chol >= 0  && chol <= 500) factors.push(getCholesterol(chol));
  if (!isNaN(hr)   && hr   >= 30 && hr   <= 200) factors.push(getHeartRate(hr));

  if (state.diab === 'yes') factors.push({ level: 'high', label: 'Diabetes', reason: 'Diagnosed diabetes significantly raises cardiovascular risk' });
  else if (state.diab === 'no') factors.push({ level: 'low', label: 'Diabetes', reason: 'No diabetes — no additional risk from this factor' });

  if (state.obes === 'yes') factors.push({ level: 'high', label: 'Obesity', reason: 'Obesity is a known independent cardiovascular risk factor' });
  else if (state.obes === 'no') factors.push({ level: 'low', label: 'Obesity', reason: 'No obesity — no additional risk from this factor' });

  const totalScore = factors.reduce((s, f) => s + levelScore(f.level), 0);
  const maxScore   = Math.max(...factors.map(f => levelScore(f.level)));
  const overall    = overallLevel(totalScore, maxScore);

  const meta = {
    low:    { title: 'Low risk',      desc: 'No significant heart attack risk indicators detected. Keep up your healthy habits!',                              icon: '&#10003;' },
    medium: { title: 'Moderate risk', desc: 'Some risk factors are present. Consider lifestyle adjustments and consult your doctor.',                         icon: '&#9888;'  },
    high:   { title: 'High risk',     desc: 'Elevated heart attack risk detected across multiple factors. Please seek medical advice promptly.',              icon: '&#9888;'  },
  };

  const dotClass = {
    low: 'dot-low', medium: 'dot-medium', 'medium-high': 'dot-medium-high', high: 'dot-high',
  };

  // Populate result card
  const card  = document.getElementById('result-card');
  card.className = 'result-card ' + overall;

  const badge = document.getElementById('result-badge');
  badge.className = 'risk-badge ' + overall;
  document.getElementById('result-icon').innerHTML = meta[overall].icon;

  const title = document.getElementById('result-title');
  title.className = 'result-title ' + overall;
  title.textContent = meta[overall].title;
  document.getElementById('result-desc').textContent = meta[overall].desc;

  const list = document.getElementById('factor-list');
  list.innerHTML = factors.map(f => `
    <li class="factor-item">
      <span class="factor-dot ${dotClass[f.level]}"></span>
      <span>
        <span class="factor-name">${f.label}:</span>
        <span class="factor-reason"> ${f.reason}</span>
      </span>
    </li>
  `).join('');

  document.getElementById('disclaimer').style.display = overall !== 'low' ? 'block' : 'none';

  const wrap = document.getElementById('result-wrap');
  wrap.style.display = 'block';
  wrap.style.marginTop = '1.2rem';
  setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ── Reset form ────────────────────────────────────────────────────────────────

function resetForm() {
  ['age', 'bp-sys', 'bp-dia', 'cholesterol', 'heartrate'].forEach(id => {
    document.getElementById(id).value = '';
  });

  state.diab = null;
  state.obes = null;

  ['diab-yes', 'diab-no', 'obes-yes', 'obes-no'].forEach(id => {
    document.getElementById(id).className = 'toggle-btn';
  });

  document.getElementById('result-wrap').style.display = 'none';
  document.getElementById('error').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
