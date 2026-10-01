export type Role = 'Batsman'|'Bowler'|'Umpire'|'All-Rounder'|'Wicket Keeper';
export const roles:Role[]=['Batsman','Bowler','Umpire','All-Rounder','Wicket Keeper'];
export type Player = {id:string; name:string; dateOfBirth:string; role:Role; phone?:string; avatar?:string; isAdmin?:boolean; approvalStatus?:'pending'|'approved'; approvedAt?:number; approvedBy?:string};
export const validBirthDate=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value&&value<=localDay()};
export const hasBirthdayToday=(dateOfBirth?:string)=>!!dateOfBirth&&dateOfBirth.slice(5)===localDay().slice(5);
export type Booking = {id:string; date:string; userId:string; name:string; role:Role; createdAt:number};
export type Captain = {id:string; date:string; userId:string; name:string; createdAt:number};
export type Membership = {id:string; date:string; userId:string; captainId:string};
export type Presence = {id:string; date:string; userId:string; name:string; createdAt:number};
export type Attendance = {id:string; date:string; userId:string; name:string; createdAt:number; markedBy:string};
export type Vote = {id:string; date:string; userId:string; targetId:string};
export type Notice = {id:string; title:string; body:string; createdAt:number};
export type Charity = {id:string; title:string; description:string; amount:number; images:string[]; date:string; createdAt:number};
export type Settings = {maxSlots:number; sessionLabel:string; matchType:string; overs:string; ballInfo:string; practiceMatch:string; specialMatch:string; specialTime:string; bestShotUrl:string; bestShotImage:string; bestShotTitle:string; shareUrl:string};
export const defaults:Settings={maxSlots:22,sessionLabel:'Morning cricket',matchType:'Practice session',overs:'',ballInfo:'',practiceMatch:'',specialMatch:'',specialTime:'',bestShotUrl:'',bestShotImage:'',bestShotTitle:'',shareUrl:''};
export const localDay=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const prettyDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
export const rupees=(n:number)=>'₹ '+new Intl.NumberFormat('en-IN').format(n);



export type FundMember = {
  id:string;
  name:string;
  userId?:string;
  external?:boolean;
  createdAt:number;
  createdBy?:string;
};
export type FundContribution = {
  id:string;
  memberId:string;
  year:number;
  month:number;
  amount:number;
  updatedAt:number;
  updatedBy:string;
};
export type FundExpense = {
  id:string;
  year:number;
  month:number;
  amount:number;
  description:string;
  createdAt:number;
  createdBy:string;
};

// ---------- scorecards (ball-by-ball) ----------
export type MPlayer = {id:string; name:string};
export type MTeam = {name:string; players:MPlayer[]};
export type Wicket = {p:string; k:'bowled'|'caught'|'lbw'|'runout'|'stumped'|'hitwicket'|'other'};
// One delivery. bat/non/bw are the ids of striker, non-striker and bowler at that moment.
// r = runs off the bat, x = extra type, xr = extra runs (wide/no-ball include the 1 penalty run).
export type Ball = {bat:string; non:string; bw:string; r:number; x?:'wd'|'nb'|'b'|'lb'; xr?:number; w?:Wicket};
export type Innings = {bat:'A'|'B'; balls:Ball[]; done:boolean};
export type Match = {id:string; date:string; createdAt:number; createdBy:string; title:string; overs:number; A:MTeam; B:MTeam; innings:Innings[]; status:'live'|'done'; result:string};

// ---------- memories ----------
export type Memory = {id:string; userId:string; name:string; title:string; description:string; date:string; mediaUrl:string; mediaType:'image'|'video'|'none'; createdAt:number};
