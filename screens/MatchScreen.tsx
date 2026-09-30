import React,{useEffect,useState} from 'react';
import {Alert,Pressable,SafeAreaView,ScrollView,Text,View} from 'react-native';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {Ball,Match,MPlayer,prettyDate,Wicket} from '../lib/types';
import {inningsOver,oversText,resultText,summarize} from '../lib/scoring';
import {Button,Card,common,Empty,Label} from '../components/UI';

type Extra='wd'|'nb'|'b'|'lb'|null;
const kinds:{k:Wicket['k'];t:string}[]=[{k:'bowled',t:'Bowled'},{k:'caught',t:'Caught'},{k:'lbw',t:'LBW'},{k:'runout',t:'Run out'},{k:'stumped',t:'Stumped'},{k:'hitwicket',t:'Hit wicket'},{k:'other',t:'Other'}];
const other=(s:'A'|'B')=>s==='A'?'B':'A';

export default function MatchScreen({route,navigation}:any){
 const {data}=useApp();
 const match=data.matches.find(m=>m.id===route.params?.id);
 if(!match)return <SafeAreaView style={common.screen}><View style={{padding:20}}><Card><Empty icon='alert-circle-outline' title='Match not found' subtitle='It may have been deleted.'/></Card></View></SafeAreaView>;
 return <MatchView match={match} navigation={navigation}/>;
}

function Chip({label,on,onPress,danger,disabled}:{label:string;on?:boolean;onPress:()=>void;danger?:boolean;disabled?:boolean}){
 return <Pressable disabled={disabled} onPress={onPress} style={{paddingVertical:11,paddingHorizontal:14,borderRadius:12,backgroundColor:on?(danger?C.red:C.green):(danger?C.softRed:C.mint),opacity:disabled?0.35:1,minWidth:46,alignItems:'center'}}><Text style={{color:on?'white':danger?C.red:C.green,fontWeight:'900',fontSize:14}}>{label}</Text></Pressable>;
}

