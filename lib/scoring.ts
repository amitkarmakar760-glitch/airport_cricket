import {Ball,Innings,Match,MPlayer,MTeam} from './types';

export type BatRow={id:string;name:string;runs:number;balls:number;fours:number;sixes:number;out:boolean;how:string;sr:string};
export type BowlRow={id:string;name:string;balls:number;runs:number;wkts:number;maidens:number;econ:string};
export type Summary={runs:number;wkts:number;balls:number;overs:string;extras:{wd:number;nb:number;b:number;lb:number;total:number};bat:BatRow[];bowl:BowlRow[];fow:string[];striker:string|null;non:string|null;bowler:string|null;overDone:boolean;lastOver:string[]};

export const isLegal=(b:Ball)=>b.x!=='wd'&&b.x!=='nb';
export const ballRuns=(b:Ball)=>b.r+(b.xr||0);
export const oversText=(balls:number)=>`${Math.floor(balls/6)}.${balls%6}`;
const nameOf=(team:MTeam,id:string)=>team.players.find(p=>p.id===id)?.name||'Unknown';
// Runs the batters actually ran (decides whether they swap ends).
const ranRuns=(b:Ball)=>b.x==='wd'?Math.max((b.xr||1)-1,0):b.x==='b'||b.x==='lb'?(b.xr||0):b.r;
const howOut=(k:string,bowler:string)=>({bowled:`b ${bowler}`,caught:`c & b/fielder, b ${bowler}`,lbw:`lbw b ${bowler}`,stumped:`st b ${bowler}`,hitwicket:`hit wicket b ${bowler}`,runout:'run out',other:'out'} as any)[k]||'out';

export function summarize(inn:Innings,batTeam:MTeam,bowlTeam:MTeam):Summary{
  const bat=new Map<string,BatRow>(),bowl=new Map<string,BowlRow>();
  const ensureBat=(id:string)=>{if(!bat.has(id))bat.set(id,{id,name:nameOf(batTeam,id),runs:0,balls:0,fours:0,sixes:0,out:false,how:'not out',sr:'0.0'});return bat.get(id)!};
  const ensureBowl=(id:string)=>{if(!bowl.has(id))bowl.set(id,{id,name:nameOf(bowlTeam,id),balls:0,runs:0,wkts:0,maidens:0,econ:'0.0'});return bowl.get(id)!};
  let runs=0,wkts=0,legal=0;const ex={wd:0,nb:0,b:0,lb:0,total:0};const fow:string[]=[];
  let slots:[string|null,string|null]=[null,null];let lastBowler:string|null=null;
  const overRuns=new Map<number,number>(),overBowler=new Map<number,string>(),overLegal=new Map<number,number>();
  inn.balls.forEach(b=>{
    const over=Math.floor(legal/6);
    const br=ensureBat(b.bat);ensureBat(b.non);const bw=ensureBowl(b.bw);
    const total=ballRuns(b);runs+=total;
    if(b.x){ex[b.x]+=b.xr||0;ex.total+=b.xr||0}
    if(b.x!=='wd')br.balls++;
    if(!b.x||b.x==='nb'){br.runs+=b.r;if(b.r===4)br.fours++;if(b.r===6)br.sixes++}
    // bowler is charged for bat runs, wides and no-balls, but not byes/leg-byes
    const charged=b.r+((b.x==='wd'||b.x==='nb')?(b.xr||0):0);bw.runs+=charged;
    overRuns.set(over,(overRuns.get(over)||0)+charged);overBowler.set(over,b.bw);
    if(isLegal(b)){bw.balls++;legal++;overLegal.set(over,(overLegal.get(over)||0)+1)}
    if(b.w){
      wkts++;const o=ensureBat(b.w.p);o.out=true;o.how=howOut(b.w.k,nameOf(bowlTeam,b.bw));
      if(b.w.k!=='runout')bw.wkts++;
      fow.push(`${runs}-${wkts} (${o.name}, ${oversText(legal)})`);
    }
    slots=[b.bat,b.non];
    if(ranRuns(b)%2===1)slots=[slots[1],slots[0]];
    if(b.w)slots=slots.map(s=>s===b.w!.p?null:s) as any;
    if(isLegal(b)&&legal%6===0)slots=[slots[1],slots[0]];
    lastBowler=b.bw;
  });
  // maidens: complete overs with no runs charged to the bowler
  overRuns.forEach((r,o)=>{if((overLegal.get(o)||0)===6&&r===0)ensureBowl(overBowler.get(o)!).maidens++});
  const batRows=[...bat.values()].map(r=>({...r,sr:r.balls?(r.runs*100/r.balls).toFixed(1):'0.0'}));
  const bowlRows=[...bowl.values()].map(r=>({...r,econ:r.balls?(r.runs*6/r.balls).toFixed(1):'0.0'}));
  const overDone=legal>0&&legal%6===0&&inn.balls.length>0&&isLegal(inn.balls[inn.balls.length-1]);
  const lastOverIdx=overDone?legal/6-1:Math.floor(legal/6);
  let idx=0,count=0;const cur:string[]=[];let L=0;
  inn.balls.forEach(b=>{if(Math.floor(L/6)===lastOverIdx)cur.push(label(b));if(isLegal(b))L++;idx++;count++});
  return {runs,wkts,balls:legal,overs:oversText(legal),extras:ex,bat:batRows,bowl:bowlRows,fow,striker:slots[0],non:slots[1],bowler:overDone?null:lastBowler,overDone,lastOver:cur};
}

