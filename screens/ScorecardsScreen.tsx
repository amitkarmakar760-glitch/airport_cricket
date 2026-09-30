import React from 'react';
import {FlatList,Pressable,SafeAreaView,Text,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {prettyDate} from '../lib/types';
import {resultText,scoreLine} from '../lib/scoring';
import {Button,Card,common,Empty,ScreenTop} from '../components/UI';

export default function ScorecardsScreen({navigation}:any){
 const {adminAuthorized,data}=useApp();
 const list=[...data.matches].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
 const header=<>
  <ScreenTop eyebrow='MATCH DAY' title='Scorecards.' subtitle='Ball-by-ball scores from every session.'/>
  {adminAuthorized&&<View style={{marginHorizontal:20,marginBottom:16}}><Button title='Start a new match' icon='add-circle-outline' onPress={()=>navigation.navigate('NewMatch')}/></View>}
 </>;
 return <SafeAreaView style={common.screen}>
  <FlatList data={list} keyExtractor={m=>m.id} ListHeaderComponent={header} contentContainerStyle={{paddingBottom:110}}
   ListEmptyComponent={<View style={{marginHorizontal:20}}><Card><Empty icon='stats-chart-outline' title='No scorecards yet' subtitle={adminAuthorized?'Start a match to begin scoring.':'Scores will appear here when an admin starts scoring.'}/></Card></View>}
   renderItem={({item:m})=>{
    const lines=m.innings.map((_,i)=>scoreLine(m,i)).filter(Boolean) as any[];
    return <Pressable onPress={()=>navigation.navigate('Match',{id:m.id})} style={{marginHorizontal:20,marginBottom:12,backgroundColor:'white',borderRadius:18,padding:16,borderWidth:1,borderColor:C.line}}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
      <Text style={{color:C.gray,fontSize:12,fontWeight:'700'}}>{prettyDate(m.date)} · {m.title}</Text>
      {m.status==='live'?<View style={{backgroundColor:C.softRed,paddingHorizontal:9,paddingVertical:3,borderRadius:99}}><Text style={{color:C.red,fontWeight:'900',fontSize:10}}>LIVE</Text></View>:<Ionicons name='chevron-forward' size={16} color={C.gray}/>}
     </View>
     {lines.length?lines.map((l,i)=><View key={i} style={{flexDirection:'row',justifyContent:'space-between',marginTop:i?4:0}}><Text style={{color:C.ink,fontWeight:'800',fontSize:15}}>{l.team}</Text><Text style={{color:C.ink,fontWeight:'900',fontSize:15}}>{l.text} <Text style={{color:C.gray,fontWeight:'700',fontSize:12}}>({l.overs})</Text></Text></View>):<Text style={{color:C.gray}}>{m.A.name} vs {m.B.name}</Text>}
     {!!(m.result||resultText(m))&&<Text style={{color:C.green,fontWeight:'800',fontSize:12.5,marginTop:9}}>{m.result||resultText(m)}</Text>}
    </Pressable>}}/>
 </SafeAreaView>;
}
