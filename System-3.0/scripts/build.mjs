import {build} from 'esbuild';
import {buildIntro} from './build-intro.mjs';
await build({entryPoints:['src/studio-motion.mjs'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:'dist/assets/studio-motion.mjs',legalComments:'none'});
await buildIntro();
