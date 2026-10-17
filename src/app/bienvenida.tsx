import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Image, Pressable, ScrollView,
  StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { completeNexoOnboarding, nexoOnboardingSlides } from '@/lib/nexo-onboarding';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NexoInstallBanner } from '@/components/nexo-install-banner';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';

const palette=[
 ['#0A315A','#291F66','#742C8B','#0A6275'],
 ['#0B3468','#243F88','#6C32A4','#125D7C'],
 ['#113F70','#1A5385','#643FAB','#0F6F81'],
 ['#244078','#65318A','#A34A85','#126E85'],
 ['#18295F','#383581','#713C9B','#176E89'],
 ['#0A3558','#3A3385','#773D89','#138981'],
] as const;

const introCards=[
 {icon:'💼',label:'Busco empleo',detail:'Encuentra oportunidades'},
 {icon:'👥',label:'Busco trabajadores',detail:'Conecta con talento'},
 {icon:'🤝',label:'Contratar servicio',detail:'Encuentra especialistas'},
 {icon:'🛠️',label:'Ofrezco servicio',detail:'Muestra lo que sabes'},
 {icon:'🛍️',label:'Comprar productos',detail:'Explora el Marketplace'},
 {icon:'📦',label:'Vendo productos',detail:'Publica lo que ofreces'},
];
const sampleCards=[
 {icon:'🪚',label:'Carpintería',detail:'Proyectos y muebles'},
 {icon:'🧁',label:'Repostería',detail:'Pasteles y postres'},
 {icon:'🔧',label:'Refacciones',detail:'Piezas y accesorios'},
 {icon:'⚡',label:'Electricidad',detail:'Servicios especializados'},
];

