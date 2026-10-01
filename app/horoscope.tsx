// ── Horoscope — Daily Zodiac Readings ─────────────────────────────────────────
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../constants";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0c0a14", card:"#12101f", border:"#1e1a3a", surface:"#181628",
  accent:"#f59e0b", accentSoft:"rgba(245,158,11,0.12)", text:"#fef3c7",
  muted:"#6b5e8a", gold:"#f59e0b", green:"#10b981", red:"#ef4444", blue:"#60a5fa",
};

const ELEMENT_COLOR:Record<string,string> = { Fire:"#f97316", Earth:"#84cc16", Air:"#38bdf8", Water:"#818cf8" };

// ── Types ─────────────────────────────────────────────────────────────────────
interface SignInfo { name:string; symbol:string; element:string; quality:string; ruler:string; dates:string }
interface HoroscopeData {
  sign:string; symbol:string; element:string; quality:string; ruler:string; dates:string; period:string; date:string;
  horoscope:{ general:string; love:string; career:string; health:string; overallRating:number; loveRating:number; careerRating:number; healthRating:number };
  lucky:{ numbers:number[]; colors:string[]; day:string };
  allSigns:SignInfo[];
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchHoroscope(sign:string, period:string):Promise<HoroscopeData> {
  const r = await fetch(`${API_URL}/horoscope/${sign}?period=${period}`);
  const j = await r.json();
  if (!j.success) throw new Error(j.message ?? "Failed");
  return j.data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function RatingBar({ label, value, col }:{ label:string; value:number; col:string }) {
  const pct = Math.round((value/10)*100);
  return (
    <View style={{marginBottom:10}}>
      <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:4}}>
        <Text style={{fontSize:12,fontWeight:"700",color:C.muted}}>{label}</Text>
        <Text style={{fontSize:12,fontWeight:"900",color:col}}>{value}/10</Text>
      </View>
      <View style={{height:5,backgroundColor:C.surface,borderRadius:3,overflow:"hidden"}}>
        <View style={{width:`${pct}%`,height:5,backgroundColor:col,borderRadius:3}}/>
      </View>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Horoscope() {
  const router = useRouter();
  const [signs, setSigns]       = useState<SignInfo[]>([]);
  const [selSign, setSelSign]   = useState<string|null>(null);
  const [period, setPeriod]     = useState<"daily"|"weekly"|"monthly">("daily");
  const [data, setData]         = useState<HoroscopeData|null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Load sign list on mount
  useEffect(()=>{
    fetch(`${API_URL}/horoscope/`)
      .then(r=>r.json())
      .then(j=>{ if(j.success)setSigns(j.data.signs); })
      .catch(()=>{});
  },[]);

  const loadHoroscope = async(sign:string, p:string)=>{
    setLoading(true); setError("");
    try { setData(await fetchHoroscope(sign, p)); }
    catch(e:any){setError(e.message??"Failed.");}
    finally{setLoading(false);}
  };

  const pickSign = (sign:string)=>{
    setSelSign(sign); setData(null);
    loadHoroscope(sign, period);
  };

  const changePeriod = (p:"daily"|"weekly"|"monthly")=>{
    setPeriod(p);
    if (selSign) loadHoroscope(selSign, p);
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text}/>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>☽ Horoscope</Text>
          <Text style={s.headerSub}>Daily zodiac readings</Text>
        </View>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:48}}>

