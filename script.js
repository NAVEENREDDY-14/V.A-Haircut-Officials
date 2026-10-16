(function(){
  'use strict';

  /* ---------- CONFIG ---------- */
  var WA_NUMBER = '917330947785';
  var ADMIN_PIN = '1234';
  var STORE_KEY = 'va_bookings_v1';
  var SESSION_KEY = 'va_admin_ok';

  /* ---------- DATA ---------- */
  var FEATURED = [
    {id:'f-haircut', name:'Haircut',        label:'Haircut (Signature)',  price:149, icon:'💈', sub:'Signature cut with styling'},
    {id:'f-beard',   name:'Beard',          label:'Beard',                price:50,  icon:'🧔', sub:'Clean beard trim'},
    {id:'f-shape',   name:'Beard Shape',    label:'Beard Shape',          price:79,  icon:'📐', sub:'Sharp, defined beard lines'},
    {id:'f-detan',   name:'De-Tan Remover', label:'De-Tan Remover',       price:249, icon:'✨', sub:'Removes tan, brightens skin'},
    {id:'f-scrub',   name:'Face Scrub',     label:'Face Scrub',           price:199, icon:'🧼', sub:'Deep clean & exfoliation'}
  ];
  var MENU = {
    'Hair':[
      {id:'m-haircut', name:'Haircut',        label:'Haircut (Regular)', price:99, sub:'Classic everyday cut'},
      {id:'m-kids',    name:'Kids Haircut',   label:'Kids Haircut',      price:79, sub:'Gentle cut for little ones'},
      {id:'m-drygel',  name:'Hair Dry & Gel', label:'Hair Dry & Gel',    price:49, sub:'Blow-dry with styling gel'}
    ],
    'Shave & Beard':[
      {id:'m-shave',   name:'Shaving',     label:'Shaving',     price:49, sub:'Smooth, clean shave'},
      {id:'m-trim',    name:'Trimming',    label:'Trimming',    price:49, sub:'Neat edge-up & trim'},
      {id:'m-bcolor',  name:'Beard Color', label:'Beard Color', price:49, sub:'Even, natural-look colour'}
    ],
    'Skin Care':[
      {id:'m-detanp',  name:'De-Tan Pack',   label:'De-Tan Pack',   price:199, sub:'Tan removal face pack'},
      {id:'m-scrub',   name:'Scrub',         label:'Scrub',         price:149, sub:'Refreshing face scrub'},
      {id:'m-facial',  name:'Beauty Facial', label:'Beauty Facial', price:999, sub:'Complete premium facial'}
    ],
    'Head Care':[
      {id:'m-massage', name:'Head Massage',    label:'Head Massage',    price:99, sub:'Stress-relief massage'},
      {id:'m-wash',    name:'Head Wash',       label:'Head Wash',       price:49, sub:'Refreshing shampoo wash'},
      {id:'m-gel',     name:'Black Color Gel', label:'Black Color Gel', price:99, sub:'Instant black hair colour'}
    ]
  };
  var TIME_SLOTS = [];
  (function(){
    for(var h=9; h<21; h++){
      [0,30].forEach(function(m){
        var hh = h%12===0?12:h%12, ap = h<12?'AM':'PM';
        TIME_SLOTS.push({label:hh+':'+(m===0?'00':'30')+' '+ap, minutes:h*60+m});
      });
    }
  })();

  var ALL = {};
  FEATURED.forEach(function(s){ALL[s.id]=s;});
  Object.keys(MENU).forEach(function(c){MENU[c].forEach(function(s){ALL[s.id]=s;});});

  /* ---------- HELPERS ---------- */
  var $ = function(s,ctx){return (ctx||document).querySelector(s);};
  var $$ = function(s,ctx){return Array.prototype.slice.call((ctx||document).querySelectorAll(s));};
  function esc(str){return String(str).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function rupee(n){return '₹'+Number(n).toLocaleString('en-IN');}
  function pad(n){return n<10?'0'+n:''+n;}
  function todayISO(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function prettyDate(iso){
    var p=iso.split('-'); var d=new Date(+p[0],+p[1]-1,+p[2]);
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  }
  function digits(s){return String(s).replace(/\D/g,'');}
  function waPhone(raw){
    var d=digits(raw);
    if(d.length===10) return '91'+d;
    if(d.length===12 && d.indexOf('91')===0) return d;
    return d;
  }
  function loadBookings(){
    try{var v=JSON.parse(localStorage.getItem(STORE_KEY)); return Array.isArray(v)?v:[];}catch(e){return [];}
  }
  function saveBookings(list){
    try{localStorage.setItem(STORE_KEY,JSON.stringify(list));return true;}catch(e){toast('Could not save — browser storage is blocked.','error');return false;}
  }
  function toast(msg,type){
    var box=$('#toasts'), t=document.createElement('div');
    t.className='toast'+(type==='error'?' error':'');
    t.innerHTML='<span>'+(type==='error'?'⚠️':'✅')+'</span><span></span>';
    t.lastChild.textContent=msg;
    box.appendChild(t);
    setTimeout(function(){t.style.opacity='0';t.style.transition='.3s';setTimeout(function(){t.remove();},300);},3800);
  }

  /* ---------- NAV ---------- */
  var burger=$('#burger'), mm=$('#mobileMenu');
  burger.addEventListener('click',function(){
    var open=mm.classList.toggle('open');
    burger.setAttribute('aria-expanded',open);
    burger.textContent=open?'✕':'☰';
  });
  $$('#mobileMenu a').forEach(function(a){a.addEventListener('click',function(){mm.classList.remove('open');burger.textContent='☰';burger.setAttribute('aria-expanded','false');});});
  $('#yr').textContent=new Date().getFullYear();

  /* ---------- RENDER: FEATURED ---------- */
  var featGrid=$('#featGrid');
  featGrid.innerHTML=FEATURED.map(function(s){
    return '<article class="glass feat reveal">'+
      '<span class="ribbon">Popular</span>'+
      '<div class="ico">'+s.icon+'</div>'+
      '<h3>'+esc(s.name)+'</h3>'+
      '<small>'+esc(s.sub)+'</small>'+
      '<div class="price">'+rupee(s.price)+'<sup>/-</sup></div>'+
      '<button class="btn btn-primary btn-sm" type="button" data-select="'+s.id+'">Select to Book</button>'+
    '</article>';
  }).join('');

  /* ---------- RENDER: MENU TABS ---------- */
  var cats=Object.keys(MENU), activeCat=cats[0];
  var tabsEl=$('#tabs'), menuGrid=$('#menuGrid');
  function renderTabs(){
    tabsEl.innerHTML=['All'].concat(cats).map(function(c){
      return '<button type="button" role="tab" class="tab'+(c===activeCat?' active':'')+'" data-cat="'+esc(c)+'" aria-selected="'+(c===activeCat)+'">'+esc(c)+'</button>';
    }).join('');
  }
  function renderMenu(){
    var list=[];
    (activeCat==='All'?cats:[activeCat]).forEach(function(c){MENU[c].forEach(function(s){list.push(s);});});
    menuGrid.innerHTML=list.map(function(s){
      return '<article class="glass menu-item">'+
        '<div class="menu-top"><div><h4>'+esc(s.name)+'</h4><small>'+esc(s.sub)+'</small></div>'+
        '<div class="price">'+rupee(s.price)+'<sup>/-</sup></div></div>'+
        '<button class="btn btn-outline btn-sm" type="button" data-select="'+s.id+'">Select to Book</button>'+
      '</article>';
    }).join('');
  }
  tabsEl.addEventListener('click',function(e){
    var b=e.target.closest('.tab'); if(!b) return;
    activeCat=b.getAttribute('data-cat'); renderTabs(); renderMenu();
  });
  renderTabs(); renderMenu();

  /* ---------- RENDER: BOOKING CHECKBOXES ---------- */
  var svcBoxes=$('#svcBoxes');
  function chkHTML(s){
    return '<label class="chk"><input type="checkbox" name="svc" value="'+s.id+'" data-price="'+s.price+'"><span>'+esc(s.label)+' <b>'+rupee(s.price)+'</b></span></label>';
  }
  var html='<div class="svc-group"><h5>Popular</h5><div class="svc-list">'+FEATURED.map(chkHTML).join('')+'</div></div>';
  cats.forEach(function(c){html+='<div class="svc-group"><h5>'+esc(c)+'</h5><div class="svc-list">'+MENU[c].map(chkHTML).join('')+'</div></div>';});
  svcBoxes.innerHTML=html;

  function calcTotal(){
    var sel=$$('input[name=svc]:checked',svcBoxes), t=0;
    sel.forEach(function(i){t+=Number(i.getAttribute('data-price'));});
    $('#totalAmt').textContent=rupee(t);
    $('#selCount').textContent=sel.length+(sel.length===1?' service selected':' services selected');
    return t;
  }
  svcBoxes.addEventListener('change',calcTotal);

  /* "Select to Book" buttons */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-select]'); if(!b) return;
    var id=b.getAttribute('data-select');
    var box=$('input[name=svc][value="'+id+'"]');
    if(box){box.checked=true;calcTotal();}
    toast(ALL[id].label+' added to your booking');
    $('#book').scrollIntoView({behavior:'smooth'});
    setTimeout(function(){var n=$('#bName'); if(n && !n.value) n.focus({preventScroll:true});},700);
  });

  /* ---------- DATE & TIME ---------- */
  var dateEl=$('#bDate'), timeEl=$('#bTime');
  dateEl.min=todayISO();
  dateEl.value=todayISO();
  function fillTimes(){
    var isToday=dateEl.value===todayISO(), now=new Date(), nowMin=now.getHours()*60+now.getMinutes();
    var prev=timeEl.value;
    var opts='<option value="">Select time slot</option>';
    var count=0;
    TIME_SLOTS.forEach(function(s){
      if(isToday && s.minutes<=nowMin) return;
      opts+='<option value="'+s.label+'">'+s.label+'</option>'; count++;
    });
    if(!count) opts='<option value="">No slots left today — pick another date</option>';
    timeEl.innerHTML=opts;
    if(prev) timeEl.value=prev;
  }
  dateEl.addEventListener('change',fillTimes);
  fillTimes();

  /* ---------- BOOKING SUBMIT ---------- */
  var form=$('#bookForm');
  function setErr(id,msg){$('#'+id).textContent=msg||'';}
  function validate(){
    var ok=true;
    var name=$('#bName').value.trim(), ph=digits($('#bPhone').value);
    setErr('eName');setErr('ePhone');setErr('eDate');setErr('eTime');setErr('eSvc');
    if(name.length<2){setErr('eName','Please enter your full name.');ok=false;}
    if(!(ph.length===10 || (ph.length===12 && ph.indexOf('91')===0))){setErr('ePhone','Enter a valid 10-digit phone number.');ok=false;}
    else if(ph.length===10 && !/^[6-9]/.test(ph)){setErr('ePhone','Indian mobile numbers start with 6, 7, 8 or 9.');ok=false;}
    if(!dateEl.value){setErr('eDate','Please choose a date.');ok=false;}
    else if(dateEl.value<todayISO()){setErr('eDate','Date cannot be in the past.');ok=false;}
    if(!timeEl.value){setErr('eTime','Please choose a time slot.');ok=false;}
    if(!$$('input[name=svc]:checked',svcBoxes).length){setErr('eSvc','Select at least one service.');ok=false;}
    return ok;
  }
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!validate()){toast('Please fix the highlighted fields.','error');return;}
    var sel=$$('input[name=svc]:checked',svcBoxes).map(function(i){return ALL[i.value];});
    var total=sel.reduce(function(a,s){return a+s.price;},0);
    var phone=digits($('#bPhone').value); if(phone.length===12) phone=phone.slice(2);
    var booking={
      id:'VA-'+Date.now().toString(36).toUpperCase(),
      name:$('#bName').value.trim(),
      phone:phone,
      date:dateEl.value,
      time:timeEl.value,
      services:sel.map(function(s){return s.label;}),
      total:total,
      timestamp:new Date().toISOString(),
      status:'Pending'
    };
    var list=loadBookings(); list.unshift(booking);
    if(!saveBookings(list)) return;

    var msg='Hello Vamsi brother, I would like to book an appointment at V.A Haircut & Officials:\n'+
      '- Name: '+booking.name+'\n'+
      '- Phone: '+booking.phone+'\n'+
      '- Date & Time: '+prettyDate(booking.date)+', '+booking.time+'\n'+
      '- Services: '+booking.services.join(', ')+'\n'+
      '- Total Approx: ₹'+booking.total+'\n'+
      'Please confirm my slot!';
    var url='https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(msg);

    // confirmation card
    $('#confirmDl').innerHTML=
      '<dt>Booking ID</dt><dd>'+esc(booking.id)+'</dd>'+
      '<dt>Name</dt><dd>'+esc(booking.name)+'</dd>'+
      '<dt>Phone</dt><dd>'+esc(booking.phone)+'</dd>'+
      '<dt>When</dt><dd>'+esc(prettyDate(booking.date))+', '+esc(booking.time)+'</dd>'+
      '<dt>Services</dt><dd>'+esc(booking.services.join(', '))+'</dd>'+
      '<dt>Total</dt><dd>'+rupee(booking.total)+'</dd>'+
      '<dt>Status</dt><dd>Pending confirmation</dd>';
    $('#confirmWa').href=url;
    $('#confirmCard').classList.add('show');
    $('#confirmCard').scrollIntoView({behavior:'smooth',block:'center'});
    toast('Booking saved! Opening WhatsApp…');

    var w=window.open(url,'_blank');
    if(!w){toast('Pop-up blocked — tap "Open WhatsApp again" below.','error');}

    form.reset(); dateEl.value=todayISO(); fillTimes(); calcTotal();
    renderAdmin();
  });

  /* ---------- ADMIN ---------- */
  var adminSec=$('#admin'), pinModal=$('#pinModal'), pinInput=$('#pinInput');
  function isAdmin(){try{return sessionStorage.getItem(SESSION_KEY)==='1';}catch(e){return false;}}
  function setAdmin(v){try{v?sessionStorage.setItem(SESSION_KEY,'1'):sessionStorage.removeItem(SESSION_KEY);}catch(e){}}
  function updateAdminButtons(){
    var label=isAdmin()?'📊 Admin Portal':'🔐 Admin Login';
    $('#adminBtn').textContent=label; $('#adminBtnM').textContent=label;
  }
  function showAdmin(){
    adminSec.classList.add('show'); renderAdmin(); updateAdminButtons();
    setTimeout(function(){adminSec.scrollIntoView({behavior:'smooth'});},50);
  }
  function openPin(){
    pinModal.classList.add('show'); document.body.classList.add('no-scroll');
    $('#ePin').textContent=''; pinInput.value=''; setTimeout(function(){pinInput.focus();},50);
  }
  function closeModal(m){m.classList.remove('show'); if(!$('.modal.show')) document.body.classList.remove('no-scroll');}
  function adminEntry(){
    mm.classList.remove('open'); burger.textContent='☰';
    if(isAdmin()) showAdmin(); else openPin();
  }
  $('#adminBtn').addEventListener('click',adminEntry);
  $('#adminBtnM').addEventListener('click',adminEntry);
  $('#pinCancel').addEventListener('click',function(){closeModal(pinModal);});
  $('#pinForm').addEventListener('submit',function(e){
    e.preventDefault();
    if(pinInput.value===ADMIN_PIN){
      setAdmin(true); closeModal(pinModal); toast('Welcome back, Vamsi!'); showAdmin();
    }else{
      $('#ePin').textContent='Incorrect PIN. Please try again.'; pinInput.value=''; pinInput.focus();
    }
  });
  $('#logoutBtn').addEventListener('click',function(){
    setAdmin(false); adminSec.classList.remove('show'); updateAdminButtons();
    window.scrollTo({top:0,behavior:'smooth'}); toast('Logged out.');
  });

  function renderAdmin(){
    var list=loadBookings(), today=todayISO();
    var rev=0, td=0;
    list.forEach(function(b){
      if(b.status!=='Cancelled') rev+=Number(b.total)||0;
      if(b.date===today && b.status!=='Cancelled') td++;
    });
    $('#stTotal').textContent=list.length;
    $('#stToday').textContent=td;
    $('#stRev').textContent=rupee(rev);
    var tb=$('#adminRows');
    if(!list.length){tb.innerHTML='<tr><td colspan="8" class="empty">No bookings yet. New appointments will appear here.</td></tr>';return;}
    tb.innerHTML=list.map(function(b){
      var wa='https://wa.me/'+waPhone(b.phone)+'?text='+encodeURIComponent(
        'Hello '+b.name+', this is Vamsi from V.A Haircut & Officials. Regarding your appointment on '+prettyDate(b.date)+' at '+b.time+' for '+b.services.join(', ')+' (approx ₹'+b.total+').');
      var opts=['Pending','Completed','Cancelled'].map(function(s){return '<option'+(b.status===s?' selected':'')+'>'+s+'</option>';}).join('');
      return '<tr>'+
        '<td><b>'+esc(b.name)+'</b><br><small style="color:#9CA3AF">'+esc(b.id)+'</small></td>'+
        '<td>'+esc(b.phone)+'</td>'+
        '<td>'+esc(prettyDate(b.date))+'</td>'+
        '<td>'+esc(b.time)+'</td>'+
        '<td>'+esc(b.services.join(', '))+'</td>'+
        '<td><b>'+rupee(b.total)+'</b></td>'+
        '<td><select class="st-'+esc(b.status)+'" data-status="'+esc(b.id)+'" aria-label="Status">'+opts+'</select></td>'+
        '<td><div class="row-actions">'+
          '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="'+wa+'">💬 WhatsApp</a>'+
          '<button class="btn btn-danger btn-sm" type="button" data-del="'+esc(b.id)+'">Delete</button>'+
        '</div></td></tr>';
    }).join('');
  }
  $('#adminRows').addEventListener('change',function(e){
    var id=e.target.getAttribute('data-status'); if(!id) return;
    var list=loadBookings();
    list.forEach(function(b){if(b.id===id) b.status=e.target.value;});
    saveBookings(list); renderAdmin(); toast('Status updated to '+e.target.value);
  });
  $('#adminRows').addEventListener('click',function(e){
    var btn=e.target.closest('[data-del]'); if(!btn) return;
    var id=btn.getAttribute('data-del');
    askConfirm('Delete booking?','This will permanently remove this booking.',function(){
      saveBookings(loadBookings().filter(function(b){return b.id!==id;}));
      renderAdmin(); toast('Booking deleted');
    });
  });
  $('#clearBtn').addEventListener('click',function(){
    if(!loadBookings().length){toast('Nothing to clear.','error');return;}
    askConfirm('Clear all bookings?','Every saved booking will be permanently deleted. This cannot be undone.',function(){
      saveBookings([]); renderAdmin(); toast('All bookings cleared');
    });
  });

  /* confirm modal */
  var cm=$('#confirmModal'), cmCb=null;
  function askConfirm(title,text,cb){
    $('#cmTitle').textContent=title; $('#cmText').textContent=text; cmCb=cb;
    cm.classList.add('show'); document.body.classList.add('no-scroll');
  }
  $('#cmNo').addEventListener('click',function(){cmCb=null;closeModal(cm);});
  $('#cmYes').addEventListener('click',function(){var cb=cmCb;cmCb=null;closeModal(cm);if(cb)cb();});
  [pinModal,cm].forEach(function(m){m.addEventListener('click',function(e){if(e.target===m){cmCb=null;closeModal(m);}});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){cmCb=null;$$('.modal.show').forEach(closeModal);}});

  /* CSV export */
  $('#exportBtn').addEventListener('click',function(){
    var list=loadBookings();
    if(!list.length){toast('No bookings to export.','error');return;}
    function cell(v){
      v=String(v==null?'':v);
      if(/^[=+\-@]/.test(v)) v="'"+v; // prevent spreadsheet formula injection
      return '"'+v.replace(/"/g,'""')+'"';
    }
    var rows=[['Booking ID','Name','Phone','Date','Time','Services','Total (INR)','Status','Created At']];
    list.forEach(function(b){rows.push([b.id,b.name,b.phone,b.date,b.time,b.services.join('; '),b.total,b.status,b.timestamp]);});
    var csv='\uFEFF'+rows.map(function(r){return r.map(cell).join(',');}).join('\r\n');
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='VA-bookings-'+todayISO()+'.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
    toast('CSV exported');
  });

  /* ---------- GALLERY LIGHTBOX ---------- */
  var lb=$('#lightbox');
  $('#galleryOpen').addEventListener('click',function(){lb.classList.add('show');document.body.classList.add('no-scroll');});
  $('#lbClose').addEventListener('click',function(){closeModal(lb);});
  lb.addEventListener('click',function(e){if(e.target===lb)closeModal(lb);});

  /* init admin state */
  updateAdminButtons();
  if(isAdmin()){adminSec.classList.add('show');renderAdmin();}

  /* sync across tabs */
  window.addEventListener('storage',function(e){if(e.key===STORE_KEY&&adminSec.classList.contains('show'))renderAdmin();});

  /* ---------- SCROLL REVEAL ---------- */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
    },{threshold:.12});
    $$('.reveal').forEach(function(el){io.observe(el);});
  }else{$$('.reveal').forEach(function(el){el.classList.add('in');});}

  calcTotal();
})();
