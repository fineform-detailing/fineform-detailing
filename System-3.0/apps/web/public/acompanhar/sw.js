/* Notification-only: never cache private pages or order responses. */
const validId=value=>typeof value==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data;try{data=event.data?.json();}catch{}
 const valid=data?.type==='review.requested'&&validId(data.quoteId)&&typeof data.token==='string'&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.token)&&data.token.length<=2048;
 event.waitUntil(self.registration.showNotification('Fine Form · Como foi seu cuidado?',{
  body:'Veículo entregue, cuidado concluído. Conte como foi sua experiência e deixe sua avaliação.',
  icon:'/assets/logo-original.png',lang:'pt-BR',tag:valid?'ff-review-'+data.quoteId:'ff-review',renotify:false,
  data:valid?{quoteId:data.quoteId,token:data.token}:{}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const data=event.notification.data||{},target=new URL('/acompanhar/',self.location.origin);
 if(validId(data.quoteId)&&typeof data.token==='string'&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.token)&&data.token.length<=2048){target.pathname='/avaliar/';target.searchParams.set('id',data.quoteId);target.hash='t='+data.token;}
 event.waitUntil(self.clients.openWindow(target.href));
});
