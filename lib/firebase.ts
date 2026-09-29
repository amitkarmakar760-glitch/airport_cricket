import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// The React Native entry point exposes this persistence adapter; the web typings omit it.
// @ts-ignore
import {getReactNativePersistence} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const config={apiKey:process.env.EXPO_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.EXPO_PUBLIC_FIREBASE_APP_ID};
// Placeholder values (PASTE_HERE / your_...) count as "not configured".
const real=(v?:string)=>!!v&&!/PASTE|^your[_-]/i.test(v);
export const firebaseEnabled=real(config.apiKey)&&real(config.projectId)&&real(config.appId);
const app=firebaseEnabled?(getApps().length?getApp():initializeApp(config)):null;
export const auth=app?(Platform.OS==='web'?getAuth(app):initializeAuth(app,{persistence:getReactNativePersistence(AsyncStorage)})):null;
export const db=app?getFirestore(app):null;
