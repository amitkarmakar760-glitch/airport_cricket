import React,{useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useApp} from '../lib/AppContext';
import {C} from '../lib/theme';
import {Button,Card,common,Heading,Label,ScreenTop} from '../components/UI';
import {FundExpense,rupees} from '../lib/types';

const months=['January','February','March','April','May','June','July','August','September','October','November','December'];

const inputStyle={backgroundColor:'white',borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:C.ink,marginTop:7};

export default function FundScreen(){
 const {data,adminAuthorized,addFundMember,saveFundContribution,saveFundExpense,removeFundExpense}=useApp();
 const now=new Date(), currentYear=now.getFullYear(), currentMonth=now.getMonth()+1;
 const [period,setPeriod]=useState<'monthly'|'yearly'>('monthly');
 const [year,setYear]=useState(String(currentYear));
 const [month,setMonth]=useState(currentMonth);
 const [selectedMember,setSelectedMember]=useState('');
 const [amount,setAmount]=useState('');
 const [newMember,setNewMember]=useState('');
 const [expenseDescription,setExpenseDescription]=useState('');
 const [expenseAmount,setExpenseAmount]=useState('');
 const [saving,setSaving]=useState(false);
 const [detailMember,setDetailMember]=useState('');

 const y=Number(year)||currentYear;
 const members=useMemo(()=>{
   const registered=data.players.map(p=>({id:p.id,name:p.name,external:false}));
   const external=data.fundMembers.filter(x=>!data.players.some(p=>p.id===x.id||p.name.trim().toLowerCase()===x.name.trim().toLowerCase())).map(x=>({id:x.id,name:x.name,external:true}));
   return [...registered,...external].sort((a,b)=>a.name.localeCompare(b.name));
 },[data.players,data.fundMembers]);

 const contributions=data.fundContributions.filter(x=>x.year===y);
 const expenses=data.fundExpenses.filter(x=>x.year===y);
 const monthContributions=contributions.filter(x=>x.month===month);
 const monthExpenses=expenses.filter(x=>x.month===month);
 const totalCollection=contributions.reduce((s,x)=>s+x.amount,0);
 const totalExpense=expenses.reduce((s,x)=>s+x.amount,0);
 const yearBalance=totalCollection-totalExpense;
 const monthlyCollection=monthContributions.reduce((s,x)=>s+x.amount,0);
 const monthlyExpense=monthExpenses.reduce((s,x)=>s+x.amount,0);
 const monthlyBalance=monthlyCollection-monthlyExpense;

 const getPaid=(memberId:string, m:number)=>data.fundContributions.find(x=>x.memberId===memberId&&x.year===y&&x.month===m)?.amount||0;
 const memberTotal=(memberId:string)=>contributions.filter(x=>x.memberId===memberId).reduce((s,x)=>s+x.amount,0);
 const allMemberTotal=(memberId:string)=>data.fundContributions.filter(x=>x.memberId===memberId).reduce((s,x)=>s+x.amount,0);
 const memberYearBreakdown=(memberId:string)=>Array.from(new Set(data.fundContributions.filter(x=>x.memberId===memberId).map(x=>x.year))).sort((a,b)=>b-a).map(yr=>({year:yr,total:data.fundContributions.filter(x=>x.memberId===memberId&&x.year===yr).reduce((sum,x)=>sum+x.amount,0)}));
 const selected=members.find(x=>x.id===selectedMember);

 const saveContribution=async()=>{
   if(!selectedMember){Alert.alert('Select member','Choose a member first.');return}
   const n=Number(amount);
   if(!Number.isFinite(n)||n<0){Alert.alert('Invalid amount','Enter a valid amount.');return}
   setSaving(true);
   try{await saveFundContribution(selectedMember,y,month,n);setAmount('');Alert.alert('Saved','Contribution updated successfully.')}
   catch(e:any){Alert.alert('Could not save',e.message)}
   finally{setSaving(false)}
 };
 const addMember=async()=>{
   setSaving(true);
   try{await addFundMember(newMember);setNewMember('');Alert.alert('Added','External member added to the fund.')}
   catch(e:any){Alert.alert('Could not add member',e.message)}
   finally{setSaving(false)}
 };
 const addExpense=async()=>{
   const n=Number(expenseAmount);
   if(!expenseDescription.trim()||!Number.isFinite(n)||n<0){Alert.alert('Invalid expense','Enter description and a valid amount.');return}
   const expense:FundExpense={id:`fe_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,year:y,month,amount:n,description:expenseDescription.trim(),createdAt:Date.now(),createdBy:''};
   setSaving(true);
   try{await saveFundExpense(expense);setExpenseDescription('');setExpenseAmount('');Alert.alert('Saved','Expense added successfully.')}
   catch(e:any){Alert.alert('Could not save',e.message)}
   finally{setSaving(false)}
 };

 if(!adminAuthorized)return <View style={common.screen}><ScreenTop eyebrow='TEAM FUND' title='Fund.' subtitle='Only authorised admins can manage the club fund.'/><View style={{margin:20}}><Card><Text style={{color:C.gray,lineHeight:20}}>You need admin access to view and manage fund records.</Text></Card></View></View>;

 return <View style={common.screen}>
   <ScrollView contentContainerStyle={{paddingBottom:60}} showsVerticalScrollIndicator={false}>
    <ScreenTop eyebrow='TEAM FUND' title='Money in. Money out.' subtitle='Track every contribution, expense and balance without manual calculation.'/>

    <View style={{flexDirection:'row',marginHorizontal:20,marginBottom:15,gap:8}}>
      <Pressable onPress={()=>setPeriod('monthly')} style={{flex:1,padding:12,borderRadius:12,backgroundColor:period==='monthly'?C.green:'white',alignItems:'center'}}><Text style={{fontWeight:'900',color:period==='monthly'?'white':C.gray}}>Monthly</Text></Pressable>
      <Pressable onPress={()=>setPeriod('yearly')} style={{flex:1,padding:12,borderRadius:12,backgroundColor:period==='yearly'?C.green:'white',alignItems:'center'}}><Text style={{fontWeight:'900',color:period==='yearly'?'white':C.gray}}>Yearly</Text></Pressable>
    </View>

    <Card style={{marginHorizontal:20,marginBottom:15}}>
      <Label>REPORT YEAR</Label>
      <TextInput value={year} onChangeText={setYear} keyboardType='number-pad' placeholder='2026' style={inputStyle}/>
      {period==='monthly'&&<><Label>MONTH</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8}}>{months.map((m,i)=><Pressable key={m} onPress={()=>setMonth(i+1)} style={{paddingHorizontal:10,paddingVertical:8,borderRadius:10,backgroundColor:month===i+1?C.green:'white',borderWidth:1,borderColor:month===i+1?C.green:C.line}}><Text style={{fontSize:11,fontWeight:'800',color:month===i+1?'white':C.gray}}>{m.slice(0,3)}</Text></Pressable>)}</View></>}
    </Card>

    <View style={{flexDirection:'row',gap:9,marginHorizontal:20,marginBottom:18}}>
      <Card style={{flex:1,margin:0}}><Label>COLLECTED</Label><Text style={{fontSize:20,fontWeight:'900',color:C.green,marginTop:7}}>{rupees(period==='monthly'?monthlyCollection:totalCollection)}</Text></Card>
      <Card style={{flex:1,margin:0}}><Label>EXPENSE</Label><Text style={{fontSize:20,fontWeight:'900',color:C.red,marginTop:7}}>{rupees(period==='monthly'?monthlyExpense:totalExpense)}</Text></Card>
      <Card style={{flex:1,margin:0}}><Label>NET BALANCE</Label><Text style={{fontSize:20,fontWeight:'900',color:C.ink,marginTop:7}}>{rupees(period==='monthly'?monthlyBalance:yearBalance)}</Text></Card>
    </View>

    <View style={{marginHorizontal:20}}>
      <Card>
        <Heading>Add monthly contribution</Heading>
        <Text style={{fontSize:12,color:C.gray,lineHeight:18,marginBottom:10}}>Select a member and save the amount they paid for {months[month-1]} {y}. Saving again edits that month's amount.</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{members.map(m=><Pressable key={m.id} onPress={()=>{setSelectedMember(m.id);setAmount(String(getPaid(m.id,month)||''))}} style={{paddingHorizontal:11,paddingVertical:9,borderRadius:11,backgroundColor:selectedMember===m.id?C.green:'white',borderWidth:1,borderColor:selectedMember===m.id?C.green:C.line}}><Text style={{fontWeight:'800',fontSize:12,color:selectedMember===m.id?'white':C.ink}}>{m.name}</Text></Pressable>)}</View>
        {selected&&<><Text style={{fontSize:12,color:C.gray,marginTop:14}}>Selected: <Text style={{fontWeight:'900',color:C.ink}}>{selected.name}</Text></Text><TextInput value={amount} onChangeText={setAmount} keyboardType='decimal-pad' placeholder='Amount in ₹' style={inputStyle}/><Button title={saving?'Saving...':'Save contribution'} disabled={saving} onPress={saveContribution}/></>}
      </Card>

      <Card>
        <Heading>Add non-registered member</Heading>
        <Text style={{fontSize:12,color:C.gray,lineHeight:18}}>Use this for someone who contributes money but has no app account.</Text>
        <TextInput value={newMember} onChangeText={setNewMember} placeholder='Member full name' style={inputStyle}/>
        <View style={{marginTop:10}}><Button title={saving?'Adding...':'Add member'} disabled={saving||!newMember.trim()} onPress={addMember} icon='person-add-outline'/></View>
      </Card>

      <Card>
        <Heading>Add expense</Heading>
        <Text style={{fontSize:12,color:C.gray,lineHeight:18}}>This expense will automatically reduce the selected month's and year's balance.</Text>
        <TextInput value={expenseDescription} onChangeText={setExpenseDescription} placeholder='Example: Ground rent' style={inputStyle}/>
        <TextInput value={expenseAmount} onChangeText={setExpenseAmount} keyboardType='decimal-pad' placeholder='Amount in ₹' style={inputStyle}/>
        <View style={{marginTop:10}}><Button title={saving?'Saving...':'Add expense'} disabled={saving} onPress={addExpense}/></View>
      </Card>

      <Card>
        <Heading>{period==='monthly'?`${months[month-1]} ${y} report`:`${y} yearly report`}</Heading>
        {(period==='monthly'?monthExpenses:expenses).length===0?<Text style={{color:C.gray,fontSize:13}}>No expenses recorded.</Text>:
        (period==='monthly'?monthExpenses:expenses).map(e=><View key={e.id} style={{paddingVertical:11,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:'row',alignItems:'center'}}><View style={{flex:1}}><Text style={{fontWeight:'800',color:C.ink}}>{e.description}</Text><Text style={{fontSize:11,color:C.gray,marginTop:3}}>{months[e.month-1]} {e.year}</Text></View><Text style={{fontWeight:'900',marginRight:10}}>{rupees(e.amount)}</Text><Pressable onPress={()=>Alert.alert('Delete expense?','This will change the balance.',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>removeFundExpense(e.id)}])}><Text style={{color:C.red,fontWeight:'800'}}>Delete</Text></Pressable></View>)}
      </Card>

      <Card>
        <Heading>Member contribution report</Heading>
        <Text style={{fontSize:12,color:C.gray,lineHeight:18,marginBottom:8}}>Tap a member to see exactly how much they paid each month and their total for the selected year.</Text>
        {members.map(m=><Pressable key={m.id} onPress={()=>setDetailMember(detailMember===m.id?'':m.id)} style={{paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line}}>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}><View><Text style={{fontWeight:'900',color:C.ink}}>{m.name}</Text><Text style={{fontSize:11,color:C.gray,marginTop:3}}>{m.external?'Non-registered member':'App member'}</Text></View><View style={{alignItems:'flex-end'}}><Text style={{fontWeight:'900',color:C.green}}>{rupees(memberTotal(m.id))}</Text><Text style={{fontSize:10,color:C.gray,marginTop:2}}>Year</Text></View></View>
          {detailMember===m.id&&<View style={{marginTop:12,backgroundColor:C.bg,borderRadius:12,padding:10}}><Text style={{fontSize:12,fontWeight:'900',color:C.ink,marginBottom:6}}>Monthly — {y}</Text>{months.map((mn,i)=><View key={mn} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:5}}><Text style={{fontSize:12,color:C.gray}}>{mn}</Text><Text style={{fontSize:12,fontWeight:'800',color:C.ink}}>{rupees(getPaid(m.id,i+1))}</Text></View>)}<View style={{borderTopWidth:1,borderTopColor:C.line,marginTop:5,paddingTop:8,flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'900'}}>Year total</Text><View style={{alignItems:'flex-end'}}><Text style={{fontWeight:'900',color:C.green}}>{rupees(memberTotal(m.id))}</Text><Text style={{fontSize:10,color:C.gray,marginTop:2}}>Year</Text></View></View><Text style={{fontSize:12,fontWeight:'900',color:C.ink,marginTop:14,marginBottom:5}}>All years</Text>{memberYearBreakdown(m.id).map(r=><View key={r.year} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}}><Text style={{fontSize:12,color:C.gray}}>{r.year}</Text><Text style={{fontSize:12,fontWeight:'800',color:C.ink}}>{rupees(r.total)}</Text></View>)}<View style={{borderTopWidth:1,borderTopColor:C.line,marginTop:5,paddingTop:8,flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'900'}}>All-time total</Text><Text style={{fontWeight:'900',color:C.green}}>{rupees(allMemberTotal(m.id))}</Text></View></View>}
        </Pressable>)}
      </Card>
    </View>
   </ScrollView>
 </View>;
}
