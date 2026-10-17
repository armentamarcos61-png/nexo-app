import {useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,Text,View} from 'react-native';

type InstallPromptEvent=Event&{
 prompt:()=>Promise<void>;
 userChoice:Promise<{outcome:'accepted'|'dismissed';platform?:string}>;
};

function alreadyInstalled():boolean{
 if(typeof window==='undefined')return false;
 return !!(window.matchMedia?.('(display-mode: standalone)').matches||
  (window.navigator as Navigator&{standalone?:boolean}).standalone);
}

/** Use Chrome's native install dialog when possible. Otherwise show exact
 * on-device steps; browsers do not always fire beforeinstallprompt.
 */
export function NexoInstallBanner({compact=false}:{compact?:boolean}){
 const deferred=useRef<InstallPromptEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 const [available,setAvailable]=useState(false);
 const [instructions,setInstructions]=useState(false);
 const [message,setMessage]=useState('');
 const [isIos,setIos]=useState(false);

 useEffect(()=>{
  if(Platform.OS!=='web'||typeof window==='undefined')return;
  setInstalled(alreadyInstalled());
  const ua=window.navigator.userAgent||'';
  setIos(/iPhone|iPad|iPod/i.test(ua));
  const show=(event:Event)=>{
   event.preventDefault();
   deferred.current=event as InstallPromptEvent;
   setAvailable(true);
  };
  const done=()=>{deferred.current=null;setAvailable(false);setInstalled(true);};
  window.addEventListener('beforeinstallprompt',show as EventListener);
  window.addEventListener('appinstalled',done);
  if('serviceWorker' in navigator&&window.isSecureContext){
   // Keep scope within /nexo-app/; never intercept the developer backend.
   void navigator.serviceWorker.register('/nexo-app/sw.js',{scope:'/nexo-app/'})
    .catch(()=>{/* A missing SW must never block Nexo login. */});
  }
  return ()=>{
   window.removeEventListener('beforeinstallprompt',show as EventListener);
   window.removeEventListener('appinstalled',done);
  };
 },[]);

 async function install(){
  const prompt=deferred.current;
  if(!prompt){
   setInstructions(v=>!v);
   return;
  }
  // prompt() must happen immediately from the user click.
  deferred.current=null;
  setAvailable(false);
  try{
   await prompt.prompt();
   const choice=await prompt.userChoice;
   if(choice.outcome==='accepted'){
    setMessage('Instalación solicitada. Busca Nexo en la pantalla principal.');
   }else{
    setMessage('Puedes instalar Nexo más tarde.');
    setInstructions(true);
   }
  }catch{
   setInstructions(true);
   setMessage('Usa la opción Instalar aplicación del menú de tu navegador.');
  }
 }
 if(Platform.OS!=='web'||installed)return null;
 return (
  <View style={[styles.card,compact&&styles.compact]}>
   <View style={styles.row}>
    <View style={styles.icon}>
     <Image source={require('../../assets/images/nexo-logo.png')}
      accessibilityLabel="Ícono oficial de Nexo"
      style={{width:34,height:34,borderRadius:8}} resizeMode="contain"/>
    </View>
    <View style={styles.copy}>
     <Text style={styles.title}>Nexo en tu pantalla principal</Text>
     <Text style={styles.description}>
      Abre Nexo como una aplicación, sin buscar el enlace cada vez.
     </Text>
    </View>
   </View>
   <Pressable
    accessibilityRole="button"
    accessibilityLabel="Instalar Nexo en la pantalla de inicio"
    onPress={()=>void install()}
    style={({pressed})=>[styles.action,pressed&&{opacity:.8}]}>
    <Text style={styles.actionLabel}>
     {available?'↓ Instalar Nexo':'＋ Agregar Nexo a mi pantalla'}
    </Text>
   </Pressable>
   {!!message&&<Text style={styles.note}>{message}</Text>}
   {instructions&&(
    <View style={styles.instructions}>
     <Text style={styles.helpTitle}>Instalación manual</Text>
     <Text style={styles.help}>
      {isIos
       ?'Abre esta página en Safari, toca Compartir y selecciona «Agregar a pantalla de inicio».'
       :'En Chrome de Android, toca ⋮ (arriba a la derecha), elige «Instalar aplicación» o «Agregar a pantalla principal» y confirma.'}
     </Text>
     <Text style={styles.help}>
      Después encontrarás el ícono de Nexo junto a tus otras aplicaciones.
     </Text>
    </View>
   )}
  </View>
 );
}
const styles=StyleSheet.create({
 card:{gap:10,padding:14,borderRadius:17,borderWidth:1,
  borderColor:'rgba(118,211,242,.51)',
  backgroundColor:'rgba(14,35,60,.90)',marginVertical:8},
 compact:{marginHorizontal:18,padding:11},
 row:{flexDirection:'row',alignItems:'center',gap:12},
 icon:{width:40,height:40,borderRadius:10,borderWidth:1,
  borderColor:'#597E9C',backgroundColor:'#0B0E13',
  justifyContent:'center',alignItems:'center'},
 iconText:{fontSize:23,fontWeight:'900',color:'#D6EAF6'},
 copy:{flex:1,gap:3},
 title:{fontSize:13,fontWeight:'900',color:'#F5FAFF'},
 description:{fontSize:11,lineHeight:16,color:'#C8DAEB'},
 action:{paddingVertical:12,paddingHorizontal:13,minHeight:44,
  justifyContent:'center',alignItems:'center',borderRadius:12,
  backgroundColor:'#84E6F1'},
 actionLabel:{fontSize:12,fontWeight:'900',color:'#082438'},
 note:{fontSize:11,lineHeight:17,color:'#9AE7BC'},
 instructions:{paddingTop:8,borderTopWidth:1,borderTopColor:'rgba(119,185,223,.32)',gap:5},
 helpTitle:{color:'#F5FAFF',fontSize:12,fontWeight:'900'},
 help:{color:'#C8DAEB',fontSize:11,lineHeight:17},
});
