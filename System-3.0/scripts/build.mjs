import {build} from 'esbuild';
await build({entryPoints:['src/studio.jsx'],bundle:true,minify:true,format:'esm',jsx:'automatic',target:['es2020'],outfile:'dist/assets/studio-react.mjs',define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
