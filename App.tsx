import React from 'react';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import {NavigationContainer,DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {AppProvider,useApp} from './lib/AppContext';
import {C} from './lib/theme';
import {Loader} from './components/UI';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import BookingScreen from './screens/BookingScreen';
import TeamsScreen from './screens/TeamsScreen';
import CharityScreen from './screens/CharityScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminScreen from './screens/AdminScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import CharityEditorScreen from './screens/CharityEditorScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import ScorecardsScreen from './screens/ScorecardsScreen';
import NewMatchScreen from './screens/NewMatchScreen';
import MatchScreen from './screens/MatchScreen';
import ChatScreen from './screens/ChatScreen';
import MemoriesScreen from './screens/MemoriesScreen';
import AddMemoryScreen from './screens/AddMemoryScreen';
const Stack=createNativeStackNavigator();const Tab=createBottomTabNavigator();
const icons:any={Home:['home','home-outline'],Booking:['calendar','calendar-outline'],Teams:['people','people-outline'],Scores:['stats-chart','stats-chart-outline'],Chat:['chatbubbles','chatbubbles-outline'],Memories:['images','images-outline'],Charity:['heart','heart-outline'],More:['person-circle','person-circle-outline']};
function Tabs(){return <Tab.Navigator screenOptions={({route})=>({headerShown:false,tabBarActiveTintColor:C.green,tabBarInactiveTintColor:'#B8A898',tabBarStyle:{height:71,paddingTop:8,paddingBottom:10,backgroundColor:'white',borderTopColor:C.line,elevation:10},tabBarLabelStyle:{fontSize:9,fontWeight:'800',marginTop:2},tabBarIcon:({focused,color})=><Ionicons name={icons[route.name][focused?0:1]} size={22} color={color}/>})}><Tab.Screen name='Home' component={HomeScreen}/><Tab.Screen name='Booking' component={BookingScreen}/><Tab.Screen name='Teams' component={TeamsScreen} options={{tabBarButton:()=>null}}/><Tab.Screen name='Scores' component={ScorecardsScreen}/><Tab.Screen name='Chat' component={ChatScreen}/><Tab.Screen name='Memories' component={MemoriesScreen}/><Tab.Screen name='Charity' component={CharityScreen} options={{tabBarButton:()=>null}}/><Tab.Screen name='More' component={ProfileScreen}/></Tab.Navigator>}
function Root(){const {ready,user,guest}=useApp();if(!ready)return <Loader/>;if(!user&&!guest)return <AuthScreen/>;return <NavigationContainer theme={{...DefaultTheme,colors:{...DefaultTheme.colors,background:C.bg}}}><Stack.Navigator screenOptions={{headerStyle:{backgroundColor:C.bg},headerTintColor:C.green,headerTitleStyle:{fontWeight:'800'},contentStyle:{backgroundColor:C.bg}}}><Stack.Screen name='Tabs' component={Tabs} options={{headerShown:false}}/><Stack.Screen name='Admin' component={AdminScreen} options={{title:'Admin studio'}}/><Stack.Screen name='EditProfile' component={EditProfileScreen} options={{title:'Edit profile'}}/><Stack.Screen name='Match' component={MatchScreen} options={{title:'Scorecard'}}/><Stack.Screen name='NewMatch' component={NewMatchScreen} options={{title:'New match'}}/><Stack.Screen name='AddMemory' component={AddMemoryScreen} options={{title:'Add a memory'}}/><Stack.Screen name='Attendance' component={AttendanceScreen} options={{title:'Attendance'}}/><Stack.Screen name='CharityEditor' component={CharityEditorScreen} options={{title:'Charity story'}}/></Stack.Navigator></NavigationContainer>}
export default function App(){const [fontsLoaded]=useFonts({...Ionicons.font});if(!fontsLoaded)return null;return <AppProvider><StatusBar style='dark'/><Root/></AppProvider>}

