import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

/** Only home receives the entry interaction; other pages navigate immediately. */
export async function buildIntro() {
  await build({
    entryPoints: ['src/intro/boot.mjs'], outfile: 'dist/assets/intro-boot.js',
    bundle: true, minify: true, format: 'iife', target: ['es2020'], legalComments: 'none',
  });
  await build({
    entryPoints: ['src/intro/index.mjs'], outfile: 'dist/assets/intro-loader.mjs',
    bundle: true, minify: true, format: 'esm', target: ['es2020'], legalComments: 'none',
  });

  const drawing = await readFile('src/intro/tentacle.svg', 'utf8');
  const wordmark = await readFile('src/intro/wordmark.svg', 'utf8');
  const shell = (await readFile('src/intro/shell.html', 'utf8')).replace('{{TENTACLE_SVG}}', drawing).replace('{{WORDMARK_SVG}}', wordmark);
  const head = '<!-- ff:intro:head:start --><link rel="stylesheet" href="/assets/intro-loader.css"><script src="/assets/intro-boot.js"></script><script type="module" src="/assets/intro-loader.mjs"></script><!-- ff:intro:head:end -->';
  const body = '<!-- ff:intro:body:start -->' + shell + '<!-- ff:intro:body:end -->';

  for (const file of ['dist/index.html', 'dist/atendimento/index.html', 'dist/links/index.html']) {
    let html = await readFile(file, 'utf8');
    html = html.replace(/<!-- ff:intro:head:start -->[\s\S]*?<!-- ff:intro:head:end -->/g, '');
    html = html.replace(/<!-- ff:intro:body:start -->[\s\S]*?<!-- ff:intro:body:end -->/g, '');
    if (file === 'dist/index.html') {
      html = html.replace('</head>', head + '</head>');
      html = html.replace(/<body\b[^>]*>/, opening => opening + body);
    }
    await writeFile(file, html);
  }
}
