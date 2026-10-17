/* Notification-only worker: no fetch handler and no caching of private pages. */
const orderId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let message;try{message=event.data?.json();}catch{}
 const quoteId=message?.type==='order.created'&&orderId(message.quoteId)?message.quoteId:null;
 const test=message?.type==='notification.test';
 event.waitUntil(self.registration.showNotification(test?'Fine Form · Teste de aviso':'Fine Form · Novo pedido',{
  body:test?'As notificações deste aparelho estão funcionando.':'Há um novo pedido para você avaliar no painel.',
  icon:'/assets/logo-original.png',lang:'pt-BR',tag:quoteId?'ff-order-'+quoteId:test?'ff-notification-test':'ff-new-order',
  renotify:false,requireInteraction:true,vibrate:[200,100,200],
  data:{quoteId}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const quoteId=orderId(event.notification.data?.quoteId)?event.notification.data.quoteId:null;
 const target=new URL('/painel/',self.location.origin);if(quoteId)target.searchParams.set('pedido',quoteId);
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
   const url=new URL(client.url);if(url.origin===target.origin&&(url.pathname==='/painel'||url.pathname.startsWith('/painel/'))){
    try{await client.focus();client.postMessage({type:'ff-open-order',quoteId});return;}catch{}
   }
  }
  await self.clients.openWindow(target.href);
 })());
});