function MatchView({match,navigation}:{match:Match;navigation:any}){
 const {adminAuthorized,saveMatch,removeMatch}=useApp();
 const idx=match.innings.length-1,inn=match.innings[idx],bt=match[inn.bat],bw=match[other(inn.bat)];
 const sums=match.innings.map(i=>summarize(i,match[i.bat],match[other(i.bat)]));
 const s=sums[idx],over=inningsOver(match,idx),live=match.status==='live';
 const [sel,setSel]=useState<{st:string|null;nn:string|null;bw:string|null}>({st:s.striker,nn:s.non,bw:s.bowler});
 const [extra,setExtra]=useState<Extra>(null),[wOpen,setWOpen]=useState(false),[kind,setKind]=useState<Wicket['k']>('bowled'),[outId,setOutId]=useState<string|null>(null),[wRuns,setWRuns]=useState(0);
 useEffect(()=>{setSel({st:s.striker,nn:s.non,bw:s.bowler});setExtra(null);setWOpen(false);setOutId(null);setWRuns(0)},[match.id,idx,inn.balls.length]);

 const commit=async(m:Match)=>{try{await saveMatch(m)}catch(e:any){Alert.alert('Not saved',e.message)}};
 const setInn=(fn:(i:typeof inn)=>typeof inn)=>match.innings.map((i,k)=>k===idx?fn(i):i);
 const ready=!!sel.st&&!!sel.nn&&!!sel.bw;
 const name=(team:{players:MPlayer[]},id:string|null)=>team.players.find(p=>p.id===id)?.name||'—';

 const rec=(n:number,w?:Wicket)=>{
  if(!sel.st||!sel.nn||!sel.bw)return;
  const base=extra==='wd'?{r:0,x:'wd' as const,xr:1+n}:extra==='nb'?{r:n,x:'nb' as const,xr:1}:extra==='b'||extra==='lb'?{r:0,x:extra,xr:n}:{r:n};
  const ball:Ball={bat:sel.st,non:sel.nn,bw:sel.bw,...base,...(w?{w}:{})};
  setExtra(null);setWOpen(false);
  commit({...match,innings:setInn(i=>({...i,balls:[...i.balls,ball]}))});
 };
 const undo=()=>{if(!inn.balls.length)return;commit({...match,innings:setInn(i=>({...i,balls:i.balls.slice(0,-1)}))})};
 const endInnings=()=>Alert.alert('End this innings?','No more balls can be added to it.',[{text:'Cancel'},{text:'End innings',style:'destructive',onPress:()=>commit({...match,innings:setInn(i=>({...i,done:true}))})}]);
 const nextInnings=()=>commit({...match,innings:[...setInn(i=>({...i,done:true})),{bat:other(inn.bat),balls:[],done:false}]});
 const finish=()=>{const d:Match={...match,innings:setInn(i=>({...i,done:true})),status:'done'};commit({...d,result:resultText(d)})};
 const del=()=>Alert.alert('Delete this match?','The whole scorecard will be removed.',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await removeMatch(match.id);navigation.goBack()}catch(e:any){Alert.alert('Could not delete',e.message)}}}]);

 const availBat=bt.players.filter(p=>!s.bat.some(r=>r.id===p.id)&&p.id!==sel.st&&p.id!==sel.nn);
 const prev=s.overDone&&inn.balls.length?inn.balls[inn.balls.length-1].bw:null;
 const availBowl=bw.players.filter(p=>p.id!==prev);
 const Picker=({title,options,onPick}:{title:string;options:MPlayer[];onPick:(id:string)=>void})=><View style={{marginTop:12}}><Label>{title}</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>{options.length?options.map(p=><Pressable key={p.id} onPress={()=>onPick(p.id)} style={{paddingVertical:10,paddingHorizontal:13,borderRadius:12,backgroundColor:'white',borderWidth:1,borderColor:C.green}}><Text style={{color:C.green,fontWeight:'800',fontSize:13}}>{p.name}</Text></Pressable>):<Text style={{color:C.gray,fontSize:12}}>No one left to pick.</Text>}</View></View>;

 const cur=(id:string|null)=>s.bat.find(r=>r.id===id);
 const bowlFig=s.bowl.find(r=>r.id===sel.bw);
 const chase=idx===1&&!over?(()=>{const need=sums[0].runs+1-s.runs,left=match.overs*6-s.balls;return `Need ${Math.max(need,0)} from ${left} ball${left===1?'':'s'}`})():'';
 const status=match.result||(!live?resultText(match):'');

 const th={color:C.gray,fontSize:10.5,fontWeight:'800' as const},num=(w:number)=>({width:w,textAlign:'right' as const});

 return <SafeAreaView style={common.screen}><ScrollView contentContainerStyle={{padding:18,paddingBottom:80}} keyboardShouldPersistTaps='handled'>
  <Text style={{color:C.gray,fontWeight:'700',fontSize:12}}>{prettyDate(match.date)} · {match.overs} overs a side</Text>
  <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:4,marginBottom:12}}><Text style={{color:C.ink,fontWeight:'900',fontSize:22,flexShrink:1}}>{match.A.name} vs {match.B.name}</Text>{live&&<View style={{backgroundColor:C.softRed,paddingHorizontal:9,paddingVertical:3,borderRadius:99}}><Text style={{color:C.red,fontWeight:'900',fontSize:10}}>LIVE</Text></View>}</View>
  {!!status&&<View style={{backgroundColor:C.mint,padding:13,borderRadius:14,marginBottom:12}}><Text style={{color:C.green,fontWeight:'900',fontSize:14}}>{status}</Text></View>}

  {adminAuthorized&&live&&<Card style={{marginBottom:16}}>
   <Label>{bt.name.toUpperCase()} BATTING · INNINGS {idx+1}</Label>
   <Text style={{color:C.ink,fontWeight:'900',fontSize:32,marginTop:4}}>{s.runs}/{s.wkts} <Text style={{fontSize:14,color:C.gray,fontWeight:'700'}}>({s.overs}/{match.overs} ov)</Text></Text>
   {!!chase&&<Text style={{color:C.green,fontWeight:'800',fontSize:13,marginTop:2}}>{chase}</Text>}
   {over?<View style={{marginTop:14,gap:10}}>
    <Text style={{color:C.ink,fontWeight:'800'}}>{idx===0?`Innings over. ${bw.name} need ${s.runs+1} to win.`:'Second innings is over.'}</Text>
    {idx===0?<Button title='Start 2nd innings' icon='arrow-forward-circle-outline' onPress={nextInnings}/>:<Button title='Finish match' icon='flag-outline' onPress={finish}/>}
    <Button variant='outline' small title='Undo last ball' onPress={undo} disabled={!inn.balls.length}/>
   </View>:<>
    <View style={{marginTop:12,gap:6}}>
     {sel.st&&<Text style={{color:C.ink,fontWeight:'800',fontSize:15}}>🏏 {name(bt,sel.st)}*  <Text style={{color:C.gray,fontWeight:'700'}}>{cur(sel.st)?`${cur(sel.st)!.runs} (${cur(sel.st)!.balls})`:'0 (0)'}</Text></Text>}
     {sel.nn&&<Text style={{color:C.ink,fontWeight:'700',fontSize:14}}>     {name(bt,sel.nn)}  <Text style={{color:C.gray}}>{cur(sel.nn)?`${cur(sel.nn)!.runs} (${cur(sel.nn)!.balls})`:'0 (0)'}</Text></Text>}
     {sel.bw&&<Text style={{color:C.gray,fontWeight:'700',fontSize:13}}>⚾ {name(bw,sel.bw)}  {bowlFig?`${oversText(bowlFig.balls)}-${bowlFig.maidens}-${bowlFig.runs}-${bowlFig.wkts}`:'0.0-0-0-0'}</Text>}
    </View>
    {!sel.st&&<Picker title={inn.balls.length?'NEW BATSMAN':'SELECT STRIKER'} options={availBat} onPick={id=>setSel(x=>({...x,st:id}))}/>}
    {sel.st&&!sel.nn&&<Picker title={inn.balls.length?'NEW BATSMAN':'SELECT NON-STRIKER'} options={availBat} onPick={id=>setSel(x=>({...x,nn:id}))}/>}
    {sel.st&&sel.nn&&!sel.bw&&<Picker title={s.overDone?'OVER COMPLETE - SELECT NEXT BOWLER':'SELECT BOWLER'} options={availBowl} onPick={id=>setSel(x=>({...x,bw:id}))}/>}
    {s.lastOver.length>0&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:14,alignItems:'center'}}><Text style={{color:C.gray,fontSize:11,fontWeight:'800'}}>{s.overDone?'LAST OVER':'THIS OVER'}</Text>{s.lastOver.map((b,i)=><View key={i} style={{minWidth:28,paddingHorizontal:6,paddingVertical:4,borderRadius:99,backgroundColor:b==='W'?C.red:C.bg,alignItems:'center'}}><Text style={{fontSize:12,fontWeight:'900',color:b==='W'?'white':C.ink}}>{b}</Text></View>)}</View>}
    {ready&&<View style={{marginTop:14}}>
     <View style={{flexDirection:'row',gap:7,marginBottom:10}}>
      {([['wd','Wide'],['nb','No ball'],['b','Bye'],['lb','Leg bye']] as [Extra,string][]).map(([k,t])=><View key={k} style={{flex:1}}><Chip label={t} on={extra===k} onPress={()=>setExtra(extra===k?null:k)}/></View>)}
     </View>
     <Text style={{color:C.gray,fontSize:11,marginBottom:8}}>{extra==='wd'?'Wide: tap the extra runs run (0 = just the wide)':extra==='nb'?'No ball: tap the runs hit off the bat':extra==='b'||extra==='lb'?'Tap the runs taken':'Tap the runs scored on this ball'}</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {[0,1,2,3,4,5,6].map(n=><Chip key={n} label={String(n)} disabled={(extra==='b'||extra==='lb')&&n===0} onPress={()=>rec(n)}/>)}
      <Chip label='Wicket' danger on={wOpen} onPress={()=>{setWOpen(!wOpen);setOutId(sel.st)}}/>
     </View>
     {wOpen&&<View style={{marginTop:12,backgroundColor:C.softRed,padding:12,borderRadius:14}}>
      <Label>HOW OUT</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8,marginBottom:10}}>{kinds.map(k=><Chip key={k.k} label={k.t} on={kind===k.k} onPress={()=>setKind(k.k)}/>)}</View>
      <Label>WHO IS OUT</Label><View style={{flexDirection:'row',gap:8,marginTop:8,marginBottom:10}}>{[sel.st!,sel.nn!].map(id=><Chip key={id} label={name(bt,id)} on={outId===id} onPress={()=>setOutId(id)}/>)}</View>
      <Label>RUNS ON THIS BALL</Label><View style={{flexDirection:'row',gap:6,marginTop:8,marginBottom:12}}>{[0,1,2,3].map(n=><Chip key={n} label={String(n)} on={wRuns===n} onPress={()=>setWRuns(n)}/>)}</View>
      <Button variant='danger' title='Confirm wicket' onPress={()=>rec(wRuns,{p:outId||sel.st!,k:kind})}/>
     </View>}
    </View>}
    <View style={{flexDirection:'row',gap:8,marginTop:14,flexWrap:'wrap'}}>
     <Button small variant='light' icon='arrow-undo-outline' title='Undo ball' disabled={!inn.balls.length} onPress={undo}/>
     {ready&&<Button small variant='light' icon='swap-horizontal-outline' title='Swap strike' onPress={()=>setSel(x=>({...x,st:x.nn,nn:x.st}))}/>}
     {ready&&<Button small variant='outline' title='Change bowler' onPress={()=>setSel(x=>({...x,bw:null}))}/>}
     <Button small variant='outline' title='End innings' onPress={endInnings}/>
    </View>
   </>}
  </Card>}

  {match.innings.map((inning,i)=>{
   const sm=sums[i],bat=match[inning.bat],bowlT=match[other(inning.bat)],yet=bat.players.filter(p=>!sm.bat.some(r=>r.id===p.id));
   return <Card key={i} style={{marginBottom:16}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}><Text style={{color:C.ink,fontWeight:'900',fontSize:16}}>{bat.name}</Text><Text style={{color:C.ink,fontWeight:'900',fontSize:16}}>{sm.runs}/{sm.wkts} <Text style={{color:C.gray,fontSize:12,fontWeight:'700'}}>({sm.overs} ov)</Text></Text></View>
    <View style={{flexDirection:'row',paddingBottom:6,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={[th,{flex:1}]}>BATTING</Text><Text style={[th,num(30)]}>R</Text><Text style={[th,num(30)]}>B</Text><Text style={[th,num(26)]}>4s</Text><Text style={[th,num(26)]}>6s</Text><Text style={[th,num(44)]}>SR</Text></View>
    {sm.bat.map(r=><View key={r.id} style={{flexDirection:'row',paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.line,alignItems:'center'}}>
     <View style={{flex:1,paddingRight:6}}><Text style={{color:C.ink,fontWeight:'800',fontSize:13}}>{r.name}</Text><Text style={{color:r.out?C.gray:C.green,fontSize:10.5,marginTop:1}}>{r.out?r.how:(live&&i===idx&&(r.id===sel.st||r.id===sel.nn)?'batting':'not out')}</Text></View>
     <Text style={[{color:C.ink,fontWeight:'900',fontSize:13},num(30)]}>{r.runs}</Text><Text style={[{color:C.ink,fontSize:12},num(30)]}>{r.balls}</Text><Text style={[{color:C.ink,fontSize:12},num(26)]}>{r.fours}</Text><Text style={[{color:C.ink,fontSize:12},num(26)]}>{r.sixes}</Text><Text style={[{color:C.gray,fontSize:11},num(44)]}>{r.sr}</Text></View>)}
    {!sm.bat.length&&<Text style={{color:C.gray,fontSize:12,paddingVertical:8}}>No balls bowled yet.</Text>}
    <Text style={{color:C.ink,fontSize:12.5,marginTop:10}}><Text style={{fontWeight:'800'}}>Extras </Text>{sm.extras.total} <Text style={{color:C.gray}}>(wd {sm.extras.wd}, nb {sm.extras.nb}, b {sm.extras.b}, lb {sm.extras.lb})</Text></Text>
    {yet.length>0&&<Text style={{color:C.gray,fontSize:12,marginTop:6}}><Text style={{fontWeight:'800',color:C.ink}}>Yet to bat </Text>{yet.map(p=>p.name).join(', ')}</Text>}
    {sm.fow.length>0&&<Text style={{color:C.gray,fontSize:12,marginTop:6}}><Text style={{fontWeight:'800',color:C.ink}}>Fall of wickets </Text>{sm.fow.join(', ')}</Text>}
    <View style={{flexDirection:'row',paddingBottom:6,marginTop:14,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={[th,{flex:1}]}>BOWLING ({bowlT.name})</Text><Text style={[th,num(34)]}>O</Text><Text style={[th,num(26)]}>M</Text><Text style={[th,num(30)]}>R</Text><Text style={[th,num(26)]}>W</Text><Text style={[th,num(40)]}>Econ</Text></View>
    {sm.bowl.map(r=><View key={r.id} style={{flexDirection:'row',paddingVertical:7,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={{flex:1,color:C.ink,fontWeight:'800',fontSize:13}}>{r.name}</Text><Text style={[{color:C.ink,fontSize:12},num(34)]}>{oversText(r.balls)}</Text><Text style={[{color:C.ink,fontSize:12},num(26)]}>{r.maidens}</Text><Text style={[{color:C.ink,fontSize:12},num(30)]}>{r.runs}</Text><Text style={[{color:C.ink,fontWeight:'900',fontSize:13},num(26)]}>{r.wkts}</Text><Text style={[{color:C.gray,fontSize:11},num(40)]}>{r.econ}</Text></View>)}
   </Card>})}
  {adminAuthorized&&<Button variant='danger' small title='Delete this match' onPress={del}/>}
 </ScrollView></SafeAreaView>;
}
