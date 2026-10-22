import {publicBusinessDetails} from './business-profile.mjs';
export async function mountPublicBusiness(){
 const blocks=[...document.querySelectorAll('[data-public-business]')];
 if(!blocks.length)return;
 try{
  const result=await fetch('/api/business',{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
  if(!result.ok)return;
  const data=await result.json();
  for(const block of blocks)block.innerHTML=publicBusinessDetails(data);
 }catch{/* Existing contact information and server-rendered supplier details remain usable. */}
}
