import{readFile,writeFile}from'node:fs/promises';
import{homeMarkup}from'../dist/assets/final-home.mjs';
export async function buildFinal(){
 const file='dist/index.html';let html=await readFile(file,'utf8');
 html=html.replace(/<main\b[^>]*id="conteudo"[\s\S]*?<\/main>/,'<main class="fn-main" id="conteudo" tabindex="-1">'+homeMarkup()+'</main>');
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>Fine Form — Seu veículo, em boa forma</title>').replace(/<meta name="description"[^>]*>/,'<meta name="description" content="Estética para carros e motos. Lavagens, higienização, polimento, vitrificação e planos Fine Form Care.">').replace(/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="Fine Form — Seu veículo, em boa forma">');
 html=html.replace(/<script type="module" src="assets\/(?:experience|studio-motion)\.mjs"><\/script>/g,'');
 html=html.replace(/<link rel="stylesheet" href="\/?assets\/(?:studio|studio-motion|visual-care|design-v3)\.css">/g,'').replace(/<link rel="preload" as="image"[^>]+>/g,'');
 if(!html.includes('src="assets/home-final.mjs"'))html=html.replace('</head>','<link rel="stylesheet" href="assets/final-layout.css"><script type="module" src="assets/home-final.mjs"></script></head>');
 if(!html.includes('<body class="fn-site"'))html=html.replace('<body ','<body class="fn-site" ');
 await writeFile(file,html);
 const booking='dist/atendimento/index.html';let form=await readFile(booking,'utf8');
 form=form.replace(/<link rel="stylesheet" href="\.\.\/assets\/(?:editorial|clean|studio|visual-care|design-v3)\.css">/g,'');
 if(!form.includes('assets/final-layout.css'))form=form.replace('</head>','<link rel="stylesheet" href="../assets/final-layout.css"></head>');
 if(!form.includes('<body class="fn-site"'))form=form.replace('<body ','<body class="fn-site" ');
 if(!form.includes('id="visual-care-aside"'))form=form.replace('<ol class="step-nav"','<div id="visual-care-aside" hidden></div><ol class="step-nav"');
 await writeFile(booking,form);
}
