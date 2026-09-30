
(function(){
 const path=(location.pathname||"").toLowerCase(),params=new URLSearchParams(location.search);
 if(!path.endsWith("/online-class/index.html")&&!path.endsWith("/online-class/"))return;
 if(!(params.get("student")==="1"||params.get("role")==="student"||sessionStorage.getItem("malawihub_student_portal")==="1"))return;
 function install(){
  const display=document.getElementById("studentDisplay"),room=document.getElementById("room");
  if(!display||!room)return;
  document.body.classList.add("student-room");
  if(!document.getElementById("mhStudentWorkspaceStyle")){
   const s=document.createElement("style");s.id="mhStudentWorkspaceStyle";
   s.textContent="body.student-room .top,body.student-room #modePanel,body.student-room #adminTopStatus,body.student-room .grid2,body.student-room #studentTopBar{display:none!important}"+
   "body.student-room .class-wrap{max-width:100%;padding:0}body.student-room #studentDisplay{display:flex!important;flex-direction:column;min-height:100vh;margin:0;border-radius:0;background:#101828;box-shadow:none}"+
   ".mh-student-symbolbar{display:flex;gap:6px;align-items:center;justify-content:center;overflow-x:auto;white-space:nowrap;padding:7px;background:#fff;border-bottom:1px solid #e4e7ec}.mh-student-symbolbar.bottom{border-top:1px solid #e4e7ec;border-bottom:0}"+
   ".mh-student-symbol{width:42px;height:42px;min-width:42px;border:0;border-radius:11px;background:#f2f4f7;display:grid;place-items:center;font-size:20px;cursor:pointer}.mh-student-symbol.active{background:#0d6efd;color:#fff}"+
   ".mh-student-head{background:#fff;padding:6px 10px;display:flex;align-items:center;justify-content:space-between;font-weight:700}.mh-student-body{flex:1;min-height:0;position:relative;background:#101828}"+
   ".mh-student-view{display:none;height:100%;min-height:calc(100vh - 180px);overflow:auto;background:#fff}.mh-student-view.active{display:block}.mh-student-view.live{background:#101828}.mh-student-view .stage{margin:0;border-radius:0;min-height:calc(100vh - 180px);height:100%}.mh-student-view .panel{margin:0;border-radius:0;box-shadow:none}.mh-student-view .video-grid{grid-template-columns:1fr}.mh-student-more{display:flex;justify-content:center;padding:8px;background:#fff;border-top:1px solid #e4e7ec}@media(max-width:600px){.mh-student-symbolbar{justify-content:flex-start}.mh-student-symbol{width:40px;height:40px;min-width:40px}.mh-student-view,.mh-student-view .stage{min-height:calc(100vh - 175px)}}";
   document.head.appendChild(s);
  }
  display.className="student-display";
  display.innerHTML='<div class="mh-student-symbolbar">'+
   '<button class="mh-student-symbol active" data-view="live" title="Live classroom">🎥</button><button class="mh-student-symbol" data-view="file" title="Shared files">📄</button><button class="mh-student-symbol" data-view="video" title="Class videos">🎬</button><button class="mh-student-symbol" data-view="whiteboard" title="Shared whiteboard">🧑‍🏫</button><button class="mh-student-symbol" data-view="notes" title="Live notes">📝</button><button class="mh-student-symbol" data-view="students" title="Students">👥</button><button class="mh-student-symbol" data-view="chat" title="Class chat">💬</button></div>'+
   '<div class="mh-student-head"><span id="mhStudentTitle">🎥 Live Classroom</span><span id="mhStudentStatus">LIVE</span></div>'+
   '<div class="mh-student-body"><div class="mh-student-view active live" id="mhStudentLive"></div><div class="mh-student-view" id="mhStudentFile"></div><div class="mh-student-view" id="mhStudentVideo"></div><div class="mh-student-view" id="mhStudentWhiteboard"><iframe title="MalawiHub Shared Whiteboard" style="width:100%;height:100%;min-height:calc(100vh - 180px);border:0;background:#fff"></iframe></div><div class="mh-student-view" id="mhStudentNotes"></div><div class="mh-student-view" id="mhStudentStudents"></div><div class="mh-student-view" id="mhStudentChat"></div></div>'+
   '<div class="mh-student-symbolbar bottom"><button class="mh-student-symbol" id="mhStudentMic" title="Microphone">🎙</button><button class="mh-student-symbol" id="mhStudentExit" title="Exit and return to Student Portal">↩</button><button class="mh-student-symbol" id="mhStudentMute" title="Mute classroom audio">🔊</button><button class="mh-student-symbol" id="mhStudentFull" title="Fullscreen">⛶</button><button class="mh-student-symbol" id="mhStudentMore" title="More">⋮</button></div>'+
   '<div class="mh-student-more hidden" id="mhStudentMoreMenu"><button class="btn" id="mhStudentPrivate">🔒 Private Notes</button></div>';
  const move=(id,target)=>{const a=document.getElementById(id),b=document.getElementById(target);if(a&&b&&!b.contains(a))b.appendChild(a)};
  function mount(){
   move("remoteVideo","mhStudentLive");move("remoteAudio","mhStudentLive");move("waiting","mhStudentLive");
   move("classFilePanel","mhStudentFile");move("videoResources","mhStudentVideo");move("notes","mhStudentNotes");move("downloadNotes","mhStudentNotes");move("printNotes","mhStudentNotes");move("saveState","mhStudentNotes");
   move("students","mhStudentStudents");move("chat","mhStudentChat");move("chatInput","mhStudentChat");move("sendChat","mhStudentChat");
   const wb=document.querySelector("#mhStudentWhiteboard iframe"),code=params.get("code")||sessionStorage.getItem("malawihub_class_code")||"";
   if(wb&&!wb.src&&code)wb.src="./whiteboard.html?code="+encodeURIComponent(code)+"&role=student&embedded=1";
  }
  const views={live:["mhStudentLive","🎥 Live Classroom","LIVE"],file:["mhStudentFile","📄 Shared File","SHARED"],video:["mhStudentVideo","🎬 Class Videos","SHARED"],whiteboard:["mhStudentWhiteboard","🧑‍🏫 Shared Whiteboard","SHARED"],notes:["mhStudentNotes","📝 Live Notes","SHARED"],students:["mhStudentStudents","👥 Students","LIVE"],chat:["mhStudentChat","💬 Class Chat","LIVE"]};
  function show(v){mount();const x=views[v]||views.live;Object.values(views).forEach(a=>document.getElementById(a[0])?.classList.remove("active"));document.getElementById(x[0])?.classList.add("active");display.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));document.getElementById("mhStudentTitle").textContent=x[1];document.getElementById("mhStudentStatus").textContent=x[2]}
  display.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view));
  document.getElementById("mhStudentMic").onclick=()=>document.getElementById("micBtn")?.click();
  document.getElementById("mhStudentMute").onclick=()=>{const a=document.getElementById("remoteAudio");if(a){a.muted=!a.muted;document.getElementById("mhStudentMute").textContent=a.muted?"🔇":"🔊"}};
  document.getElementById("mhStudentFull").onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else display.requestFullscreen?.()};
  document.getElementById("mhStudentMore").onclick=()=>document.getElementById("mhStudentMoreMenu")?.classList.toggle("hidden");
  document.getElementById("mhStudentExit").onclick=()=>{const code=params.get("code")||sessionStorage.getItem("malawihub_class_code")||"";sessionStorage.setItem("malawihub_class_code",code);sessionStorage.setItem("malawihub_student_portal","1");location.href="../student-portal/?reenter=1"};
  document.getElementById("mhStudentPrivate").onclick=()=>{const p=document.getElementById("privateNotes")?.closest(".private-note-panel");if(p)document.getElementById("mhStudentNotes")?.appendChild(p);show("notes");document.getElementById("mhStudentMoreMenu")?.classList.add("hidden")};
  mount();if(!room.classList.contains("hidden"))show("live");
 }
 let tries=0;function ready(){install();if(tries++<20)setTimeout(ready,250)}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
})();
