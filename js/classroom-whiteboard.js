/* MalawiHub in-page classroom whiteboard — 2026-10-03 */
(function(){
  const $=id=>document.getElementById(id);
  let canvas=null,ctx=null,role='',room='',channel=null,strokes=[],current=null,drawing=false,tool='pen',lastSent=0,resizeBound=false,channelBound=false;
  function addStudentClassControls(){
    if(role!=='student'||$('mhStudentClassControls'))return;
    const bar=document.querySelector('.student-toolbar');
    if(!bar)return;
    const wrap=document.createElement('div');
    wrap.id='mhStudentClassControls';
    wrap.style.cssText='display:flex;gap:7px;align-items:center;justify-content:center;flex-wrap:wrap;width:100%;margin-top:4px';
    const exit=document.createElement('button');
    exit.type='button';exit.className='btn danger';exit.textContent='🚪 Exit Class';
    exit.title='Leave this class and return to the Student Portal';
    exit.onclick=async()=>{
      try{if(channel&&room)await channel.send({type:'broadcast',event:'presence',payload:{code:room,action:'leave',id:window.malawiClassUserId||'',name:window.malawiClassUserName||''}})}catch(e){}
      try{sessionStorage.setItem('malawihub_class_code',room);sessionStorage.setItem('malawihub_student_portal','1')}catch(e){}
      location.href='../student-portal/?class='+encodeURIComponent(room)+'&reenter=1';
    };
    const reenter=document.createElement('button');
    reenter.type='button';reenter.className='btn';reenter.textContent='↩ Re-enter Class';
    reenter.title='Return to this class';
    reenter.onclick=()=>{if(room)location.href='./index.html?student=1&role=student&code='+encodeURIComponent(room)+'&v=20261003-student-reenter'};
    wrap.appendChild(exit);
    wrap.appendChild(reenter);
    bar.appendChild(wrap);
  }
  function init(){
    role=window.malawiClassRole||'';room=window.malawiClassRoom||'';channel=window.malawiClassChannel||null;
    canvas=role==='student'?$('mhStudentBoard'):$('mhTeacherBoard');
    if(role==='student')addStudentClassControls();
    if(!canvas)return;
    ctx=canvas.getContext('2d');resize();
    if(!resizeBound){window.addEventListener('resize',resize);resizeBound=true}
    bind();redraw();
    if(role==='student'&&channel)send('whiteboard-sync-request',{});
  }
  function resize(){if(!canvas||!ctx)return;const r=canvas.getBoundingClientRect(),d=Math.max(1,window.devicePixelRatio||1);canvas.width=Math.max(1,Math.floor(r.width*d));canvas.height=Math.max(1,Math.floor(r.height*d));ctx.setTransform(d,0,0,d,0,0);ctx.lineCap='round';ctx.lineJoin='round';redraw()}
  function pos(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
  function drawStroke(s,partial){if(!s?.points?.length)return;const w=canvas.clientWidth,h=canvas.clientHeight,p=s.points;ctx.save();ctx.strokeStyle=s.eraser?'#fff':s.color;ctx.lineWidth=s.size;ctx.lineCap='round';ctx.lineJoin='round';if(p.length===1){ctx.fillStyle=s.eraser?'#fff':s.color;ctx.beginPath();ctx.arc(p[0].x*w,p[0].y*h,Math.max(1,s.size/2),0,Math.PI*2);ctx.fill();ctx.restore();return}const start=partial?Math.max(0,p.length-2):0;ctx.beginPath();ctx.moveTo(p[start].x*w,p[start].y*h);for(let i=start+1;i<p.length;i++)ctx.lineTo(p[i].x*w,p[i].y*h);ctx.stroke();ctx.restore()}
  function redraw(){if(!ctx)return;ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);strokes.forEach(s=>drawStroke(s,false))}
  function addStroke(s){const i=strokes.findIndex(x=>x.id===s.id);if(i>=0)strokes[i]=s;else strokes.push(s);redraw()}
  async function send(action,payload){if(!channel||!room)return;try{await channel.send({type:'broadcast',event:'class',payload:{code:room,type:'whiteboard',action,...payload}})}catch(e){console.warn('whiteboard send',e)}}
  function down(e){if(!['teacher','admin','student'].includes(role))return;drawing=true;canvas.setPointerCapture?.(e.pointerId);const p=pos(e);current={id:(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()),color:$('mhBoardColor')?.value||'#111111',size:Number($('mhBoardSize')?.value||4),eraser:tool==='eraser',points:[p],author:window.malawiClassUserId||''};strokes.push(current);drawStroke(current,false)}
  function move(e){if(!drawing||!current)return;current.points.push(pos(e));drawStroke(current,true);const now=Date.now();if(now-lastSent>100){lastSent=now;send('whiteboard-segment',{stroke:{id:current.id,color:current.color,size:current.size,eraser:current.eraser,points:current.points.slice(-2),author:current.author}})}}
  function up(){if(!drawing)return;drawing=false;if(current){send('whiteboard-stroke',{stroke:current});current=null}}
  function setTool(t){tool=t;$('mhBoardPen')?.classList.toggle('primary',t==='pen');$('mhBoardEraser')?.classList.toggle('primary',t==='eraser')}
  function clearBoard(){strokes=[];redraw();send('whiteboard-clear',{})}
  function undo(){if(!strokes.length)return;strokes.pop();redraw();send('whiteboard-state',{strokes})}
  function receive(p){if(!p||p.code!==room||p.type!=='whiteboard')return;if(p.action==='whiteboard-stroke'&&p.stroke)addStroke(p.stroke);else if(p.action==='whiteboard-segment'&&p.stroke){const s=p.stroke,e=strokes.find(x=>x.id===s.id);if(e){const last=e.points.at(-1),pts=(s.points||[]).filter((x,i)=>i===0||!last||x.x!==last.x||x.y!==last.y);e.points.push(...pts);drawStroke(e,true)}else addStroke(s)}else if(p.action==='whiteboard-clear'){strokes=[];redraw()}else if(p.action==='whiteboard-state'&&Array.isArray(p.strokes)){strokes=p.strokes;redraw()}else if(p.action==='whiteboard-sync-request'&&['teacher','admin'].includes(role))send('whiteboard-state',{strokes})}
  function bind(){if(canvas.dataset.mhWbBound==='1')return;canvas.dataset.mhWbBound='1';canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',()=>{if(drawing)up()});$('mhBoardPen')?.addEventListener('click',()=>setTool('pen'));$('mhBoardEraser')?.addEventListener('click',()=>setTool('eraser'));$('mhBoardUndo')?.addEventListener('click',undo);$('mhBoardClear')?.addEventListener('click',clearBoard);setTool('pen');if(channel&&!channelBound){channel.on('broadcast',{event:'class'},({payload})=>receive(payload));channelBound=true}}
  window.MalawiHubInPageWhiteboard={init,resize,receive};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();