type PreviewCardProps={icon:string;title:string;detail?:string;accent?:string};
function PreviewCard({icon,title,detail,accent='#70E7F9'}:PreviewCardProps){
 return (
  <View style={styles.previewCard}>
   <View style={[styles.iconWrap,{borderColor:accent+'66'}]}>
    <Text style={styles.previewIcon}>{icon}</Text>
   </View>
   <View style={styles.previewCopy}>
    <Text style={styles.previewTitle}>{title}</Text>
    {detail?<Text style={styles.previewDetail}>{detail}</Text>:null}
   </View>
   <Text style={[styles.arrow,{color:accent}]}>›</Text>
  </View>
 );
}
function Visual({page}:{page:number}){
 switch(page){
  case 0:
   return (
    <View style={styles.heroVisual}>
     <View style={styles.heroHalo}/>
     <View style={styles.heroLogoFrame}>
      <Image source={require('../../assets/images/nexo-logo.png')}
       style={styles.heroLogo} resizeMode="contain"
       accessibilityLabel="Logo original de Nexo"/>
     </View>
     <View style={styles.orbitChipA}><Text style={styles.chipText}>💼 Empleo</Text></View>
     <View style={styles.orbitChipB}><Text style={styles.chipText}>🤝 Servicios</Text></View>
     <View style={styles.orbitChipC}><Text style={styles.chipText}>🛍️ Productos</Text></View>
     <Text style={styles.heroCaption}>CONECTANDO PERSONAS Y OPORTUNIDADES</Text>
    </View>
   );
  case 1:
   return (
    <View style={styles.visualCard}>
     <Text style={styles.visualLabel}>ELIGE TU CAMINO</Text>
     <View style={styles.optionGrid}>
      {introCards.map(item=>(
       <View key={item.label} style={styles.optionCard}>
        <Text style={styles.optionIcon}>{item.icon}</Text>
        <Text style={styles.optionTitle}>{item.label}</Text>
       </View>
      ))}
     </View>
    </View>
   );
  case 2:
   return (
    <View style={styles.visualCard}>
     <Text style={styles.visualLabel}>EXPLORAR EN NEXO</Text>
     <View style={styles.searchPreview}>
      <Text style={styles.searchPreviewIcon}>⌕</Text>
      <Text style={styles.searchPreviewText}>Buscar una oportunidad...</Text>
     </View>
     <View style={styles.tagRow}>
      <Text style={styles.tag}>Empleo</Text>
      <Text style={styles.tag}>Trabajadores</Text>
      <Text style={styles.tag}>Servicios</Text>
     </View>
     <PreviewCard icon="🪚" title="Carpintería" detail="Oficio · proyectos"/>
     <PreviewCard icon="⚡" title="Electricidad" detail="Servicio · especialistas" accent="#BBA6FF"/>
     <PreviewCard icon="🎨" title="Diseño" detail="Trabajo · experiencia" accent="#FFB3C4"/>
    </View>
   );
  case 3:
   return (
    <View style={styles.visualCard}>
     <Text style={styles.visualLabel}>PUBLICACIONES CON PERSONALIDAD</Text>
     <View style={styles.productsGrid}>
      {sampleCards.map(card=>(
       <View key={card.label} style={styles.productCard}>
        <View style={styles.productArt}>
         <Text style={styles.productEmoji}>{card.icon}</Text>
        </View>
        <Text style={styles.productTitle}>{card.label}</Text>
        <Text style={styles.productDetail}>{card.detail}</Text>
      </View>
      ))}
     </View>
     <View style={styles.miniAction}>
      <Text style={styles.miniActionText}>＋ Publicar producto o servicio</Text>
     </View>
    </View>
   );
  case 4:
   return (
    <View style={styles.visualCard}>
     <Text style={styles.visualLabel}>DOS ASISTENTES · UNA MISMA MISIÓN</Text>
     <View style={styles.assistantsRow}>
      <View style={styles.assistantBox}>
       <Image source={{uri:NEXA_IMAGE_DATA}} style={styles.assistantPortrait}
        resizeMode="cover" accessibilityLabel="Retrato de Nexa"/>
       <Text style={styles.assistantName}>Nexa</Text>
       <Text style={styles.assistantSub}>Te orienta por Nexo</Text>
      </View>
      <View style={styles.assistantBox}>
       <Image source={{uri:NEXO_IMAGE_DATA}} style={styles.assistantPortrait}
        resizeMode="cover" accessibilityLabel="Retrato de Nexo"/>
       <Text style={styles.assistantName}>Nexo</Text>
       <Text style={styles.assistantSub}>Resuelve tus dudas</Text>
      </View>
     </View>
     <View style={styles.assistantSpeech}>
      <Text style={styles.speechText}>“¿Cómo publico mis servicios?”</Text>
      <Text style={styles.speechSub}>Tu asistente te explica la ruta dentro de la app.</Text>
     </View>
    </View>
   );
  default:
   return (
    <View style={styles.finishVisual}>
     <View style={styles.finishLogoCircle}>
      <Image source={require('../../assets/images/nexo-logo.png')}
       resizeMode="contain" style={styles.finishLogo}/>
     </View>
     <View style={styles.finishList}>
      <PreviewCard icon="💼" title="Encuentra oportunidades"/>
      <PreviewCard icon="🛍️" title="Comparte tus productos"/>
      <PreviewCard icon="✦" title="Habla con Nexo o Nexa"/>
     </View>
    </View>
   );
 }
}

