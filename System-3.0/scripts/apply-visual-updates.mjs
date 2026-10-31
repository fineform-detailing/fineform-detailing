import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative,sep} from 'node:path';

const root='dist';
const css='<link rel="stylesheet" href="/assets/ff-header-v4.css">';
const js='<script defer src="/assets/ff-header-v4.js"></script>';
const hero='<figure class="hero-image" data-hero-image><img src="/assets/ff-20261031-wash.avif?v=4" width="950" height="1187" alt="Lavagem detalhada de um carro preto com luva de microfibra" fetchpriority="high" decoding="async"></figure>';
async function* htmlFiles(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())yield* htmlFiles(path);
  else if(entry.isFile()&&entry.name.endsWith('.html'))yield path;
 }
}
export async function applyVisualUpdates(){
 const home=await readFile(join(root,'index.html'),'utf8');
 const staticHeader=home.match(/<header class="site-header" data-header>[\\s\\S]*?<\\/header>/)?.[0];
 if(!staticHeader||!staticHeader.includes('ff-new-header'))throw new Error('Static Fine Form header missing in homepage');
 for await(const path of htmlFiles(root)){
  let html=await readFile(path,'utf8');
  const original=html;
  const page=relative(root,path).split(sep).join('/');
  if(/^(painel|acompanhar|assinatura|avaliar)\\//.test(page))continue;
  // All pages share the same responsive header; remove outdated injectors.
  html=html.replace(/<link[^>]+href=["']\/assets\/ff-header-v[0-9]+\.css["'][^>]*>/g,'');
  html=html.replace(/<script[^>]+src=["']\/assets\/ff-header-v[0-9]+\.js["'][^>]*><\/script>/g,'');
  html=html.replace('</head>',css+js+'</head>');
  html=html.replace(/<header class="site-header" data-header>[\\s\\S]*?<\\/header>/,staticHeader);
  if(relative(root,path).split(sep).join('/')==='index.html'){
   html=html.replace(/<link rel="preload" as="image"[^>]*>/,'<link rel="preload" as="image" href="/assets/ff-20261031-wash.avif?v=4">');
   html=html.replace(/<figure class="hero-image" data-hero-image>[\s\S]*?<\/figure>/,hero);
  }
  if(html!==original)await writeFile(path,html);
 }
}
