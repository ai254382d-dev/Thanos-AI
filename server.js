const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json({ limit: "32kb" }));
const origin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin }));
app.get("/health", (_req,res)=>res.json({ok:true,service:"thanox-backend"}));
app.post("/chat", async (req,res)=>{
  try {
    const key=process.env.OPENAI_API_KEY;
    if(!key) return res.status(503).json({error:"Server missing OPENAI_API_KEY. Add it privately in hosting environment variables."});
    const message=typeof req.body?.message==="string"?req.body.message.trim():"";
    const language=typeof req.body?.language==="string"?req.body.language:"auto";
    if(!message) return res.status(400).json({error:"Please send a message."});
    if(message.length>8000) return res.status(413).json({error:"Message too long (limit 8000 characters)."});
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL||"gpt-4.1-mini",
        instructions:"You are ThanoX AI, a helpful multilingual personal assistant. Reply in the language the user writes in unless they request another language. Be honest about limitations. Language preference setting: "+language+".",
        input:message,max_output_tokens:700
      })
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){console.error("AI provider error",r.status,data?.error?.message||"");return res.status(502).json({error:"AI provider request failed. Check API key, billing, model access, and server logs."});}
    const reply=data.output_text||(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
    if(!reply)return res.status(502).json({error:"AI provider returned no text."});
    res.json({reply});
  } catch(e){console.error(e);res.status(500).json({error:"Backend error. Check server logs."});}
});
app.listen(process.env.PORT||3000,()=>console.log("ThanoX backend started"));
