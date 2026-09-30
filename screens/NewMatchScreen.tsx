import React,{useMemo,useState} from 'react';
import {Alert,Pressable,SafeAreaView,ScrollView,Text,TextInput,View} from 'react-native';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {localDay,Match,MPlayer} from '../lib/types';
import {Button,Card,common,Field,Label} from '../components/UI';

type Side='A'|'B';
export default function NewMatchScreen({navigation}:any){
 const {user,adminAuthorized,data,saveMatch}=useApp();
 const today=localDay();
 const [title,setTitle]=useState('Morning match'),[overs,setOvers]=useState('10'),[nameA,setNameA]=useState('Team A'),[nameB,setNameB]=useState('Team B'),[first,setFirst]=useState<Side>('A');
 const [pick,setPick]=useState<Record<string,Side>>({}),[guests,setGuests]=useState<{id:string;name:string;team:Side}[]>([]),[guest,setGuest]=useState(''),[busy,setBusy]=useState(false);

 const present=useMemo(()=>new Set(data.attendance.filter(a=>a.date===today).map(a=>a.userId)),[data.attendance,today]);
 const booked=useMemo(()=>new Set(data.bookings.filter(b=>b.date===today).map(b=>b.userId)),[data.bookings,today]);
 const players=useMemo(()=>data.players.filter(p=>p.approvalStatus!=='pending').sort((a,b)=>Number(present.has(b.id))-Number(present.has(a.id))||Number(booked.has(b.id))-Number(booked.has(a.id))||a.name.localeCompare(b.name)),[data.players,present,booked]);

 if(!adminAuthorized)return <SafeAreaView style={common.screen}><View style={{padding:24}}><Text style={{color:C.gray}}>Only admins can start a match.</Text></View></SafeAreaView>;

 const team=(side:Side):MPlayer[]=>[...players.filter(p=>pick[p.id]===side).map(p=>({id:p.id,name:p.name})),...guests.filter(g=>g.team===side).map(g=>({id:g.id,name:g.name}))];
 const toggle=(id:string,side:Side)=>setPick(p=>{const n={...p};if(n[id]===side)delete n[id];else n[id]=side;return n});
 const addGuest=(team:Side)=>{const n=guest.trim();if(!n)return;setGuests(g=>[...g,{id:'g_'+Date.now()+'_'+g.length,name:n,team}]);setGuest('')};

 const create=async()=>{
  const o=parseInt(overs,10),A=team('A'),B=team('B');
  if(!o||o<1||o>50)return Alert.alert('Overs','Enter overs between 1 and 50.');
  if(A.length<2||B.length<2)return Alert.alert('Teams','Each team needs at least 2 players.');
  if(!nameA.trim()||!nameB.trim()||nameA.trim().toLowerCase()===nameB.trim().toLowerCase())return Alert.alert('Team names','Give the two teams different names.');
  const m:Match={id:'m_'+Date.now(),date:today,createdAt:Date.now(),createdBy:user!.id,title:title.trim()||'Match',overs:o,A:{name:nameA.trim(),players:A},B:{name:nameB.trim(),players:B},innings:[{bat:first,balls:[],done:false}],status:'live',result:''};
  setBusy(true);
  try{await saveMatch(m);navigation.replace('Match',{id:m.id})}catch(e:any){Alert.alert('Could not start match',e.message)}finally{setBusy(false)}
 };

 const Pill=({on,label,onPress}:{on:boolean;label:string;onPress:()=>void})=><Pressable onPress={onPress} style={{minWidth:44,alignItems:'center',paddingVertical:8,paddingHorizontal:10,borderRadius:99,backgroundColor:on?C.green:C.bg}}><Text style={{color:on?'white':C.gray,fontWeight:'800',fontSize:12}}>{label}</Text></Pressable>;

 return <SafeAreaView style={common.screen}><ScrollView contentContainerStyle={{padding:20,paddingBottom:60}} keyboardShouldPersistTaps='handled'>
  <Card style={{marginBottom:16}}>
   <Field label='Match title' value={title} onChangeText={setTitle}/>
   <Field label='Overs per side' value={overs} onChangeText={setOvers} keyboardType='number-pad'/>
   <Field label='Team A name' value={nameA} onChangeText={setNameA}/>
   <Field label='Team B name' value={nameB} onChangeText={setNameB}/>
   <Label style={{marginBottom:8}}>BATS FIRST</Label>
   <View style={{flexDirection:'row',gap:8}}><Pill on={first==='A'} label={nameA||'Team A'} onPress={()=>setFirst('A')}/><Pill on={first==='B'} label={nameB||'Team B'} onPress={()=>setFirst('B')}/></View>
  </Card>
  <Label style={{marginBottom:4}}>PICK PLAYERS  ·  A: {team('A').length}   B: {team('B').length}</Label>
  <Text style={{color:C.gray,fontSize:12,marginBottom:10}}>Players marked present today are listed first.</Text>
  {players.map(p=><View key={p.id} style={{backgroundColor:'white',borderRadius:14,padding:11,marginBottom:7,flexDirection:'row',alignItems:'center',gap:8}}>
   <View style={{flex:1}}><Text style={{color:C.ink,fontWeight:'800',fontSize:14}}>{p.name}</Text><Text style={{color:C.gray,fontSize:11,marginTop:2}}>{present.has(p.id)?'Present':booked.has(p.id)?'Booked':p.role}</Text></View>
   <Pill on={pick[p.id]==='A'} label='A' onPress={()=>toggle(p.id,'A')}/><Pill on={pick[p.id]==='B'} label='B' onPress={()=>toggle(p.id,'B')}/>
  </View>)}
  <Card style={{marginTop:8,marginBottom:18}}>
   <Label style={{marginBottom:8}}>ADD A GUEST PLAYER (not in the app)</Label>
   <TextInput value={guest} onChangeText={setGuest} placeholder='Guest name' placeholderTextColor='#9BAC9E' style={{borderRadius:14,backgroundColor:'#F5F8F3',borderWidth:1,borderColor:C.line,color:C.ink,fontSize:15,paddingHorizontal:15,paddingVertical:11,marginBottom:10}}/>
   <View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Button small variant='light' title='Add to A' onPress={()=>addGuest('A')}/></View><View style={{flex:1}}><Button small variant='light' title='Add to B' onPress={()=>addGuest('B')}/></View></View>
   {guests.map(g=><Pressable key={g.id} onPress={()=>setGuests(x=>x.filter(y=>y.id!==g.id))} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:8}}><Text style={{color:C.ink}}>{g.name} · Team {g.team}</Text><Text style={{color:C.red,fontWeight:'800',fontSize:12}}>Remove</Text></Pressable>)}
  </Card>
  <Button title={busy?'Starting...':'Start scoring'} icon='play-circle-outline' disabled={busy} onPress={create}/>
 </ScrollView></SafeAreaView>;
}
