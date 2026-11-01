import fs from 'node:fs';
import vm from 'node:vm';

const content=JSON.parse(fs.readFileSync('data/content.json','utf8'));
const failures=[];
const assert=(test,msg)=>{if(!test)failures.push(msg)};
assert(Array.isArray(content.issues)&&content.issues.length>0,'No issues found');
assert(Array.isArray(content.guides)&&content.guides.length>0,'No explanations found');
assert(Array.isArray(content.glossary)&&content.glossary.length>0,'No glossary found');
const ids=new Set(content.guides.map(g=>g.id));
const terms=new Set(content.glossary.map(g=>g.term));
const issueIds=new Set();
for(const issue of content.issues){
 assert(!issueIds.has(issue.id),'Duplicate issue '+issue.id);issueIds.add(issue.id);
 assert(typeof issue.title==='string'&&issue.title.length>5,'Missing issue title '+issue.id);
 assert(Array.isArray(issue.guideIds)&&issue.guideIds.length>0,'Empty issue '+issue.id);
 for(const id of issue.guideIds)assert(ids.has(id),'Missing guide '+id+' referenced in issue '+issue.id);
}
for(const g of content.guides){
 assert(g.title&&g.lead&&g.happened&&g.matters&&g.limits&&g.analogy,'Incomplete guide '+g.id);
 for(const t of (g.terms||[]))assert(terms.has(t),'Unknown glossary term '+t+' referenced by '+g.id);
 for(const source of (g.sources||[]))assert(Array.isArray(source)&&/^https:\/\//.test(source[1]),'Invalid research source in '+g.id);
}

// Validate research tracker. A measurement may never be mislabeled as ASI completion.
const tracker=JSON.parse(fs.readFileSync('data/tracker.json','utf8'));
assert(tracker.publishedAt && tracker.lastReviewed,'Tracker must show when the snapshot was reviewed');
assert(tracker.groups?.companies && tracker.groups?.countries,'Both company and country comparisons must exist');
for(const [groupName,group] of Object.entries(tracker.groups||{})){
 assert(group.defaultMetric in group.metrics,'Default metric missing for '+groupName);
 for(const [metricId,metric] of Object.entries(group.metrics||{})){
   assert(metric.label && metric.unit && metric.asOf && metric.explain,'Missing description of '+groupName+'/'+metricId);
   assert(metric.sourceNames.length===metric.sourceUrls.length,'Source mismatch '+groupName+'/'+metricId);
   assert(metric.sourceUrls.length>0 && metric.sourceUrls.every(u=>/^https:\/\//.test(u)),'Invalid tracker source '+metricId);
   assert(Number.isFinite(metric.displayMax)&&metric.displayMax>0,'Invalid chart scale '+metricId);
   assert(Array.isArray(metric.entries)&&metric.entries.length>0,'No data for '+metricId);
   for(const row of metric.entries){
     assert(typeof row.name==='string'&&row.name.length>0,'Missing row label '+metricId);
     assert(Number.isFinite(row.value)&&row.value>=0&&row.value<=metric.displayMax,'Invalid tracker value '+row.name+'/'+metricId);
   }
 }
}
// Build the static site and validate the generated pages.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const pages=walk('dist').filter(f=>f.endsWith('.html'));
const exists=new Set(pages.map(f=>'/'+path.relative('dist',f).replace(/\.html$/,'').replace(/^index$/,'')));
for(const f of walk('dist'))exists.add('/'+path.relative('dist',f));
const required=['/','/archive','/dictionary','/tracker','/editorial-standards','/about','/sources','/404',...content.issues.map(i=>'/issue/'+i.id),...content.guides.map(g=>'/guide/'+g.id)];
for(const r of required)assert(exists.has(r),'Missing generated page '+r);
for(const r of ['/sitemap.xml','/robots.txt','/feed.xml'])assert(exists.has(r),'Missing '+r);
const latestId=content.issues.slice().sort((a,b)=>b.number-a.number)[0].id;
const home=fs.readFileSync('dist/index.html','utf8');
assert(home.includes('href="/issue/'+latestId+'"'),'Homepage must feature the newest issue '+latestId);
for(const file of pages){
 const name=path.relative('dist',file),text=fs.readFileSync(file,'utf8');
 if(name==='issue/latest.html')continue;
 assert(text.startsWith('<!doctype html>'),name+': missing document declaration');
 assert(text.includes('</html>')&&text.includes('</body>'),name+': truncated HTML');
 assert(/<html lang="en">/.test(text),name+': missing lang');
 assert(/<title>[^<]{5,}<\/title>/.test(text),name+': missing title');
 assert(/<meta name="description" content="[^"]{20,}">/.test(text),name+': missing description');
 assert(text.includes('<link rel="canonical"'),name+': missing canonical');
 assert(text.includes('property="og:image"'),name+': missing og:image');
 assert((text.match(/<h1[\s>]/g)||[]).length===1,name+': must have exactly one h1');
 assert(text.includes('id="main"'),name+': missing main landmark');
 for(const m of text.matchAll(/<img\b[^>]*>/g))assert(/\balt="/.test(m[0]),name+': image without alt');
 for(const m of text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
   if(m[0].includes('application/ld+json')){try{JSON.parse(m[1])}catch(e){failures.push(name+': invalid JSON-LD')}continue}
   if(m[1].trim()){try{new vm.Script(m[1],{filename:name})}catch(e){failures.push(name+': JavaScript syntax: '+e.message)}}
 }
 for(const m of text.matchAll(/href="(\/[^"#?]*)(?:#([^"]*))?"/g)){
   const target=m[1].replace(/\/$/,'')||'/';
   if(target.startsWith('/_vercel')||target.startsWith('/api/'))continue;
   assert(exists.has(target),name+': broken internal link '+m[1]);
   if(m[2]&&target==='/dictionary')assert(fs.readFileSync('dist/dictionary.html','utf8').includes('id="'+m[2]+'"'),name+': broken dictionary anchor #'+m[2]);
 }
}
const trackerPage=fs.readFileSync('dist/tracker.html','utf8');
assert(trackerPage.includes('no credible')||trackerPage.includes('No credible'),'Tracker must explain why ASI completion cannot be quantified');
assert(trackerPage.includes('/data/tracker.json'),'Tracker must link the documented dataset');
const about=fs.readFileSync('dist/about.html','utf8');
assert(about.includes('facebook.com/profile.php?id=61594314568046'),'About page must link the Facebook page');
assert(fs.readFileSync('dist/sources.html','utf8').includes('Artificial Analysis'),'Sources page must list Artificial Analysis');

if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log('Passed: '+pages.length+' generated pages (HTML structure, SEO meta, one h1, internal links, JavaScript syntax), data: issue references, glossary terms, tracker metrics, source URLs, and Vercel routing. ('+content.issues.length+' issues, '+content.guides.length+' explainers, '+content.glossary.length+' terms)');
