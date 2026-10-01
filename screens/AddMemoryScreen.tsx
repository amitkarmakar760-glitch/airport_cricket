import React,{useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,ScrollView,Text,TextInput,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Image} from 'expo-image';
import {addDoc,collection} from 'firebase/firestore';
import {db} from '../lib/firebase';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {localDay} from '../lib/types';
import {pickMedia,Picked,uploadPicked} from '../lib/upload';
import {Button,Card,Label} from '../components/UI';

const box={borderRadius:14,backgroundColor:'#FBF6F0',borderWidth:1,borderColor:C.line,color:C.ink,fontSize:15,paddingHorizontal:14,paddingVertical:11} as const;

export default function AddMemoryScreen({navigation}:any){
 const {user,notify}=useApp();
 const today=localDay(),[y0,m0,d0]=today.split('-');
 const [picked,setPicked]=useState<Picked|null>(null),[title,setTitle]=useState(''),[desc,setDesc]=useState(''),[d,setD]=useState(d0),[m,setM]=useState(m0),[y,setY]=useState(y0),[busy,setBusy]=useState(false);

 const choose=async()=>{try{const p=await pickMedia();if(p)setPicked(p)}catch(e:any){Alert.alert('Could not use that file',e.message)}};
 const save=async()=>{
  if(!user||!db)return;
  const date=`${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  const real=new Date(date+'T12:00:00');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(real.getTime())||real.getDate()!==Number(d))return Alert.alert('Date','Enter a real date (day, month, year).');
  if(date>today)return Alert.alert('Date','A memory cannot be from the future.');
  if(!picked&&!desc.trim()&&!title.trim())return Alert.alert('Add something','Choose a photo or video, or write a few words.');
  setBusy(true);
  try{
   const url=picked?await uploadPicked(picked,'memories'):'';
   await addDoc(collection(db,'memories'),{userId:user.id,name:user.name,title:title.trim().slice(0,80),description:desc.trim().slice(0,1000),date,mediaUrl:url,mediaType:picked?picked.type:'none',createdAt:Date.now()});
   notify('📸 New memory',`${user.name} shared ${title.trim()||'a memory'}`,'memories');
   navigation.goBack();
  }catch(e:any){Alert.alert('Could not save',e.message)}finally{setBusy(false)}
 };

 return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><KeyboardAvoidingView style={{flex:1}} behavior='padding'><ScrollView contentContainerStyle={{padding:20,paddingBottom:60}} keyboardShouldPersistTaps='handled'>
  <Card style={{marginBottom:16}}>
   {picked?<View>
    {picked.type==='image'?<Image source={{uri:picked.uri}} contentFit='cover' style={{width:'100%',height:220,borderRadius:14}}/>:<View style={{height:140,borderRadius:14,backgroundColor:'#2B1204',alignItems:'center',justifyContent:'center'}}><Ionicons name='videocam' size={40} color='white'/><Text style={{color:'#F5DFC9',marginTop:6,fontWeight:'700'}}>Video ready</Text></View>}
    <Pressable onPress={()=>setPicked(null)} style={{alignSelf:'flex-end',marginTop:10}}><Text style={{color:C.red,fontWeight:'800',fontSize:12}}>Remove</Text></Pressable>
   </View>:<Pressable onPress={choose} style={{height:150,borderRadius:16,borderWidth:2,borderStyle:'dashed',borderColor:C.green2,alignItems:'center',justifyContent:'center',backgroundColor:C.mint}}><Ionicons name='images-outline' size={34} color={C.green}/><Text style={{color:C.green,fontWeight:'900',marginTop:8}}>Choose a photo or short video</Text><Text style={{color:C.gray,fontSize:11,marginTop:3}}>Video up to 25 MB</Text></Pressable>}
  </Card>
  <Label style={{marginBottom:6}}>TITLE (OPTIONAL)</Label>
  <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder='e.g. Our first tournament' placeholderTextColor='#B8A898' style={[box,{marginBottom:16}]}/>
  <Label style={{marginBottom:6}}>DESCRIPTION</Label>
  <TextInput value={desc} onChangeText={setDesc} maxLength={1000} multiline placeholder='Write the story behind this memory...' placeholderTextColor='#B8A898' style={[box,{minHeight:110,textAlignVertical:'top',marginBottom:16}]}/>
  <Label style={{marginBottom:6}}>DATE OF THIS MEMORY</Label>
  <View style={{flexDirection:'row',gap:10,marginBottom:6}}>
   {[['Day',d,setD,2],['Month',m,setM,2],['Year',y,setY,4]].map(([lab,val,set,max]:any)=><View key={lab} style={{flex:max===4?1.4:1}}><TextInput value={val} onChangeText={t=>set(t.replace(/\D/g,'').slice(0,max))} keyboardType='number-pad' maxLength={max} placeholder={lab} placeholderTextColor='#B8A898' style={[box,{textAlign:'center'}]}/><Text style={{textAlign:'center',color:C.gray,fontSize:10,marginTop:3}}>{lab}</Text></View>)}
  </View>
  <Pressable onPress={()=>{setD(d0);setM(m0);setY(y0)}} style={{alignSelf:'flex-start',marginBottom:20}}><Text style={{color:C.green,fontWeight:'800',fontSize:12}}>Use today’s date</Text></Pressable>
  <Button title={busy?'Uploading...':'Save memory'} icon='checkmark-circle-outline' disabled={busy} onPress={save}/>
 </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
