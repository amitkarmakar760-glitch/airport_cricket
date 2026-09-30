import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {deleteUser,onAuthStateChanged,signInAnonymously,signOut} from 'firebase/auth';
import {collection,deleteDoc,doc,getDoc,getDocFromServer,onSnapshot,query,runTransaction,setDoc,where,writeBatch} from 'firebase/firestore';
import {auth,db,firebaseEnabled} from './firebase';
import {ADMIN_CODE,HISTORY_DAYS,MAX_ADMINS} from './config';
import {Attendance,Booking,Captain,Charity,defaults,localDay,Membership,Notice,Player,Presence,Settings,validBirthDate,Vote} from './types';

export type AdminSlot={id:string;uid:string;name:string};
type Store={players:Player[];adminSlots:AdminSlot[];bookings:Booking[];attendance:Attendance[];captains:Captain[];memberships:Membership[];presences:Presence[];votes:Vote[];notices:Notice[];charities:Charity[];settings:Settings};
const initial:Store={players:[],adminSlots:[],bookings:[],attendance:[],captains:[],memberships:[],presences:[],votes:[],notices:[],charities:[],settings:defaults};

type Ctx={
 ready:boolean;online:boolean;user:Player|null;adminAuthorized:boolean;guest:boolean;pausedProfile:Player|null;data:Store;error:string;clearError:()=>void;
 resume:(name:string)=>Promise<void>;pause:()=>void;join:(name:string,dateOfBirth:string,role:Player['role'])=>Promise<void>;logout:()=>Promise<void>;
 recheckProfile:()=>Promise<Player>;deleteProfile:()=>Promise<void>;enterGuest:()=>void;showAuth:()=>void;updateProfile:(fields:Partial<Player>)=>Promise<void>;
 approvePlayer:(id:string)=>Promise<void>;adminLogin:(name:string,password:string)=>Promise<void>;deletePlayer:(id:string)=>Promise<void>;
 book:(date:string)=>Promise<void>;cancelBooking:(date:string)=>Promise<void>;beCaptain:(date:string)=>Promise<void>;joinTeam:(date:string,captainId:string)=>Promise<void>;
 setAttendance:(date:string,player:Player,present:boolean)=>Promise<void>;
 togglePresence:(date:string)=>Promise<void>;toggleVote:(date:string,targetId:string)=>Promise<void>;saveSettings:(fields:Partial<Settings>)=>Promise<void>;
 saveNotice:(title:string,body:string,id?:string)=>Promise<void>;removeNotice:(id:string)=>Promise<void>;saveCharity:(post:Charity)=>Promise<void>;removeCharity:(id:string)=>Promise<void>;
};
const Context=createContext<Ctx>(null as any);
const key='airport-cricket-v1';
const slotIds=['1','2','3'];
const same=(a:string,b:string)=>a.trim().toLocaleLowerCase()===b.trim().toLocaleLowerCase();
const clean=(o:Record<string,any>)=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));

