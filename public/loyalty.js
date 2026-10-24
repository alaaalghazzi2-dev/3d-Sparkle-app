(()=>{
 const add=(p,tag,value)=>{const e=document.createElement(tag);e.textContent=value;p.append(e);return e;};
 const states={quote_requested:'بانتظار التسعير',contacted:'تم التواصل',confirmed:'مؤكد',completed:'مكتمل — تم الشراء والتسليم',cancelled:'ملغى'};
 window.addOrderEditor=(db,parent,table,order)=>{
 const form=add(parent,'form','');form.className='order-editor';
 const label=add(form,'label','سعر القطعة المدفوع (ل.س)');const price=add(label,'input','');price.type='number';price.min='0';price.max='999999999999.99';price.step='.01';price.value=order.unit_price_syp??'';price.placeholder='سعر القطعة بعد الخصم، دون الشحن';
 const sl=add(form,'label','حالة الطلب');const status=add(sl,'select','');for(const [v,t] of Object.entries(states)){const o=add(status,'option',t);o.value=v;}status.value=order.status;
 add(form,'small','أكّد اكتمال الطلب بعد الدفع والتسليم فقط. كل قطعة سعرها أكبر من ٥٠٠ ل.س تُحتسب للولاء في الحساب المسجّل.');
 const save=add(form,'button','حفظ السعر والحالة');save.type='submit';const note=add(form,'p','');note.setAttribute('role','status');
 form.onsubmit=async e=>{e.preventDefault();if(save.disabled)return;const value=price.value===''?null:Number(price.value);if(status.value==='completed'&&value===null){note.textContent='أدخل سعر القطعة قبل تأكيد اكتمال الشراء.';return;}save.disabled=true;
 try{const r=await db.from(table).update({unit_price_syp:value,status:status.value}).eq('id',order.id).select('id').single();if(r.error)throw r.error;order.status=status.value;order.unit_price_syp=value;note.textContent='تم الحفظ وتحديث رصيد الولاء.';document.dispatchEvent(new Event('loyalty-updated'));}catch{note.textContent='تعذّر الحفظ. تحقق من السعر والاتصال والصلاحيات.';}finally{save.disabled=false;}};
 };
 window.loadLoyaltyCard=async db=>{
 const box=document.getElementById('loyaltyCard');if(!box)return;box.textContent='جارٍ تحميل بطاقة الولاء…';
 try{const r=await db.rpc('loyalty_status');if(r.error)throw r.error;const s=r.data;box.replaceChildren();
 add(box,'h2','بطاقة Sparkle للولاء');add(box,'p','كل ٥ منتجات تشتريها، سعر القطعة منها أكثر من ٥٠٠ ل.س، تمنحك هدية مجانية قيّمة من المتجر.');
 const filled=s.available_rewards>0?5:s.progress;const stamps=add(box,'div','');stamps.className='loyalty-stamps';stamps.setAttribute('aria-label',filled+' من 5');for(let i=0;i<5;i++){const stamp=add(stamps,'span',i<filled?'★':String(i+1));stamp.className=i<filled?'earned':'';stamp.setAttribute('aria-hidden','true');}
 if(s.available_rewards>0){const ready=add(box,'p','🎁 لديك '+s.available_rewards+' هدية مجانية مستحقة! تواصل مع المتجر لاستلامها.');ready.className='loyalty-ready';const a=add(box,'a','تواصل لاستلام هديتك');a.href='https://wa.me/963998227776?text='+encodeURIComponent('مرحبًا، لدي هدية مستحقة في بطاقة الولاء بحسابي في Sparkle 3D.');a.className='buy';a.target='_blank';a.rel='noopener noreferrer';}
 add(box,'p','تقدّم البطاقة التالية: '+s.progress+' / ٥ — تبقّى '+s.next_needed+' قطع مؤهلة.');add(box,'small','القطع المؤهلة: '+s.eligible_units+' · الهدايا المستلمة: '+s.delivered_rewards);
 add(box,'p','تُحتسب الكمية بعد تأكيد المسؤول الدفع والتسليم وتسجيل سعر القطعة. تشمل طلبات النماذج والطلبات الخاصة المرتبطة بحسابك. القطع بسعر ٥٠٠ ل.س أو أقل والطلبات الملغاة لا تُحتسب. نوع الهدية يحدده المتجر.').className='loyalty-note';
 if(s.adjustment_units>0)add(box,'p','تم تعديل مشتريات سبق احتسابها؛ تُسوّى '+s.adjustment_units+' قطع قبل احتساب رصيد جديد.').className='loyalty-note';
 const history=await db.from('loyalty_rewards').select('gift,delivered_at').order('delivered_at',{ascending:false}).limit(10);if(!history.error&&history.data.length){add(box,'h3','آخر الهدايا المستلمة');const list=add(box,'ul','');for(const g of history.data)add(list,'li',g.gift+' — '+new Date(g.delivered_at).toLocaleDateString('ar'));}
 const refresh=add(box,'button','تحديث البطاقة');refresh.className='secondary';refresh.type='button';refresh.onclick=()=>loadLoyaltyCard(db);
 }catch{box.textContent='تعذّر تحميل بطاقة الولاء. أعد تحميل الصفحة للمحاولة.';}
 };
 window.loyaltyCustomerCell=(db,cell,customer,stats,onRefresh)=>{
 if(!stats){cell.textContent='تعذّر تحميل الرصيد';return;}
 add(cell,'p',stats.progress+'/٥ · هدايا مستحقة: '+stats.available_rewards+' · مستلمة: '+stats.delivered_rewards);
 if(stats.available_rewards<1)return;
 const form=add(cell,'form','');form.className='gift-delivery';const label=add(form,'label','الهدية المسلّمة');const input=add(label,'input','');input.required=true;input.maxLength=200;input.placeholder='مثال: ميدالية مطبوعة مجانية';const checkLabel=add(form,'label','');const confirmed=add(checkLabel,'input','');confirmed.type='checkbox';confirmed.required=true;checkLabel.append(document.createTextNode(' تم تسليم الهدية للعميل بالفعل'));
 const button=add(form,'button','تسجيل تسليم هدية واحدة');button.type='submit';const feedback=add(form,'p','');feedback.setAttribute('role','status');const request=crypto.randomUUID();
 form.onsubmit=async e=>{e.preventDefault();if(button.disabled)return;button.disabled=true;try{const r=await db.rpc('deliver_loyalty_gift',{p_user:customer.id,p_request:request,p_gift:input.value.trim()});if(r.error)throw r.error;feedback.textContent='تم تسجيل التسليم.';await onRefresh();}catch{feedback.textContent='تعذّر التسجيل أو لم تعد الهدية مستحقة. حدّث قائمة العملاء قبل المحاولة.';button.disabled=false;}};
 };
})();
