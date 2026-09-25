const KEY="shipchain_shipments_v1";

function getShipments(){return JSON.parse(localStorage.getItem(KEY)||"[]");}
function saveShipments(data){localStorage.setItem(KEY,JSON.stringify(data));}
function makeId(){return "SHP-"+Math.floor(100000+Math.random()*900000);}

const form=document.getElementById("shipmentForm");
if(form){
 form.addEventListener("submit",e=>{
  e.preventDefault();
  const shipment={
   id:makeId(),
   sender:sender.value.trim(),
   receiver:receiver.value.trim(),
   product:product.value.trim(),
   source:source.value.trim(),
   destination:destination.value.trim(),
   mode:mode.value,
   delivery:delivery.value,
   status:"Created",
   createdAt:new Date().toISOString(),
   events:[
    {status:"Shipment Created",location:source.value.trim(),time:new Date().toISOString(),verified:false},
    {status:"Picked Up",location:source.value.trim(),time:null,verified:false},
    {status:"In Transit",location:"",time:null,verified:false},
    {status:"Arrived at Hub",location:"",time:null,verified:false},
    {status:"Out for Delivery",location:destination.value.trim(),time:null,verified:false},
    {status:"Delivered",location:destination.value.trim(),time:null,verified:false}
   ]
  };
  const data=getShipments(); data.unshift(shipment); saveShipments(data);
  success.classList.remove("hidden");
  success.innerHTML=`<b>✅ Shipment created successfully.</b><br>Shipment ID: <strong>${shipment.id}</strong><br><a href="tracking.html?id=${shipment.id}">Open tracking page →</a>`;
  form.reset();
 });
}

const trackingForm=document.getElementById("trackingForm");
if(trackingForm){
 trackingForm.addEventListener("submit",e=>{
  e.preventDefault(); showTracking(document.getElementById("shipmentId").value.trim());
 });
}
function showTracking(id){
 const box=document.getElementById("trackingResult"), s=getShipments().find(x=>x.id.toLowerCase()===id.toLowerCase());
 if(!s){box.innerHTML='<div class="panel shipment-card"><h3>❌ Shipment not found</h3><p>Check the shipment ID and try again.</p></div>';return;}
 box.innerHTML=`<div class="panel shipment-card">
 <div class="table-head"><div><span class="eyebrow">SHIPMENT ${s.id}</span><h2>${escapeHtml(s.product)}</h2></div><span class="badge">${s.status}</span></div>
 <p><b>${escapeHtml(s.source)}</b> → <b>${escapeHtml(s.destination)}</b> · ${escapeHtml(s.mode)}</p>
 <p>Sender: ${escapeHtml(s.sender)} · Receiver: ${escapeHtml(s.receiver)}</p>
 <div class="timeline-list">${s.events.map((e,i)=>`<div class="event ${e.time?'done':''}"><div class="event-dot"></div><div><b>${escapeHtml(e.status)}</b><br><small>${e.time?new Date(e.time).toLocaleString():"Pending"} ${e.location?"· "+escapeHtml(e.location):""} ${e.verified?"· 🔗 Verified":""}</small></div></div>`).join("")}</div>
 <div class="panel" style="box-shadow:none;margin-top:10px;background:#f7f9fc"><b>Blockchain status:</b> Prototype-ready · smart contract integration will be added in the next phase.</div>
 </div>`;
}
function renderDashboard(){
 const data=getShipments();
 document.getElementById("total").textContent=data.length;
 document.getElementById("transit").textContent=data.filter(s=>s.status==="In Transit"||s.status==="Created").length;
 document.getElementById("delivered").textContent=data.filter(s=>s.status==="Delivered").length;
 const el=document.getElementById("shipmentTable");
 if(!data.length){el.innerHTML='<div class="empty">No shipments yet. Create your first shipment.</div>';return;}
 el.innerHTML='<div class="table-scroll"><table><thead><tr><th>ID</th><th>Product</th><th>Route</th><th>Status</th><th>Action</th></tr></thead><tbody>'+data.map(s=>`<tr><td><b>${s.id}</b></td><td>${escapeHtml(s.product)}</td><td>${escapeHtml(s.source)} → ${escapeHtml(s.destination)}</td><td><span class="badge">${s.status}</span></td><td><a href="tracking.html?id=${s.id}">View</a></td></tr>`).join("")+'</tbody></table></div>';
}
function clearShipments(){if(confirm("Delete all prototype shipment data from this browser?")){localStorage.removeItem(KEY);location.reload();}}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}