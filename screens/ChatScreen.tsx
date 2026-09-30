import React,{useEffect,useState} from 'react';
import {Alert,FlatList,Keyboard,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,Text,TextInput,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {addDoc,collection,deleteDoc,doc,limit,onSnapshot,orderBy,query} from 'firebase/firestore';
import {db,firebaseEnabled} from '../lib/firebase';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {localDay} from '../lib/types';
import {Card,common,Empty,ScreenTop} from '../components/UI';

const EMOJIS=['🏏','🏆','🎯','🔥','👏','💪','😂','🤣','😄','😍','😎','🤩','🥳','🎉','🙌','👍','👌','✌️','🤝','🙏','❤️','💯','⚡','✅','😅','😜','🤔','😬','😱','😭','😡','🙈','😴','🥲','💥','🌅','☀️','☕','🍵','🏃‍♂️','🥇','🎊','🧤','⚾','🚀','👀','🤞','👋','😇','🤗'];
const emojiOnly=(t:string)=>t.length<=12&&/^[\s\u200d\ufe0f\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\u2190-\u21FF\u2300-\u23FF]+$/u.test(t);
type Msg={id:string;userId:string;name:string;text:string;createdAt:number};
const stamp=(t:number)=>{const d=new Date(t),time=d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'});const day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return day===localDay()?time:`${d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}, ${time}`};

export default function ChatScreen(){
 const {user,adminAuthorized,data,showAuth}=useApp();
 const [msgs,setMsgs]=useState<Msg[]>([]),[text,setText]=useState(''),[sending,setSending]=useState(false),[emojiOpen,setEmojiOpen]=useState(false),[err,setErr]=useState('');
 const canPost=!!user&&user.approvalStatus!=='pending';
 const admins=new Set(data.adminSlots.map(s=>s.uid));

 useEffect(()=>{
  if(!firebaseEnabled||!db||!user)return;
  // newest 100 messages, live
  return onSnapshot(query(collection(db,'chat_messages'),orderBy('createdAt','desc'),limit(100)),
   snap=>{setErr('');setMsgs(snap.docs.map(d=>({...(d.data() as any),id:d.id})))},
   e=>setErr(e.message));
 },[user?.id]);

 const send=async()=>{
  const t=text.trim();if(!t||!db||!user||sending)return;
  setSending(true);
  try{await addDoc(collection(db,'chat_messages'),{userId:user.id,name:user.name,text:t.slice(0,500),createdAt:Date.now()});setText('')}
  catch(e:any){Alert.alert('Message not sent',e.message)}
  finally{setSending(false)}
 };
 const remove=(m:Msg)=>{
  if(!db||!(m.userId===user?.id||adminAuthorized))return;
  Alert.alert('Delete message?',m.text.slice(0,80),[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>deleteDoc(doc(db!,'chat_messages',m.id)).catch((e:any)=>Alert.alert('Could not delete',e.message))}]);
 };

 if(!user)return <SafeAreaView style={common.screen}><ScreenTop eyebrow='TEAM CHAT' title='Chat.'/><View style={{marginHorizontal:20}}><Card><Empty icon='chatbubbles-outline' title='Join the team to chat' subtitle='Create your player profile to talk with everyone.'/><Pressable onPress={showAuth} style={{alignSelf:'center',marginTop:8}}><Text style={{color:C.green,fontWeight:'800'}}>Create profile</Text></Pressable></Card></View></SafeAreaView>;
 if(!firebaseEnabled)return <SafeAreaView style={common.screen}><ScreenTop eyebrow='TEAM CHAT' title='Chat.'/><View style={{marginHorizontal:20}}><Card><Empty icon='cloud-offline-outline' title='Chat needs the online version' subtitle='Firebase is not connected in this build.'/></Card></View></SafeAreaView>;

 return <SafeAreaView style={common.screen}>
  <KeyboardAvoidingView style={{flex:1}} behavior='padding'>
   <ScreenTop eyebrow='TEAM CHAT' title='Chat.' subtitle='Everyone in the team can read and write here.'/>
   {!!err&&<Text style={{color:C.red,marginHorizontal:20,marginBottom:8,fontSize:12}}>{err}</Text>}
   <FlatList inverted data={msgs} keyExtractor={m=>m.id} contentContainerStyle={{paddingHorizontal:16,paddingVertical:8}}
    ListEmptyComponent={<View style={{transform:[{scaleY:-1}],paddingTop:40}}><Empty icon='chatbubble-ellipses-outline' title='No messages yet' subtitle='Say hello to the team!'/></View>}
    renderItem={({item:m})=>{const mine=m.userId===user.id;return <Pressable onLongPress={()=>remove(m)} style={{alignSelf:mine?'flex-end':'flex-start',maxWidth:'82%',marginBottom:8}}>
     <View style={{backgroundColor:mine?C.green:'white',borderRadius:16,borderBottomRightRadius:mine?4:16,borderBottomLeftRadius:mine?16:4,paddingHorizontal:13,paddingVertical:9,borderWidth:mine?0:1,borderColor:C.line}}>
      {!mine&&<Text style={{color:C.green2,fontWeight:'800',fontSize:11,marginBottom:3}}>{m.name}{admins.has(m.userId)?'  · Admin':''}</Text>}
      <Text style={{color:mine?'white':C.ink,fontSize:emojiOnly(m.text)?34:14.5,lineHeight:emojiOnly(m.text)?44:20}}>{m.text}</Text>
      <Text style={{color:mine?'#BFD9C7':C.gray,fontSize:10,marginTop:4,alignSelf:'flex-end'}}>{stamp(m.createdAt)}</Text>
     </View></Pressable>}}/>
   {canPost&&emojiOpen&&<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',paddingVertical:8,paddingHorizontal:6,backgroundColor:'white',borderTopWidth:1,borderTopColor:C.line}}>
    {EMOJIS.map(e=><Pressable key={e} onPress={()=>setText(t=>(t+e).slice(0,500))} style={{width:'12.5%',alignItems:'center',paddingVertical:7}}><Text style={{fontSize:25}}>{e}</Text></Pressable>)}
   </View>}
   {canPost?<View style={{flexDirection:'row',alignItems:'flex-end',gap:8,padding:10,paddingBottom:12,backgroundColor:C.bg,borderTopWidth:1,borderTopColor:C.line}}>
    <Pressable onPress={()=>{Keyboard.dismiss();setEmojiOpen(o=>!o)}} style={{width:44,height:44,borderRadius:22,backgroundColor:emojiOpen?C.mint:'white',borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'}}><Ionicons name={emojiOpen?'happy':'happy-outline'} size={23} color={C.green}/></Pressable>
    <TextInput onFocus={()=>setEmojiOpen(false)} value={text} onChangeText={setText} placeholder='Type a message' placeholderTextColor='#9BAC9E' multiline maxLength={500} style={{flex:1,maxHeight:110,backgroundColor:'white',borderRadius:20,borderWidth:1,borderColor:C.line,paddingHorizontal:15,paddingVertical:10,fontSize:15,color:C.ink}}/>
    <Pressable onPress={send} disabled={!text.trim()||sending} style={{width:44,height:44,borderRadius:22,backgroundColor:C.green,alignItems:'center',justifyContent:'center',opacity:!text.trim()||sending?0.45:1}}><Ionicons name='send' size={19} color='white'/></Pressable>
   </View>:<Text style={{textAlign:'center',color:C.gray,fontSize:12,padding:14}}>You can chat once an admin approves your player application.</Text>}
  </KeyboardAvoidingView>
 </SafeAreaView>;
}
