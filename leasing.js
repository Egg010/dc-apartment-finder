/* Leasing action board - factual leads and manual outreach workflow.
   This file contains NO user identity, credentials, or sent-message claims. */
(function(){
"use strict";
var box=document.getElementById("leasingActionBoard");if(!box)return;
var KEY="dcmap.leasing.v1";
var today="2026-11-01";
var leads=[
{name:"The 202",rank:1,url:"https://www.the202dc.com/contact/",phone:"855-605-2358",source:"https://hotpads.com/the-202-washington-dc-20002-24bkmpg/pad",units:[{id:"0622",type:"1BR",sqft:574,price:2008,basis:"Total monthly listing",available:"2026-12-07"},{id:"0808",type:"1BR",sqft:596,price:2088,basis:"Total monthly listing",available:"2027-01-08"}],detail:"Excellent Red Line and grocery access; ask if the December or January units can start Feb 7."},
{name:"Flats 130",rank:2,url:"https://www.flats130.com/contactus",phone:"833-712-2191",source:"https://www.flats130.com/availableunits",units:[{id:"0553",type:"1BR",sqft:686,price:1970,basis:"Advertised from price, term-dependent",available:"Not established"},{id:"0345",type:"1BR",sqft:719,price:1997,basis:"Advertised from price, term-dependent",available:"Not established"},{id:"0214",type:"1BR",sqft:712,price:2157,basis:"Advertised from price, term-dependent",available:"Not established"}],detail:"Official site offers specific units; quoted price varies materially by lease length. Get a written 12–15-month quote."},
{name:"The Hale",rank:3,url:"https://www.thehaledc.com/contact",phone:"202-883-7987",source:"https://www.thehaledc.com/availability",units:[{id:"A1 floor plan",type:"1BR",sqft:489,price:2098,basis:"Base rent (plan-level, Oct/Nov snapshot)",available:"November 2026 only"}],detail:"Official floor-plan offers are not exact units; garage estimated $300/month. Ask which floor plan has a real Feb 7 opening."},
{name:"Cielo",rank:4,url:"https://www.zillow.com/apartments/washington-dc/cielo/CnNySG/",phone:"202-851-0300",source:"https://www.zillow.com/apartments/washington-dc/cielo/CnNySG/",units:[{id:"0642",type:"Junior 1BR",sqft:511,price:1926,basis:"Base rent, +$70 technology fee",available:"2027-01-21"},{id:"0340",type:"Junior 1BR",sqft:521,price:2139,basis:"Advertised base, fees extra",available:"2027-02-16"}],detail:"Unit 0340 is too late for Feb 7. Unit 0642 is earlier; ask if it can be held for Feb 7. Verify $350 garage quote and mandatory fees."},
{name:"The Belgard",rank:5,url:"https://www.thebelgarddc.com/contact/",phone:"866-702-6871",source:"https://hotpads.com/the-belgard-washington-dc-20002-249hdmj/pad",units:[{id:"0324",type:"1BR",sqft:605,price:2201,basis:"Total listing before parking",available:"2026-11-06"}],detail:"At/above $2,200 before garage. Ask about a qualifying February concession and newer units."},
{name:"The Burton",rank:6,url:"https://www.theburtondc.com/contact/",phone:"833-283-4802",source:"https://hotpads.com/the-burton-washington-dc-20002-249j70w/pad",units:[{id:"1018",type:"1BR",sqft:547,price:2134,basis:"Listed monthly total; confirm fees",available:"2026-11-21"},{id:"0316",type:"1BR",sqft:547,price:2195,basis:"Listed monthly total; confirm fees",available:"2026-11-26"}],detail:"Ask about February inventory in the 547 sqft U16 layout and parking."},
{name:"Slate at NoMa",rank:7,url:"https://www.bozzuto.com/apartments-for-rent/dc/washington/slate-at-noma/contact",phone:"877-848-6291",source:"https://hotpads.com/slate-at-noma-washington-dc-20002-25ecjhu/pad",units:[{id:"0448",type:"1BR",sqft:601,price:2191,basis:"Listed monthly total before parking",available:"Now"}],detail:"Review floor-plan window status and garage availability; published October concession is expired."}
];
var state=load();
function load(){try{var s=JSON.parse(localStorage.getItem(KEY)||"{}");return s&&typeof s==="object"?s:{}}catch(e){return {}}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function el(tag,parent,text,cls){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);if(parent)parent.appendChild(e);return e}
function btn(parent,text,fn){var b=el("button",parent,text,"dc-btn");b.type="button";b.addEventListener("click",fn);return b}
function money(v){return "$"+Number(v).toLocaleString("en-US")}
function contactText(l){
var units=l.units.filter(function(u){return u.available!=="2027-02-16"}).slice(0,3).map(function(u){return "#"+u.id+" ("+u.sqft+" sq ft, advertised "+money(u.price)+" "+u.basis+", listed "+u.available+")"}).join("; ");
return "Hello "+l.name+" leasing team,\n\n"+
"I am looking for a studio or one-bedroom apartment with a lease start on February 7, 2027. My rent target is $2,200/month or less before optional parking and metered utilities. I'm particularly interested in "+units+".\n\n"+
"Could you confirm:\n"+
"1. Which specific units (including unit numbers, sizes, and floor plans) can start a lease on February 7, 2027? If these units cannot, are comparable homes expected?\n"+
"2. The base rent and TOTAL fixed monthly rent for a 12-, 13-, 14-, or 15-month lease starting February 7, including mandatory fees, technology/amenity/trash charges and any current concessions. Please send a written itemized quote.\n"+
"3. Availability and monthly cost for a resident parking space and whether there is a waitlist.\n"+
"4. Whether the quoted unit includes an in-unit washer/dryer and any interior bedrooms without exterior windows.\n"+
"5. The estimate for utilities, internet, deposit, application/admin fees and total move-in charges.\n"+
"6. Whether I could tour the actual unit or a matching floor plan in November/December, and how long the quote can be held.\n\n"+
"I'm targeting February 7 rather than an immediate move-in, so please let me know if you haven't opened February inventory yet and when I should follow up.\n\nThank you!";
}
function download(){
var obj={schema:"dc-leasing-actions-v1",generated:new Date().toISOString(),actions:state,properties:leads};
var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
var url=URL.createObjectURL(blob),a=el("a",document.body);a.href=url;a.download="dc-leasing-outreach-backup.json";a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},900);
}
function render(){
box.textContent="";
var head=el("div",box,undefined,"dc-head");el("h2",head,"Leasing outreach — February 7");el("span",head,"7 priority communities · November 1 research","dc-status");
el("p",box,"These are leads to contact, NOT messages already sent. All February move-in dates, incentives, garage spots, and final rent quotes remain unconfirmed until leasing responds.","dc-note");
var tools=el("div",box,undefined,"dc-actions");btn(tools,"Export outreach backup",download);
var sent=leads.filter(function(l){return ["sent","replied","quote","tour"].includes((state[l.name]||{}).status)}).length;
el("span",tools,sent+" of 7 marked contacted by you","dc-status");
var tablewrap=el("div",box,undefined,"dc-scroll");
var table=el("table",tablewrap,undefined,"dc-data-table");
var tr=el("tr",el("thead",table));["Priority / property","Specific units to ask about","Contact","Your status","Response / next step"].forEach(function(x){el("th",tr,x)});
var tbody=el("tbody",table);
leads.forEach(function(l){
var row=el("tr",tbody),s=state[l.name]||{};
var td=el("td",row);el("strong",td,l.rank+". "+l.name);el("p",td,l.detail,"dc-small");
td=el("td",row);l.units.forEach(function(u){el("p",td,"#"+u.id+" · "+u.sqft+" sq ft · "+money(u.price)+" · "+u.available+" · "+u.basis,"dc-small")});
td=el("td",row);var a=el("a",td,"Contact form ↗","dc-btn");a.href=l.url;a.target="_blank";a.rel="noopener noreferrer";
var p=el("p",td);var phone=el("a",p,l.phone);phone.href="tel:"+l.phone.replace(/[^\d]/g,"");
var src=el("a",td,"View source ↗","dc-btn");src.href=l.source;src.rel="noopener noreferrer";src.target="_blank";
btn(td,"Copy request",function(){var text=contactText(l);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){alert("Request copied. Paste it into the leasing form. This has NOT sent a message.")}).catch(function(){window.prompt("Copy this leasing request:",text)})}else window.prompt("Copy this leasing request:",text)});
td=el("td",row);
var select=el("select",td,undefined,"dc-field");[["not-contacted","Not contacted"],["sent","Message sent"],["replied","Leasing replied"],["quote","Quote obtained"],["tour","Tour arranged"],["no-match","No February match"]].forEach(function(x){var o=el("option",select,x[1]);o.value=x[0]});
select.value=s.status||"not-contacted";select.addEventListener("change",function(){state[l.name]=state[l.name]||{};state[l.name].status=select.value;state[l.name].updated=new Date().toISOString();save();render()});
td=el("td",row);var notes=el("textarea",td,undefined,"dc-field");notes.placeholder="Agent, confirmed unit, parking quote, promotion, tour date, follow-up...";notes.value=s.notes||"";notes.rows=3;notes.style.minWidth="200px";notes.addEventListener("change",function(){state[l.name]=state[l.name]||{};state[l.name].notes=notes.value;state[l.name].updated=new Date().toISOString();save()});
});
el("p",box,"Copy request → open the property's contact form → paste and submit it yourself → mark Message sent. Do not put your personal notes in this public GitHub repository; this board saves them locally in your browser.","dc-small");
}
render();
})();
