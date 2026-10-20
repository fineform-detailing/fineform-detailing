import {build} from 'esbuild';
await build({entryPoints:['src/studio-motion.mjs'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:'dist/assets/studio-motion.mjs',legalComments:'none'});
