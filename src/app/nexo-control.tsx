import React, { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator, Linking, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  acceptControlRedirect, controlApplySettings, controlCreateIdea,
  controlIdeaStatus, controlLogout, hasControlSession, loadControlDashboard,
  parseControlCommand, sendControlEmail, verifyControlEmail,
  type ControlDashboard, type ControlIdea, type ParsedControlCommand,
  type RuntimeSettings, type ActionId,
} from '@/lib/nexo-control-api';

const accentNames={cyan:'Azul eléctrico',violet:'Violeta',orange:'Naranja',teal:'Turquesa'} as const;
const actionNames:Record<ActionId,string>={
  employment:'Empleos',services:'Contratar servicios',products:'Productos',offer:'Ofrecer servicio',
};
const ideaStatuses:Record<ControlIdea['status'],string>={
  pending:'Pendiente',review:'En revisión',approved:'Aprobada',
  implemented:'Implementada',rejected:'Descartada',
};
const phases:ControlIdea['status'][]=['pending','review','approved','implemented','rejected'];
const accentHex={cyan:'#54DEFF',violet:'#BC8DFF',orange:'#FFA362',teal:'#56EDC7'};
type Tab='resumen'|'ordenes'|'ideas'|'feedback'|'versiones';
function Btn({label,onPress,disabled=false,primary=false}:{
 label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;
}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
   style={({pressed})=>[styles.btn,primary&&styles.primary,disabled&&styles.disabled,
     pressed&&{opacity:.78}]}>
   <Text style={[styles.btnText,primary&&{color:'#05121E'}]}>{label}</Text>
 </Pressable>;
}
function Stat({label,count,sub}: {label:string;count:number|string;sub?:string}){
 return <View style={styles.stat}>
  <Text style={styles.statNum}>{count}</Text><Text style={styles.statLabel}>{label}</Text>
  {sub?<Text style={styles.dimSmall}>{sub}</Text>:null}
 </View>;
}
export default function NexoControlScreen(){
 const [email,setEmail]=useState('');
 const [verification,setVerification]=useState('');
 const [sent,setSent]=useState(false);
 const [dashboard,setDashboard]=useState<ControlDashboard|null>(null);
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [tab,setTab]=useState<Tab>('resumen');
 const [command,setCommand]=useState('');
 const [micStatus,setMicStatus]=useState('');
 const [listening,setListening]=useState(false);
 const [proposal,setProposal]=useState<ParsedControlCommand|null>(null);
 const [draft,setDraft]=useState<RuntimeSettings|null>(null);
 const recognizer=useRef<{start:()=>void;stop:()=>void}|null>(null);
 const settings=draft||dashboard?.settings||{accent:'cyan' as const,
   action_order:['employment','services','products','offer'] as ActionId[]};
 const refresh=useCallback(async()=>{
  const result=await loadControlDashboard();
  setDashboard(result);
  setDraft(null);
 },[]);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    await acceptControlRedirect();
    if(hasControlSession()){
     const data=await loadControlDashboard();
     if(active)setDashboard(data);
    }
   }catch(e){if(active)setError(e instanceof Error?e.message:'Acceso no autorizado');}
   finally{if(active)setLoading(false);}
  })();
  return ()=>{active=false;recognizer.current?.stop();}
 },[]);
 async function doWork(run:()=>Promise<void>){
  if(working)return;
  setWorking(true);setError('');setNotice('');
  try{await run();}catch(e){setError(e instanceof Error?e.message:'No se pudo completar la acción');}
  finally{setWorking(false);}
 }
 function listen(){
  if(recognizer.current){
   try{recognizer.current.stop();}catch{/* already stopping */}
   recognizer.current=null;setListening(false);setMicStatus('Dictado detenido.');
   return;
  }
  if(Platform.OS!=='web'||typeof window==='undefined'){
   setMicStatus('Abre el panel en Chrome o usa el micrófono del teclado.');return;
  }
  const speech=window as typeof window & {
   SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any;
  };
  const Recognition=speech.SpeechRecognition||speech.webkitSpeechRecognition;
  if(!Recognition){
   setMicStatus('Este navegador no permite dictado. Usa Chrome o el micrófono del teclado.');return;
  }
  const errors:Record<string,string>={
   'not-allowed':'Permite el micrófono en los ajustes del sitio y vuelve a intentar.',
   'service-not-allowed':'El servicio de voz está bloqueado. Prueba Chrome o el teclado.',
   'audio-capture':'No se detectó micrófono. Revisa permisos y otras aplicaciones.',
   'network':'El servicio de voz del navegador falló. Prueba Chrome actualizado o el teclado.',
   'no-speech':'No se escucharon palabras. Acerca el teléfono y vuelve a intentar.',
  };
  try{
   const recognition=new Recognition();recognizer.current=recognition;
   recognition.lang='es-MX';recognition.continuous=false;
   recognition.interimResults=false;recognition.maxAlternatives=1;
   let received=false,failed=false;
   recognition.onstart=()=>{setListening(true);setMicStatus('🎙 Escuchando… habla ahora.');};
   recognition.onresult=(e:any)=>{
    const words=e.results?.[0]?.[0]?.transcript;
    if(typeof words==='string'&&words.trim()){
     received=true;setCommand(old=>(old.trim()+' '+words.trim()).trim());
     setProposal(null);setMicStatus('Orden capturada. Revisa el texto.');
    }
   };
   recognition.onerror=(e:{error?:string})=>{
    failed=true;setMicStatus(errors[e.error||'']||'No se pudo transcribir. Vuelve a intentar.');
    setListening(false);
   };
   recognition.onend=()=>{
    if(recognizer.current===recognition)recognizer.current=null;
    setListening(false);
    if(!received&&!failed)setMicStatus('Dictado terminado. Pulsa Dictar para intentar otra vez.');
   };
   recognition.start();setListening(true);setMicStatus('Solicitando acceso al micrófono…');
  }catch{
   recognizer.current=null;setListening(false);
   setMicStatus('No se pudo iniciar el micrófono. Revisa sus permisos.');
  }
 }
 function interpret(){
  if(!command.trim())return;
  setProposal(parseControlCommand(command,settings));
  setNotice('');
 }
 async function applyProposal(){
  if(!proposal)return;
  await doWork(async()=>{
   if(proposal.kind==='settings'){
    await controlApplySettings(proposal.settings);
    setNotice('Cambios publicados en la configuración de Nexo.');
   }else{
    await controlCreateIdea(proposal.title,proposal.description,proposal.category);
    setNotice('Idea registrada. Necesita revisión antes de cambiar código.');
   }
   setProposal(null);setCommand('');await refresh();
  });
 }
 async function updateIdea(idea:ControlIdea,status:ControlIdea['status']){
  await doWork(async()=>{
   await controlIdeaStatus(idea.id,status);
   await refresh();setNotice('Estado actualizado.');
  });
 }
 function moveAction(id:ActionId,offset:number){
  const order=[...settings.action_order];const at=order.indexOf(id);
  const dest=at+offset;if(at<0||dest<0||dest>=order.length)return;
  [order[at],order[dest]]=[order[dest],order[at]];
  setDraft({...settings,action_order:order});
 }
 const metrics=dashboard?.metrics;
 return <SafeAreaView style={styles.safe}>
  <LinearGradient colors={['#061525','#151637','#08283C']} style={StyleSheet.absoluteFill}/>
  <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
   <View style={styles.head}>
    <Pressable onPress={()=>router.back()} accessibilityRole="button">
     <Text style={styles.back}>‹ Nexo</Text>
    </Pressable>
    <Text style={styles.logo}>NEXO <Text style={styles.logoAccent}>CONTROL</Text></Text>
    <Text style={styles.ownerTag}>PRIVADO</Text>
   </View>
   <Text style={styles.title}>Centro de mando</Text>
   <Text style={styles.sub}>Estadísticas, configuración en vivo, propuestas y seguimiento técnico.</Text>
   {error?<View style={styles.warning}><Text style={styles.warningText}>{error}</Text></View>:null}
   {notice?<View style={styles.success}><Text style={styles.successText}>{notice}</Text></View>:null}
   {loading?<ActivityIndicator color="#68E9FF" size="large" style={{marginTop:70}}/>:
   !dashboard?
    <View style={styles.loginCard}>
     <Text style={styles.heading}>Acceso de desarrollador</Text>
     <Text style={styles.muted}>El inicio de sesión normal de Nexo no concede permisos administrativos. El servidor verificará tu cuenta y el correo autorizado.</Text>
     <Text style={styles.fieldLabel}>Correo autorizado</Text>
     <TextInput value={email} onChangeText={setEmail} style={styles.input}
       autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
       placeholder="Correo de administrador" placeholderTextColor="#7185A0"/>
     <Btn primary label={working?'Enviando…':'Enviar acceso por correo'}
       disabled={working} onPress={()=>{void doWork(async()=>{
         await sendControlEmail(email);setSent(true);
         setNotice('Revisa tu correo. Si recibes un enlace, puedes copiarlo y pegarlo aquí.');
       });}}/>
     {sent?<View style={{gap:9,marginTop:13}}>
       <Text style={styles.fieldLabel}>Código o enlace del correo</Text>
       <TextInput value={verification} onChangeText={setVerification} style={styles.input}
         autoCapitalize="none" autoCorrect={false}
         placeholder="Código de verificación o enlace completo" placeholderTextColor="#7185A0"/>
       <Btn label={working?'Verificando…':'Verificar y abrir Nexo Control'}
         disabled={working||verification.trim().length<6}
         onPress={()=>{void doWork(async()=>{
          await verifyControlEmail(email,verification);
          await refresh();setNotice('Acceso de administrador verificado.');
         });}}/>
     </View>:null}
     <Text style={styles.footNote}>Si el correo abre otra pantalla, vuelve aquí con el código o pega el enlace completo. Nunca compartas ese enlace.</Text>
    </View>
   :
    <>
     <View style={styles.session}>
      <View style={{flex:1}}><Text style={styles.sessionText}>{dashboard.account.email}</Text>
        <Text style={styles.dimSmall}>Rol: {dashboard.account.role} · acceso verificado</Text></View>
      <Btn label="Salir" onPress={()=>{controlLogout();setDashboard(null);setSent(false);setNotice('');}}/>
     </View>
     <View style={styles.tabs}>
      {([['resumen','Resumen'],['ordenes','Órdenes'],['ideas','Ideas'],['feedback','Respuestas'],['versiones','Versiones']] as const)
        .map(([key,label])=><Pressable key={key} onPress={()=>setTab(key)} style={[styles.tab,tab===key&&styles.tabActive]}>
         <Text style={[styles.tabText,tab===key&&{color:'#85EDFF'}]}>{label}</Text>
        </Pressable>)}
     </View>
     {tab==='resumen'?<>
      <View style={styles.stats}>
       <Stat label="Preguntas" count={metrics?.total||0}/>
       <Stat label="Resueltas" count={metrics?.resolved||0}/>
       <Stat label="Sin resolver" count={metrics?.unresolved||0}/>
       <Stat label="Búsquedas registradas" count={metrics?.searches||0}/>
      </View>
      <Text style={styles.sectionTitle}>Lo que preguntan</Text>
      {(metrics?.topics||[]).length?
       metrics?.topics.slice(0,12).map(item=><View style={styles.topic} key={item.key}>
        <View style={{flex:1}}><Text style={styles.topicName}>{item.label||item.key}</Text>
         <Text style={styles.dimSmall}>{item.key}</Text></View>
        <Text style={styles.topicCount}>{item.count}</Text>
        <Text style={styles.unresolved}>{item.unresolved} pendientes</Text>
       </View>):
       <Text style={styles.muted}>Aún no hay preguntas categorizadas.</Text>}
      <Text style={styles.sectionTitle}>Búsquedas por categoría</Text>
      {(metrics?.searchCategories||[]).length?
       metrics?.searchCategories.map(item=><View style={styles.topic} key={item.name}>
        <Text style={[styles.topicName,{flex:1}]}>{item.name}</Text>
        <Text style={styles.topicCount}>{item.count}</Text></View>):
       <Text style={styles.muted}>El conteo de búsquedas empieza desde esta versión. No se recuperan búsquedas históricas que no se registraron.</Text>}
      <Text style={styles.sectionTitle}>Ideas pendientes</Text>
      <Text style={styles.muted}>{dashboard.ideas.filter(i=>i.status==='pending').length} pendientes de revisión y {dashboard.ideas.length} registradas en total.</Text>
     </>:null}
     {tab==='ordenes'?<>
      <View style={styles.box}>
       <Text style={styles.heading}>Dicta o escribe una orden</Text>
       <Text style={styles.muted}>Ejemplos: “Pon Nexo en naranja”, “Productos primero”, “Añade una función para compartir portafolios”.</Text>
       <TextInput multiline value={command} onChangeText={x=>{setCommand(x);setProposal(null);}}
         style={[styles.input,styles.commandInput]} placeholder="¿Qué cambiamos o implementamos?"
         placeholderTextColor="#7185A0"/>
       <View style={styles.buttonRow}>
        <Btn label={listening?'⏹ Detener':'🎙 Dictar'} onPress={listen}/>
        <Btn primary label="Interpretar" onPress={interpret} disabled={!command.trim()}/>
       </View>
       {!!micStatus&&<Text style={styles.dimSmall}>{micStatus}</Text>}
        {proposal?<View style={styles.preview}>
        <Text style={styles.heading}>Vista previa</Text>
        <Text style={styles.muted}>{proposal.kind==='settings'?proposal.explanation:
         'Se guardará como propuesta de implementación. No se ejecutará código automáticamente.'}</Text>
        {proposal.kind==='settings'?<Text style={styles.topicName}>
         Color: {accentNames[proposal.settings.accent]} · Orden: {proposal.settings.action_order.map(x=>actionNames[x]).join(' → ')}
        </Text>:<Text style={styles.topicName}>{proposal.title}</Text>}
        <Btn primary label={working?'Aplicando…':proposal.kind==='settings'?'Confirmar cambios':'Guardar idea'}
         disabled={working} onPress={()=>{void applyProposal();}}/>
       </View>:null}
      </View>
      <View style={styles.box}>
       <Text style={styles.heading}>Cambios inmediatos</Text>
       <Text style={styles.muted}>Afectan los colores destacados y el orden de tarjetas de inicio, sin volver a publicar código.</Text>
       <Text style={styles.fieldLabel}>Color principal</Text>
       <View style={styles.buttonRow}>
        {(['cyan','violet','orange','teal'] as const).map(color=>
         <Pressable key={color} onPress={()=>setDraft({...settings,accent:color})}
          style={[styles.colorDot,{backgroundColor:accentHex[color]},
           settings.accent===color&&styles.dotSelected]} accessibilityLabel={accentNames[color]}/>)}
       </View>
       <Text style={styles.fieldLabel}>Orden de tarjetas</Text>
       {settings.action_order.map((id,index)=><View style={styles.orderRow} key={id}>
        <Text style={[styles.topicName,{flex:1}]}>{index+1}. {actionNames[id]}</Text>
        <Btn label="↑" disabled={index===0} onPress={()=>moveAction(id,-1)}/>
        <Btn label="↓" disabled={index===3} onPress={()=>moveAction(id,1)}/>
       </View>)}
       <Btn label={working?'Guardando…':'Aplicar apariencia y orden'} primary
         disabled={working} onPress={()=>{void doWork(async()=>{
          await controlApplySettings(settings);await refresh();
          setNotice('Configuración actualizada para los usuarios de Nexo.');
         });}}/>
      </View>
     </>:null}
     {tab==='ideas'?<>
      <Text style={styles.sectionTitle}>Solicitudes de implementación</Text>
      <Text style={styles.muted}>Cada instrucción nueva queda registrada y puede aprobarse, revisarse o marcarse como implementada. El estado “implementada” no escribe código por sí solo.</Text>
      {dashboard.ideas.length?dashboard.ideas.map(idea=><View style={styles.box} key={idea.id}>
       <View style={styles.ideaRow}><Text style={[styles.topicName,{flex:1}]}>{idea.title}</Text>
        <Text style={styles.dimSmall}>#{idea.id}</Text></View>
       <Text style={styles.muted}>{idea.description}</Text>
       <Text style={styles.dimSmall}>{idea.category} · {new Date(idea.created_at).toLocaleDateString('es-MX')}</Text>
       <Text style={styles.fieldLabel}>Estado: {ideaStatuses[idea.status]}</Text>
       <View style={styles.buttonRow}>{phases.map(state=><Pressable key={state}
        disabled={working} onPress={()=>{void updateIdea(idea,state);}}
        style={[styles.smallChip,idea.status===state&&styles.chipActive]}>
        <Text style={styles.chipText}>{ideaStatuses[state]}</Text>
       </Pressable>)}</View>
      </View>):
       <Text style={styles.muted}>Todavía no hay ideas. Abre Órdenes para registrar la primera.</Text>}
     </>:null}
     {tab==='feedback'?<>
      <Text style={styles.sectionTitle}>Comentarios de Nexo y Nexa</Text>
      <Text style={styles.muted}>
        Solo para cuentas de desarrollador verificadas. Las preguntas completas
        se muestran únicamente cuando el usuario autoriza compartir el contexto.
      </Text>
      <View style={styles.stats}>
        <Stat label="Valoraciones recientes" count={dashboard.feedbackTotals?.total||0}/>
        <Stat label="👍 Me gustó" count={dashboard.feedbackTotals?.likes||0}/>
        <Stat label="👎 No me gustó" count={dashboard.feedbackTotals?.dislikes||0}/>
        <Stat label="Comentarios" count={dashboard.feedbackTotals?.comments||0}/>
      </View>
      {dashboard.feedback?.length?dashboard.feedback.map(entry=>(
        <View style={styles.box} key={entry.response_id}>
          <Text style={styles.heading}>
            {entry.rating==='up'?'👍 Me gustó':entry.rating==='down'
              ?'👎 Necesita mejorar':'💬 Comentario'}
            {' · '}{entry.assistant_id==='nexa'?'Nexa':'Nexo'}
          </Text>
          <Text style={styles.dimSmall}>
            {entry.intent_key} · {new Date(entry.updated_at).toLocaleString('es-MX')}
          </Text>
          {!!entry.comment&&<Text style={styles.topicName}>{entry.comment}</Text>}
          {entry.context_shared&&entry.question_text&&entry.answer_text?
            <View style={styles.preview}>
              <Text style={styles.muted}>Pregunta: {entry.question_text}</Text>
              <Text style={styles.muted}>Respuesta: {entry.answer_text}</Text>
            </View>:
            <Text style={styles.dimSmall}>No compartió el texto de la conversación.</Text>}
        </View>
      )):<Text style={styles.muted}>Aún no se han recibido valoraciones.</Text>}
     </>:null}
     {tab==='versiones'?<>
      <Text style={styles.sectionTitle}>Ejecuciones y publicaciones</Text>
      <Text style={styles.muted}>Conteo real de ejecuciones de GitHub Actions. No equivale a número de funciones implementadas.</Text>
      <Stat label="Ejecuciones registradas" count={metrics?.workflows?.count??'No disponible'}/>
      {metrics?.workflows?.latest.map((item,index)=><View style={styles.topic} key={String(index)}>
       <View style={{flex:1}}><Text style={styles.topicName}>{item.name}</Text>
       <Text style={styles.dimSmall}>{item.created_at?new Date(item.created_at).toLocaleString('es-MX'):''}</Text></View>
       <Text style={styles.statusText}>{item.conclusion||item.status}</Text>
      </View>)}
      <Btn label="Abrir GitHub" onPress={()=>{void Linking.openURL('https://github.com/armentamarcos61-png/nexo-app/actions');}}/>
      <Text style={styles.sectionTitle}>Auditoría administrativa</Text>
      {dashboard.audit.map(log=><View style={styles.topic} key={log.id}>
       <Text style={[styles.topicName,{flex:1}]}>{log.action}</Text>
       <Text style={styles.dimSmall}>{new Date(log.created_at).toLocaleString('es-MX')}</Text>
      </View>)}
     </>:null}
     <View style={{marginTop:20}}><Btn label={working?'Actualizando…':'Actualizar datos'} disabled={working}
      onPress={()=>{void doWork(refresh);}}/></View>
     <Text style={styles.footNote}>Las métricas generales son agregadas. Solo en Respuestas se muestra información que el usuario autorizó compartir para mejorar los asistentes. El servidor requiere una sesión administrativa verificada.</Text>
    </>
   }
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#061423'},page:{width:'100%',maxWidth:980,alignSelf:'center',paddingHorizontal:17,paddingBottom:90,paddingTop:12,gap:14},
 head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 back:{color:'#9DCAEF',fontSize:15,fontWeight:'700'},logo:{fontWeight:'900',fontSize:17,color:'#FFFFFF',letterSpacing:1.2},
 logoAccent:{color:'#79E8FF'},ownerTag:{color:'#9BAEDD',fontSize:10,fontWeight:'900',letterSpacing:1},
 title:{fontWeight:'900',fontSize:31,color:'#FFFFFF',marginTop:12},
 sub:{color:'#B2C2DC',fontSize:14,lineHeight:20},
 heading:{fontSize:18,fontWeight:'900',color:'#F5F7FF',marginBottom:4},
 muted:{fontSize:13,color:'#B4C4DF',lineHeight:19},
 dimSmall:{fontSize:11,color:'#8498B8',lineHeight:17},
 fieldLabel:{color:'#D6E4FC',fontSize:12,fontWeight:'800',marginTop:8},
 loginCard:{borderRadius:23,backgroundColor:'#172543',padding:18,borderWidth:1,borderColor:'#536A98',gap:12,marginTop:14},
 input:{padding:13,color:'#FFFFFF',backgroundColor:'#071729',borderRadius:13,borderColor:'#7182BD',borderWidth:1,fontSize:15,minHeight:49},
 commandInput:{minHeight:105,textAlignVertical:'top'},
 btn:{paddingVertical:10,paddingHorizontal:15,borderRadius:13,borderWidth:1,borderColor:'#566997',backgroundColor:'#1F3151',alignItems:'center',justifyContent:'center',minHeight:40},
 primary:{backgroundColor:'#77E3FF',borderColor:'#99F0FF'},
 disabled:{opacity:0.4},btnText:{color:'#EDF4FF',fontWeight:'800',fontSize:12},
 session:{flexDirection:'row',gap:12,alignItems:'center',borderRadius:17,padding:12,backgroundColor:'#182846'},
 sessionText:{color:'#EDF7FF',fontWeight:'800',fontSize:13},
 tabs:{flexDirection:'row',gap:5,flexWrap:'wrap',borderBottomWidth:1,borderBottomColor:'#38507D',paddingBottom:7},
 tab:{paddingVertical:11,paddingHorizontal:11,flex:1,alignItems:'center',borderRadius:10},
 tabActive:{backgroundColor:'#263B66'},tabText:{fontSize:11,color:'#AFBED8',fontWeight:'800'},
 stats:{flexDirection:'row',flexWrap:'wrap',gap:8},
 stat:{backgroundColor:'#1C2C4E',borderWidth:1,borderColor:'#3D5280',borderRadius:16,minWidth:'46%',flexGrow:1,padding:16,gap:3},
 statNum:{color:'#FFFFFF',fontSize:27,fontWeight:'900'},statLabel:{color:'#AFC6E9',fontWeight:'700',fontSize:12},
 sectionTitle:{color:'#FFFFFF',fontSize:18,fontWeight:'900',marginTop:15,marginBottom:1},
 topic:{backgroundColor:'#152640',borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:'#314469'},
 topicName:{color:'#F3F5FF',fontWeight:'800',fontSize:13},
 topicCount:{color:'#75E8FF',fontWeight:'900',fontSize:16},
 unresolved:{color:'#F4B1B1',fontWeight:'700',fontSize:10},
 statusText:{color:'#7FE1C2',fontSize:11,fontWeight:'800'},
 box:{borderRadius:20,padding:15,backgroundColor:'#142541',borderWidth:1,borderColor:'#3B5682',gap:12},
 buttonRow:{flexDirection:'row',gap:8,flexWrap:'wrap',alignItems:'center'},
 preview:{padding:12,backgroundColor:'#263A61',borderRadius:12,gap:10,borderWidth:1,borderColor:'#5274AB'},
 colorDot:{width:49,height:43,borderRadius:13,borderWidth:2,borderColor:'transparent'},
 dotSelected:{borderWidth:4,borderColor:'#FFFFFF'},
 orderRow:{flexDirection:'row',gap:7,alignItems:'center',borderBottomWidth:1,borderBottomColor:'#34496D',paddingBottom:8},
 ideaRow:{flexDirection:'row',justifyContent:'space-between',gap:8},
 smallChip:{padding:7,backgroundColor:'#253858',borderRadius:10},
 chipActive:{backgroundColor:'#586CB3'},chipText:{color:'#ECF4FF',fontSize:10,fontWeight:'800'},
 warning:{padding:12,backgroundColor:'#5E2E3F',borderRadius:12},
 warningText:{color:'#FFE3E3',fontSize:12},
 success:{padding:12,backgroundColor:'#174D51',borderRadius:12},
 successText:{color:'#D7FFF9',fontSize:12},
 footNote:{color:'#8DA4C5',fontSize:11,lineHeight:17,marginTop:10},
});
