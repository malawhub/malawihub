(function(){
 const path=(location.pathname||"").toLowerCase(),params=new URLSearchParams(location.search);
 if(!path.endsWith("/online-class/index.html")&&!path.endsWith("/online-class/"))return;
 if(!(params.get("student")==="1"||params.get("role")==="student"||sessionStorage.getItem("malawihub_student_portal")==="1"))return;

 function install(){
  const display=document.getElementById("studentDisplay"),room=document.getElementById("room");
  if(!display||!room)return;
  document.body.classList.add("student-room");

  if(!document.getElementById("mhStudentWorkspaceStyle")){
   const s=document.createElement("style");
   s.id="mhStudentWorkspaceStyle";
   s.textContent=
    "body.student-room .top,body.student-room #modePanel,body.student-room #adminTopStatus,body.student-room .grid2,body.student-room #studentTopBar{display:none!important}"+
    "body.student-room .class-wrap{max-width:100%;padding:0}"+
    "body.student-room #studentDisplay{display:flex!important;flex-direction:column;min-height:100vh;margin:0;border-radius:0;background:#101828;box-shadow:none}"+
    ".mh-student-head{background:#fff;padding:8px 12px;display:flex;align-items:center;gap:12px;font-weight:700;min-height:44px;box-sizing:border-box}"+
    ".mh-student-head #mhStudentTimer{margin-left:auto;font-variant-numeric:tabular-nums;font-size:20px}"+
    ".mh-student-mic{width:42px;height:42px;border:0;border-radius:11px;background:#f2f4f7;display:grid;place-items:center;font-size:20px;cursor:pointer}"+
    ".mh-student-mic.active{background:#0d6efd;color:#fff}"+
    ".mh-student-body{flex:1;min-height:0;position:relative;background:#101828}"+
    ".mh-student-view{display:none;height:100%;min-height:calc(100vh - 60px);overflow:auto;background:#fff}"+
    ".mh-student-view.active{display:block}.mh-student-view.live{background:#101828}"+
    ".mh-student-view .stage{margin:0;border-radius:0;min-height:calc(100vh - 60px);height:100%}"+
    ".mh-student-view .panel{margin:0;border-radius:0;box-shadow:none}"+
    ".mh-student-view .video-grid{grid-template-columns:1fr}.mh-student-board{display:block;width:100%;height:calc(100vh - 60px);min-height:360px;background:#fff;touch-action:none;cursor:crosshair}"+
    "@media(max-width:600px){.mh-student-view,.mh-student-view .stage{min-height:calc(100vh - 58px)}}";
   document.head.appendChild(s);
  }

  display.className="student-display";
  display.innerHTML=
   '<div class="mh-student-head">'+
   '<span id="mhStudentTitle">🎥 Live Classroom</span>'+
   '<span id="mhStudentTimer">00:00</span>'+
   '<button class="mh-student-mic" id="mhStudentMic" title="Microphone" aria-label="Microphone">🎙</button>'+
   '</div>'+
   '<div class="mh-student-body">'+
   '<div class="mh-student-view active live" id="mhStudentLive"></div>'+
   '<div class="mh-student-view" id="mhStudentFile"></div>'+
   '<div class="mh-student-view" id="mhStudentVideo"></div>'+
   '<div class="mh-student-view" id="mhStudentWhiteboard"><canvas id="mhStudentBoard" class="mh-student-board" aria-label="MalawiHub shared whiteboard"></canvas></div>'+
   '<div class="mh-student-view" id="mhStudentNotes"></div>'+
   '<div class="mh-student-view" id="mhStudentStudents"></div>'+
   '<div class="mh-student-view" id="mhStudentChat"></div>'+
   '</div>';

  const move=(id,target)=>{
   const a=document.getElementById(id),b=document.getElementById(target);
   if(a&&b&&!b.contains(a))b.appendChild(a);
  };

  function ensureFileDownload(){
   const panel=document.getElementById("classFilePanel");
   if(!panel||document.getElementById("mhStudentFileDownload"))return;
   const b=document.createElement("button");
   b.id="mhStudentFileDownload";
   b.type="button";
   b.className="btn primary";
   b.textContent="⬇ Download Displayed File";
   b.style.cssText="display:block;width:calc(100% - 24px);margin:10px 12px 14px;padding:11px 14px;font-weight:700";
   b.onclick=async()=>{
    const url=b.dataset.url;
    const name=b.dataset.name||"malawihub-class-file";
    if(!url)return;
    const old=b.textContent;b.disabled=true;b.textContent="⏳ Preparing download…";
    try{
     const res=await fetch(url,{mode:"cors"});
     if(!res.ok)throw new Error("HTTP "+res.status);
     const blob=await res.blob();
     const a=document.createElement("a");
     a.href=URL.createObjectURL(blob);
     a.download=name;
     document.body.appendChild(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }catch(e){
     console.warn("Displayed file download failed",e);
     const a=document.createElement("a");
     a.href=url;a.target="_blank";a.rel="noopener";
     document.body.appendChild(a);a.click();a.remove();
    }finally{b.disabled=false;b.textContent=old}
   };
   panel.appendChild(b);
  }

  window.updateStudentFileDownload=(file)=>{
   ensureFileDownload();
   const b=document.getElementById("mhStudentFileDownload");
   if(!b)return;
   b.dataset.url=file?.url||"";
   b.dataset.name=(file?.name||"malawihub-class-file").replace(/[\\/:"*?<>|]+/g,"_");
   b.style.display=file?.url?"block":"none";
  };

  function mount(){
   ensureFileDownload();
   move("remoteVideo","mhStudentLive");
   move("remoteAudio","mhStudentLive");
   move("waiting","mhStudentLive");
   move("classFilePanel","mhStudentFile");
   move("videoResources","mhStudentVideo");
   move("notes","mhStudentNotes");
   move("downloadNotes","mhStudentNotes");
   move("printNotes","mhStudentNotes");
   move("saveState","mhStudentNotes");
   move("students","mhStudentStudents");
   move("chat","mhStudentChat");
   move("chatInput","mhStudentChat");
   move("sendChat","mhStudentChat");

  }

  const views={
   live:["mhStudentLive","🎥 Live Classroom"],
   file:["mhStudentFile","📄 Shared File"],
   video:["mhStudentVideo","🎬 Class Videos"],
   whiteboard:["mhStudentWhiteboard","🧑‍🏫 Shared Whiteboard"],
   notes:["mhStudentNotes","📝 Live Notes"],
   students:["mhStudentStudents","👥 Students"],
   chat:["mhStudentChat","💬 Class Chat"]
  };

  function show(v){
   mount();
   const x=views[v]||views.live;
   Object.values(views).forEach(a=>document.getElementById(a[0])?.classList.remove("active"));
   document.getElementById(x[0])?.classList.add("active");
   if(v==="whiteboard")window.MalawiHubInPageWhiteboard?.resize();
   const title=document.getElementById("mhStudentTitle");
   if(title)title.textContent=x[1];
  }

  // Keep the legacy classroom engine as the actual audio/WebRTC controller.
  // The visible student microphone simply triggers that proven handler.
  const mic=document.getElementById("mhStudentMic");
  if(mic){
   mic.onclick=()=>{
    const legacy=document.getElementById("micBtn");
    if(legacy)legacy.click();
   };
  }

  // Override the legacy display helpers so the new single-display layout
  // never references removed elements.
  window.prepareStudentDisplay=()=>{document.body.classList.add("student-room");mount();show("live");};
  window.studentShowDisplay=(view,title)=>{
   const map={studentLiveView:"live",studentFileView:"file",studentWhiteboardView:"whiteboard",live:"live",file:"file",whiteboard:"whiteboard",notes:"notes",chat:"chat"};
   show(map[view]||"live");
   const t=document.getElementById("mhStudentTitle");
   if(t&&title)t.textContent=title;
  };

  const sourceTimer=document.getElementById("timer");
  const syncTimer=()=>{
   const t=document.getElementById("mhStudentTimer");
   if(t&&sourceTimer)t.textContent=sourceTimer.textContent||"00:00";
  };
  syncTimer();
  setInterval(syncTimer,500);

  mount();
  show("live");
 }

 let tries=0;
 function ready(){
  install();
  if(tries++<20)setTimeout(ready,250);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
 else ready();
})();