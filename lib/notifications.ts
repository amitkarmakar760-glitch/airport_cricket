import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {Platform} from 'react-native';

// Push notifications through Expo's free push service (which delivers via Google FCM).
if(Platform.OS!=='web'){
  Notifications.setNotificationHandler({
    handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false}),
  });
}

// Android keeps a channel's sound forever once it is created, so the custom sound lives in a NEW channel id.
const CHANNEL_ID='team-v2';

export type PushState={status:'unknown'|'on'|'denied'|'setup'|'error';message:string;token:string};

export async function registerForPush():Promise<PushState>{
  if(Platform.OS==='web')return {status:'setup',message:'Notifications work in the installed Android app.',token:''};
  try{
    if(Platform.OS==='android'){
      await Notifications.setNotificationChannelAsync(CHANNEL_ID,{name:'Team updates',importance:Notifications.AndroidImportance.MAX,vibrationPattern:[0,250,250,250],lightColor:'#B4500F',sound:'airport_ping.wav'});
    }
    let {status}=await Notifications.getPermissionsAsync();
    if(status!=='granted')status=(await Notifications.requestPermissionsAsync()).status;
    if(status!=='granted')return {status:'denied',message:'Notifications are blocked. Turn them on in your phone: Settings > Apps > Airport Cricket Team > Notifications.',token:''};
    const projectId=(Constants as any)?.expoConfig?.extra?.eas?.projectId??(Constants as any)?.easConfig?.projectId;
    if(!projectId)return {status:'setup',message:'Push is not set up in this build yet (missing Expo project id).',token:''};
    const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
    return {status:'on',message:'Notifications are on for this phone.',token};
  }catch(e:any){
    return {status:'setup',message:'Push is not set up in this build yet. '+(e?.message||''),token:''};
  }
}

// Sends through Expo's push API (free, no server needed). Failures never block the app.
export async function sendPush(tokens:string[],title:string,body:string,data:Record<string,any>={}){
  const unique=[...new Set(tokens.filter(t=>/PushToken\[/.test(t)))];
  for(let i=0;i<unique.length;i+=100){
    const messages=unique.slice(i,i+100).map(to=>({to,title,body:body.slice(0,180),sound:'default',channelId:CHANNEL_ID,priority:'high',data}));
    try{
      await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(messages)});
    }catch{}
  }
}
