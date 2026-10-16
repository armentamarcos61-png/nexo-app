import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
};

export function ProfilePhotoPicker({ value,onChange }: Props) {
  async function choosePhoto(){
    if(Platform.OS!=='web'||typeof document==='undefined')return;
    const input=document.createElement('input');
    input.type='file';input.accept='image/png,image/jpeg,image/webp,image/heic';
    input.onchange=()=>{
      const file=input.files?.[0];
      if(!file||!file.type.startsWith('image/')||file.size>12*1024*1024)return;
      const url=URL.createObjectURL(file);
      const image=document.createElement('img');
      image.onload=()=>{
        try{
          const size=260;
          const canvas=document.createElement('canvas');
          canvas.width=size;canvas.height=size;
          const ctx=canvas.getContext('2d');
          if(!ctx)return;
          const side=Math.min(image.naturalWidth,image.naturalHeight);
          const sx=(image.naturalWidth-side)/2;
          const sy=(image.naturalHeight-side)/2;
          ctx.drawImage(image,sx,sy,side,side,0,0,size,size);
          const result=canvas.toDataURL('image/jpeg',0.70);
          if(result.length<135000)onChange(result);
        }finally{URL.revokeObjectURL(url);}
      };
      image.onerror=()=>URL.revokeObjectURL(url);
      image.src=url;
    };
    input.click();
  }
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.88)' : 'rgba(15,30,53,0.82)',
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cambiar fotografía de perfil"
        disabled={Platform.OS!=='web'}
        onPress={()=>void choosePhoto()}
        style={[
          styles.avatar,
          {
            backgroundColor: mode === 'claro' ? '#E9F1FB' : '#162844',
            borderColor: value ? '#72E9FF' : palette.cardBorder,
          },
        ]}
      >
        {value ? (
          <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.placeholder}>👤</Text>
        )}
      </Pressable>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.title }]}>Foto de perfil</Text>
        <Text style={[styles.text, { color: palette.text }]}>
          {Platform.OS==='web'
            ?'Toca la foto para elegir una imagen. Se recorta en cuadrado y se guarda en tu dispositivo.'
            :'La selección de fotos está disponible en la versión web. La aplicación nativa está pendiente.'}
        </Text>
        {Platform.OS==='web'&&(
          <View style={{flexDirection:'row',gap:10,marginTop:6}}>
            <Pressable onPress={()=>void choosePhoto()} style={{padding:8,borderRadius:9,
              borderWidth:1,borderColor:palette.cardBorder}}>
              <Text style={{color:palette.title,fontSize:12,fontWeight:'800'}}>
                {value?'Cambiar foto':'Subir fotografía'}
              </Text>
            </Pressable>
            {!!value&&<Pressable onPress={()=>onChange('')}
              style={{padding:8,borderRadius:9,borderWidth:1,borderColor:palette.cardBorder}}>
              <Text style={{color:palette.title,fontSize:12,fontWeight:'700'}}>Quitar</Text>
            </Pressable>}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 36,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
  },
});