        {/* Period selector */}
        <View style={{paddingHorizontal:16,paddingTop:16}}>
          <View style={s.tabRow}>
            {(["daily","weekly","monthly"] as const).map(p=>(
              <TouchableOpacity key={p} style={[s.tabBtn,period===p&&s.tabActive]} onPress={()=>changePeriod(p)}>
                <Text style={[s.tabTxt,period===p&&{color:C.accent,fontWeight:"800"}]}>
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign picker grid */}
        <View style={{paddingHorizontal:16,marginTop:16}}>
          <Text style={{fontSize:12,fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Select Your Sign</Text>
          <View style={s.signGrid}>
            {signs.map(sg=>{
              const elCol = ELEMENT_COLOR[sg.element] ?? C.accent;
              const active = selSign===sg.name;
              return (
                <TouchableOpacity key={sg.name} style={[s.signChip,{borderColor:active?elCol:C.border,backgroundColor:active?elCol+"18":C.card}]}
                  onPress={()=>pickSign(sg.name)} activeOpacity={0.7}>
                  <Text style={{fontSize:20}}>{sg.symbol}</Text>
                  <Text style={{fontSize:11,fontWeight:"800",color:active?elCol:C.muted,marginTop:2}}>{sg.name.slice(0,3).toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Loading */}
        {loading&&<View style={{alignItems:"center",padding:32}}><ActivityIndicator color={C.accent} size="large"/></View>}
        {error?<Text style={{color:C.red,textAlign:"center",padding:16,fontSize:13}}>{error}</Text>:null}

        {/* Horoscope result */}
        {data&&!loading&&(
          <View style={{paddingHorizontal:16,gap:14,marginTop:16}}>

            {/* Sign hero */}
            <View style={[s.heroCard,{borderColor:ELEMENT_COLOR[data.element]+"55"}]}>
              <View style={{flexDirection:"row",alignItems:"center",gap:14}}>
                <View style={[s.symbolBox,{backgroundColor:ELEMENT_COLOR[data.element]+"22",borderColor:ELEMENT_COLOR[data.element]+"44"}]}>
                  <Text style={{fontSize:38}}>{data.symbol}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:24,fontWeight:"900",color:C.text}}>{data.sign}</Text>
                  <Text style={{fontSize:11,color:C.muted,marginTop:1}}>{data.dates}</Text>
                  <View style={{flexDirection:"row",gap:8,marginTop:6,flexWrap:"wrap"}}>
                    {[data.element, data.quality, `Ruler: ${data.ruler}`].map(t=>(
                      <View key={t} style={[s.tag,{borderColor:ELEMENT_COLOR[data.element]+"44",backgroundColor:ELEMENT_COLOR[data.element]+"18"}]}>
                        <Text style={{fontSize:10,fontWeight:"700",color:ELEMENT_COLOR[data.element]}}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Ratings */}
            <View style={s.card}>
              <Text style={s.cardTitle}>⭐ Overview Ratings</Text>
              <View style={{marginTop:12}}>
                <RatingBar label="Overall"  value={data.horoscope.overallRating} col={C.gold}/>
                <RatingBar label="Love ❤️" value={data.horoscope.loveRating}    col="#f43f5e"/>
                <RatingBar label="Career 💼" value={data.horoscope.careerRating} col={C.blue}/>
                <RatingBar label="Health 🌿" value={data.horoscope.healthRating} col={C.green}/>
              </View>
            </View>

            {/* Readings */}
            {[
              {icon:"🌟",title:"General", text:data.horoscope.general, col:C.gold},
              {icon:"❤️", title:"Love & Relationships", text:data.horoscope.love, col:"#f43f5e"},
              {icon:"💼", title:"Career & Finance", text:data.horoscope.career, col:C.blue},
              {icon:"🌿", title:"Health & Wellness", text:data.horoscope.health, col:C.green},
            ].map(({icon,title,text,col})=>(
              <View key={title} style={[s.card,{borderLeftWidth:3,borderLeftColor:col}]}>
                <Text style={{fontSize:13,fontWeight:"800",color:col,marginBottom:8}}>{icon} {title}</Text>
                <Text style={{fontSize:13,color:C.text,lineHeight:20}}>{text}</Text>
              </View>
            ))}

            {/* Lucky */}
            <View style={s.card}>
              <Text style={s.cardTitle}>🍀 Today's Lucky Indicators</Text>
              <View style={{flexDirection:"row",gap:12,marginTop:12,flexWrap:"wrap"}}>
                <View style={s.luckyBox}>
                  <Text style={{fontSize:10,color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.4}}>Lucky Numbers</Text>
                  <View style={{flexDirection:"row",gap:6,marginTop:6}}>
                    {data.lucky.numbers.map(n=>(
                      <View key={n} style={[s.numBubble,{backgroundColor:C.gold+"22",borderColor:C.gold+"44"}]}>
                        <Text style={{fontSize:13,fontWeight:"900",color:C.gold}}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.luckyBox}>
                  <Text style={{fontSize:10,color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.4}}>Lucky Colors</Text>
                  <View style={{flexDirection:"row",gap:6,marginTop:6}}>
                    {data.lucky.colors.map(c=>(
                      <View key={c} style={[s.colorChip,{backgroundColor:ELEMENT_COLOR[data.element]+"22",borderColor:ELEMENT_COLOR[data.element]+"44"}]}>
                        <Text style={{fontSize:11,fontWeight:"700",color:ELEMENT_COLOR[data.element]}}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.luckyBox}>
                  <Text style={{fontSize:10,color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.4}}>Lucky Day</Text>
                  <Text style={{fontSize:14,fontWeight:"900",color:C.green,marginTop:6}}>{data.lucky.day}</Text>
                </View>
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:{flexDirection:"row",alignItems:"center",gap:14,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderColor:C.border},
  backBtn:{padding:6},
  headerTitle:{fontSize:20,fontWeight:"900",color:C.text},
  headerSub:{fontSize:11,color:C.muted,marginTop:1},
  tabRow:{flexDirection:"row",backgroundColor:C.card,borderRadius:10,padding:3,borderWidth:1,borderColor:C.border},
  tabBtn:{flex:1,paddingVertical:9,alignItems:"center",borderRadius:8},
  tabActive:{backgroundColor:C.surface,borderWidth:1,borderColor:C.accent+"44"},
  tabTxt:{fontSize:12,fontWeight:"600",color:C.muted},
  signGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,justifyContent:"flex-start"},
  signChip:{width:"22%",backgroundColor:C.card,borderRadius:12,borderWidth:1,padding:10,alignItems:"center",gap:2},
  heroCard:{backgroundColor:C.card,borderRadius:16,borderWidth:1,padding:16},
  symbolBox:{width:72,height:72,borderRadius:20,borderWidth:1,alignItems:"center",justifyContent:"center"},
  tag:{borderRadius:20,paddingHorizontal:8,paddingVertical:3,borderWidth:1},
  card:{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:16},
  cardTitle:{fontSize:13,fontWeight:"800",color:C.text,marginBottom:2},
  luckyBox:{flex:1,minWidth:"45%"},
  numBubble:{width:34,height:34,borderRadius:17,borderWidth:1,alignItems:"center",justifyContent:"center"},
  colorChip:{borderRadius:20,paddingHorizontal:10,paddingVertical:4,borderWidth:1},
});
