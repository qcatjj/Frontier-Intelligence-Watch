import fs from 'node:fs';
import vm from 'node:vm';

const content=JSON.parse(fs.readFileSync('data/content.json','utf8'));
const failures=[];
const assert=(test,msg)=>{if(!test)failures.push(msg)};
for(const name of ['index.html','learn.html']){
 const text=fs.readFileSync(name,'utf8');
 assert(text.startsWith('<!doctype html>'),name+': missing document declaration');
 assert(text.includes('</html>'),name+': missing closing HTML');
 assert(text.includes('</body>'),name+': missing closing body');
 assert(text.length>5000,name+': unexpectedly short document');
 const re=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
 for(const match of text.matchAll(re)){
   if(match[1].trim()){try{new vm.Script(match[1],{filename:name})}catch(e){failures.push(name+': JavaScript syntax: '+e.message)}}
 }
}
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
const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert(vercel.rewrites?.some(r=>r.source==='/dictionary'),'Missing dictionary route');
assert(vercel.rewrites?.some(r=>r.source==='/archive'),'Missing archive route');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log('Passed: HTML structure, JavaScript syntax, issue references, glossary terms, source URLs, and Vercel routing. ('+content.issues.length+' issues, '+content.guides.length+' explainers, '+content.glossary.length+' terms)');
