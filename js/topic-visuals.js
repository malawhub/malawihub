/* MalawiHub topic visuals: real inline SVG diagrams/graphs for revision. */
(function () {
  const topic = (location.pathname.split('/').pop() || '').replace('.html','');
  const target = document.querySelector('[data-topic-visual]');
  if (!target) return;

  const wrap = (title, note, svg) => `
    <section class="mh-visual" aria-label="${title}">
      <h2>📊 ${title}</h2>
      <p>${note}</p>
      <div class="mh-svg-wrap">${svg}</div>
    </section>`;

  const common = `fill="none" stroke="currentColor" stroke-width="2"`;
  const visuals = {
    'energy-changes': wrap('Energy profile diagram', 'Compare exothermic and endothermic reactions. The vertical difference between reactants and products represents ΔH; the peak shows the activation-energy barrier.', `
      <svg viewBox="0 0 760 390" role="img" aria-label="Exothermic and endothermic energy profile graphs">
        <line x1="70" y1="335" x2="700" y2="335" ${common}/><line x1="70" y1="335" x2="70" y2="35" ${common}/>
        <text x="350" y="375" text-anchor="middle">Reaction progress</text><text x="22" y="185" transform="rotate(-90 22 185)">Energy</text>
        <path d="M100 265 C190 265 180 90 300 90 C410 90 390 225 650 225" stroke="#dc2626" stroke-width="4" fill="none"/>
        <text x="110" y="255">Reactants</text><text x="565" y="217">Products (lower)</text><text x="310" y="78">Activation energy</text>
        <path d="M100 185 C190 185 180 55 300 55 C410 55 390 285 650 285" stroke="#2563eb" stroke-width="4" fill="none"/>
        <text x="565" y="278">Products (higher)</text><text x="575" y="115">Endothermic</text><text x="575" y="165">Exothermic</text>
      </svg>`),
    'rates-reaction': wrap('Rate of reaction graph', 'A typical reaction-rate curve becomes less steep as reactants are used up. A catalyst increases the rate by providing a faster pathway.', `
      <svg viewBox="0 0 760 390" role="img" aria-label="Rate of reaction curve">
        <line x1="75" y1="335" x2="710" y2="335" ${common}/><line x1="75" y1="335" x2="75" y2="40" ${common}/>
        <text x="390" y="375" text-anchor="middle">Time</text><text x="25" y="190" transform="rotate(-90 25 190)">Amount of product</text>
        <path d="M90 325 C150 235 210 145 300 95 C410 45 540 42 690 42" fill="none" stroke="#087f5b" stroke-width="5"/>
        <path d="M90 325 C170 185 245 115 330 80 C450 42 570 42 690 42" fill="none" stroke="#2563eb" stroke-width="4" stroke-dasharray="9 7"/>
        <text x="475" y="70">With catalyst: faster</text><text x="470" y="125">Without catalyst</text>
        <text x="100" y="315">Steep = fast rate</text><text x="510" y="325">Rate approaches zero</text>
      </svg>`),
    'atomic-structure': wrap('Simple atomic structure', 'The nucleus contains protons and neutrons. Electrons occupy shells around the nucleus.', `
      <svg viewBox="0 0 760 390" role="img" aria-label="Atom diagram with nucleus and electron shells">
        <circle cx="380" cy="195" r="58" fill="#eef2ff" stroke="#333" stroke-width="3"/><text x="380" y="188" text-anchor="middle">Nucleus</text><text x="380" y="212" text-anchor="middle">p⁺ + n⁰</text>
        <circle cx="380" cy="195" r="115" ${common}/><circle cx="380" cy="195" r="175" ${common}/>
        <circle cx="380" cy="80" r="10" fill="#2563eb"/><circle cx="380" cy="20" r="10" fill="#dc2626"/>
        <circle cx="555" cy="195" r="10" fill="#2563eb"/><circle cx="205" cy="195" r="10" fill="#2563eb"/>
        <text x="585" y="190">electron e⁻</text><text x="400" y="18">outer shell</text><text x="420" y="80">inner shell</text>
      </svg>`),
    'chemical-bonding': wrap('Bonding model: ionic vs covalent', 'Ionic bonding involves electron transfer and attraction between oppositely charged ions. Covalent bonding involves sharing electron pairs.', `
      <svg viewBox="0 0 760 350" role="img" aria-label="Ionic and covalent bonding diagrams">
        <text x="190" y="35" text-anchor="middle" font-weight="bold">Ionic bonding</text><circle cx="140" cy="145" r="55" fill="#eef8f4" stroke="#087f5b" stroke-width="3"/><text x="140" y="152" text-anchor="middle">Na⁺</text><circle cx="245" cy="145" r="55" fill="#fff0f0" stroke="#dc2626" stroke-width="3"/><text x="245" y="152" text-anchor="middle">Cl⁻</text><path d="M195 145h-20" stroke="#333" stroke-width="3" marker-end="url(#a)"/>
        <text x="560" y="35" text-anchor="middle" font-weight="bold">Covalent bonding</text><circle cx="510" cy="145" r="58" ${common}/><circle cx="610" cy="145" r="58" ${common}/><ellipse cx="560" cy="145" rx="35" ry="18" fill="#dbeafe" stroke="#2563eb"/><text x="560" y="150" text-anchor="middle">shared e⁻</text><text x="560" y="240" text-anchor="middle">H — H</text>
      </svg>`),
    'electrochemistry': wrap('Simple electrochemical cell', 'Electrons flow through the external circuit from the more reactive electrode (anode) toward the cathode in a galvanic cell.', `
      <svg viewBox="0 0 760 390" role="img" aria-label="Electrochemical cell diagram">
        <rect x="110" y="95" width="190" height="220" fill="#eef8f4" stroke="#087f5b" stroke-width="3"/><rect x="460" y="95" width="190" height="220" fill="#fff8dc" stroke="#d49b00" stroke-width="3"/>
        <rect x="185" y="70" width="35" height="190" fill="#999"/><rect x="535" y="70" width="35" height="190" fill="#777"/>
        <text x="200" y="290" text-anchor="middle">Anode (−)</text><text x="552" y="290" text-anchor="middle">Cathode (+)</text><path d="M220 50 H535" stroke="#2563eb" stroke-width="4" marker-end="url(#b)"/><text x="375" y="38" text-anchor="middle">electron flow</text><path d="M300 340 H460" stroke="#333" stroke-width="3"/><text x="380" y="365" text-anchor="middle">salt bridge / ion movement</text>
      </svg>`),
    'periodic-table-trends': wrap('Periodic trends', 'Across a period, atomic radius generally decreases while ionisation energy generally increases. Down a group, radius increases and ionisation energy generally decreases.', `
      <svg viewBox="0 0 760 350" role="img" aria-label="Periodic table trend arrows">
        <rect x="130" y="70" width="500" height="180" fill="#f8fafc" stroke="#334155" stroke-width="2"/><path d="M170 215 H590" stroke="#2563eb" stroke-width="5" marker-end="url(#b)"/><path d="M170 215 V95" stroke="#dc2626" stroke-width="5" marker-end="url(#a)"/>
        <text x="380" y="275" text-anchor="middle">Across period → ionisation energy generally increases</text><text x="90" y="150" transform="rotate(-90 90 150)">Down group: atomic radius increases ↓</text><text x="380" y="55" text-anchor="middle">Periodic-table trend directions</text>
      </svg>`),
    'acids-bases-salts': wrap('pH scale', 'The pH scale shows how acidic or alkaline a solution is. Lower pH means greater acidity; higher pH means greater alkalinity.', `
      <svg viewBox="0 0 760 260" role="img" aria-label="pH scale from 0 to 14">
        <rect x="70" y="100" width="620" height="55" fill="#eee" stroke="#333"/><text x="70" y="90">0</text><text x="375" y="90" text-anchor="middle">7</text><text x="690" y="90" text-anchor="end">14</text>
        <line x1="70" y1="100" x2="70" y2="170" stroke="#333"/><line x1="380" y1="100" x2="380" y2="170" stroke="#333"/><line x1="690" y1="100" x2="690" y2="170" stroke="#333"/>
        <text x="150" y="195" text-anchor="middle">Acidic</text><text x="380" y="195" text-anchor="middle">Neutral</text><text x="610" y="195" text-anchor="middle">Alkaline</text><text x="380" y="235" text-anchor="middle">pH increases →</text>
      </svg>`),
    'mole-stoichiometry': wrap('Mole relationship map', 'Use the mole as the bridge between mass, number of particles and concentration.', `
      <svg viewBox="0 0 760 330" role="img" aria-label="Mole concept relationship diagram">
        <circle cx="380" cy="155" r="70" fill="#eef8f4" stroke="#087f5b" stroke-width="4"/><text x="380" y="150" text-anchor="middle" font-size="22">MOLE</text><text x="380" y="175" text-anchor="middle">n</text>
        <rect x="75" y="80" width="160" height="70" rx="12" fill="#eef2ff" stroke="#2563eb"/><text x="155" y="122" text-anchor="middle">Mass, m</text><text x="155" y="142" text-anchor="middle">n = m / M</text>
        <rect x="525" y="80" width="160" height="70" rx="12" fill="#fff8dc" stroke="#d49b00"/><text x="605" y="122" text-anchor="middle">Particles, N</text><text x="605" y="142" text-anchor="middle">N = nNₐ</text>
        <rect x="300" y="240" width="160" height="70" rx="12" fill="#fff0f0" stroke="#dc2626"/><text x="380" y="282" text-anchor="middle">Concentration</text><text x="380" y="302" text-anchor="middle">c = n / V</text>
        <path d="M235 115 H310" stroke="#333" stroke-width="3"/><path d="M450 115 H525" stroke="#333" stroke-width="3"/><path d="M380 225 V240" stroke="#333" stroke-width="3"/>
      </svg>`),
    'formulae-equations-reactions': wrap('Balancing a chemical equation', 'Atoms are conserved. Coefficients are changed to balance an equation; subscripts inside formulae are not changed.', `
      <svg viewBox="0 0 760 250" role="img" aria-label="Balanced chemical equation example">
        <text x="380" y="45" text-anchor="middle" font-size="22" font-weight="bold">2H₂ + O₂ → 2H₂O</text>
        <circle cx="180" cy="130" r="22" fill="#fff" stroke="#2563eb" stroke-width="3"/><circle cx="230" cy="130" r="22" fill="#fff" stroke="#2563eb" stroke-width="3"/><text x="205" y="185" text-anchor="middle">2H₂</text>
        <circle cx="380" cy="130" r="22" fill="#fff" stroke="#dc2626" stroke-width="3"/><circle cx="430" cy="130" r="22" fill="#fff" stroke="#dc2626" stroke-width="3"/><text x="405" y="185" text-anchor="middle">O₂</text>
        <path d="M470 130 H540" stroke="#333" stroke-width="4" marker-end="url(#b)"/>
        <circle cx="590" cy="120" r="20" fill="#fff" stroke="#2563eb" stroke-width="3"/><circle cx="635" cy="120" r="20" fill="#fff" stroke="#2563eb" stroke-width="3"/><circle cx="612" cy="155" r="20" fill="#fff" stroke="#dc2626" stroke-width="3"/><text x="612" y="205" text-anchor="middle">2H₂O</text>
      </svg>`),
    'practical-chemistry': wrap('Filtration apparatus', 'A filter funnel separates an insoluble solid from a liquid. The residue remains on the filter paper and the filtrate passes into the container.', `
      <svg viewBox="0 0 760 380" role="img" aria-label="Filtration apparatus diagram">
        <path d="M300 75 H460 L405 190 H355 Z" fill="#eef2ff" stroke="#2563eb" stroke-width="3"/><path d="M355 190 H405 V300" stroke="#333" stroke-width="4" fill="none"/><path d="M300 75 Q380 35 460 75" fill="#fff8dc" stroke="#333" stroke-width="3"/><path d="M350 300 Q380 320 410 300 L400 350 H360 Z" fill="#eef8f4" stroke="#087f5b" stroke-width="3"/>
        <text x="380" y="55" text-anchor="middle">filter paper + mixture</text><text x="430" y="220">residue</text><text x="420" y="275">filtrate</text>
      </svg>`)
  };

  const generic = wrap('Study visual', 'Use the labelled visual below as a quick revision map for this topic.', `<svg viewBox="0 0 760 260" role="img" aria-label="Topic revision flow diagram"><rect x="70" y="90" width="170" height="70" rx="12" fill="#eef8f4" stroke="#087f5b" stroke-width="3"/><rect x="295" y="90" width="170" height="70" rx="12" fill="#eef2ff" stroke="#2563eb" stroke-width="3"/><rect x="520" y="90" width="170" height="70" rx="12" fill="#fff8dc" stroke="#d49b00" stroke-width="3"/><path d="M240 125 H295" stroke="#333" stroke-width="3"/><path d="M465 125 H520" stroke="#333" stroke-width="3"/><text x="155" y="132" text-anchor="middle">Key concept</text><text x="380" y="132" text-anchor="middle">Process / rule</text><text x="605" y="132" text-anchor="middle">Application</text></svg>`);

  target.innerHTML = visuals[topic] || generic;
})();
