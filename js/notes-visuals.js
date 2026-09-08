(function () {
  'use strict';

  if (!/^\/resources\/(chemistry|mathematics|physics|biology|education|study-guides)\//.test(location.pathname)) return;
  if (document.getElementById('malawihub-notes-visuals')) return;

  const path = location.pathname.toLowerCase();
  const slug = path.split('/').pop().replace(/\.html$/, '').replace(/\/index$/, '');
  const subject = path.match(/^\/resources\/([^/]+)/)?.[1] || 'study-guides';

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svgWrap = (body, viewBox='0 0 760 300') => `<svg viewBox="${viewBox}" role="img" aria-label="Educational diagram" class="mhv-svg">${body}</svg>`;
  const card = (title, desc, svg) => `<section class="mhv-card"><h2>${esc(title)}</h2><p>${esc(desc)}</p><div class="mhv-diagram">${svg}</div></section>`;
  const line = (points, labels, title) => {
    const w=720,h=250,p=45, max=Math.max(...points.flat(),1), min=Math.min(...points.flat(),0);
    const sx=i=>p+i*((w-2*p)/(points[0].length-1));
    const sy=v=>h-p-(v-min)*(h-2*p)/(max-min||1);
    const colors=['#087f5b','#2563eb','#d97706'];
    const paths=points.map((arr,si)=>`<polyline fill="none" stroke="${colors[si%colors.length]}" stroke-width="4" points="${arr.map((v,i)=>`${sx(i)},${sy(v)}`).join(' ')}"/>`).join('');
    const dots=points.map((arr,si)=>arr.map((v,i)=>`<circle cx="${sx(i)}" cy="${sy(v)}" r="4" fill="${colors[si%colors.length]}"/>`).join('')).join('');
    const xlabels=labels.map((x,i)=>`<text x="${sx(i)}" y="${h-12}" text-anchor="middle">${esc(x)}</text>`).join('');
    return svgWrap(`<line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="#555"/><line x1="${p}" y1="${p}" x2="${p}" y2="${h-p}" stroke="#555"/>${paths}${dots}${xlabels}<text x="${w/2}" y="24" text-anchor="middle" font-weight="700">${esc(title)}</text>`);
  };
  const bars = (values, labels, title) => {
    const w=720,h=250,p=45,max=Math.max(...values,1), bw=(w-2*p)/values.length*.62;
    const body=values.map((v,i)=>{const x=p+i*((w-2*p)/values.length)+((w-2*p)/values.length-bw)/2; const bh=(h-2*p)*v/max; return `<rect x="${x}" y="${h-p-bh}" width="${bw}" height="${bh}" rx="5" fill="#087f5b"/><text x="${x+bw/2}" y="${h-12}" text-anchor="middle">${esc(labels[i])}</text><text x="${x+bw/2}" y="${h-p-bh-7}" text-anchor="middle" font-weight="700">${v}</text>`}).join('');
    return svgWrap(`<line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="#555"/><line x1="${p}" y1="${p}" x2="${p}" y2="${h-p}" stroke="#555"/><text x="${w/2}" y="24" text-anchor="middle" font-weight="700">${esc(title)}</text>${body}`);
  };
  const flow = (items, title) => {
    const n=items.length, gap=720/n, body=items.map((x,i)=>{const bw=Math.min(150,gap-16), x0=i*gap+(gap-bw)/2; const arrow=i<n-1?`<line x1="${x0+bw}" y1="145" x2="${(i+1)*gap+(gap-bw)/2-8}" y2="145" stroke="#087f5b" stroke-width="4"/><polygon points="${(i+1)*gap+(gap-bw)/2-8},145 ${(i+1)*gap+(gap-bw)/2-20},138 ${(i+1)*gap+(gap-bw)/2-20},152" fill="#087f5b"/>`:''; return `<rect x="${x0}" y="105" width="${bw}" height="80" rx="14" fill="#eef8f4" stroke="#087f5b" stroke-width="2"/><text x="${x0+bw/2}" y="138" text-anchor="middle" font-weight="700">${esc(x)}</text>${arrow}`}).join('');
    return svgWrap(`<text x="360" y="30" text-anchor="middle" font-weight="700">${esc(title)}</text>${body}`);
  };
  const wave = (title) => {
    const pts=[]; for(let i=0;i<=120;i++){const x=40+i*5.3,y=145-75*Math.sin(i/9);pts.push(`${x},${y}`)}
    return svgWrap(`<line x1="40" y1="145" x2="680" y2="145" stroke="#555"/><polyline fill="none" stroke="#2563eb" stroke-width="4" points="${pts.join(' ')}"/><text x="360" y="28" text-anchor="middle" font-weight="700">${esc(title)}</text><text x="690" y="150">distance</text><text x="35" y="55">amplitude</text>`);
  };
  const cycle = (items,title) => {
    const cx=360,cy=145,r=88; const nodes=items.map((x,i)=>{const a=-Math.PI/2+i*2*Math.PI/items.length;const nx=cx+Math.cos(a)*r,ny=cy+Math.sin(a)*r;return `<circle cx="${nx}" cy="${ny}" r="38" fill="#eef8f4" stroke="#087f5b" stroke-width="2"/><text x="${nx}" y="${ny+4}" text-anchor="middle" font-size="12" font-weight="700">${esc(x)}</text>`}).join('');
    return svgWrap(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#087f5b" stroke-width="4" stroke-dasharray="8 8"/><text x="360" y="24" text-anchor="middle" font-weight="700">${esc(title)}</text>${nodes}`);
  };
  const tree = (title) => svgWrap(`<text x="360" y="24" text-anchor="middle" font-weight="700">${esc(title)}</text><line x1="360" y1="55" x2="210" y2="115" stroke="#555" stroke-width="2"/><line x1="360" y1="55" x2="510" y2="115" stroke="#555" stroke-width="2"/><line x1="210" y1="115" x2="135" y2="180" stroke="#555"/><line x1="210" y1="115" x2="285" y2="180" stroke="#555"/><line x1="510" y1="115" x2="435" y2="180" stroke="#555"/><line x1="510" y1="115" x2="585" y2="180" stroke="#555"/><circle cx="360" cy="55" r="25" fill="#eef8f4" stroke="#087f5b"/><text x="360" y="60" text-anchor="middle">Start</text><text x="210" y="120" text-anchor="middle">A</text><text x="510" y="120" text-anchor="middle">B</text><text x="135" y="185" text-anchor="middle">A₁</text><text x="285" y="185" text-anchor="middle">A₂</text><text x="435" y="185" text-anchor="middle">B₁</text><text x="585" y="185" text-anchor="middle">B₂</text>`);
  const box = (title, labels) => svgWrap(`<text x="360" y="25" text-anchor="middle" font-weight="700">${esc(title)}</text>${labels.map((x,i)=>`<rect x="${120+i*170}" y="85" width="130" height="130" fill="#f8fafc" stroke="#087f5b" stroke-width="2"/><text x="${185+i*170}" y="155" text-anchor="middle" font-weight="700">${esc(x)}</text>`).join('')}`);

  const visuals=[];
  if(subject==='chemistry'){
    if(/periodic/.test(slug)) visuals.push(card('Periodic trend graph','General trends across a period: atomic radius decreases while first ionisation energy increases.',line([[9,8,7,6,5,4,3,2],[2,3,4,5,6,7,8,9]],['Na','Mg','Al','Si','P','S','Cl','Ar'],'Periodic trends')));
    else if(/rates/.test(slug)) visuals.push(card('Reaction-rate graph','A typical concentration-versus-time relationship becomes less steep as reactants are consumed.',line([[10,7.5,5.5,4,3,2.2,1.7,1.4]],['0','10','20','30','40','50','60','70'],'Concentration vs time')));
    else if(/energy-changes/.test(slug)) visuals.push(card('Energy profile','Activation energy is the energy barrier between reactants and the transition state.',line([[2,3,7,4]],['Reactants','Transition state','Products','End'],'Energy profile')));
    else if(/electrochemistry/.test(slug)) visuals.push(card('Electrochemical cell flow','Electrons flow through the external circuit from oxidation at the anode toward reduction at the cathode.',flow(['Anode','External circuit','Cathode','Ions in electrolyte'],'Electrochemical cell')));
    else if(/acids-bases/.test(slug)) visuals.push(card('pH scale','The pH scale runs from strongly acidic through neutral to strongly basic.',bars([1,3,7,11,13],['Acid','Weak acid','Neutral','Base','Strong base'],'pH scale')));
    else if(/atomic-structure/.test(slug)) visuals.push(card('Atomic structure','Electrons occupy shells around a dense nucleus containing protons and neutrons.',box('Basic atomic model',['Nucleus','Electron shell','Valence shell'])));
    else if(/bonding/.test(slug)) visuals.push(card('Bond formation pathway','Atoms can transfer or share electrons to reach more stable electron arrangements.',flow(['Atoms','Electron transfer/share','Bond','Stable arrangement'],'Chemical bonding')));
    else if(/mole-stoichiometry/.test(slug)) visuals.push(card('Stoichiometry pathway','Use the balanced equation to connect mass, moles and reacting-particle ratios.',flow(['Mass','Moles','Mole ratio','Mass/volume'],'Stoichiometry')));
    else if(/practical|qualitative/.test(slug)) visuals.push(card('Practical-analysis workflow','A safe practical investigation follows observation, testing, interpretation and conclusion.',flow(['Observe','Test','Record','Interpret','Conclude'],'Practical chemistry')));
    else if(/particulate/.test(slug)) visuals.push(card('Particle model','Matter can be visualised as particles whose spacing and movement change between states.',box('States of matter',['Solid','Liquid','Gas'])));
    else if(/environmental/.test(slug)) visuals.push(card('Environmental cycle','Materials move between organisms and the physical environment through linked processes.',cycle(['Atmosphere','Plants','Animals','Decomposers','Soil'],'Matter cycling')));
    else visuals.push(card('Chemistry concept map','Connect definitions, particles, equations, observations and applications when studying a chemistry topic.',flow(['Concept','Particles','Equation','Observation','Application'],'Study pathway')));
  } else if(subject==='mathematics'){
    if(/functions-graphs/.test(slug)) visuals.push(card('Function graph','A graph shows how the dependent variable changes as the independent variable changes.',line([[1,2,4,7,11,16,22]],['−3','−2','−1','0','1','2','3'],'Function relationship')));
    else if(/statistics/.test(slug)) visuals.push(card('Data distribution','Bar-style visualisation helps compare frequencies across categories.',bars([4,8,6,10,5],['A','B','C','D','E'],'Frequency')));
    else if(/probability/.test(slug)) visuals.push(card('Probability tree','A tree diagram separates possible outcomes and their associated probabilities.',tree('Probability tree')));
    else if(/trigonometry/.test(slug)) visuals.push(card('Sine-wave graph','Sine and cosine functions produce repeating periodic curves.',wave('Trigonometric wave')));
    else if(/sequences/.test(slug)) visuals.push(card('Sequence pattern','A sequence can be studied by plotting term number against term value.',line([[2,4,6,8,10,12]],['1','2','3','4','5','6'],'Sequence terms')));
    else if(/vectors/.test(slug)) visuals.push(card('Vector representation','A vector has magnitude and direction and can be represented by an arrow.',flow(['Magnitude','Direction','Vector','Resultant'],'Vector reasoning')));
    else if(/geometry|mensuration/.test(slug)) visuals.push(card('Geometric relationships','Geometry connects lengths, angles, areas and volumes through defined relationships.',box('Geometry toolkit',['Lengths','Angles','Area/volume'])));
    else if(/coordinate/.test(slug)) visuals.push(card('Coordinate relationship','Coordinates locate points and make geometric relationships visible on a plane.',line([[1,3,5,7,9]],['(1,1)','(2,3)','(3,5)','(4,7)','(5,9)'],'Coordinate pattern')));
    else if(/financial/.test(slug)) visuals.push(card('Financial growth','Compound growth produces a curved increase because each period builds on the previous total.',line([[100,110,121,133.1,146.4,161.1]],['0','1','2','3','4','5'],'Compound growth')));
    else visuals.push(card('Mathematics visual method','Represent the problem, identify the relationship, calculate and check the result.',flow(['Problem','Diagram/graph','Formula','Calculation','Check'],'Problem-solving pathway')));
  } else if(subject==='physics'){
    if(/motion-speed-acceleration/.test(slug)) visuals.push(card('Motion graph','Distance-time graphs show how position changes; the gradient represents speed.',line([[0,1,2,4,7,11,16]],['0','1','2','3','4','5','6'],'Distance vs time')));
    else if(/waves-sound/.test(slug)) visuals.push(card('Wave diagram','Amplitude measures maximum displacement while wavelength measures the distance between matching points.',wave('Wave properties')));
    else if(/heat|thermal/.test(slug)) visuals.push(card('Heating curve','Temperature can remain constant during a change of state while energy is transferred.',line([[20,30,40,40,40,50,60]],['1','2','3','4','5','6','7'],'Temperature vs time')));
    else if(/electricity-circuits/.test(slug)) visuals.push(card('Circuit pathway','A complete circuit provides a closed path for charge through the components.',flow(['Cell','Switch','Load','Return path'],'Simple circuit')));
    else if(/light-optics/.test(slug)) visuals.push(card('Ray pathway','Ray diagrams trace the direction of light and show reflection or refraction at boundaries.',flow(['Incident ray','Boundary','Reflected/refracted ray','Image'],'Ray diagram')));
    else if(/forces-newtons/.test(slug)) visuals.push(card('Force model','Forces can be represented as directed arrows acting on an object.',flow(['Object','Forces','Net force','Motion response'],'Force analysis')));
    else if(/work-energy-power/.test(slug)) visuals.push(card('Energy transfer','Work done transfers energy between systems; power describes the rate of energy transfer.',bars([100,70,30],['Initial','Transferred','Useful output'],'Energy transfer')));
    else if(/density-pressure/.test(slug)) visuals.push(card('Pressure with depth','In a liquid, pressure generally increases as depth increases.',line([[1,2,3,4,5,6]],['0','1','2','3','4','5'],'Pressure vs depth')));
    else if(/electromagnetic-induction/.test(slug)) visuals.push(card('Induction pathway','A changing magnetic flux can induce an emf in a conductor.',flow(['Changing flux','Conductor','Induced emf','Current'],'Electromagnetic induction')));
    else if(/solar-renewable/.test(slug)) visuals.push(card('Energy conversion','Solar systems convert incoming radiation into useful electrical or thermal energy.',flow(['Sunlight','Collector','Conversion','Useful energy'],'Solar-energy pathway')));
    else if(/atomic-nuclear/.test(slug)) visuals.push(card('Radioactive decay','Radioactive activity decreases over time as unstable nuclei decay.',line([[100,70,50,35,25,18]],['0','1','2','3','4','5'],'Activity vs time')));
    else visuals.push(card('Physics reasoning pathway','Translate the situation into a diagram, identify quantities, apply a law and interpret the result.',flow(['Situation','Diagram','Law','Calculation','Interpret'],'Physics problem solving')));
  } else if(subject==='biology'){
    if(/cell-structure/.test(slug)) visuals.push(card('Cell organisation','Cell structures work together as specialised parts of one system.',flow(['Cell membrane','Cytoplasm','Organelles','Nucleus'],'Cell organisation')));
    else if(/photosynthesis|plant-nutrition/.test(slug)) visuals.push(card('Photosynthesis pathway','Plants use light energy to convert carbon dioxide and water into glucose and oxygen.',flow(['Light','CO₂ + water','Photosynthesis','Glucose + O₂'],'Photosynthesis')));
    else if(/digestive/.test(slug)) visuals.push(card('Digestive pathway','Food moves through specialised organs where mechanical and chemical digestion occur.',flow(['Mouth','Stomach','Small intestine','Large intestine','Rectum'],'Digestive system')));
    else if(/respiratory/.test(slug)) visuals.push(card('Gas-exchange pathway','Ventilation brings air to the lungs where oxygen and carbon dioxide are exchanged.',flow(['Air','Lungs','Alveoli','Blood'],'Gas exchange')));
    else if(/circulatory|transport-circulatory/.test(slug)) visuals.push(card('Double circulation','Blood travels through pulmonary and systemic circuits to deliver oxygen and remove wastes.',flow(['Heart','Lungs','Heart','Body tissues','Heart'],'Double circulation')));
    else if(/genetics|variation/.test(slug)) visuals.push(card('Inheritance pathway','Genes are transmitted through gametes and combine at fertilisation.',flow(['Parent alleles','Gametes','Fertilisation','Offspring genotype'],'Inheritance')));
    else if(/ecology|population|nutrient-cycles/.test(slug)) visuals.push(card('Ecosystem cycle','Energy moves through food chains while matter is recycled between organisms and the environment.',cycle(['Sun','Producers','Consumers','Decomposers','Nutrients'],'Ecosystem relationships')));
    else if(/microorganisms/.test(slug)) visuals.push(card('Microbial growth curve','A typical culture passes through lag, rapid growth, stationary and decline phases.',line([[1,2,4,8,14,16,15,12]],['Lag','Growth','Growth','Growth','Stationary','Stationary','Decline','Decline'],'Microbial growth')));
    else if(/reproduction/.test(slug)) visuals.push(card('Reproductive cycle','Reproduction involves coordinated stages from gamete formation through development.',flow(['Gametes','Fertilisation','Embryo','Development','New organism'],'Reproduction')));
    else if(/nervous|endocrine/.test(slug)) visuals.push(card('Coordination pathway','Stimulus information is detected, processed and linked to an appropriate response.',flow(['Stimulus','Receptor','Coordinator','Effector','Response'],'Coordination')));
    else if(/excretion|osmoregulation/.test(slug)) visuals.push(card('Excretion pathway','The body removes metabolic wastes while regulating water and dissolved substances.',flow(['Blood','Kidney','Filtration','Reabsorption','Urine'],'Excretion and osmoregulation')));
    else if(/plant-structure/.test(slug)) visuals.push(card('Plant transport','Roots absorb water and minerals while vascular tissues distribute materials through the plant.',flow(['Roots','Xylem/phloem','Stem','Leaves'],'Plant transport')));
    else visuals.push(card('Biology systems view','Biological processes are linked systems: structure supports function and changes can affect the whole organism.',flow(['Structure','Function','Process','Response','Adaptation'],'Biology systems')));
  } else if(subject==='education'){
    visuals.push(card('Instructional design cycle','Effective teaching can be planned as a cycle of needs analysis, design, implementation and evaluation.',cycle(['Analyse','Design','Implement','Evaluate'],'Instructional design cycle')));
  } else {
    visuals.push(card('Study cycle','A strong study session moves from planning to learning, practice, feedback and review.',cycle(['Plan','Learn','Practise','Check','Review'],'Effective study cycle')));
  }

  if (!visuals.length) return;
  const host=document.createElement('div');
  host.id='malawihub-notes-visuals';
  host.innerHTML=`<div class="mhv-heading"><span>📊</span><div><h2>Graphs &amp; diagrams</h2><p>Visual summaries to make this note easier to understand and revise.</p></div></div>${visuals.join('')}`;
  const style=document.createElement('style');
  style.textContent=`#malawihub-notes-visuals{margin:28px 0}.mhv-heading{display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#eef8f4,#f8fafc);border:1px solid #d8e7e1;border-radius:14px;padding:16px 18px;margin-bottom:18px}.mhv-heading h2{margin:0;color:#087f5b}.mhv-heading p{margin:4px 0 0;color:#475569}.mhv-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:16px 0;box-shadow:0 3px 12px rgba(0,0,0,.05)}.mhv-card h2{margin:0 0 6px;color:#087f5b}.mhv-card p{margin:0 0 10px;color:#475569}.mhv-diagram{overflow-x:auto}.mhv-svg{width:100%;min-width:620px;height:auto;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.mhv-svg text{fill:#334155;font-size:13px}.mhv-svg circle,.mhv-svg rect{vector-effect:non-scaling-stroke}@media(max-width:650px){.mhv-svg{min-width:560px}.mhv-card{padding:14px}}`;
  document.head.appendChild(style);
  const main=document.querySelector('main');
  if(main) main.appendChild(host); else document.body.appendChild(host);
})();
