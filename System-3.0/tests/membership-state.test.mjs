import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visitAvailability,chooseCredit} from '../dist/assets/membership-state.mjs';
const now='2026-10-13';
const care=()=>({plate:'ABC1D23',plateVerified:true,status:'active',cycle:{paid:1,starts_on:'2026-10-01',ends_on:'2026-11-01',notStarted:false,expired:false,credits:{premium:{quota:1,available:1},essential:{quota:1,available:1},moto:{quota:0,available:0}}}});
test('saldo válido libera a visita independentemente da conexão de atualização',()=>{assert.equal(visitAvailability(care(),'premium',now).allowed,true);});
test('bloqueios de plano e pagamento têm mensagens distintas',()=>{for(const [modify,match] of [[s=>s.status='paused',/pausado/],[s=>s.status='cancelled',/cancelado/],[s=>s.cycle=null,/ciclo ativo/],[s=>s.cycle.paid=0,/pagamento/]]){const s=care();modify(s);const result=visitAvailability(s,'premium',now);assert.equal(result.allowed,false);assert.match(result.reason,match);}});
test('ciclo futuro e vencido informam o motivo',()=>{const s=care();s.cycle.starts_on='2026-10-14';assert.match(visitAvailability(s,'premium',now).reason,/14\/10\/2026/);s.cycle.starts_on='2026-09-01';s.cycle.ends_on=now;assert.match(visitAvailability(s,'premium',now).reason,/terminou/);});
test('lavagem indisponível não impede selecionar outro saldo válido',()=>{const s=care();s.cycle.credits.premium.available=0;assert.equal(chooseCredit(s,'premium'),'essential');assert.equal(visitAvailability(s,'essential',now).allowed,true);assert.match(visitAvailability(s,'premium',now).reason,/Escolha outra/);s.cycle.credits.essential.available=0;assert.match(visitAvailability(s,'essential',now).reason,/utilizadas ou reservadas/);});
