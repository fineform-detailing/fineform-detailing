import test from 'node:test';
import assert from 'node:assert/strict';
import {socialContacts,emailMessage,preferredContact,whatsappMessage} from '../dist/assets/contacts.mjs';
const config={instagram:'https://www.instagram.com/fineform.detailing/',tiktok:'https://www.tiktok.com/@fineform.detailing',email:'fineformcare@gmail.com'};
test('contatos preservam o perfil informado e oferecem os três destinos',()=>{
 const links=socialContacts(config);assert.equal(links.length,3);assert.equal(links[0].url,config.instagram);assert.equal(links[1].url,config.tiktok);assert.equal(links[2].url,'mailto:fineformcare@gmail.com');
});
test('WhatsApp informado recebe o resumo completo; e-mail continua disponível como alternativa',()=>{
 const configured={...config,whatsapp:'55 (11) 95947-3298'};
 const text='# Fine Form\nCliente: João & Maria\nExtra + vitrificação\nData: a combinar';
 const url=new URL(whatsappMessage(configured,text));
 assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/5511959473298');
 assert.equal(url.searchParams.get('text'),text);assert.equal(url.searchParams.size,1);
 assert.equal(socialContacts(configured).length,4);
 assert.ok(socialContacts(configured).some(x=>x.url==='mailto:fineformcare@gmail.com'));
 assert.equal(whatsappMessage({whatsapp:'javascript:5511959473298'},text),'');
 assert.equal(whatsappMessage({},text),'');
});
test('o resumo vai inteiro no corpo, sem transformar caracteres em cabeçalhos',()=>{
 const text='# Fine Form\nNome: João & Maria\nVeículo: Porsche 911\nA confirmar? Sim';
 const url=new URL(emailMessage(config,text));assert.equal(url.pathname,'fineformcare@gmail.com');assert.equal(url.searchParams.get('subject'),'Meu próximo cuidado — Fine Form');assert.equal(url.searchParams.get('body'),text.replace(/\n/g,'\r\n'));assert.equal(url.searchParams.size,2);
});
test('o e-mail é o contato disponível; WhatsApp só assume prioridade quando configurado',()=>{
 assert.equal(preferredContact(config).kind,'email');assert.equal(preferredContact({...config,whatsapp:'55 11 99999-8888'}).kind,'whatsapp');assert.equal(preferredContact({}).kind,'unavailable');assert.equal(emailMessage({email:'evil@example.com?cc=another@example.com'},'x'),'');assert.deepEqual(socialContacts({instagram:'javascript:alert(1)',tiktok:'https://tiktok.com.other.example/@x'}),[]);
});
