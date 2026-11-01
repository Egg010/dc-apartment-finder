/* Jamie commute comparison — address stored only on the visitor's device.
   Routes open Google Maps for actual travel modes and current travel times.
   No private starting address is included in this public source code. */
(function(){
"use strict";
var root=document.getElementById("jamieCommute");if(!root)return;
var app=window.DCApartment;
if(!app||!app.getData)return;
var SOURCE_KEY="dcmap.jamie.origin.v1";
var MODE_KEY="dcmap.jamie.mode.v1";
var COLLAPSE_KEY="dcmap.jamie.showAll.v1";
var FALLBACK_AREA="Otis Pl NW, Washington, DC 20010";
var defaultMode="transit";
function localGet(k){try{return localStorage.getItem(k)||""}catch(_){return ""}}
function localSet(k,v){try{localStorage.setItem(k,v)}catch(_){}}
function element(tag,parent,text,cls){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);if(parent)parent.appendChild(e);return e}
function clear(node){node.replaceChildren()}
function fmtDest(l){return l.address+", Washington, DC"}
function googleRoute(origin,l,mode){
 var q=new URLSearchParams({api:"1",origin:origin,destination:fmtDest(l),travelmode:mode});
 return "https://www.google.com/maps/dir/?"+q.toString();
}
function link(parent,origin,l,mode,label){
 var a=element("a",parent,label,"dc-btn");
 a.href=googleRoute(origin,l,mode);a.target="_blank";a.rel="noopener noreferrer";
 a.setAttribute("aria-label",label+" route from Jamie to "+l.name+" in Google Maps");return a;
}
function render(){
 clear(root);
 var origin=localGet(SOURCE_KEY);
 var mode=localGet(MODE_KEY)||defaultMode;
 var expanded=localGet(COLLAPSE_KEY)==="yes";
 var bar=element("div",root,null,"dc-head");
 element("h2",bar,"Jamie's commute to your apartment");
 element("span",bar,"Jamie → apartment","dc-status");
 element("p",root,"Compare Jamie's trip to every apartment. Directions open Google Maps for actual drive, transit, or walking routes; this page does not make up traffic-dependent travel times.","dc-note");
 var fields=element("div",root,null,"dc-form");
 var label=element("label",fields,null,"dc-field");
 element("span",label,"Jamie's starting address (saved only in this browser)");
 var input=element("input",label);
 input.type="text";input.placeholder="Enter full address on Otis Pl NW";input.autocomplete="street-address";
 input.value=origin;input.style.minWidth="270px";input.setAttribute("aria-label","Jamie's origin address");
 var modes=element("label",fields,null,"dc-field");
 element("span",modes,"Travel mode");
 var select=element("select",modes);
 [["transit","Metro / bus"],["driving","Driving"],["walking","Walking"],["bicycling","Biking"]].forEach(function(pair){var opt=element("option",select,pair[1]);opt.value=pair[0]});
 select.value=mode;
 var apply=element("button",fields,"Save starting address","dc-btn primary");
 apply.type="button";
 var state=element("p",root,"","dc-small");
 var isExact=Boolean(origin.trim());
 if(!isExact){
  state.textContent="Full address not saved yet. Routes currently use the Otis Pl NW neighborhood as an approximate starting point. Enter the exact starting address once for door-to-door directions.";
 }else{
  state.textContent="Exact starting address saved in this browser only. It is passed to Google Maps when you open a route; it is not stored in GitHub.";
 }
 function commit(){localSet(SOURCE_KEY,input.value.trim());render()}
 apply.addEventListener("click",commit);
 input.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();commit()}});
 select.addEventListener("change",function(){localSet(MODE_KEY,select.value);render()});
 var tripOrigin=isExact?origin.trim():FALLBACK_AREA;
 var all=app.getData().listings.slice();
 all.sort(function(a,b){var aRank=a.status==="top"?0:a.status==="consider"?1:2,bRank=b.status==="top"?0:b.status==="consider"?1:2;return aRank-bRank||a.name.localeCompare(b.name)});
 var visible=expanded?all:all.slice(0,8);
 var wrap=element("div",root,null,"dc-scroll");
 var table=element("table",wrap,null,"dc-data-table");
 var head=element("tr",element("thead",table));
 ["Apartment","Area","Metro walk¹","Jamie → apartment"].forEach(function(n){element("th",head,n)});
 var tbody=element("tbody",table);
 visible.forEach(function(l){
  var tr=element("tr",tbody);
  var td=element("td",tr);
  element("strong",td,l.name);
  element("div",td,fmtDest(l),"dc-small");
  element("td",tr,l.hood||l.area||"Washington DC");
  element("td",tr,l.redWalkMin!=null?l.redWalkMin+" min to Red Line":"Not verified");
  td=element("td",tr);
  link(td,tripOrigin,l,mode,mode==="transit"?"Check transit":"View route");
  if(mode!=="transit")link(td,tripOrigin,l,"transit","Transit");
  if(mode!=="driving")link(td,tripOrigin,l,"driving","Drive");
 });
 var foot=element("div",root,null,"dc-actions");
 var toggle=element("button",foot,expanded?"Show top apartments":"Show all "+all.length+" apartments","dc-btn");
 toggle.type="button";toggle.addEventListener("click",function(){localSet(COLLAPSE_KEY,expanded?"no":"yes");render()});
 var date=element("p",root,"¹ Red Line walk times are existing map estimates; they're not Jamie-to-apartment trip times. Google Maps calculates route time and service for the chosen mode. If you choose transit, the trip may use the Green/Yellow and Red Lines or a bus connection.","dc-small");
}
render();
})();
