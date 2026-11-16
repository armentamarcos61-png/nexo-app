import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/state/auth';
import { sendEmploymentInterest } from '@/lib/nexo-employment-api';
import { sendServiceProposal, type PortfolioOpportunity } from '@/lib/nexo-portfolio-opportunities';
import type { ServicePortfolio } from '@/state/portfolios';

type Props={portfolio:ServicePortfolio;offers:PortfolioOpportunity[];loading:boolean;error:string;onRefresh:()=>void};

export function PortfolioOffers({portfolio,offers,loading,error,onRefresh}:Props){
 const {user}=useAuth();
 const [opened,setOpened]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState<string[]>([]);
 const [localError,setLocalError]=useState('');
 const [localNotice,setLocalNotice]=useState('');

 function open(offer:PortfolioOpportunity){
  setLocalError('');setLocalNotice('');
  if(opened===offer.key){setOpened('');return;}
  setOpened(offer.key);
  setMessage(offer.type==='service'
   ?'Hola, vi tu solicitud en Nexo. Tengo experiencia en '+portfolio.title+
    ' y me interesa enviarte una propuesta. Podemos conversar sobre los detalles.'
   :'Hola, vi tu vacante en Nexo y tengo experiencia en '+portfolio.title+
    '. Me interesa conocer más sobre esta oportunidad.');
 }
 async function send(offer:PortfolioOpportunity){
  if(busy||!user)return;
  setBusy(true);setLocalError('');setLocalNotice('');
  try{
   if(offer.type==='service'){
     await sendServiceProposal(offer.item,user.username||'Usuario Nexo',portfolio.title,message);
   }else{
     await sendEmploymentInterest(offer.item,user.username||'Usuario Nexo',message);
   }
   setSent(previous=>[...previous,offer.key]);
   setLocalNotice('✓ Propuesta enviada a Nexo Central. Consulta las respuestas en Mis solicitudes.');
  }catch(cause){
   setLocalError(cause instanceof Error?cause.message:'No se pudo enviar la propuesta.');
  }finally{setBusy(false);}
 }
 return <View style={styles.block}>
  <View style={styles.heading}>
   <Text style={styles.headingTitle}>Ofertas para {portfolio.title}</Text>
   <Text style={styles.headingCount}>{offers.length} {offers.length===1?'oferta':'ofertas'}</Text>
  </View>
  <Text style={styles.help}>Oportunidades relacionadas con el trabajo de este portafolio. Las ofertas vienen de publicaciones reales de Nexo.</Text>
  <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.refresh}>
   <Text style={styles.refreshText}>↻ Actualizar ofertas</Text>
  </Pressable>
  {loading?<Text style={styles.muted}>Consultando ofertas disponibles…</Text>:null}
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  {!loading&&!error&&offers.length===0&&(
   <View style={styles.empty}>
    <Text style={styles.emptyTitle}>No hay ofertas coincidentes por ahora</Text>
    <Text style={styles.muted}>Cuando alguien publique un proyecto o vacante relacionada con {portfolio.title}, aparecerá aquí y el contador se actualizará.</Text>
   </View>
  )}
  {!loading&&!error&&offers.map(offer=>{
    const request=offer.item;
    const selected=opened===offer.key;
    const isOwn=!!user&&request.owner_id===user.id;
    const isSent=sent.includes(offer.key);
    return <View key={offer.key} style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:selected}} onPress={()=>open(offer)} style={styles.cardInner}>
       <View style={styles.top}>
        <Text style={styles.tag}>{offer.type==='service'?'🛠️ PROYECTO SOLICITADO':'💼 VACANTE DE TRABAJO'}</Text>
        <Text style={styles.arrow}>{selected?'⌃':'›'}</Text>
       </View>
       <Text style={styles.title}>{request.title}</Text>
       <Text style={styles.meta}>{request.category||'Sin categoría'}{request.location?' · '+request.location:''}</Text>
       {offer.type==='service' && request.budget_mxn!=null &&
         <Text style={styles.budget}>Presupuesto: {request.budget_mxn.toLocaleString('es-MX',{style:'currency',currency:'MXN'})}</Text>}
       <Text style={styles.description} numberOfLines={selected?undefined:2}>{request.description}</Text>
       <Text style={styles.openText}>{selected?'Ocultar oferta':'Ver oferta y enviar propuesta'}</Text>
      </Pressable>
      {selected&&<View style={styles.contact}>
       {isOwn?<Text style={styles.muted}>Esta publicación es tuya; no puedes responder a tu propia oferta.</Text>:
        isSent?<Text style={styles.success}>✓ Propuesta enviada correctamente.</Text>:
        !user?<><Text style={styles.muted}>Inicia sesión para enviar tu propuesta.</Text>
         <Pressable onPress={()=>router.push('/iniciar-sesion')} style={styles.action}>
          <Text style={styles.actionText}>Iniciar sesión</Text>
         </Pressable></>:
        <>
         <Text style={styles.label}>Tu mensaje para el anunciante</Text>
         <TextInput
          multiline value={message} onChangeText={setMessage}
          maxLength={1200} placeholder="Explica brevemente qué puedes ofrecer…"
          placeholderTextColor="#7189A6" accessibilityLabel="Mensaje de propuesta"
          style={styles.input}
         />
         <Pressable accessibilityRole="button" disabled={busy||message.trim().length<10}
           onPress={()=>void send(offer)} style={[styles.action,(busy||message.trim().length<10)&&styles.disabled]}>
          <Text style={styles.actionText}>{busy?'Enviando…':'Me interesa esta oferta'}</Text>
         </Pressable>
        </>}
       {!!localNotice&&<Text accessibilityRole="alert" style={styles.success}>{localNotice}</Text>}
       {!!localError&&<Text accessibilityRole="alert" style={styles.error}>{localError}</Text>}
       <Text style={styles.privacy}>Los mensajes solo son visibles para las personas involucradas. No compartimos tu teléfono públicamente.</Text>
      </View>}
    </View>;
  })}
  <Pressable accessibilityRole="button" onPress={()=>router.push('/mis-solicitudes')} style={styles.inbox}>
   <Text style={styles.inboxText}>Ver mis solicitudes y propuestas ›</Text>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({
 block:{gap:12,marginTop:12,padding:12,borderWidth:1,borderColor:'#3A7592',borderRadius:17,backgroundColor:'#101F38'},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 headingTitle:{fontSize:17,fontWeight:'900',color:'#FFFFFF',flexShrink:1},
 headingCount:{backgroundColor:'#35C9E8',color:'#09223B',fontWeight:'900',fontSize:12,paddingHorizontal:10,paddingVertical:5,borderRadius:99,overflow:'hidden'},
 help:{fontSize:12,lineHeight:18,color:'#C1D5EC'},
 refresh:{alignSelf:'flex-start',paddingVertical:7,paddingHorizontal:10},
 refreshText:{color:'#96E5F5',fontWeight:'900',fontSize:12},
 empty:{padding:12,borderRadius:12,backgroundColor:'#1D3451',gap:6},
 emptyTitle:{color:'#FFFFFF',fontSize:13,fontWeight:'900'},
 muted:{color:'#BFD0E7',fontSize:12,lineHeight:18},
 error:{color:'#FFB8C6',fontSize:12,lineHeight:18},
 success:{color:'#88F3C6',fontSize:12,lineHeight:18,fontWeight:'800'},
 card:{backgroundColor:'#203856',borderRadius:14,borderWidth:1,borderColor:'#4A7194',overflow:'hidden'},
 cardInner:{padding:12,gap:6},
 top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 tag:{fontSize:10,fontWeight:'900',letterSpacing:0.7,color:'#9BEFE8'},
 arrow:{fontSize:20,color:'#D6ECFD'},
 title:{fontSize:15,fontWeight:'900',color:'#FFFFFF'},
 meta:{fontSize:11,color:'#B8D1E7'},
 budget:{fontSize:12,fontWeight:'900',color:'#81F2DC'},
 description:{fontSize:12,lineHeight:18,color:'#DBEAF8'},
 openText:{fontSize:12,fontWeight:'900',color:'#85DFFC'},
 contact:{padding:12,gap:9,borderTopWidth:1,borderTopColor:'#527899'},
 label:{color:'#EEF6FF',fontSize:12,fontWeight:'800'},
 input:{minHeight:90,backgroundColor:'#EFF5FF',borderRadius:12,padding:12,color:'#0A1A32',fontSize:13,textAlignVertical:'top'},
 action:{backgroundColor:'#69DAF4',borderRadius:12,padding:12,alignItems:'center'},
 actionText:{color:'#09223B',fontSize:13,fontWeight:'900'},
 disabled:{opacity:0.5},
 privacy:{fontSize:10,color:'#ADC6DF',lineHeight:16},
 inbox:{padding:9,alignSelf:'center'},
 inboxText:{color:'#9AE7F7',fontSize:12,fontWeight:'900'},
});