export const label=(b:Ball)=>{
  if(b.w)return 'W';
  if(b.x==='wd')return `${(b.xr||1)>1?(b.xr||1):''}Wd`;
  if(b.x==='nb')return b.r?`${b.r}+Nb`:'Nb';
  if(b.x==='b'||b.x==='lb')return `${b.xr}${b.x==='b'?'B':'Lb'}`;
  return String(b.r);
};

export const inningsLimit=(m:Match,inn:Innings)=>{
  const batTeam=m[inn.bat],maxWkts=Math.max(batTeam.players.length-1,1);
  return {maxWkts,maxBalls:m.overs*6};
};

// Innings is finished automatically when all out, overs are up, or the target is passed.
export function inningsOver(m:Match,idx:number):boolean{
  const inn=m.innings[idx];if(!inn)return false;if(inn.done)return true;
  const s=summarize(inn,m[inn.bat],m[inn.bat==='A'?'B':'A']);const {maxWkts,maxBalls}=inningsLimit(m,inn);
  if(s.wkts>=maxWkts||s.balls>=maxBalls)return true;
  if(idx===1){const first=m.innings[0],fs=summarize(first,m[first.bat],m[first.bat==='A'?'B':'A']);if(s.runs>fs.runs)return true}
  return false;
}

export function resultText(m:Match):string{
  if(m.innings.length<2)return '';
  const [a,b]=m.innings,sa=summarize(a,m[a.bat],m[a.bat==='A'?'B':'A']),sb=summarize(b,m[b.bat],m[b.bat==='A'?'B':'A']);
  const n1=m[a.bat].name,n2=m[b.bat].name;
  if(sb.runs>sa.runs){const left=Math.max(m[b.bat].players.length-1-sb.wkts,0);return `${n2} won by ${left} wicket${left===1?'':'s'}`}
  if(sb.runs<sa.runs)return `${n1} won by ${sa.runs-sb.runs} run${sa.runs-sb.runs===1?'':'s'}`;
  return 'Match tied';
}

export const scoreLine=(m:Match,idx:number)=>{const inn=m.innings[idx];if(!inn)return null;const s=summarize(inn,m[inn.bat],m[inn.bat==='A'?'B':'A']);return {team:m[inn.bat].name,text:`${s.runs}/${s.wkts}`,overs:s.overs}};
export type {MPlayer};
