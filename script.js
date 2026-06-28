/* ============================================================
   Saumya Singh — résumé app
   ============================================================ */
(function(){
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s,c)=> (c||document).querySelector(s);
  const $$ = (s,c)=> [...(c||document).querySelectorAll(s)];

  const PAGES = [
    {id:"overview",  name:"Overview",   ix:"01", desc:"Intro & headline metrics"},
    {id:"experience",name:"Experience", ix:"02", desc:"Roles & achievements"},
    {id:"impact",    name:"Impact",     ix:"03", desc:"Metrics & data viz"},
    {id:"skills",    name:"Skills",     ix:"04", desc:"Toolkit & filters"},
    {id:"education", name:"Education",  ix:"05", desc:"Degrees & career path"},
    {id:"contact",   name:"Contact",    ix:"06", desc:"LinkedIn, GitHub, email"}
  ];

  const stage   = $("#stage");
  const navItems= $$(".navitem");
  const navind  = $("#navind");
  const tbIx    = $("#tbIx");
  const tbName  = $("#tbName");

  /* ---------- router ---------- */
  let current = null;
  function moveIndicator(){
    const active = $(".navitem.is-active");
    if(!active || !navind){ navind && navind.classList.remove("show"); return; }
    // horizontal indicator: move and resize to match active tab
    navind.style.transform = "translateX(" + active.offsetLeft + "px)";
    navind.style.width = active.offsetWidth + "px";
    navind.classList.add("show");
  }
  function animateView(view){
    // counters
    $$("[data-count]", view).forEach(animateCount);
    // bars / rings / meters via CSS class (works without rAF)
    view.classList.remove("animate");
    void view.offsetWidth;             // reflow
    setTimeout(()=> view.classList.add("animate"), 30);
  }
  function goTo(id, push){
    const page = PAGES.find(p=>p.id===id) || PAGES[0];
    if(page.id === current) { stage.scrollTo({top:0,behavior:"smooth"}); return; }
    current = page.id;

    $$(".view").forEach(v=> v.classList.toggle("is-shown", v.id===page.id));
    navItems.forEach(n=> n.classList.toggle("is-active", n.dataset.view===page.id));
    if(tbIx) tbIx.textContent = page.ix;
    if(tbName) tbName.textContent = page.name;
    document.title = "Saumya Singh · " + page.name;
    if(push !== false && location.hash !== "#"+page.id) history.replaceState(null,"","#"+page.id);

    moveIndicator();
    stage.scrollTo({top:0});
    animateView($("#"+page.id));
    closeNav();
  }

  // any element with data-view navigates
  document.addEventListener("click",(e)=>{
    const t = e.target.closest("[data-view]");
    if(t){ e.preventDefault(); goTo(t.dataset.view); }
  });
  addEventListener("hashchange",()=> goTo((location.hash||"#overview").slice(1), false));

  /* ---------- counters ---------- */
  function animateCount(el){
    const target = parseFloat(el.dataset.count);
    const suf = el.dataset.suffix || "";
    if(reduce){ el.textContent = target + suf; return; }
    const dur = 1300, t0 = performance.now();
    function step(now){
      const p = Math.min((now-t0)/dur, 1);
      const e = 1 - Math.pow(1-p, 3);
      el.textContent = Math.round(target*e) + suf;
      if(p < 1) requestAnimationFrame(step);
    }
    el.textContent = "0" + suf;
    requestAnimationFrame(step);
    setTimeout(()=>{ el.textContent = target + suf; }, dur + 220); // safety net
  }

  /* ---------- typing ---------- */
  const typed = $("#typed");
  const roles = ["Senior Data Associate","Data Storyteller","Analytics & BI Specialist","MDM & Governance Lead"];
  if(typed && !reduce){
    let ri=0, ci=0, del=false;
    (function tick(){
      const w = roles[ri];
      typed.textContent = w.slice(0,ci);
      if(!del && ci<w.length){ ci++; setTimeout(tick,65); }
      else if(!del && ci===w.length){ del=true; setTimeout(tick,1500); }
      else if(del && ci>0){ ci--; setTimeout(tick,32); }
      else { del=false; ri=(ri+1)%roles.length; setTimeout(tick,300); }
    })();
  } else if(typed){ typed.textContent = roles[0]; }

  /* ---------- experience master-detail ---------- */
  $$(".exprole").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const r = btn.dataset.role;
      $$(".exprole").forEach(b=> b.classList.toggle("is-active", b===btn));
      $$(".expcard").forEach(c=> c.classList.toggle("is-active", c.dataset.role===r));
    });
  });

  /* ---------- skills filter ---------- */
  const sks = $$(".sk");
  $$(".filt").forEach(f=>{
    f.addEventListener("click",()=>{
      const cat = f.dataset.cat;
      $$(".filt").forEach(b=> b.classList.toggle("is-active", b===f));
      sks.forEach(s=>{
        const on = cat==="all" || s.dataset.cat===cat;
        s.classList.toggle("is-dim", !on);
        s.classList.toggle("is-hot", on && cat!=="all");
      });
    });
  });

  /* ---------- mobile nav ---------- */
  const navlist=$("#navlist"), scrim=$("#scrim"), burger=$("#burger");
  function openNav(){ navlist && navlist.classList.add("open"); scrim && scrim.classList.add("show"); }
  function closeNav(){ navlist && navlist.classList.remove("open"); scrim && scrim.classList.remove("show"); }
  burger && burger.addEventListener("click",()=> navlist && navlist.classList.contains("open")?closeNav():openNav());
  scrim && scrim.addEventListener("click", closeNav);

  /* ---------- command palette ---------- */
  const pal=$("#palette"), palInput=$("#paletteInput"), palList=$("#paletteList");
  let sel=0, filtered=PAGES.slice();
  function renderPal(){
    palList.innerHTML = filtered.map((p,i)=>
      `<li class="palette__opt ${i===sel?'is-sel':''}" data-go="${p.id}">
         <span class="ix">${p.ix}</span><span class="nm">${p.name}</span><span class="ds">${p.desc}</span>
       </li>`).join("");
  }
  function openPal(){
    pal.classList.add("show"); palInput.value=""; filtered=PAGES.slice(); sel=0; renderPal();
    setTimeout(()=>palInput.focus(),30);
  }
  function closePal(){ pal.classList.remove("show"); }
  $("#cmdkBtn").addEventListener("click", openPal);
  palInput.addEventListener("input",()=>{
    const q = palInput.value.toLowerCase().trim();
    filtered = PAGES.filter(p=> (p.name+" "+p.desc+" "+p.id).toLowerCase().includes(q));
    sel=0; renderPal();
  });
  palList.addEventListener("click",(e)=>{
    const li=e.target.closest("[data-go]"); if(li){ goTo(li.dataset.go); closePal(); }
  });
  addEventListener("keydown",(e)=>{
    const open = pal.classList.contains("show");
    if((e.key==="k"||e.key==="K") && (e.metaKey||e.ctrlKey)){ e.preventDefault(); open?closePal():openPal(); return; }
    if(open){
      if(e.key==="Escape") closePal();
      else if(e.key==="ArrowDown"){ e.preventDefault(); sel=Math.min(sel+1,filtered.length-1); renderPal(); }
      else if(e.key==="ArrowUp"){ e.preventDefault(); sel=Math.max(sel-1,0); renderPal(); }
      else if(e.key==="Enter" && filtered[sel]){ goTo(filtered[sel].id); closePal(); }
      return;
    }
    // page nav with arrows (when not typing)
    if(/input|textarea/i.test(e.target.tagName)) return;
    if(e.key==="ArrowRight"||e.key==="ArrowDown"){ const i=PAGES.findIndex(p=>p.id===current); goTo(PAGES[Math.min(i+1,PAGES.length-1)].id); }
    else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){ const i=PAGES.findIndex(p=>p.id===current); goTo(PAGES[Math.max(i-1,0)].id); }
  });

  /* ---------- card tilt (pointer only) ---------- */
  if(!reduce && matchMedia("(pointer:fine)").matches){
    $$(".kpi,.tile,.edu__card").forEach(card=>{
      card.addEventListener("mousemove",(e)=>{
        const r=card.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`translateY(-5px) rotateX(${-py*5}deg) rotateY(${px*5}deg)`;
      });
      card.addEventListener("mouseleave",()=> card.style.transform="");
    });
  }

  /* ---------- boot ---------- */
  window.addEventListener("resize", moveIndicator);
  goTo((location.hash||"#overview").slice(1), false);
})();
