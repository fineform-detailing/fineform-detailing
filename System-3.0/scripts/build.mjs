import {build} from 'esbuild';
import {buildFinal} from './build-final.mjs';
import {buildIntro} from './build-intro.mjs';
import {buildLegal} from './build-legal.mjs';
await build({entryPoints:['src/studio-motion.mjs'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:'dist/assets/studio-motion.mjs',legalComments:'none'});
await buildFinal();
await buildIntro();
await buildLegal();
