import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {attendanceMarkup,carePlateMarkup,bindAttendance} from '../dist/assets/admin-attendance.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(extra={},handlers={}){
 const q={id:'order',version:7,status:'accepted',kind:'single',plateVerified:true,scheduledDate:'2026-11-06',scheduledTime:'11:00',...extra};
 const dom=new JSDOM('<div id="detail"><p id="dialog-error" hidden></p>'+attendanceMarkup(q)+(q.kind==='subscription_visit'?carePlateMarkup():'')+'</div>');
 const detail=dom.window.document.getElementById('detail'),calls=[];let revealed=0,saved=0,error;
 bindAttendance({detail,q,save:async body=>{calls.push(body);await handlers.save?.(body);},onSaved:async()=>saved++,onError:err=>{error=err;},revealVehicle:()=>revealed++,confirm:()=>handlers.confirm!==false});
 return {dom,detail,calls,get revealed(){return revealed;},get saved(){return saved;},get error(){return error;},click:status=>detail.querySelector('[data-quick-quote-status="'+status+'"]').click()};
}
test('visita Care só avança após a conferência da placa e envia o agendamento na mesma atualização',async()=>{
 const f=fixture({kind:'subscription_visit'});f.click('in_progress');await settle();
 assert.equal(f.calls.length,0);assert.equal(f.revealed,1);
 const form=f.detail.querySelector('#care-confirm-plate');form.elements.checkedPlate.value='ABC1D23';
 form.dispatchEvent(new f.dom.window.Event('submit',{cancelable:true}));await settle();
 assert.deepEqual(f.calls,[{version:7,status:'in_progress',scheduledDate:'2026-11-06',scheduledTime:'11:00',checkedPlate:'ABC1D23'}]);
 assert.equal(f.saved,1);f.dom.window.close();
});
test('falha de gravação mantém a data digitada, libera os botões e não duplica pedidos',async()=>{
 let reject;const f=fixture({}, {save:()=>new Promise((_,r)=>{reject=r;})});
 const date=f.detail.querySelector('[name="scheduledDate"]');date.value='2026-11-07';
 f.click('in_progress');f.click('in_progress');
 assert.equal(f.calls.length,1);assert.ok(f.detail.querySelector('[data-quick-quote-status]').disabled);
 reject(new Error('Falha de conexão'));await settle();
 assert.equal(f.error.message,'Falha de conexão');assert.equal(f.saved,0);assert.equal(date.value,'2026-11-07');
 assert.ok([...f.detail.querySelectorAll('button')].every(button=>!button.disabled));f.dom.window.close();
});
test('recusar a confirmação de cancelamento não altera o pedido',async()=>{
 const f=fixture({}, {confirm:false});f.click('cancelled');await settle();assert.equal(f.calls.length,0);f.dom.window.close();
});
