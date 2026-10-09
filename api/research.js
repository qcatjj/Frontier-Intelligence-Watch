// Public discovery feed. These papers are NOT editorially reviewed.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=7200');
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),7500);
 try{
   const today=new Date().toISOString().slice(0,10);
   const qs=new URLSearchParams({
     'search.title':'AI safety autonomous agent',
     'filter':'from_publication_date:2026-09-01,to_publication_date:'+today,
     'sort':'publication_date:desc',
     'per-page':'18',
     'select':'title,publication_date,primary_location,doi,id'
   });
   const r=await fetch('https://api.openalex.org/works?'+qs.toString(),{signal:ctl.signal,headers:{'User-Agent':'FrontierIntelligenceWatch/1.0 (research discovery)'}});
   if(!r.ok)throw new Error('Research index unavailable');
   const d=await r.json();
   const results=(d.results||[])
     .filter(x=>x.title&&x.publication_date&&x.publication_date<=today&&/(AI|artificial intelligence|agent|language model|machine learning)/i.test(x.title))
     .slice(0,8)
     .map(x=>({title:x.title.slice(0,230),date:x.publication_date,url:x.primary_location?.landing_page_url||x.doi||x.id}))
     .filter(x=>/^https:\/\//.test(x.url));
   return res.status(200).json({fetchedAt:new Date().toISOString(),provider:'OpenAlex',reviewed:false,results});
 }catch(e){return res.status(503).json({error:'Research index currently unavailable'})}
 finally{clearTimeout(timer)}
};
