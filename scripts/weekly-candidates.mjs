// Creates an editorial research candidate pack. It never publishes unreviewed papers to the public archive.
const token=process.env.GITHUB_TOKEN;
const repo=process.env.GITHUB_REPOSITORY;
if(!token||!repo)throw new Error('GitHub Actions context required');
const now=new Date(), date=(d)=>d.toISOString().slice(0,10);
const finish=date(now),begin=date(new Date(now.getTime()-7*86400000));
const title='Weekly research candidate pack: '+begin+' to '+finish;
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
const prior=await fetch('https://api.github.com/repos/'+repo+'/issues?state=all&per_page=100',{headers});
if(!prior.ok)throw new Error('Cannot list editorial issues: '+prior.status);
if((await prior.json()).some(x=>x.title===title)){console.log('Candidate pack already exists');process.exit(0)}
const qs=new URLSearchParams({'search.title':'AI safety autonomous agent','filter':'from_publication_date:'+begin+',to_publication_date:'+finish,'sort':'publication_date:desc','per-page':'25','select':'title,publication_date,primary_location,doi,id'});
const out=await fetch('https://api.openalex.org/works?'+qs.toString(),{headers:{'User-Agent':'FrontierIntelligenceWatch/1.0 (editorial candidates)'}});
if(!out.ok)throw new Error('OpenAlex temporarily unavailable: '+out.status);
const data=await out.json();
const results=(data.results||[]).filter(x=>x.title&&x.publication_date).filter(x=>/(AI|artificial intelligence|agent|language model|machine learning)/i.test(x.title)).slice(0,12);
if(!results.length){console.log('No candidate results');process.exit(0)}
const body=[
 '## Research candidates for review',
 '',
 '**STATUS: UNREVIEWED DISCOVERY — NOT A PUBLISHED WEEKLY ISSUE.**',
 '',
 'These are newly indexed papers, not independently verified findings. Read each source, check its methods, publication date and limitations, and prepare reader-friendly summaries before publishing.',
 '',
 ...results.map((p,i)=>{
 const url=p.primary_location?.landing_page_url||p.doi||p.id;
 return (i+1)+'. **'+p.title.replace(/[\r\n]+/g,' ').slice(0,250)+'** ('+p.publication_date+') — '+url;
 }),
 '',
 '## Editorial checklist',
 '- [ ] Choose the strongest 4–8 original sources and verify their claims.',
 '- [ ] Write: What happened; Why it matters; What this does not prove; Everyday analogy.',
 '- [ ] Add glossary cross-links and primary source citations.',
 '- [ ] Add the reviewed content to data/content.json, then verify the /issue/NUMBER and /archive pages.',
 '- [ ] Never label unreviewed papers as confirmed AGI or ASI.',
 '',
 '_This GitHub issue is a research workflow ticket, not the public-facing weekly publication._'
].join('\n');
const response=await fetch('https://api.github.com/repos/'+repo+'/issues',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({title,body})});
if(!response.ok)throw new Error('Cannot create editorial pack: '+response.status+' '+(await response.text()).slice(0,500));
console.log('Created candidate pack: '+(await response.json()).html_url);
