// Public discovery feed. These papers are NOT editorially reviewed.
// Heuristics to drop obvious low-quality index entries.
function isJunk(x){
 const t=String(x.title).trim();
 const letters=t.replace(/[^A-Za-z]/g,'');
 if(letters.length>=12){const up=letters.replace(/[^A-Z]/g,'').length;if(up/letters.length>0.7)return true}
 if(t.length<15||t.length>300)return true;
 if(/\b(TITLE|SUBTITLE|AUTHOR)\b/.test(t)||/^(supplementary|dataset|data for)\b/i.test(t))return true;
 const src=x.primary_location&&x.primary_location.source;
 if(!src||!src.display_name)return true;
 return false;
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=7200');
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),7500);
 try{
   const now=new Date();const today=now.toISOString().slice(0,10);
   const start=new Date(now.getTime()-60*86400000).toISOString().slice(0,10);
   const qs=new URLSearchParams({
     'search.title':'AI safety autonomous agent',
     'filter':'from_publication_date:'+start+',to_publication_date:'+today+',has_doi:true',
     'sort':'publication_date:desc',
     'per-page':'40',
     'select':'title,publication_date,primary_location,doi,id,type'
   });
   const r=await fetch('https://api.openalex.org/works?'+qs.toString(),{signal:ctl.signal,headers:{'User-Agent':'FrontierIntelligenceWatch/1.0 (research discovery)'}});
   if(!r.ok)throw new Error('Research index unavailable');
   const d=await r.json();
   const results=(d.results||[])
     .filter(x=>x.title&&x.publication_date&&x.publication_date<=today&&x.doi&&/(AI|artificial intelligence|agent|language model|machine learning)/i.test(x.title)&&!isJunk(x))
     .slice(0,8)
     .map(x=>({title:x.title.slice(0,230),date:x.publication_date,url:x.primary_location?.landing_page_url||x.doi||x.id}))
     .filter(x=>/^https:\/\//.test(x.url));
   return res.status(200).json({fetchedAt:new Date().toISOString(),provider:'OpenAlex',reviewed:false,results});
 }catch(e){return res.status(503).json({error:'Research index currently unavailable'})}
 finally{clearTimeout(timer)}
};