export function AppProvider({children}:{children:React.ReactNode}){
 const [data,setData]=useState<Store>(initial),[profile,setProfile]=useState<Player|null>(null),[pausedProfile,setPausedProfile]=useState<Player|null>(null),[guest,setGuest]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const pausedRef=useRef(false),hadProfileRef=useRef(false);

 const fail=(e:any):never=>{
  const message=e?.code==='permission-denied'?'Not allowed (permission denied). If you were just approved, close and reopen the app, then try again.':(e?.message||'Something went wrong. Please try again.');
  setError(message);throw new Error(message);
 };

 // ---- session + profile (real-time) ----
 useEffect(()=>{
  let active=true;
  if(firebaseEnabled&&auth&&db){
   let profileUnsub:(()=>void)|undefined;
   const unsub=onAuthStateChanged(auth,a=>{
    profileUnsub?.();profileUnsub=undefined;
    if(!active)return;
    if(!a){hadProfileRef.current=false;setProfile(null);setReady(true);return}
    profileUnsub=onSnapshot(doc(db!,'users',a.uid),snap=>{
     if(!pausedRef.current){
      if(snap.exists()){hadProfileRef.current=true;setProfile(snap.data().dateOfBirth?snap.data() as Player:null)}
      else{setProfile(null);if(hadProfileRef.current)signOut(auth!).catch(()=>{})} // profile deleted (by admin) -> sign out
     }
     setReady(true);
    },()=>setReady(true));
   });
   return()=>{active=false;profileUnsub?.();unsub()};
  }
  // Local preview mode (no Firebase keys): data lives on this phone only.
  AsyncStorage.getItem(key).then(v=>{
   if(v){const parsed=JSON.parse(v);setData({...initial,...parsed.data,settings:{...defaults,...parsed.data?.settings}});setProfile(parsed.user?.dateOfBirth?parsed.user:null);setGuest(parsed.user&&!parsed.user.dateOfBirth?false:parsed.guest||false);setPausedProfile(parsed.pausedProfile||null)}
   else setGuest(true);
  }).catch(()=>setGuest(true)).finally(()=>setReady(true));
  return()=>{active=false};
 },[]);
 useEffect(()=>{if(!ready||firebaseEnabled)return;AsyncStorage.setItem(key,JSON.stringify({data,user:profile,guest,pausedProfile})).catch(()=>{})},[data,profile,guest,pausedProfile,ready]);

 // ---- shared data streams (real-time) ----
 useEffect(()=>{
  if(!firebaseEnabled||!db||!profile)return;
  const cutoff=localDay(-HISTORY_DAYS);
  const lists:[keyof Store,string,boolean][]=[['players','users',false],['adminSlots','admin_slots',false],['bookings','bookings',true],['attendance','attendance',true],['captains','captain_assignments',true],['memberships','team_memberships',true],['presences','tea_stall_presence',true],['votes','tea_stall_votes',true],['notices','notices',false],['charities','charity_posts',false]];
  const unsubs=lists.map(([field,path,dated])=>onSnapshot(dated?query(collection(db!,path),where('date','>=',cutoff)):collection(db!,path),snap=>setData(prev=>({...prev,[field]:snap.docs.map(d=>field==='adminSlots'?{...d.data(),id:d.id}:d.data())})),e=>setError(e.message)));
  unsubs.push(onSnapshot(doc(db,'app_settings','main'),snap=>setData(prev=>({...prev,settings:{...defaults,...(snap.data()||{})}})),e=>setError(e.message)));
  return()=>unsubs.forEach(fn=>fn());
 },[profile?.id]);

 // ---- derived admin state: admin = holds one of the 3 admin seats ----
 const adminUids=useMemo(()=>new Set(data.adminSlots.map(s=>s.uid)),[data.adminSlots]);
 const adminAuthorized=!!profile&&adminUids.has(profile.id);
 const user=useMemo<Player|null>(()=>profile&&adminAuthorized?{...profile,isAdmin:true,approvalStatus:'approved'}:profile,[profile,adminAuthorized]);
 const view=useMemo<Store>(()=>({...data,players:data.players.map(p=>adminUids.has(p.id)?{...p,isAdmin:true,approvalStatus:'approved' as const}:p)}),[data,adminUids]);

 const needUser=()=>{if(!user)throw new Error('Create an account or sign in to continue.');return user};
 const requireAdmin=()=>{const u=needUser();if(!adminAuthorized)throw new Error('Admin access is required.');return u};
 const requireApproved=()=>{const u=needUser();if(u.approvalStatus==='pending')throw new Error('Your player application is awaiting admin approval.');return u};
 const put=async <K extends keyof Store>(field:K,path:string,item:any)=>{if(db)await setDoc(doc(db,path,item.id),item);else setData(p=>({...p,[field]:[...(p[field] as any[]).filter(x=>x.id!==item.id),item]}))};
 const remove=async <K extends keyof Store>(field:K,path:string,id:string)=>{if(db)await deleteDoc(doc(db,path,id));else setData(p=>({...p,[field]:(p[field] as any[]).filter(x=>x.id!==id)}))};

 // ---- account / profile ----
 const join=async(name:string,dateOfBirth:string,role:Player['role'])=>{try{
  if(!name.trim()||!validBirthDate(dateOfBirth))throw Error('Enter your full name and a valid date of birth (YYYY-MM-DD).');
  const id=auth?(auth.currentUser||(await signInAnonymously(auth)).user).uid:'u_'+Date.now();
  const existing=db?(await getDoc(doc(db,'users',id))).data():undefined;
  const player:Player={...existing,id,name:name.trim(),dateOfBirth,role,isAdmin:false,approvalStatus:existing?.approvalStatus||(existing?'approved':'pending')};
  if(db)await setDoc(doc(db,'users',id),player);else setData(p=>({...p,players:[...p.players.filter(x=>x.id!==id),player]}));
  setProfile(player);setPausedProfile(null);setGuest(false);
 }catch(e){fail(e)}};
 const pause=()=>{if(profile){pausedRef.current=true;setPausedProfile(profile);setProfile(null);setGuest(false)}};
 const resume=async(name:string)=>{try{
  if(!pausedProfile||!same(name,pausedProfile.name))throw Error('That name does not match this device’s saved profile.');
  if(auth){
   if(auth.currentUser?.uid!==pausedProfile.id)throw Error('This device is no longer signed in. A name alone cannot recover an account.');
   const snapshot=await getDoc(doc(db!,'users',pausedProfile.id));if(!snapshot.exists())throw Error('Profile not found.');setProfile(snapshot.data() as Player);
  }else{const player=data.players.find(p=>p.id===pausedProfile.id);if(!player)throw Error('Profile not found on this device.');setProfile(player)}
  pausedRef.current=false;setPausedProfile(null);setGuest(false);
 }catch(e){fail(e)}};
 const logout=async()=>{if(auth)await signOut(auth);pausedRef.current=false;setProfile(null);setPausedProfile(null);setGuest(false)};
 const recheckProfile=async():Promise<Player>=>{try{
  const u=needUser();let latest:Player;
  if(db){const snapshot=await getDocFromServer(doc(db,'users',u.id));if(!snapshot.exists())throw Error('Profile no longer exists.');latest=snapshot.data() as Player}
  else{const found=data.players.find(p=>p.id===u.id);if(!found)throw Error('Profile no longer exists on this device.');latest=found}
  setProfile(latest);return adminUids.has(latest.id)?{...latest,isAdmin:true,approvalStatus:'approved'}:latest;
 }catch(e){return fail(e)}};
 const updateProfile=async(fields:Partial<Player>)=>{try{
  const u=needUser();
  if(fields.dateOfBirth&&!validBirthDate(fields.dateOfBirth))throw Error('Enter a valid date of birth (YYYY-MM-DD).');
  // Only these fields may be edited by the player; approval/admin status is never written from here.
  const allowed=clean({name:fields.name,dateOfBirth:fields.dateOfBirth,role:fields.role,phone:fields.phone,avatar:fields.avatar});
  if(db)await setDoc(doc(db,'users',u.id),allowed,{merge:true});
  else{const next={...(profile as Player),...allowed} as Player;setProfile(next);setData(p=>({...p,players:[...p.players.filter(x=>x.id!==u.id),next]}))}
 }catch(e){fail(e)}};

 // ---- deleting a player (self or by admin), all client-side ----
 // Order matters: the profile document is removed LAST, so a failed run can simply be retried.
 const purgeUser=async(uid:string)=>{
  if(!db)return;
  const fdb=db;
  const myCaptains=data.captains.filter(c=>c.userId===uid),myBookings=data.bookings.filter(b=>b.userId===uid);
  for(const c of myCaptains){
   await Promise.all(data.memberships.filter(m=>m.captainId===c.id).map(m=>deleteDoc(doc(fdb,'team_memberships',m.id)).catch(()=>{})));
   await runTransaction(fdb,async tx=>{const cnt=doc(fdb,'captain_counts',c.date),ref=doc(fdb,'captain_assignments',c.id);const [cs,rs]=await Promise.all([tx.get(cnt),tx.get(ref)]);if(rs.exists()){tx.delete(ref);tx.set(cnt,{count:Math.max(0,(cs.data()?.count??0)-1)})}});
  }
  for(const b of myBookings){
   await runTransaction(fdb,async tx=>{const cnt=doc(fdb,'booking_counts',b.date),ref=doc(fdb,'bookings',b.id);const [cs,rs]=await Promise.all([tx.get(cnt),tx.get(ref)]);if(rs.exists()){tx.delete(ref);tx.set(cnt,{count:Math.max(0,(cs.data()?.count??0)-1)})}});
  }
  const loose=new Map<string,[string,string]>();
  data.memberships.filter(m=>m.userId===uid).forEach(m=>loose.set('team_memberships/'+m.id,['team_memberships',m.id]));
  data.presences.filter(p=>p.userId===uid).forEach(p=>loose.set('tea_stall_presence/'+p.id,['tea_stall_presence',p.id]));
  data.votes.filter(v=>v.userId===uid||v.targetId===uid).forEach(v=>loose.set('tea_stall_votes/'+v.id,['tea_stall_votes',v.id]));
  await Promise.all([...loose.values()].map(([path,id])=>deleteDoc(doc(fdb,path,id)).catch(()=>{})));
  const slot=data.adminSlots.find(s=>s.uid===uid);
  if(slot){const batch=writeBatch(fdb);batch.delete(doc(fdb,'admin_slots',slot.id));batch.delete(doc(fdb,'admins',uid));await batch.commit()}
  await deleteDoc(doc(fdb,'users',uid));
 };
 const purgeLocal=(id:string)=>{const ownedCaptains=data.captains.filter(c=>c.userId===id).map(c=>c.id);setData(p=>({...p,players:p.players.filter(x=>x.id!==id),adminSlots:p.adminSlots.filter(x=>x.uid!==id),bookings:p.bookings.filter(x=>x.userId!==id),captains:p.captains.filter(x=>x.userId!==id),memberships:p.memberships.filter(x=>x.userId!==id&&!ownedCaptains.includes(x.captainId)),presences:p.presences.filter(x=>x.userId!==id),votes:p.votes.filter(x=>x.userId!==id&&x.targetId!==id)}))};
 const deleteProfile=async()=>{try{
  const u=needUser();
  if(db){
   await purgeUser(u.id);
   if(auth?.currentUser){try{await deleteUser(auth.currentUser)}catch{await signOut(auth).catch(()=>{})}}
  }else purgeLocal(u.id);
  hadProfileRef.current=false;pausedRef.current=false;setProfile(null);setPausedProfile(null);setGuest(false);
 }catch(e){fail(e)}};
 const deletePlayer=async(id:string)=>{try{
  const admin=requireAdmin();
  if(id===admin.id)throw Error('Use “Delete my profile” to remove your own account.');
  if(!data.players.some(p=>p.id===id))throw Error('Player not found.');
  if(adminUids.has(id))throw Error('Admins cannot be deleted here.');
  if(db)await purgeUser(id);else purgeLocal(id);
 }catch(e){fail(e)}};

 // ---- admin seats (max 3, each admin uses their own name, one shared password) ----
 const adminLogin=async(name:string,password:string)=>{try{
  const u=needUser();
  if(!name.trim()||!same(name,u.name))throw Error('Enter the full name from your player profile.');
  if(password!==ADMIN_CODE)throw Error('Incorrect admin password.');
  const mine=data.adminSlots.find(s=>s.uid===u.id);
  const free=slotIds.find(n=>!data.adminSlots.some(s=>s.id===n));
  if(!mine){
   if(data.adminSlots.some(s=>same(s.name,u.name)))throw Error('This admin name is already registered.');
   if(data.adminSlots.length>=MAX_ADMINS||!free)throw Error('All three admin seats are already taken.');
  }
  if(db){
   if(!mine){
    await setDoc(doc(db,'admin_enroll',u.id),{code:password,at:Date.now()}); // server rules check the password here
    try{await setDoc(doc(db,'admin_slots',free!),{uid:u.id,name:u.name})}
    catch{await deleteDoc(doc(db,'admin_enroll',u.id)).catch(()=>{});throw Error('Could not take an admin seat. Someone may have just taken it — please try again.')}
   }
   const marker=await getDoc(doc(db,'admins',u.id));
   if(!marker.exists())await setDoc(doc(db,'admins',u.id),{at:Date.now()});
   deleteDoc(doc(db,'admin_enroll',u.id)).catch(()=>{});
  }else if(!mine){
   setData(p=>({...p,adminSlots:[...p.adminSlots,{id:free!,uid:u.id,name:u.name}]}));
  }
 }catch(e){fail(e)}};
 const approvePlayer=async(id:string)=>{try{
  const admin=requireAdmin();const applicant=view.players.find(p=>p.id===id);
  if(!applicant||applicant.approvalStatus!=='pending')throw Error('Application is no longer pending.');
  if(db)await setDoc(doc(db,'users',id),{approvalStatus:'approved',approvedAt:Date.now(),approvedBy:admin.id},{merge:true});
  else setData(p=>({...p,players:p.players.map(player=>player.id===id?{...player,approvalStatus:'approved' as const,approvedAt:Date.now(),approvedBy:admin.id}:player)}));
 }catch(e){fail(e)}};

 // ---- booking / captains / teams ----
 const book=async(date:string)=>{try{
  const u=requireApproved(),id=`${date}_${u.id}`;
  if(data.bookings.some(b=>b.id===id))throw Error('You are already booked for this day.');
  if(db){await runTransaction(db,async tx=>{
   const ref=doc(db!,'app_settings','main'),existing=doc(db!,'bookings',id),bref=doc(db!,'booking_counts',date);
   const [settingsSnap,bookSnap,countSnap]=await Promise.all([tx.get(ref),tx.get(existing),tx.get(bref)]);
   const max=settingsSnap.data()?.maxSlots||22,n=countSnap.data()?.count||0;
   if(bookSnap.exists())throw Error('Already booked.');
   if(n>=max)throw Error('All slots are full.');
   tx.set(existing,{id,date,userId:u.id,name:u.name,role:u.role,createdAt:Date.now()});
   tx.set(bref,{count:n+1});
  })}else{
   if(data.bookings.filter(b=>b.date===date).length>=data.settings.maxSlots)throw Error('All slots are full.');
   await put('bookings','bookings',{id,date,userId:u.id,name:u.name,role:u.role,createdAt:Date.now()});
  }
 }catch(e){fail(e)}};
 const cancelBooking=async(date:string)=>{try{
  const u=needUser(),id=`${date}_${u.id}`;
  if(date<localDay())throw Error('Past bookings cannot be cancelled.');
  const roster=data.memberships.filter(m=>m.captainId===id);
  if(db){await runTransaction(db,async tx=>{
   const bref=doc(db!,'bookings',id),count=doc(db!,'booking_counts',date),cap=doc(db!,'captain_assignments',id),capCount=doc(db!,'captain_counts',date),membership=doc(db!,'team_memberships',id);
   const rosterRefs=roster.map(r=>doc(db!,'team_memberships',r.id));
   const [b,c,cp,cc,m,...rs]=await Promise.all([tx.get(bref),tx.get(count),tx.get(cap),tx.get(capCount),tx.get(membership),...rosterRefs.map(r=>tx.get(r))]);
   if(b.exists()){tx.delete(bref);tx.set(count,{count:Math.max(0,(c.data()?.count??0)-1)})}
   if(cp.exists()){tx.delete(cap);tx.set(capCount,{count:Math.max(0,(cc.data()?.count??0)-1)});rs.forEach(r=>{if(r.exists())tx.delete(r.ref)})} // captain leaves -> team is released
   if(m.exists())tx.delete(membership);
  })}else{
   await remove('bookings','bookings',id);
   if(data.captains.some(c=>c.id===id)){await remove('captains','captain_assignments',id);setData(p=>({...p,memberships:p.memberships.filter(m=>m.captainId!==id)}))}
   if(data.memberships.some(m=>m.id===id))await remove('memberships','team_memberships',id);
  }
 }catch(e){fail(e)}};
 const beCaptain=async(date:string)=>{try{
  const u=requireApproved(),id=`${date}_${u.id}`;
  if(!data.bookings.some(b=>b.id===id))throw Error('Book your slot first.');
  if(db){await runTransaction(db,async tx=>{
   const count=doc(db!,'captain_counts',date),ref=doc(db!,'captain_assignments',id),[c,r]=await Promise.all([tx.get(count),tx.get(ref)]);
   if(r.exists())throw Error('You are already a captain.');
   if((c.data()?.count||0)>=2)throw Error('Both captain spots are filled.');
   tx.set(ref,{id,date,userId:u.id,name:u.name,createdAt:Date.now()});
   tx.set(count,{count:(c.data()?.count||0)+1});
  })}else{
   if(data.captains.filter(c=>c.date===date).length>=2)throw Error('Both captain spots are filled.');
   if(data.captains.some(c=>c.id===id))throw Error('Already a captain.');
   await put('captains','captain_assignments',{id,date,userId:u.id,name:u.name,createdAt:Date.now()});
  }
 }catch(e){fail(e)}};
 const joinTeam=async(date:string,captainId:string)=>{try{
  const u=requireApproved(),id=`${date}_${u.id}`;
  if(!data.bookings.some(b=>b.id===id))throw Error('Book your slot before joining a team.');
  if(data.captains.some(c=>c.id===id))throw Error('Captains cannot join another team.');
  if(!data.captains.some(c=>c.id===captainId&&c.date===date))throw Error('Captain not found.');
  await put('memberships','team_memberships',{id,date,userId:u.id,captainId});
 }catch(e){fail(e)}};

 // ---- tea stall ----
 const togglePresence=async(date:string)=>{try{
  const u=requireApproved(),id=`${date}_${u.id}`;
  if(date!==localDay())throw Error('Presence is available for today only.');
  if(data.presences.some(p=>p.id===id))await remove('presences','tea_stall_presence',id);
  else await put('presences','tea_stall_presence',{id,date,userId:u.id,name:u.name,createdAt:Date.now()});
 }catch(e){fail(e)}};
 const toggleVote=async(date:string,targetId:string)=>{try{
  const u=requireApproved();
  if(u.id===targetId)throw Error('You cannot check yourself.');
  const id=`${date}_${u.id}_${targetId}`;
  if(data.votes.some(v=>v.id===id))await remove('votes','tea_stall_votes',id);
  else await put('votes','tea_stall_votes',{id,date,userId:u.id,targetId});
 }catch(e){fail(e)}};

 // ---- admin content ----
 const saveSettings=async(fields:Partial<Settings>)=>{try{
  requireAdmin();
  if(db)await setDoc(doc(db,'app_settings','main'),clean(fields),{merge:true}); // merge: never overwrite another admin's fields
  else setData(p=>({...p,settings:{...p.settings,...fields}}));
 }catch(e){fail(e)}};
 const saveNotice=async(title:string,body:string,id?:string)=>{try{requireAdmin();if(!title.trim()||!body.trim())throw Error('Enter a title and message.');await put('notices','notices',{id:id||'notice_'+Date.now(),title:title.trim(),body:body.trim(),createdAt:Date.now()})}catch(e){fail(e)}};
 const setAttendance=async(date:string,player:Player,present:boolean)=>{try{
  const u=requireAdmin(),id=`${date}_${player.id}`;
  if(date>localDay())throw Error('Attendance cannot be marked for a future day.');
  if(present)await put('attendance','attendance',{id,date,userId:player.id,name:player.name,createdAt:Date.now(),markedBy:u.id});
  else await remove('attendance','attendance',id);
 }catch(e){fail(e)}};
 const removeNotice=async(id:string)=>{try{requireAdmin();await remove('notices','notices',id)}catch(e){fail(e)}};
 const saveCharity=async(post:Charity)=>{try{requireAdmin();if(!post.title.trim()||!post.description.trim()||!post.amount||post.amount<0)throw Error('Enter a title, description and a valid amount.');await put('charities','charity_posts',post)}catch(e){fail(e)}};
 const removeCharity=async(id:string)=>{try{requireAdmin();await remove('charities','charity_posts',id)}catch(e){fail(e)}};

 return <Context.Provider value={{ready,online:firebaseEnabled,user,adminAuthorized,guest,pausedProfile,data:view,error,clearError:()=>setError(''),resume,pause,join,logout,recheckProfile,deleteProfile,enterGuest:()=>setGuest(true),showAuth:()=>setGuest(false),updateProfile,approvePlayer,adminLogin,deletePlayer,book,cancelBooking,beCaptain,joinTeam,setAttendance,togglePresence,toggleVote,saveSettings,saveNotice,removeNotice,saveCharity,removeCharity}}>{children}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
