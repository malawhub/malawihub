/* MalawiHub feature-specific Android app installer */
(function () {
  'use strict';
  const path = (location.pathname || '/').toLowerCase();
  const releases = 'https://github.com/malawhub/malawihub/releases/download/';
  const latest = 'https://github.com/malawhub/malawihub/releases/latest/download/';
  let app = { name: 'MalawiHub Main Hub', url: releases + 'malawihub-world-v1.0.2/main-hub.apk' };

  if (/\/tools\/(gpa|gpa-calculator-malawi)(\/|$)/.test(path)) app = { name: 'GPA Calculator', url: latest + 'gpa.apk' };
  else if (/\/tools\/(chemistry|chemistry-calculator-malawi)(\/|$)/.test(path)) app = { name: 'Chemistry Calculator', url: latest + 'chemistry.apk' };
  else if (/\/tools\/(assignment|assignment-cover-page-malawi)(\/|$)/.test(path)) app = { name: 'Assignment Cover Page', url: latest + 'assignment.apk' };
  else if (/\/tools\/(grade|grade-calculator-malawi)(\/|$)/.test(path)) app = { name: 'Grade Calculator', url: latest + 'grade.apk' };
  else if (/\/tools\/(timetable|study-timetable-malawi)(\/|$)/.test(path)) app = { name: 'Study Timetable', url: latest + 'timetable.apk' };
  else if (/\/tools\/(percentage|percentage-calculator-malawi)(\/|$)/.test(path)) app = { name: 'Percentage Calculator', url: latest + 'percentage.apk' };
  else if (/\/tools\/(currency|currency-calculator-malawi)(\/|$)/.test(path)) app = { name: 'Currency Calculator', url: latest + 'currency.apk' };
  else if (/\/tools\/(profit|profit-calculator-malawi)(\/|$)/.test(path)) app = { name: 'Profit Calculator', url: latest + 'profit.apk' };
  else if (/\/tools\/smart-writer(\/|$)/.test(path)) app = { name: 'Smart Writer', url: latest + 'smartwriter.apk' };
  else if (/\/tools\/(past-papers-malawi|study-resources-malawi)(\/|$)|\/papers\//.test(path) || /\/resources\/secondary\/past-papers\//.test(path)) app = { name: 'Past Papers', url: latest + 'papers.apk' };
  else if (/\/teacher-portal\//.test(path) || /\/online-class\/(teacher|teacher-portal|teacher-room|teacher-workspace)/.test(path)) app = { name: 'Teacher Portal', url: releases + 'malawihub-teacher-v1.0.0/teacher.apk' };
  else if (/\/student-portal\//.test(path) || /\/online-class\//.test(path)) app = { name: 'Student Portal', url: releases + 'malawihub-student-v1.0.0/student.apk' };
  else if (/\/categories\/(calculators|student-tools)/.test(path) || /\/download\//.test(path)) app = { name: 'MalawiHub Apps', url: '/download/' };
  else if (/\/resources\//.test(path)) app = { name: 'MalawiHub Main Hub', url: releases + 'malawihub-world-v1.0.2/main-hub.apk' };

  function addBadge() {
    const hero = document.querySelector('.hero-modern .hero-badge');
    if (hero && !document.querySelector('.mh-official-badge')) {
      const badge = document.createElement('div');
      badge.className = 'mh-official-badge';
      badge.innerHTML = '<span class="mh-official-dot"></span>Official MalawiHub app';
      hero.insertAdjacentElement('afterend', badge);
    }
  }
  const badgeStyle = document.createElement('style');
  badgeStyle.textContent = '.mh-official-badge{display:inline-flex;align-items:center;gap:7px;margin:8px 0 0;padding:7px 11px;border-radius:999px;background:#eaf7ef;color:#087f3f;font-size:12px;font-weight:800;letter-spacing:.2px;border:1px solid #ccebd8}.mh-official-dot{width:8px;height:8px;border-radius:50%;background:#087f3f;box-shadow:0 0 0 3px #d8f1e2}';
  document.head.appendChild(badgeStyle);

  function showInstallButton() {
    if (document.getElementById('mh-feature-install') || document.documentElement.classList.contains('mh-app-installed')) return;
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.startsWith('android-app://')) return;
    const style = document.createElement('style');
    style.textContent = '#mh-feature-install{position:fixed;z-index:2147483000;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:560px;margin:auto;box-sizing:border-box;display:flex;align-items:center;gap:11px;padding:13px;border-radius:16px;background:#111827;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.28);font:14px/1.35 system-ui,-apple-system,sans-serif}#mh-feature-install .mh-fi-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}#mh-feature-install .mh-fi-copy strong{font-size:14px}#mh-feature-install .mh-fi-copy span{font-size:12px;color:#e5e7eb}#mh-feature-install .mh-fi-action{flex-shrink:0;background:#dc2626;color:#fff;text-decoration:none;font-weight:750;padding:10px 12px;border-radius:10px;white-space:nowrap}#mh-feature-install .mh-fi-close{align-self:flex-start;border:0;background:transparent;color:#fff;font-size:22px;line-height:1;padding:0 2px;cursor:pointer}@media(min-width:700px){#mh-feature-install{left:auto;right:18px;bottom:18px;width:440px}}';
    document.head.appendChild(style);
    const box = document.createElement('aside');
    box.id = 'mh-feature-install';
    box.setAttribute('aria-label', 'Install this MalawiHub app');
    const title = document.createElement('strong');
    title.textContent = '📲 Install ' + app.name;
    const sub = document.createElement('span');
    sub.textContent = 'Get the app for quicker access from your phone.';
    const copy = document.createElement('div');
    copy.className = 'mh-fi-copy';
    copy.append(title, sub);
    const link = document.createElement('a');
    link.className = 'mh-fi-action';
    link.href = app.url;
    link.rel = 'nofollow';
    link.textContent = app.url === '/download/' ? 'Choose app' : 'Install app';
    const close = document.createElement('button');
    close.className = 'mh-fi-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close install prompt');
    close.textContent = '×';
    close.addEventListener('click', function () { box.remove(); });
    box.append(copy, link, close);
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { addBadge(); setTimeout(showInstallButton, 1200); });
  else { addBadge(); setTimeout(showInstallButton, 1200); }
})();