import {escapeBusiness,publicBusinessDetails} from './business-profile.mjs';
export async function mountPublicBusiness(){
 const blocks=[...document.querySelectorAll('[data-public-business]')],footers=[...document.querySelectorAll('[data-public-supplier]')];
 if(!blocks.length&&!footers.length)return;
 try{
  const result=await fetch('/api/business',{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
  if(!result.ok)return;
  const data=await result.json();
  for(const block of blocks)block.innerHTML=publicBusinessDetails(data);
  const s=data.supplier,e=escapeBusiness;
  for(const footer of footers)footer.innerHTML=s?e(s.legalName)+' · CNPJ '+e(s.cnpj)+' · '+e(s.registeredAddress):'';
 }catch{/* Existing contact information and server-rendered supplier details remain usable. */}
}
