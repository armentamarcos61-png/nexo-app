import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Action, NexoScreen } from '@/components/nexo-screen';
import {
  closeEmploymentPost, listEmploymentPosts, listMyEmploymentInterests,
  listMyEmploymentPosts, respondEmploymentInterest,
  type EmploymentInterest, type EmploymentPost,
} from '@/lib/nexo-employment-api';
import { useAuth } from '@/state/auth';

export default function MisSolicitudesScreen() {
  const { user } = useAuth();
  const [posts,setPosts] = useState<EmploymentPost[]>([]);
  const [interests,setInterests] = useState<EmploymentInterest[]>([]);
  const [titles,setTitles] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [reply,setReply] = useState<Record<string,string>>({});
  const [writing,setWriting] = useState('');
  const refresh=useCallback(async () => {
    if (!user) return;
    setBusy(true);setError('');
    try {
      const [myPosts, messages, publicPosts] = await Promise.all([
        listMyEmploymentPosts(), listMyEmploymentInterests(), listEmploymentPosts(),
      ]);
      setPosts(myPosts);
      setInterests(messages);
      setTitles(Object.fromEntries([...myPosts,...publicPosts].map(p=>[p.id,p.title])));
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'No se pudo consultar Nexo Central.');
    }finally{setBusy(false);}
  },[user]);
  useEffect(()=>{void refresh();},[refresh]);

  async function answer(item: EmploymentInterest) {
    if (writing) return;
    setWriting(item.id);setError('');setNotice('');
    try {
      await respondEmploymentInterest(item.id,reply[item.id]||'');
      setNotice('Respuesta enviada. La otra persona puede verla en Mis solicitudes.');
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo enviar.');}
    finally{setWriting('');}
  }
  async function finish(post:EmploymentPost) {
    setWriting(post.id);setError('');setNotice('');
    try {
      await closeEmploymentPost(post.id);
      setNotice('Publicación cerrada. Ya no aparecerá en nuevas búsquedas.');
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cerrar.');}
    finally{setWriting('');}
  }
  const ownIds=new Set(posts.map(p=>p.id));
  const received=interests.filter(i=>ownIds.has(i.post_id));
  const sent=interests.filter(i=>!ownIds.has(i.post_id));
  return (
    <NexoScreen title="Mis solicitudes">
      <View style={styles.intro}>
        <Text style={styles.heading}>Empleos e intereses</Text>
        <Text style={styles.sub}>Consulta tus solicitudes publicadas, vacantes, personas interesadas y respuestas. Los mensajes solo son visibles para ambas partes.</Text>
      </View>
      <Action label="Volver a Buscar en Nexo" secondary onPress={()=>router.push('/explorar')}/>
      {user ? (
        <>
          <Action label={busy?'Actualizando…':'Actualizar mis solicitudes'} disabled={busy} onPress={()=>void refresh()}/>
          {!!notice&&<Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
          {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Text style={styles.section}>Mis publicaciones · {posts.length}</Text>
          {!busy&&!posts.length&&<Text style={styles.sub}>Aún no tienes solicitudes publicadas en Nexo Central.</Text>}
          {posts.map(p=>(
            <View key={p.id} style={styles.card}>
              <Text style={styles.tag}>{p.kind==='seeking_job'?'BUSCO EMPLEO':'OFREZCO VACANTE'} · {p.status==='active'?'PUBLICADA':'CERRADA'}</Text>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.meta}>{p.category}{p.location?' · '+p.location:''}</Text>
              <Text style={styles.sub}>{p.description}</Text>
              {p.status==='active'&&(
                <Pressable disabled={!!writing} onPress={()=>void finish(p)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>{writing===p.id?'Guardando…':'Cerrar esta publicación'}</Text>
                </Pressable>
              )}
            </View>
          ))}
          <Text style={styles.section}>Personas interesadas · {received.length}</Text>
          {!busy&&!received.length&&<Text style={styles.sub}>Cuando alguien toque «Me interesa», aparecerá aquí su mensaje.</Text>}
          {received.map(i=>(
            <View key={i.id} style={styles.card}>
              <Text style={styles.tag}>INTERÉS RECIBIDO · {titles[i.post_id]||'Tu propuesta'}</Text>
              <Text style={styles.title}>{i.sender_name}</Text>
              <Text style={styles.sub}>{i.message}</Text>
              {!!i.response&&<Text style={styles.success}>Tu respuesta: {i.response}</Text>}
              <TextInput
                value={reply[i.id]??''}
                onChangeText={value=>setReply(existing=>({...existing,[i.id]:value}))}
                maxLength={1200}
                multiline
                placeholder="Responde a la persona interesada…"
                placeholderTextColor="#738BA9"
                accessibilityLabel="Respuesta a persona interesada"
                style={styles.input}
              />
              <Pressable disabled={!!writing || (reply[i.id]||'').trim().length<10}
                onPress={()=>void answer(i)} style={[styles.button,(writing || (reply[i.id]||'').trim().length<10)&&styles.disabled]}>
                <Text style={styles.buttonText}>{writing===i.id?'Enviando…':'Enviar respuesta'}</Text>
              </Pressable>
            </View>
          ))}
          <Text style={styles.section}>Mis intereses enviados · {sent.length}</Text>
          {!busy&&!sent.length&&<Text style={styles.sub}>Aquí se guardarán tus mensajes al mostrar interés en una propuesta.</Text>}
          {sent.map(i=>(
            <View key={i.id} style={styles.card}>
              <Text style={styles.tag}>INTERÉS ENVIADO · {titles[i.post_id]||'Propuesta de Nexo'}</Text>
              <Text style={styles.sub}>Tu mensaje: {i.message}</Text>
              {!!i.response?<Text style={styles.success}>Respuesta recibida: {i.response}</Text>:
                <Text style={styles.meta}>Esperando respuesta dentro de Nexo</Text>}
            </View>
          ))}
        </>
      ): <View style={styles.card}><Text style={styles.sub}>Inicia sesión con tu cuenta Nexo para consultar tus solicitudes y mensajes.</Text>
      <Action label="Iniciar sesión" onPress={()=>router.push('/iniciar-sesion')}/></View>}
    </NexoScreen>
  );
}
const styles=StyleSheet.create({
  intro:{gap:7,paddingVertical:6},
  heading:{color:'#F6F9FF',fontSize:23,fontWeight:'900'},
  sub:{color:'#D1DEEF',fontSize:13,lineHeight:20},
  meta:{color:'#AFC4E0',fontSize:12,lineHeight:19},
  section:{color:'#F7FBFF',fontSize:19,fontWeight:'900',marginTop:15},
  card:{padding:16,gap:9,borderRadius:18,borderWidth:1,borderColor:'#526C91',backgroundColor:'#132541'},
  tag:{color:'#89E6FA',fontSize:10,fontWeight:'900',letterSpacing:0.6},
  title:{color:'#FFFFFF',fontSize:17,fontWeight:'900'},
  success:{color:'#87F2CA',fontSize:13,lineHeight:20},
  error:{color:'#FFB9C8',fontSize:12,lineHeight:20},
  input:{padding:13,borderRadius:12,minHeight:90,textAlignVertical:'top',
    backgroundColor:'#EAF3FF',fontSize:14,color:'#0B203C'},
  button:{backgroundColor:'#69E0F5',padding:13,borderRadius:12,alignItems:'center'},
  disabled:{opacity:0.5},
  buttonText:{color:'#071D33',fontWeight:'900'},
  secondaryButton:{padding:12,borderRadius:12,borderColor:'#7593B5',borderWidth:1,alignItems:'center'},
  secondaryText:{color:'#DFEFFF',fontSize:12,fontWeight:'800'},
});
