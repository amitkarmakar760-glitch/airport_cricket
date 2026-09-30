import React,{useMemo,useState} from 'react';
import {Alert,FlatList,Pressable,SafeAreaView,Share,Text,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {localDay,prettyDate,Player} from '../lib/types';
import {Button,Card,common,Empty,Label,ScreenTop} from '../components/UI';

const shiftDay=(date:string,n:number)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

export default function AttendanceScreen(){
 const {user,adminAuthorized,data,setAttendance}=useApp();
 const [tab,setTab]=useState<'Daily'|'Sheet'>('Daily'),[date,setDate]=useState(localDay()),[range,setRange]=useState<30|60>(30),[busy,setBusy]=useState('');
 const today=localDay();

 // Everyone who is an approved player (pending applicants are not listed).
 const players=useMemo(()=>data.players.filter(p=>p.approvalStatus!=='pending'),[data.players]);
 const booked=useMemo(()=>new Set(data.bookings.filter(b=>b.date===date).map(b=>b.userId)),[data.bookings,date]);
 const present=useMemo(()=>new Set(data.attendance.filter(a=>a.date===date).map(a=>a.userId)),[data.attendance,date]);

 const dailyList=useMemo(()=>[...players].sort((a,b)=>Number(present.has(b.id))-Number(present.has(a.id))||Number(booked.has(b.id))-Number(booked.has(a.id))||a.name.localeCompare(b.name)),[players,present,booked]);

 // Overall sheet for the last `range` days.
 const sheet=useMemo(()=>{
  const from=localDay(-range+1);
  const rows=data.attendance.filter(a=>a.date>=from&&a.date<=today);
  const sessions=new Set(rows.map(r=>r.date)).size;
  const count=new Map<string,number>();
  rows.forEach(r=>count.set(r.userId,(count.get(r.userId)||0)+1));
  const list=players.map(p=>({player:p,days:count.get(p.id)||0})).sort((a,b)=>b.days-a.days||a.player.name.localeCompare(b.player.name));
  return {sessions,list};
 },[data.attendance,players,range,today]);

 const run=async(key:string,fn:()=>Promise<void>)=>{setBusy(key);try{await fn()}catch(e:any){Alert.alert('Could not update',e.message)}finally{setBusy('')}};
 const toggle=(p:Player)=>run(p.id,()=>setAttendance(date,p,!present.has(p.id)));
 const markAllBooked=()=>run('all',async()=>{for(const p of players.filter(x=>booked.has(x.id)&&!present.has(x.id)))await setAttendance(date,p,true)});
 const clearDay=()=>run('clear',async()=>{for(const p of players.filter(x=>present.has(x.id)))await setAttendance(date,p,false)});

 const shareSheet=async()=>{
  const lines=sheet.list.map((r,i)=>`${i+1}. ${r.player.name} — ${r.days}/${sheet.sessions}${sheet.sessions?` (${Math.round(r.days*100/sheet.sessions)}%)`:''}`);
  try{await Share.share({message:`Airport Cricket attendance\nLast ${range} days · ${sheet.sessions} session${sheet.sessions===1?'':'s'}\n\n${lines.join('\n')}`})}catch{}
 };

 const Toggle=({label,on,onPress}:{label:string;on:boolean;onPress:()=>void})=><Pressable onPress={onPress} style={{flex:1,backgroundColor:on?C.green:'white',paddingVertical:12,borderRadius:12,alignItems:'center'}}><Text style={{color:on?'white':C.gray,fontWeight:'800',fontSize:13}}>{label}</Text></Pressable>;

 const header=<>
  <ScreenTop eyebrow='CLUB RECORD' title='Attendance.' subtitle={adminAuthorized?'Mark who came to each session.':'See who turned up, day by day.'}/>
  <View style={{flexDirection:'row',gap:8,marginHorizontal:20,marginBottom:18}}><Toggle label='Daily' on={tab==='Daily'} onPress={()=>setTab('Daily')}/><Toggle label='Sheet' on={tab==='Sheet'} onPress={()=>setTab('Sheet')}/></View>
  {tab==='Daily'?<View style={{marginHorizontal:20,marginBottom:14}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'white',borderRadius:14,padding:8,marginBottom:12}}>
    <Pressable onPress={()=>setDate(shiftDay(date,-1))} style={{padding:10}}><Ionicons name='chevron-back' size={20} color={C.green}/></Pressable>
    <Pressable onPress={()=>setDate(today)}><Text style={{fontWeight:'900',color:C.ink,fontSize:15,textAlign:'center'}}>{date===today?'Today, ':''}{prettyDate(date)}</Text></Pressable>
    <Pressable disabled={date>=today} onPress={()=>setDate(shiftDay(date,1))} style={{padding:10,opacity:date>=today?0.25:1}}><Ionicons name='chevron-forward' size={20} color={C.green}/></Pressable>
   </View>
   <View style={{flexDirection:'row',gap:10,marginBottom:adminAuthorized?12:0}}>
    <View style={{flex:1,backgroundColor:C.mint,padding:14,borderRadius:16}}><Text style={{fontWeight:'900',fontSize:22,color:C.green}}>{present.size}</Text><Text style={{fontSize:12,color:C.green}}>Present</Text></View>
    <View style={{flex:1,backgroundColor:'#F4EDE4',padding:14,borderRadius:16}}><Text style={{fontWeight:'900',fontSize:22,color:'#936635'}}>{booked.size}</Text><Text style={{fontSize:12,color:'#936635'}}>Had booked</Text></View>
   </View>
   {adminAuthorized&&<View style={{gap:8}}><Button title={busy==='all'?'Marking...':'Mark all booked players present'} icon='checkmark-done-outline' variant='light' small disabled={!!busy||!booked.size} onPress={markAllBooked}/>{present.size>0&&<Button title='Clear this day' variant='outline' small disabled={!!busy} onPress={()=>Alert.alert('Clear attendance?',`Remove all marks for ${prettyDate(date)}?`,[{text:'Cancel'},{text:'Clear',style:'destructive',onPress:clearDay}])}/>}</View>}
  </View>:<View style={{marginHorizontal:20,marginBottom:14}}>
   <View style={{flexDirection:'row',gap:8,marginBottom:12}}><Toggle label='Last 30 days' on={range===30} onPress={()=>setRange(30)}/><Toggle label='Last 60 days' on={range===60} onPress={()=>setRange(60)}/></View>
   <Card style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View><Label>SESSIONS RECORDED</Label><Text style={{fontSize:26,fontWeight:'900',color:C.ink,marginTop:4}}>{sheet.sessions}</Text></View><Button title='Share' icon='share-social-outline' variant='light' small onPress={shareSheet}/></Card>
  </View>}
 </>;

 if(!user)return <SafeAreaView style={common.screen}><ScreenTop eyebrow='CLUB RECORD' title='Attendance.'/><View style={{marginHorizontal:20}}><Card><Empty icon='person-circle-outline' title='Join the team first' subtitle='Create your player profile to see the attendance sheet.'/></Card></View></SafeAreaView>;

 return <SafeAreaView style={common.screen}>
  {tab==='Daily'?
   <FlatList data={dailyList} keyExtractor={p=>p.id} ListHeaderComponent={header} contentContainerStyle={{paddingBottom:100}} ListEmptyComponent={<View style={{marginHorizontal:20}}><Card><Empty icon='people-outline' title='No players yet' subtitle='Approved players will appear here.'/></Card></View>}
    renderItem={({item:p})=>{const here=present.has(p.id);return <View style={{marginHorizontal:20,marginBottom:8,backgroundColor:'white',borderRadius:14,padding:13,flexDirection:'row',alignItems:'center',gap:11}}>
     <View style={{width:36,height:36,borderRadius:18,backgroundColor:here?C.green:C.mint,alignItems:'center',justifyContent:'center'}}><Text style={{color:here?'white':C.green,fontWeight:'900'}}>{p.name[0]?.toUpperCase()}</Text></View>
     <View style={{flex:1}}><Text style={{color:C.ink,fontWeight:'800',fontSize:14}}>{p.name}</Text><Text style={{color:C.gray,fontSize:11,marginTop:2}}>{p.role}{booked.has(p.id)?' · Booked':''}</Text></View>
     {adminAuthorized?<Pressable disabled={!!busy} onPress={()=>toggle(p)} style={{backgroundColor:here?C.green:C.bg,paddingHorizontal:14,paddingVertical:9,borderRadius:99,opacity:busy===p.id?0.5:1}}><Text style={{color:here?'white':C.gray,fontWeight:'800',fontSize:12}}>{here?'Present':'Absent'}</Text></Pressable>
     :<Ionicons name={here?'checkmark-circle':'ellipse-outline'} size={22} color={here?C.green:'#C9D3CB'}/>}
    </View>}}/>
  :<FlatList data={sheet.list} keyExtractor={r=>r.player.id} ListHeaderComponent={header} contentContainerStyle={{paddingBottom:100}} ListEmptyComponent={<View style={{marginHorizontal:20}}><Card><Empty icon='clipboard-outline' title='Nothing recorded yet' subtitle='Attendance will show here once an admin marks a session.'/></Card></View>}
    renderItem={({item:r,index})=>{const pct=sheet.sessions?Math.round(r.days*100/sheet.sessions):0;return <View style={{marginHorizontal:20,marginBottom:8,backgroundColor:'white',borderRadius:14,padding:13}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Text style={{width:22,color:C.gray,fontWeight:'800',fontSize:12}}>{index+1}</Text><Text style={{flex:1,color:C.ink,fontWeight:'800',fontSize:14}}>{r.player.name}</Text><Text style={{color:C.green,fontWeight:'900',fontSize:14}}>{r.days}<Text style={{color:C.gray,fontWeight:'700',fontSize:12}}> / {sheet.sessions} · {pct}%</Text></Text></View>
     <View style={{height:6,backgroundColor:C.bg,borderRadius:3,marginTop:10,overflow:'hidden'}}><View style={{height:6,width:`${pct}%`,backgroundColor:C.green2,borderRadius:3}}/></View>
    </View>}}/>}
 </SafeAreaView>;
}