export default function BienvenidaScreen(){
 const {width:windowWidth}=useWindowDimensions();
 const pageWidth=Math.max(280,windowWidth);
 const [index,setIndex]=useState(0);
 const pager=useRef<ScrollView>(null);
 const entrance=useRef(new Animated.Value(0)).current;
 const float=useRef(new Animated.Value(0)).current;
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{
  let mounted=true;
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{
   if(mounted)setReducedMotion(value);
  }).catch(()=>{});
  return ()=>{mounted=false;};
 },[]);
 useEffect(()=>{
  entrance.stopAnimation();
  entrance.setValue(0);
  Animated.timing(entrance,{toValue:1,duration:reducedMotion?0:460,
   useNativeDriver:true}).start();
 },[index,entrance,reducedMotion]);
 useEffect(()=>{
  if(reducedMotion){float.setValue(0);return;}
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(float,{toValue:1,duration:2100,useNativeDriver:true}),
   Animated.timing(float,{toValue:0,duration:2100,useNativeDriver:true}),
  ]));
  loop.start();
  return ()=>loop.stop();
 },[float,reducedMotion]);
 const finish=(destination:'/'|'/registrarse'|'/iniciar-sesion')=>{
  completeNexoOnboarding();
  router.replace(destination);
 };
 const move=(target:number)=>{
  const next=Math.max(0,Math.min(nexoOnboardingSlides.length-1,target));
  pager.current?.scrollTo({x:next*pageWidth,animated:!reducedMotion});
  setIndex(next);
 };
 const last=index===nexoOnboardingSlides.length-1;
 return (
  <SafeAreaView style={styles.safe}>
   <LinearGradient colors={palette[index]}
    start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
   <View pointerEvents="none" style={styles.backGlow}/>
   <View style={styles.header}>
    <View style={styles.brandRow}>
     <Image source={require('../../assets/images/nexo-logo.png')} style={styles.brandLogo}
      resizeMode="contain"/>
     <Text style={styles.brandTitle}>NEXO</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Omitir presentación"
     onPress={()=>finish('/')} style={styles.skip}>
     <Text style={styles.skipText}>Omitir</Text>
    </Pressable>
   </View>
   <NexoInstallBanner compact/>
   <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
    bounces={false} scrollEventThrottle={16}
    accessibilityLabel="Presentación deslizable de Nexo"
    onMomentumScrollEnd={e=>{
      setIndex(Math.max(0,Math.min(nexoOnboardingSlides.length-1,
       Math.round(e.nativeEvent.contentOffset.x/pageWidth))));
    }}
    style={styles.pager} contentContainerStyle={styles.pagerContent}>
    {nexoOnboardingSlides.map((slide,i)=>(
     <View key={slide.key} style={[styles.slide,{width:pageWidth}]}>
      <Animated.View style={[styles.slideInner,{
       opacity:i===index?entrance:1,
       transform:[{translateY:i===index?entrance.interpolate({
        inputRange:[0,1],outputRange:[16,0]}):0}],
      }]}>
       <View style={styles.visualArea}>
        <Animated.View style={{
         transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[0,-7]})},
          {scale:i===0?entrance.interpolate({inputRange:[0,1],outputRange:[.90,1]}):1}],
         opacity:i===0?entrance:1,
        }}>
         <Visual page={i}/>
        </Animated.View>
       </View>
       <View style={styles.copyArea}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
       </View>
      </Animated.View>
     </View>
    ))}
   </ScrollView>
   <View style={styles.footer}>
    <View accessibilityLabel={'Paso '+(index+1)+' de '+nexoOnboardingSlides.length}
     style={styles.dots}>
     {nexoOnboardingSlides.map((slide,i)=>(
      <Pressable key={slide.key} accessibilityRole="button"
       accessibilityLabel={'Ir a la diapositiva '+(i+1)}
       onPress={()=>move(i)} style={[styles.dot,i===index&&styles.dotActive]}/>
     ))}
    </View>
    {last?(
     <View style={styles.finishActions}>
      <Pressable accessibilityRole="button" style={styles.primary}
       onPress={()=>finish('/registrarse')}>
       <Text style={styles.primaryText}>Crear cuenta  →</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.secondary}
       onPress={()=>finish('/iniciar-sesion')}>
       <Text style={styles.secondaryText}>Ya tengo cuenta · Iniciar sesión</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.guest}
       onPress={()=>finish('/')}>
       <Text style={styles.guestText}>Explorar sin cuenta</Text>
      </Pressable>
     </View>
    ):(
     <View style={styles.navigation}>
      <Pressable accessibilityRole="button" disabled={index===0}
       onPress={()=>move(index-1)} style={styles.backButton}>
       <Text style={styles.backText}>{index===0?'':'← Anterior'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={()=>move(index+1)}
       style={styles.primary}>
       <Text style={styles.primaryText}>Siguiente  →</Text>
      </Pressable>
     </View>
    )}
   </View>
  </SafeAreaView>
 );
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#081B37'},
 backGlow:{position:'absolute',width:330,height:330,borderRadius:170,
  backgroundColor:'rgba(86,219,252,.10)',top:'14%',right:-180},
 header:{paddingHorizontal:23,paddingTop:8,paddingBottom:6,
  flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 brandRow:{flexDirection:'row',alignItems:'center',gap:9},
 brandLogo:{height:34,width:34,borderRadius:9},
 brandTitle:{color:'#F8FCFF',fontWeight:'900',fontSize:17,letterSpacing:3.2},
 skip:{padding:10,minHeight:42,justifyContent:'center'},
 skipText:{color:'#D4ECFF',fontWeight:'800',fontSize:12},
 pager:{flex:1},pagerContent:{alignItems:'stretch'},
 slide:{flex:1,paddingHorizontal:20,alignItems:'center'},
 slideInner:{flex:1,width:'100%',maxWidth:540,justifyContent:'space-around',
  paddingVertical:7},
 visualArea:{flexGrow:1,minHeight:220,justifyContent:'center',
  alignItems:'center',paddingBottom:8},
 copyArea:{alignItems:'center',paddingBottom:12,gap:8},
 eyebrow:{color:'#91E8FF',fontSize:10,fontWeight:'900',letterSpacing:2,
  textAlign:'center'},
 title:{color:'#FFF',fontSize:30,lineHeight:36,fontWeight:'900',textAlign:'center',
  letterSpacing:-.7},
 subtitle:{color:'#D7E5F7',fontSize:14,lineHeight:21,textAlign:'center',
  maxWidth:450},
 heroVisual:{height:285,width:300,alignItems:'center',justifyContent:'center'},
 heroHalo:{position:'absolute',width:245,height:245,borderRadius:135,
  borderWidth:2,borderColor:'rgba(142,230,255,0.18)',
  backgroundColor:'rgba(100,137,244,0.13)'},
 heroLogoFrame:{height:152,width:152,borderRadius:40,
  backgroundColor:'rgba(11,23,52,.78)',alignItems:'center',justifyContent:'center',
  borderWidth:2,borderColor:'rgba(175,235,255,.46)',elevation:10},
 heroLogo:{height:134,width:134},
 orbitChipA:{position:'absolute',top:9,right:0,...chipStyle()},
 orbitChipB:{position:'absolute',bottom:52,left:0,...chipStyle()},
 orbitChipC:{position:'absolute',bottom:30,right:0,...chipStyle()},
 chipText:{color:'#F5F9FF',fontWeight:'800',fontSize:11},
 heroCaption:{position:'absolute',bottom:0,color:'#8BEAFF',
  fontSize:9,fontWeight:'900',letterSpacing:1.1},
 visualCard:{width:'100%',borderWidth:1,borderRadius:26,
  borderColor:'rgba(146,212,249,0.40)',backgroundColor:'rgba(6,17,46,0.50)',
  padding:15,gap:11,overflow:'hidden'},
 visualLabel:{color:'#A5EBFF',fontWeight:'900',letterSpacing:1.5,fontSize:10},
 optionGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 optionCard:{width:'48%',flexGrow:1,paddingVertical:12,paddingHorizontal:8,
  borderRadius:15,backgroundColor:'rgba(58,86,145,.43)',
  borderWidth:1,borderColor:'rgba(143,182,244,.25)',alignItems:'center',gap:5},
 optionIcon:{fontSize:25},optionTitle:{color:'#F6FAFF',fontSize:11,fontWeight:'800',
  textAlign:'center'},
 searchPreview:{backgroundColor:'#E2F8FF',borderRadius:12,flexDirection:'row',
  alignItems:'center',paddingHorizontal:13,paddingVertical:11,gap:11},
 searchPreviewIcon:{fontSize:25,color:'#0076AA',fontWeight:'900'},
 searchPreviewText:{fontSize:12,color:'#102B44',fontWeight:'700'},
 tagRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
 tag:{color:'#E7FAFF',fontWeight:'800',fontSize:10,overflow:'hidden',
  backgroundColor:'#325A91',paddingVertical:7,paddingHorizontal:10,borderRadius:99},
 previewCard:{backgroundColor:'rgba(50,76,127,.57)',borderRadius:15,
  padding:9,flexDirection:'row',alignItems:'center',gap:10,
  borderWidth:1,borderColor:'rgba(160,200,249,.19)'},
 iconWrap:{height:42,width:42,borderRadius:12,alignItems:'center',
  justifyContent:'center',backgroundColor:'rgba(145,188,255,.10)',borderWidth:1},
 previewIcon:{fontSize:22},
 previewCopy:{flex:1,gap:2},
 previewTitle:{color:'#F7FBFF',fontWeight:'900',fontSize:13},
 previewDetail:{color:'#BED5E7',fontSize:10},
 arrow:{fontWeight:'900',fontSize:25},
 productsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 productCard:{width:'48%',flexGrow:1,padding:8,borderRadius:14,
  backgroundColor:'rgba(34,57,109,.72)',gap:3},
 productArt:{height:60,borderRadius:10,backgroundColor:'rgba(101,113,205,.38)',
  alignItems:'center',justifyContent:'center'},
 productEmoji:{fontSize:32},
 productTitle:{color:'#F8FBFF',fontSize:12,fontWeight:'900'},
 productDetail:{color:'#C7D7ED',fontSize:10},
 miniAction:{padding:11,borderRadius:11,backgroundColor:'#3DC8D3',
  alignItems:'center'},
 miniActionText:{fontWeight:'900',color:'#073352',fontSize:12},
 assistantsRow:{flexDirection:'row',gap:11},
 assistantBox:{backgroundColor:'rgba(70,76,139,.42)',flex:1,
  alignItems:'center',padding:15,borderRadius:18,gap:6,
  borderWidth:1,borderColor:'rgba(155,202,248,.24)'},
 assistantPortrait:{height:88,width:88,borderRadius:22,
  borderWidth:2,borderColor:'rgba(163,227,255,.62)',
  backgroundColor:'#132553'},
 assistantName:{fontSize:17,fontWeight:'900',color:'#FFF'},
 assistantSub:{color:'#C2D8EC',fontSize:10,textAlign:'center'},
 assistantSpeech:{borderRadius:16,backgroundColor:'rgba(20,38,85,.85)',
  padding:14,gap:6},
 speechText:{color:'#F7FCFF',fontWeight:'900',fontSize:14},
 speechSub:{color:'#BDDDF3',fontSize:11,lineHeight:17},
 finishVisual:{alignItems:'center',width:'100%',gap:10},
 finishLogoCircle:{height:105,width:105,borderRadius:26,
  backgroundColor:'rgba(15,35,70,.70)',alignItems:'center',justifyContent:'center',
  borderWidth:1,borderColor:'rgba(166,228,255,.6)'},
 finishLogo:{width:94,height:94},
 finishList:{alignSelf:'stretch',gap:7},
 footer:{paddingHorizontal:24,paddingBottom:13,gap:16},
 dots:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,
  minHeight:18},
 dot:{height:7,width:8,borderRadius:99,backgroundColor:'rgba(218,238,255,.33)'},
 dotActive:{width:28,backgroundColor:'#7AEAFF'},
 navigation:{flexDirection:'row',alignItems:'center',gap:12},
 backButton:{width:110,justifyContent:'center',minHeight:52},
 backText:{color:'#DBF2FF',fontSize:12,fontWeight:'800'},
 primary:{flex:1,minHeight:53,borderRadius:16,
  backgroundColor:'#69E7F4',justifyContent:'center',alignItems:'center',
  paddingHorizontal:15,borderWidth:1,borderColor:'#C3FAFF'},
 primaryText:{color:'#082846',fontSize:15,fontWeight:'900'},
 secondary:{minHeight:48,borderWidth:1,borderColor:'rgba(167,222,255,.50)',
  borderRadius:16,justifyContent:'center',alignItems:'center',
  backgroundColor:'rgba(27,58,103,.73)'},
 secondaryText:{color:'#F4FAFF',fontWeight:'900',fontSize:12},
 guest:{alignItems:'center',paddingVertical:5,minHeight:30},
 guestText:{fontSize:11,color:'#BEDFF1',fontWeight:'800'},
 finishActions:{gap:9},
});
function chipStyle(){
 return {backgroundColor:'rgba(20,47,94,.92)',borderRadius:99,
  borderWidth:1,borderColor:'rgba(164,230,255,.30)',
  paddingHorizontal:12,paddingVertical:9};
}
