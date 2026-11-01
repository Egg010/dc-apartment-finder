/* Simple planning-only average Metro commute from Jamie's Otis Place area.
   No address input, browser storage, external route links or geolocation.
   Estimates combine approximate walk to Georgia Ave-Petworth, train travel,
   typical waiting/transfer allowance and the building's nearby-station walk.
   They are NOT live transit data or measured trip durations. */
(function(){
  "use strict";
  var root=document.getElementById("jamieCommute");
  if(!root||!window.DCApartment)return;
  var data=window.DCApartment.getData();
  if(!data||!Array.isArray(data.listings))return;
  function node(tag,parent,text,cls){
    var e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!=null)e.textContent=String(text);
    if(parent)parent.appendChild(e);
    return e;
  }
  function averageMinutes(l){
    var station=String(l.nearStation||l.redStation||"").toLowerCase();
    var train;
    if(station.includes("u street"))train=5;
    else if(station.includes("shaw-howard"))train=7;
    else if(station.includes("mt vernon"))train=9;
    else if(station.includes("gallery"))train=11;
    else if(station.includes("judiciary"))train=19;
    else if(station.includes("union station"))train=21;
    else if(station.includes("noma"))train=24;
    else if(station.includes("rhode island"))train=28;
    else train=23;
    var finalWalk=Number.isFinite(l.nearWalkMin)?l.nearWalkMin:
      Number.isFinite(l.redWalkMin)?l.redWalkMin:8;
    return Math.round(10+train+5+finalWalk+1);
  }
  root.replaceChildren();
  var header=node("div",root,null,"dc-head");
  node("h2",header,"Jamie's average Metro commute");
  node("p",root,"From the Otis Pl NW area to each apartment, including walking, typical train waiting and transfers. Approximate planning estimates, not live Metro times.","dc-note");
  var wrap=node("div",root,null,"dc-scroll");
  var table=node("table",wrap,null,"dc-data-table");
  var thead=node("thead",table);
  var hr=node("tr",thead);
  ["Apartment","Average Metro commute"].forEach(function(label){node("th",hr,label)});
  var tbody=node("tbody",table);
  var buildings=data.listings.map(function(l){
    return {name:l.name,minutes:averageMinutes(l)};
  }).sort(function(a,b){return a.minutes-b.minutes||a.name.localeCompare(b.name)});
  buildings.forEach(function(b){
    var tr=node("tr",tbody);
    node("td",tr,b.name);
    var td=node("td",tr);
    var strong=node("strong",td,"≈ "+b.minutes+" min");
    strong.style.fontSize="15px";
  });
  node("p",root,"Times may vary with service frequency, route choice and walking pace. Check a transit journey planner before scheduling a visit.","dc-small");
})();
