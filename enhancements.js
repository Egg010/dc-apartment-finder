/* DC Apartment Finder: research dashboard. No external JS dependencies. */
(function(){
"use strict";
var api=window.DCApartment;
var root=document.getElementById("dashboardEnhancements");
if(!api||!root)return;
var KEY="dcmap.v2";
var tabs=["Overview","Units & dates","Budget","Tours","Price history","Data quality"];
var current=0, search="", selected="", unitFilter="oneBr", dateFilter="all";
var store=read(), history=null, feed=null, alerts=null, feedError=null;
function read(){try{var a=JSON.parse(localStorage.getItem(KEY)||"{}");return a&&typeof a==="object"?a:{}}catch(_){return {}}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){console.warn("Could not save dashboard data",e)}}
function clone(o){return JSON.parse(JSON.stringify(o))}
function el(tag,parent,text,cls){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);if(parent)parent.appendChild(e);return e}
function clear(e){while(e.firstChild)e.removeChild(e.firstChild)}
function button(parent,text,callback,cls){var b=el("button",parent,text,"dc-btn "+(cls||""));b.type="button";b.addEventListener("click",callback);return b}
function note(parent,text){return el("p",parent,text,"dc-muted")}
function field(parent,label,value,change,type){var wrap=el("label",parent,undefined,"dc-field");el("span",wrap,label);var inp=el(type==="textarea"?"textarea":"input",wrap);if(type!=="textarea")inp.type=type||"text";inp.value=value==null?"":String(value);inp.addEventListener("change",function(){change(inp.value)});return inp}
function selectField(parent,label,options,value,change){var wrap=el("label",parent,undefined,"dc-field");el("span",wrap,label);var s=el("select",wrap);options.forEach(function(o){var op=el("option",s,o[1]);op.value=o[0]});s.value=value;s.addEventListener("change",function(){change(s.value)});return s}
function money(n){return n==null||!Number.isFinite(+n)?"Unknown":"$"+Math.round(+n).toLocaleString("en-US")}
function num(s,d){var v=Number(s);return Number.isFinite(v)&&v>=0?v:d}
function displayDate(s){if(!s)return "Unconfirmed";var d=new Date(s+"T12:00:00");return isNaN(d)?"Unconfirmed":d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
function dateStr(){var t=new Date();return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0")}
function listings(){return api.getData().listings}
function favorites(){try{var a=JSON.parse(localStorage.getItem("dcmap.saved")||"[]");return Array.isArray(a)?a:[]}catch(_){return []}}
function selectedProperty(){return listings().find(function(x){return x.name===selected})||listings()[0]}
function costConfig(l){var d=(store.costs||{})[l.name]||{};var p=l.pricing&&l.pricing[unitFilter]||{};var total=p.total!=null?p.total:l[unitFilter];var base=p.base!=null?p.base:null;return {rent:total,base:base,priceVerified:!!l.checked,feesIncluded:p.total!=null,parking:num(d.parking,extractParking(l)),utilities:num(d.utilities,125),extraFees:num(d.extraFees,0),deposit:num(d.deposit,500),application:num(d.application,50),concession:num(d.concession,0),leaseMonths:num(d.leaseMonths,12)}}
function extractParking(l){var m=(l.parkingNote||"").match(/\$(\d+)/);return m?Number(m[1]):250}
function calc(l){var c=costConfig(l),p=c.rent;var recurring=p==null?null:p+c.parking+c.utilities+c.extraFees;return {c:c,recurring:recurring,effective:recurring==null?null:recurring-c.concession/Math.max(1,c.leaseMonths),moveCost:recurring==null?null:recurring+c.deposit+c.application,estimated:!c.feesIncluded||!/\$\d+/.test(l.parkingNote||"")}}
function confirmation(l){return (store.confirmations||{})[l.name]||{}}
function status(l){var c=confirmation(l);if(c.status==="verified"&&c.moveIn==="2027-02-07"&&c.unit&&c.checked)return "Confirmed by leasing";if(c.status==="rejected")return "Not available";if(c.status==="asked")return "Leasing contacted";return "Not verified"}
function score(l){var c=calc(l),n=0;var rent=c.recurring;if(rent!=null){n+=Math.max(0,Math.min(35,35-(rent-1950)/27))}else n+=0;
n+=Math.max(0,25-Math.max(0,l.redWalkMin-2)*2.6);
n+=Math.max(0,Math.min(18,(l.rating-3.0)*9));
n+=(l.wd==="yes"?8:0)+(l.parking==="yes"?7:0);
n+=l.status==="top"?7:l.status==="skip"?-20:0;
if(status(l)==="Confirmed by leasing")n+=12;
return Math.round(n)}
function quality(l){var n=(dateStr().slice(0,10));if(!l.checked)return "No date";var days=(new Date(n+"T00:00:00")-new Date(l.checked+"T00:00:00"))/86400000;return days>7?"Stale "+Math.floor(days)+"d":Math.floor(days)+"d ago"}
function link(parent,url,label){var a=el("a",parent,label,"dc-btn");a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function table(parent,headers,rows){var wrap=el("div",parent,undefined,"dc-scroll");var t=el("table",wrap,undefined,"dc-data-table"),h=el("thead",t),tr=el("tr",h);headers.forEach(function(x){el("th",tr,x)});var b=el("tbody",t);rows.forEach(function(r){var row=el("tr",b);r.forEach(function(v){var td=el("td",row);if(typeof v==="function")v(td);else td.textContent=v==null?"—":String(v)})});return t}
function heading(parent,title,subtitle){var h=el("div",parent,undefined,"dc-head");el("h2",h,title);if(subtitle)note(parent,subtitle);return h}
function tab(i){current=i;render()}
function propertyChoices(parent,label,cb){selectField(parent,label,listings().filter(function(l){return l.status!=="skip"}).map(function(l){return [l.name,l.name]}),selected, function(v){selected=v;cb()})}
function overview(parent){
heading(parent,"Shortlist & decision view","Rankings are explainable research scores, not recommendations from real-time lease inventory.");
var ranked=listings().filter(function(l){return l.status!=="skip"}).sort(function(a,b){return score(b)-score(a)});
var fav=favorites();
var stats=el("div",parent,undefined,"dc-layout");
[[listings().length,"Complexes mapped"],[fav.length,"Favorites saved"],[feed&&feed.units?feed.units.length:0,"Parsed unit offers"],[ranked.filter(function(l){return status(l)==="Confirmed by leasing"}).length,"Feb 7 leasing-confirmed"]].forEach(function(z){var c=el("div",stats,undefined,"dc-kpi");el("strong",c,z[0]);note(c,z[1])});
el("p",parent,"Priority ranking considers approximate all-in cost, Red Line walk, public ratings, washer/dryer, parking and your existing shortlist. Unverified pricing and ratings are not guarantees.","dc-note");
table(parent,["Rank","Building","Score / 100*","Monthly estimate","Move-in","Metro","Source age","Actions"],ranked.slice(0,12).map(function(l,i){var c=calc(l);return [i+1,l.name,score(l),c.recurring==null?"Unknown":money(c.recurring)+(c.estimated?" est.":""),status(l),l.redWalkMin+" min",quality(l),function(td){button(td,"Compare costs",function(){selected=l.name;tab(2)});button(td,"Tour",function(){selected=l.name;tab(3)})}]}));
note(parent,"*Scores are directional and can exceed 100 when a Feb 7 confirmation exists; they aren't a statistical prediction. Cost estimates include an editable $125 utility allowance and estimated parking where not published.");
}
function unitStatus(u){if(u.feb7Confirmed&&u.availableDate==="2027-02-07"&&u.confirmationSource)return "Verified Feb 7";if(u.availableDate==="2027-02-07")return "Listed Feb 7 — verify";if(u.availableDate&&u.availableDate>"2027-02-07")return "Advertised too late";if(u.availableDate)return "Earlier date — ask leasing";return "Exact date unknown"}
function unitView(parent){
heading(parent,"Unit inventory & target move-in","Automated findings are separated from manually verified lease-start confirmations. An earlier availability date does not mean the building will hold a unit.");
var units=feed&&Array.isArray(feed.units)?feed.units:[];
var tools=el("div",parent,undefined,"dc-actions");
selectField(tools,"Unit type",[["oneBr","1 bedroom"],["studio","Studio"],["all","Both"]],unitFilter,function(v){unitFilter=v;render()});
selectField(tools,"Availability",[["all","Show all"],["possible","Not later than Feb 7"],["exact","Listed for Feb 7"]],dateFilter,function(v){dateFilter=v;render()});
var visible=units.filter(function(u){
 var typeOK=unitFilter==="all"||u.bedrooms===(unitFilter==="studio"?0:1);
 var dateOK=dateFilter==="all"||(dateFilter==="exact"?u.availableDate==="2027-02-07":!u.availableDate||u.availableDate<="2027-02-07");
 return typeOK&&dateOK;
}).sort(function(a,b){
 var pa=a.totalRent!=null?a.totalRent:a.baseRent,pb=b.totalRent!=null?b.totalRent:b.baseRent;
 return (pa||999999)-(pb||999999);
});
if(!visible.length)el("p",parent,"No machine-readable unit offers yet. Source checks do not equal inventory. Use the leasing confirmation form below.","dc-empty");
else table(parent,["Building","Unit / plan","Rent","Size","Available date","February eligibility","Source"],visible.slice(0,100).map(function(u){return [u.building||"The Hale",(u.unit||"Unspecified")+" / "+(u.plan||"Unknown"),money(u.totalRent!=null?u.totalRent:u.baseRent)+(u.totalRent!=null?" total":" base"),u.sqft?u.sqft+" sq ft":"—",u.availableDate?displayDate(u.availableDate):(u.availability||"Unknown"),unitStatus(u),function(td){if(u.sourceUrl)link(td,u.sourceUrl,"View")}]}));
var buildingPrices=(feed&&feed.checks||[]).filter(function(c){return c.summary&&c.summary.oneBrStartingTotal!=null});
if(buildingPrices.length){
 el("div",parent,undefined,"dc-subtle");
 el("h3",parent,"Additional building-wide 1BR starting rents");
 note(parent,"These figures were parsed from building-level listing FAQs. They are NOT specific units, February availability, or all-in quotes.");
 table(parent,["Building","From","1BRs reported","Source"],buildingPrices.sort(function(a,b){return a.summary.oneBrStartingTotal-b.summary.oneBrStartingTotal}).map(function(c){return [c.name,money(c.summary.oneBrStartingTotal)+" (listing total)",c.summary.oneBrCount,function(td){link(td,c.sourceUrl,"Open")}]}));
}
el("div",parent,undefined,"dc-subtle");
var h=heading(parent,"Confirm February 7 with leasing","Manual status is saved in this browser. Mark confirmed only when the leasing office verified an exact Feb 7 lease start for a named unit.");
var inputs=el("div",parent,undefined,"dc-form");propertyChoices(inputs,"Building",function(){render()});
var l=selectedProperty(),c=confirmation(l);var v=Object.assign({status:"unverified",unit:"",moveIn:"2027-02-07",checked:"",source:"",notes:""},c);
selectField(inputs,"Status",[["unverified","Not verified"],["asked","Asked leasing"],["verified","Leasing confirmed"],["rejected","Not available"]],v.status,function(x){v.status=x});
field(inputs,"Unit number / floor plan",v.unit,function(x){v.unit=x});
field(inputs,"Exact move-in date",v.moveIn,function(x){v.moveIn=x},"date");
field(inputs,"Confirmation date",v.checked,function(x){v.checked=x},"date");
field(inputs,"Who confirmed / source",v.source,function(x){v.source=x});
field(inputs,"Notes",v.notes,function(x){v.notes=x},"textarea");
button(parent,"Save leasing confirmation",function(){if(v.status==="verified"&&(!v.unit||!v.checked||!v.source||v.moveIn!=="2027-02-07")){alert("For a February confirmation enter a named unit, exact 2027-02-07 date, confirmation date and source.");return;}store.confirmations=store.confirmations||{};store.confirmations[l.name]=v;persist();render()},"primary");
el("p",parent,"Leasing confirmation status: "+status(l),"dc-note");
}
function budget(parent){
heading(parent,"True monthly cost model","Budget is compared with the recurring monthly total including parking and an adjustable utility allowance. One-time expenses and concessions are separate.");
var row=el("div",parent,undefined,"dc-form");
propertyChoices(row,"Building",function(){render()});
selectField(row,"Type",[["oneBr","1 bedroom"],["studio","Studio"]],unitFilter==="studio"?"studio":"oneBr",function(v){unitFilter=v;render()});
var l=selectedProperty(),c=costConfig(l);
var vals={parking:c.parking,utilities:c.utilities,extraFees:c.extraFees,deposit:c.deposit,application:c.application,concession:c.concession,leaseMonths:c.leaseMonths};
var f=el("div",parent,undefined,"dc-form");
[["parking","Garage / month"],["utilities","Estimated utilities / month"],["extraFees","Additional required fees / month"],["deposit","Deposit"],["application","Application fees"],["concession","Total advertised discount ($)"],["leaseMonths","Lease term (months)"]].forEach(function(k){field(f,k[1],vals[k[0]],function(v){vals[k[0]]=num(v,0)},"number")});
var ccalc=calc(l),kpis=el("div",parent,undefined,"dc-layout");
[[money(ccalc.c.rent),"Observed rent / total before parking"],[money(ccalc.recurring),"Recurring monthly estimate"],[money(ccalc.effective),"Net effective monthly (concession spread)"],[money(ccalc.moveCost),"Approx. first month + deposit + application"]].forEach(function(z){var b=el("div",kpis,undefined,"dc-kpi");el("strong",b,z[0]);note(b,z[1])});
var p=el("p",parent,undefined,"dc-note");p.textContent=ccalc.estimated?"Some costs or monthly fees have not been verified. The all-in result is an estimate, not a leasing quote.":"Known fixed monthly fees are reflected where reported; utilities and concessions remain estimates.";
var ac=el("div",parent,undefined,"dc-actions");
button(ac,"Save custom quote",function(){store.costs=store.costs||{};store.costs[l.name]=vals;persist();render()},"primary");
button(ac,"Clear custom quote",function(){if(store.costs)delete store.costs[l.name];persist();render()});
var budget=2200;var all=calc(l);var raw=all.c.rent;
el("p",parent,raw==null?"Published unit pricing missing":((raw>budget?money(raw-budget)+" above":money(budget-raw)+" below")+" the $2,200 rent-only reference (parking and utilities excluded)."),"dc-note");
el("p",parent,"Estimated recurring monthly outlay with parking, utilities and extra fees: "+money(all.recurring)+". This is not a second hard budget unless you choose to set one.","dc-small");
el("div",parent,undefined,"dc-subtle");
el("h3",parent,"All-in price comparison");
table(parent,["Building","Type","Recurring monthly","Net effective","Confidence"],listings().filter(function(x){return x.status!=="skip"}).map(function(x){var a=calc(x);return [x.name,unitFilter==="studio"?"Studio":"1BR",money(a.recurring),money(a.effective),a.estimated?"Partly estimated":"Published total + estimates"]}).sort(function(a,b){var x=Number(a[2].replace(/[^0-9]/g,""))||999999,y=Number(b[2].replace(/[^0-9]/g,""))||999999;return x-y}).slice(0,18));
}
function tours(parent){
heading(parent,"Tours & leasing conversations","Store tour notes and leasing answers locally. Export a backup to move this information between devices.");
var f=el("div",parent,undefined,"dc-form");propertyChoices(f,"Property",function(){render()});var l=selectedProperty();
var record=(store.tours||{})[l.name]||{};
var v=Object.assign({status:"not-contacted",date:"",time:"",unit:"",contact:"",garage:"",promo:"",notes:"",followUp:""},record);
selectField(f,"Stage",[["not-contacted","Not contacted"],["contacted","Contacted"],["scheduled","Tour scheduled"],["toured","Toured"],["applied","Applied"],["declined","Declined"]],v.status,function(x){v.status=x});
field(f,"Tour date",v.date,function(x){v.date=x},"date");
field(f,"Tour time",v.time,function(x){v.time=x},"time");
field(f,"Unit / floorplan",v.unit,function(x){v.unit=x});
field(f,"Leasing contact",v.contact,function(x){v.contact=x});
field(f,"Parking quote",v.garage,function(x){v.garage=x});
field(f,"Special / lease terms",v.promo,function(x){v.promo=x});
field(f,"Follow up by",v.followUp,function(x){v.followUp=x},"date");
field(f,"Pros / cons / questions",v.notes,function(x){v.notes=x},"textarea");
button(parent,"Save tour details",function(){store.tours=store.tours||{};store.tours[l.name]=v;persist();render()},"primary");
el("div",parent,undefined,"dc-subtle");el("h3",parent,"Tour pipeline");
var items=Object.keys(store.tours||{}).map(function(k){return [k,store.tours[k]]});
if(!items.length)el("p",parent,"No tours saved yet.","dc-empty");
else{
 var due=items.filter(function(k){return k[1].followUp&&k[1].followUp<=dateStr()&&k[1].status!=="declined"&&k[1].status!=="applied"});
 if(due.length)el("p",parent,due.length+" follow-up(s) due today or earlier. Review their leasing responses.","dc-note");
 table(parent,["Building","Stage","Tour date","Unit","Follow-up","Open"],items.map(function(k){return [k[0],k[1].status,displayDate(k[1].date),k[1].unit||"—",displayDate(k[1].followUp),function(td){button(td,"Edit",function(){selected=k[0];render()})}]}));
}
}
function historyView(parent){
heading(parent,"Price trends & potential alerts","Only successfully extracted, comparable, source-dated prices count. A change in available unit mix is not necessarily a price change for the same unit.");
if(alerts&&Array.isArray(alerts.events)&&alerts.events.length){
  el("h3",parent,"New pricing watch alerts");
  table(parent,["Property","Unit","Signal","Advertised rent","Source"],alerts.events.map(function(a){return [a.building,a.unit,a.kind==="unit-price-drop"?"Unit price decrease "+money(a.change):"Newly observed listing",money(a.price)+" "+(a.priceBasis||""),function(td){if(a.sourceUrl)link(td,a.sourceUrl,"Review")}]}));
  note(parent,"These alerts are preliminary leasing leads, not guaranteed all-in budget matches or February lease starts.");
}
if(!history||!Array.isArray(history.observations)||!history.observations.length){el("p",parent,"No historical price records have been published yet. Daily refreshes will append observations after successful extraction. Alerts will appear here when comparable listings change.","dc-empty");return;}
var records=history.observations;
var key=function(o){return [o.building,o.unit||o.plan||"",o.bedrooms,o.priceBasis||""].join("|")};
var groups={};records.forEach(function(o){if(!Number.isFinite(o.price))return;var id=key(o);(groups[id]=groups[id]||[]).push(o)});
var changes=[];
Object.keys(groups).forEach(function(k){var rows=groups[k].sort(function(a,b){return a.observedAt.localeCompare(b.observedAt)});if(rows.length<2)return;var recent=rows[rows.length-1],older=rows[rows.length-2];if(recent.observedAt.slice(0,10)===older.observedAt.slice(0,10))return;changes.push({name:recent.building,unit:recent.unit||recent.plan||"Unspecified",before:older.price,after:recent.price,diff:recent.price-older.price,when:recent.observedAt,source:recent.sourceUrl||""})});
var drops=changes.filter(function(c){return c.diff<0});var first=el("div",parent,undefined,"dc-layout");[[records.length,"Dated observations"],[changes.length,"Observed changes"],[drops.length,"Price decreases"]].forEach(function(z){var d=el("div",first,undefined,"dc-kpi");el("strong",d,z[0]);note(d,z[1])});
if(!changes.length)el("p",parent,"Not enough comparable days yet to calculate price changes.","dc-note");
else table(parent,["Building","Unit / plan","Previous","New","Change","Observed"],changes.sort(function(a,b){return a.diff-b.diff}).slice(0,30).map(function(c){return [c.name,c.unit,money(c.before),money(c.after),(c.diff>0?"+":"")+money(c.diff),c.when.slice(0,10)]}));
note(parent,"The daily workflow can also create GitHub Issues for new exact-unit price leads. GitHub only sends email/mobile notifications if your account is watching the repository with appropriate notification settings.");
var act=el("div",parent,undefined,"dc-actions");link(act,"https://github.com/Egg010/dc-apartment-finder/issues","GitHub price-watch Issues");
}
function backup(parent){
var acts=el("div",parent,undefined,"dc-actions");
button(acts,"Export favorites, notes & tour data",function(){
var bundle={schema:"dc-apartments-backup-v1",savedAt:new Date().toISOString(),favorites:favorites(),mapNotes:(function(){try{return JSON.parse(localStorage.getItem("dcmap.notes")||"{}")}catch(_){return {}}})(),dashboard:store};
var data=JSON.stringify(bundle,null,2),blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob);
var a=el("a",document.body);a.href=url;a.download="dc-apartment-backup-"+dateStr()+".json";a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);
});
var label=el("label",acts,"Import backup JSON","dc-btn dc-file");var file=el("input",label);file.type="file";file.accept=".json,application/json";file.addEventListener("change",function(){var f=file.files&&file.files[0];if(!f)return;if(f.size>1000000){alert("Backup too large");return}f.text().then(function(txt){var a=JSON.parse(txt);if(a.schema!=="dc-apartments-backup-v1"||!Array.isArray(a.favorites)||typeof a.dashboard!=="object"||!a.dashboard)throw Error("Invalid apartment backup");if(!confirm("Replace favorites, notes and dashboard data on this device?"))return;localStorage.setItem("dcmap.saved",JSON.stringify(a.favorites.filter(function(x){return typeof x==="string"}).slice(0,100)));localStorage.setItem("dcmap.notes",JSON.stringify(a.mapNotes||{}));store=a.dashboard;persist();api.render();render();}).catch(function(e){alert("Unable to import: "+e.message)})});
note(parent,"Favorites, tour notes and cost overrides are stored only on this device, not in public GitHub. Export JSON if you switch phones or browsers. Do not commit backup files containing private notes to this public repository.");
}
function qualityView(parent){
heading(parent,"Source audit & portability","This is a factual report of what the daily checker could and couldn't read—not a claim that all 25 listings were refreshed.");
var cs=feed&&feed.checks||[], types={};cs.forEach(function(c){types[c.result]=(types[c.result]||0)+1});
var k=el("div",parent,undefined,"dc-layout");
Object.keys(types).forEach(function(x){var card=el("div",k,undefined,"dc-kpi");el("strong",card,types[x]);note(card,x)});
if(feed){note(parent,"Last automated check: "+new Date(feed.generated).toLocaleString("en-US")+". Confirmed Feb 7 units: "+(feed.feb7ConfirmedCount||0)+".");}
else el("p",parent,"No daily JSON feed loaded. Check GitHub Pages deployment and the Actions logs. "+(feedError||""),"dc-empty");
table(parent,["Property","Page check","Price last verified","Source"],listings().map(function(l){var c=cs.find(function(x){return x.name===l.name})||{};return [l.name,c.result||"Not run",l.checked||"Unknown",function(td){var url=c.sourceUrl||(l.links&&l.links[0]&&l.links[0].url);if(url)link(td,url,"Open");else td.textContent="Not configured"}]}));
el("div",parent,undefined,"dc-subtle");
el("h3",parent,"Sync your data between devices");backup(parent);
var actions=el("div",parent,undefined,"dc-actions");
link(actions,"https://github.com/Egg010/dc-apartment-finder/actions/workflows/refresh-and-deploy.yml","View refresh workflow");
link(actions,"https://github.com/Egg010/dc-apartment-finder/settings/pages","Pages settings");
}
function render(){
if(!api||!root)return;clear(root);
var title=el("div",root,undefined,"dc-head");
el("h2",title,"Apartment Decision Center");
el("span",title,"February 7, 2027 target move-in","dc-status");
var nav=el("div",root,undefined,"dc-tabs");nav.setAttribute("role","tablist");
tabs.forEach(function(label,i){var b=el("button",nav,label);b.type="button";b.setAttribute("role","tab");b.setAttribute("aria-selected",i===current?"true":"false");b.addEventListener("click",function(){tab(i)})});
var body=el("section",root,undefined,"dc-panel");
[overview,unitView,budget,tours,historyView,qualityView][current](body);
}
window.DCApartmentEnhancements={render:render};
window.addEventListener("dc-feed-loaded",function(ev){feed=ev.detail;render()});
fetch("data/alerts.json",{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("No alerts feed yet");return r.json()}).then(function(a){alerts=a;render()}).catch(function(){alerts=null;render()});
fetch("data/history.json",{cache:"no-store"}).then(function(r){if(!r.ok)throw Error("No history yet");return r.json()}).then(function(h){history=h;render()}).catch(function(){history=null;render()});
render();
})();
