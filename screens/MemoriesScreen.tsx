import React,{useEffect,useState} from 'react';
import {Alert,FlatList,Pressable,SafeAreaView,Text,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Image} from 'expo-image';
import {useVideoPlayer,VideoView} from 'expo-video';
import {collection,deleteDoc,doc,limit,onSnapshot,orderBy,query} from 'firebase/firestore';
import {db,firebaseEnabled} from '../lib/firebase';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {Memory,prettyDate} from '../lib/types';
import {Button,Card,common,Empty,ScreenTop} from '../components/UI';

function Player({uri}:{uri:string}){
 const player=useVideoPlayer(uri,p=>{p.loop=false;p.play()});
 return <VideoView player={player} nativeControls contentFit='contain' style={{width:'100%',height:260,backgroundColor:'#2B1204'}}/>;
}
// The video player is only created after a tap, so a long list of memories stays light.
function Media({m}:{m:Memory}){
 const [play,setPlay]=useState(false);
 if(m.mediaType==='image')return <Image source={{uri:m.mediaUrl}} contentFit='cover' style={{width:'100%',height:260,backgroundColor:C.mint}} transition={150}/>;
 if(m.mediaType==='video')return play?<Player uri={m.mediaUrl}/>:<Pressable onPress={()=>setPlay(true)} style={{width:'100%',height:200,backgroundColor:'#2B1204',alignItems:'center',justifyContent:'center'}}><Ionicons name='play-circle' size={64} color='white'/><Text style={{color:'#F5DFC9',fontSize:12,marginTop:6,fontWeight:'700'}}>Tap to play video</Text></Pressable>;
 return null;
}

export default function MemoriesScreen({navigation}:any){
 const {user,adminAuthorized}=useApp();
 const [items,setItems]=useState<Memory[]>([]),[err,setErr]=useState(''),[count,setCount]=useState(40);
 const canAdd=!!user&&user.approvalStatus!=='pending';

 useEffect(()=>{
  if(!firebaseEnabled||!db||!user)return;
  return onSnapshot(query(collection(db,'memories'),orderBy('date','desc'),limit(count)),
   snap=>{setErr('');setItems(snap.docs.map(d=>({...(d.data() as any),id:d.id})))},e=>setErr(e.message));
 },[user?.id,count]);

 const remove=(m:Memory)=>Alert.alert('Delete this memory?',m.title||m.description.slice(0,60),[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>deleteDoc(doc(db!,'memories',m.id)).catch((e:any)=>Alert.alert('Could not delete',e.message))}]);

 const header=<>
  <ScreenTop eyebrow='OUR STORY' title='Memories.' subtitle='Photos, short videos and stories from our mornings together.'/>
  {canAdd&&<View style={{marginHorizontal:20,marginBottom:16}}><Button title='Add a memory' icon='add-circle-outline' onPress={()=>navigation.navigate('AddMemory')}/></View>}
  {!!err&&<Text style={{color:C.red,marginHorizontal:20,marginBottom:10,fontSize:12}}>{err}</Text>}
 </>;

 if(!user)return <SafeAreaView style={common.screen}><ScreenTop eyebrow='OUR STORY' title='Memories.'/><View style={{marginHorizontal:20}}><Card><Empty icon='images-outline' title='Join the team to see memories' subtitle='Create your player profile first.'/></Card></View></SafeAreaView>;
 if(!firebaseEnabled)return <SafeAreaView style={common.screen}><ScreenTop eyebrow='OUR STORY' title='Memories.'/><View style={{marginHorizontal:20}}><Card><Empty icon='cloud-offline-outline' title='Memories need the online version' subtitle='Firebase is not connected in this build.'/></Card></View></SafeAreaView>;

 return <SafeAreaView style={common.screen}>
  <FlatList data={items} keyExtractor={m=>m.id} ListHeaderComponent={header} contentContainerStyle={{paddingBottom:110}}
   ListEmptyComponent={<View style={{marginHorizontal:20}}><Card><Empty icon='images-outline' title='No memories yet' subtitle='Add the first photo or story from our cricket mornings.'/></Card></View>}
   ListFooterComponent={items.length>=count?<View style={{marginHorizontal:20,marginTop:4}}><Button variant='light' small title='Show older memories' onPress={()=>setCount(c=>c+40)}/></View>:null}
   renderItem={({item:m})=><View style={{marginHorizontal:20,marginBottom:16,backgroundColor:'white',borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:C.line}}>
    <Media m={m}/>
    <View style={{padding:15}}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <Text style={{color:C.green,fontWeight:'800',fontSize:12}}>{prettyDate(m.date)}</Text>
      {(m.userId===user.id||adminAuthorized)&&<Pressable hitSlop={10} onPress={()=>remove(m)}><Ionicons name='trash-outline' size={18} color={C.red}/></Pressable>}
     </View>
     {!!m.title&&<Text style={{color:C.ink,fontWeight:'900',fontSize:17,marginTop:6}}>{m.title}</Text>}
     {!!m.description&&<Text style={{color:C.ink,fontSize:14,lineHeight:21,marginTop:5}}>{m.description}</Text>}
     <Text style={{color:C.gray,fontSize:11,marginTop:9}}>Shared by {m.name}</Text>
    </View>
   </View>}/>
 </SafeAreaView>;
}
