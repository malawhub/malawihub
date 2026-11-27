/* MalawiHub Learning Centre navigation: lightweight breadcrumbs for resource pages. */
(function () {
  'use strict';
  if (!/^\/resources(?:\/|$)/.test(window.location.pathname)) return;
  if (document.querySelector('.mh-resource-breadcrumbs')) return;

  const root = '/resources/';
  const relative = window.location.pathname.replace(/^\/resources\/?/, '');
  const parts = relative.split('/').filter(Boolean);
  if (parts[parts.length - 1] === 'index.html') parts.pop();
  else if (parts.length && parts[parts.length - 1].endsWith('.html')) {
    parts[parts.length - 1] = parts[parts.length - 1].replace(/\.html$/i, '');
  }

  const nav = document.createElement('nav');
  nav.className = 'mh-resource-breadcrumbs';
  nav.setAttribute('aria-label', 'Breadcrumb');
  const style = document.createElement('style');
  style.textContent = '.mh-resource-breadcrumbs{max-width:1100px;margin:12px auto 0;padding:8px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:7px;font:13px/1.5 system-ui,sans-serif;color:#657184}.mh-resource-breadcrumbs a{color:#a51f2d;text-decoration:none;font-weight:700}.mh-resource-breadcrumbs a:hover{text-decoration:underline}.mh-resource-breadcrumbs .mh-current{color:#344255;font-weight:700}.mh-resource-breadcrumbs .mh-sep{color:#a0a8b3}';
  document.head.appendChild(style);

  function addText(text, className) {
    const span = document.createElement('span');
    span.textContent = text;
    if (className) span.className = className;
    nav.appendChild(span);
  }
  function addLink(text, href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    nav.appendChild(a);
  }

  addLink('Learning Centre', root);
  const labels = {
    secondary: 'Secondary', jc: 'JC', msce: 'MSCE', notes: 'Notes',
    chemistry: 'Chemistry', mathematics: 'Mathematics', physics: 'Physics',
    biology: 'Biology', education: 'Education', computing: 'Computing',
    'study-guides': 'Study Guides', 'past-papers': 'Past Papers',
    schemes: 'Schemes of Work', revision: 'Revision', topics: 'Topics',
    'health-sciences': 'Health Sciences', 'law-social-sciences': 'Law & Social Sciences',
    'organic-chemistry': 'Organic Chemistry', business: 'Business & Economics',
    curriculum: 'Curriculum'
  };
  const folderParts = parts.slice(0, Math.max(0, parts.length - (relative.endsWith('.html') ? 1 : 0)));
  let prefix = '';
  folderParts.forEach((part) => {
    prefix += part + '/';
    addText('›', 'mh-sep');
    addLink(labels[part] || part.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), root + prefix);
  });
  addText('›', 'mh-sep');
  let current = document.title.replace(/\s*[|—-]\s*MalawiHub.*$/i, '').trim();
  if (!current || current.toLowerCase() === 'malawihub') {
    current = parts.length ? parts[parts.length - 1].replace(/[-_]/g, ' ') : 'Resources';
  }
  addText(current, 'mh-current');

  const header = document.querySelector('body > header');
  if (header && header.parentNode) header.parentNode.insertBefore(nav, header.nextSibling);
  else document.body.insertBefore(nav, document.body.firstChild);
})();