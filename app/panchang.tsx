// ── Panchang — Vedic Daily Almanac ────────────────────────────────────────────
import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../constants";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0a0d14", card:"#111827", border:"#1f2d3d", surface:"#18213a",
  accent:"#10b981", gold:"#f59e0b", text:"#e2e8f5", muted:"#64748b",
  red:"#ef4444", violet:"#8b5cf6", blue:"#3b82f6",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Place {
  osmId:string; displayName:string; timezone:string; utcOffset:string;
  latitude:number; longitude:number;
}
interface Choghadiya {
  index:number; type:"day"|"night"; name:string; ruler:string;
  nature:"auspicious"|"inauspicious"|"neutral"; start:string; end:string; active:boolean;
}
interface PanchangData {
  date:string; weekday:string;
  location:{ latitude:number; longitude:number; timezone:string; utcOffset:string };
  tithi:{ name:string; paksha:string; lord:string; endTime:string };
  nakshatra:{ name:string; lord:string; pada:number; endTime:string };
  yoga:{ name:string; lord:string; endTime:string };
  karana:{ name:string; type:string; endTime:string };
  vara:{ name:string; lord:string; significance:string };
  sunrise:string; sunset:string; moonrise:string; moonset:string;
  rahuKaal:{ start:string; end:string; active:boolean };
  yamaganda:{ start:string; end:string; active:boolean };
  gulikaKaal:{ start:string; end:string; active:boolean };
  abhijitMuhurta:{ start:string; end:string; active:boolean };
  choghadiya:Choghadiya[];
  auspiciousness:string;
  auspiciousnessReason:string;
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchPlaces(q:string):Promise<Place[]> {
  const r = await fetch(`${API_URL}/kundli/places?q=${encodeURIComponent(q)}`);
  const j = await r.json(); return j.data ?? [];
}
async function fetchPanchang(date:string, tz:string, lat:number, lon:number):Promise<PanchangData> {
  const url = `${API_URL}/panchang?date=${date}&lat=${lat}&lon=${lon}&tz=${encodeURIComponent(tz)}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!j.success) throw new Error(j.error?.message ?? j.message ?? "Failed");
  return j.data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function today():string { return new Date().toISOString().slice(0,10); }
function useDebounce<T>(v:T, delay:number):T {
  const [dv,setDv]=useState(v); const t=useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(()=>{
    t.current=setTimeout(()=>setDv(v),delay);
    return()=>clearTimeout(t.current!);
  },[v,delay]); return dv;
}

const NAT_COLOR:Record<string,string>={auspicious:C.accent,inauspicious:C.red,neutral:C.gold};

function QBadge({ label }:{ label:string }) {
  const col = label==="Highly Auspicious"?C.accent:label==="Auspicious"?C.accent:label==="Inauspicious"?C.red:C.gold;
  return <View style={{backgroundColor:col+"22",borderRadius:10,paddingHorizontal:8,paddingVertical:2,borderWidth:1,borderColor:col+"55"}}>
    <Text style={{fontSize:10,fontWeight:"700",color:col}}>{label}</Text>
  </View>;
}

function InfoRow({ icon, title, value, sub }:{ icon:string; title:string; value:string; sub?:string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={{flex:1}}>
        <Text style={s.infoLabel}>{title}</Text>
        <Text style={s.infoValue}>{value}</Text>
        {sub?<Text style={s.infoSub}>{sub}</Text>:null}
      </View>
    </View>
  );
}

function TimeRow({icon,label,start,end,active}:{icon:string;label:string;start:string;end:string;active?:boolean}) {
  return (
    <View style={[s.timeRow,active&&{backgroundColor:C.surface,borderRadius:10,paddingHorizontal:10}]}>
      <Text style={s.timeIcon}>{icon}</Text>
      <Text style={s.timeLabel}>{label}</Text>
      {active&&<View style={{backgroundColor:C.red+"22",borderRadius:4,paddingHorizontal:5,paddingVertical:1}}><Text style={{fontSize:9,fontWeight:"800",color:C.red}}>NOW</Text></View>}
      <View style={{flex:1}}/>
      <Text style={[s.timeVal,active&&{color:C.red}]}>{start}–{end}</Text>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Panchang() {
  const router = useRouter();
  const [dateStr, setDateStr]   = useState(today());
  const [placeQ, setPlaceQ]     = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [selPlace, setSelPlace] = useState<Place|null>(null);
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState<PanchangData|null>(null);
  const [error, setError]       = useState("");
  const [chogTab, setChogTab]   = useState<"day"|"night">("day");

  const dqry = useDebounce(placeQ, 380);
  React.useEffect(()=>{
    if (dqry.length<2||selPlace){setSuggestions([]);return;}
    fetchPlaces(dqry).then(setSuggestions).catch(()=>setSuggestions([]));
  },[dqry,selPlace]);

  const pickPlace = useCallback((p:Place)=>{
    setSelPlace(p); setPlaceQ(p.displayName); setSuggestions([]);
  },[]);

  const calculate = async()=>{
    if (!selPlace){setError("Please select a location.");return;}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)){setError("Date must be YYYY-MM-DD.");return;}
    setError(""); setLoading(true);
    try {
      const r = await fetchPanchang(dateStr, selPlace.timezone, selPlace.latitude, selPlace.longitude);
      setData(r);
    } catch(e:any){setError(e.message??"Calculation failed.");}
    finally{setLoading(false);}
  };

  const dayChog   = data?.choghadiya.filter(c=>c.type==="day")  ?? [];
  const nightChog = data?.choghadiya.filter(c=>c.type==="night") ?? [];
  const chogRows  = chogTab==="day" ? dayChog : nightChog;

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text}/>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>🕉 Panchang</Text>
          <Text style={s.headerSub}>Vedic Daily Almanac · Lahiri Ayanamsa</Text>
        </View>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:40}} keyboardShouldPersistTaps="handled">

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <View style={s.formCard}>
          <Text style={s.lbl}>Date</Text>
          <TextInput style={s.inp} value={dateStr} onChangeText={setDateStr}
            placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} maxLength={10}/>

          <Text style={[s.lbl,{marginTop:12}]}>Location</Text>
          <View style={{position:"relative"}}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
              <TextInput style={[s.inp,{flex:1,marginBottom:0}]}
                value={placeQ} onChangeText={t=>{setPlaceQ(t);if(selPlace)setSelPlace(null);}}
                placeholder="Type city name…" placeholderTextColor={C.muted}/>
              {selPlace&&<TouchableOpacity onPress={()=>{setSelPlace(null);setPlaceQ("");}} style={{padding:10}}>
                <Ionicons name="close-circle" size={18} color={C.muted}/>
              </TouchableOpacity>}
            </View>
            {suggestions.length>0&&!selPlace&&(
              <View style={s.dropBox}>
                {suggestions.slice(0,5).map(p=>(
                  <TouchableOpacity key={p.osmId} onPress={()=>pickPlace(p)} style={s.dropItem}>
                    <Text style={s.dropName} numberOfLines={1}>{p.displayName}</Text>
                    <Text style={s.dropSub}>{p.timezone} · {p.utcOffset}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {selPlace&&(
            <View style={{flexDirection:"row",alignItems:"center",gap:5,marginTop:6}}>
              <Ionicons name="checkmark-circle" size={13} color={C.accent}/>
              <Text style={{fontSize:11,color:C.accent}}>{selPlace.timezone} ({selPlace.utcOffset})</Text>
            </View>
          )}

          {error?<Text style={s.err}>{error}</Text>:null}

          <TouchableOpacity style={[s.calcBtn,loading&&{opacity:0.6}]} onPress={calculate} disabled={loading} activeOpacity={0.8}>
            {loading?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.calcBtnTxt}>Show Panchang</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {data&&(
          <View style={{gap:14}}>

            {/* Auspiciousness banner */}
            <View style={[s.card,{flexDirection:"row",alignItems:"center",gap:12}]}>
              <Text style={{fontSize:28}}>
                {data.auspiciousness==="Highly Auspicious"?"🌟":data.auspiciousness==="Auspicious"?"✨":data.auspiciousness==="Inauspicious"?"⚠️":"☁️"}
              </Text>
              <View style={{flex:1}}>
                <QBadge label={data.auspiciousness}/>
                <Text style={{fontSize:12,color:C.muted,marginTop:4}}>{data.auspiciousnessReason}</Text>
              </View>
            </View>

            {/* Celestial timings */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>🌄 Celestial Timings</Text>
              <View style={{flexDirection:"row",gap:10,marginTop:10}}>
                {[
                  {icon:"🌅",label:"Sunrise",val:data.sunrise,col:C.gold},
                  {icon:"🌇",label:"Sunset",val:data.sunset,col:C.violet},
                  {icon:"🌕",label:"Moonrise",val:data.moonrise,col:"#a78bfa"},
                  {icon:"🌑",label:"Moonset",val:data.moonset,col:C.muted},
                ].map(i=>(
                  <View key={i.label} style={[s.sunBox,{borderColor:i.col+"44"}]}>
                    <Text style={{fontSize:18}}>{i.icon}</Text>
                    <Text style={{fontSize:9,fontWeight:"700",color:i.col,textTransform:"uppercase",letterSpacing:0.5}}>{i.label}</Text>
                    <Text style={{fontSize:14,fontWeight:"900",color:i.col}}>{i.val}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pancha Anga */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>📿 Pancha Anga (Five Limbs)</Text>
              <View style={{gap:0,marginTop:6}}>
                <InfoRow icon="📅" title={`Vara · ${data.weekday}`} value={data.vara.name} sub={`Lord: ${data.vara.lord} · ${data.vara.significance}`}/>
                <InfoRow icon="🌙" title={`Tithi · ${data.tithi.paksha}`} value={data.tithi.name} sub={`Lord: ${data.tithi.lord} · ends ~${data.tithi.endTime}`}/>
                <InfoRow icon="⭐" title="Nakshatra" value={data.nakshatra.name} sub={`Pada ${data.nakshatra.pada} · Lord: ${data.nakshatra.lord} · ends ~${data.nakshatra.endTime}`}/>
                <InfoRow icon="✨" title="Yoga" value={data.yoga.name} sub={`Lord: ${data.yoga.lord} · ends ~${data.yoga.endTime}`}/>
                <InfoRow icon="🌀" title="Karana" value={data.karana.name} sub={`${data.karana.type} · ends ~${data.karana.endTime}`}/>
              </View>
            </View>

            {/* Inauspicious periods */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>⚠️ Inauspicious Periods</Text>
              <View style={{gap:10,marginTop:10}}>
                <TimeRow icon="🐍" label="Rahu Kaal"   start={data.rahuKaal.start}   end={data.rahuKaal.end}   active={data.rahuKaal.active}/>
                <TimeRow icon="👁" label="Yamagandam"  start={data.yamaganda.start}  end={data.yamaganda.end}  active={data.yamaganda.active}/>
                <TimeRow icon="⚫" label="Gulika Kaal" start={data.gulikaKaal.start} end={data.gulikaKaal.end} active={data.gulikaKaal.active}/>
              </View>
              <View style={{marginTop:12,paddingTop:12,borderTopWidth:1,borderColor:C.border}}>
                <TimeRow icon="🌟" label="Abhijit Muhurta" start={data.abhijitMuhurta.start} end={data.abhijitMuhurta.end} active={data.abhijitMuhurta.active}/>
                <Text style={{fontSize:11,color:C.muted,marginTop:4,marginLeft:34}}>Most auspicious mid-day window</Text>
              </View>
            </View>

            {/* Choghadiya */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>⏱ Choghadiya</Text>
              <View style={s.tabRow}>
                {(["day","night"] as const).map(tab=>(
                  <TouchableOpacity key={tab} style={[s.tabBtn,chogTab===tab&&s.tabActive]} onPress={()=>setChogTab(tab)}>
                    <Text style={[s.tabTxt,chogTab===tab&&{color:C.accent,fontWeight:"800"}]}>{tab==="day"?"☀️ Day":"🌙 Night"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{gap:6,marginTop:10}}>
                {chogRows.map((row,i)=>{
                  const col=NAT_COLOR[row.nature]??C.muted;
                  return (
                    <View key={i} style={[s.chogRow,{borderColor:col+"33"},row.active&&{borderColor:col,backgroundColor:col+"0f"}]}>
                      <View style={[s.chogDot,{backgroundColor:col}]}/>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:"800",color:col}}>{row.name}</Text>
                        <Text style={{fontSize:10,color:C.muted}}>{row.nature} · {row.ruler}</Text>
                      </View>
                      {row.active&&<View style={{backgroundColor:C.accent+"22",borderRadius:4,paddingHorizontal:5,paddingVertical:1}}><Text style={{fontSize:9,fontWeight:"800",color:C.accent}}>NOW</Text></View>}
                      <Text style={{fontSize:11,fontWeight:"700",color:C.muted,marginLeft:8}}>{row.start}–{row.end}</Text>
                    </View>
                  );
                })}
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
  formCard:{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:16,marginBottom:14},
  lbl:{fontSize:11,fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6},
  inp:{backgroundColor:C.surface,borderWidth:1.5,borderColor:C.border,borderRadius:10,paddingHorizontal:14,paddingVertical:11,color:C.text,fontSize:14,marginBottom:4},
  dropBox:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:10,overflow:"hidden",marginTop:4,zIndex:100},
  dropItem:{padding:12,borderBottomWidth:1,borderColor:C.border},
  dropName:{fontSize:13,fontWeight:"600",color:C.text},
  dropSub:{fontSize:11,color:C.muted,marginTop:2},
  err:{marginTop:8,color:C.red,fontSize:12},
  calcBtn:{marginTop:16,backgroundColor:C.accent,borderRadius:12,paddingVertical:14,alignItems:"center"},
  calcBtnTxt:{color:"#fff",fontSize:15,fontWeight:"800"},
  card:{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:16},
  sectionTitle:{fontSize:13,fontWeight:"800",color:C.text,letterSpacing:0.3},
  sunBox:{flex:1,backgroundColor:C.surface,borderRadius:12,borderWidth:1,padding:8,alignItems:"center",gap:3},
  infoRow:{flexDirection:"row",alignItems:"flex-start",gap:10,paddingVertical:10,borderBottomWidth:1,borderColor:C.border+"55"},
  infoIcon:{fontSize:18,marginTop:2},
  infoLabel:{fontSize:10,fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3},
  infoValue:{fontSize:14,fontWeight:"800",color:C.text},
  infoSub:{fontSize:11,color:C.muted,marginTop:2},
  timeRow:{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:6},
  timeIcon:{fontSize:16,width:24,textAlign:"center"},
  timeLabel:{fontSize:13,fontWeight:"700",color:C.text},
  timeVal:{fontSize:12,fontWeight:"700",color:C.gold},
  tabRow:{flexDirection:"row",backgroundColor:C.surface,borderRadius:10,padding:3,marginTop:10,gap:3},
  tabBtn:{flex:1,paddingVertical:8,alignItems:"center",borderRadius:8},
  tabActive:{backgroundColor:C.card,borderWidth:1,borderColor:C.accent+"44"},
  tabTxt:{fontSize:12,fontWeight:"600",color:C.muted},
  chogRow:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:C.surface,borderRadius:10,borderWidth:1,padding:10},
  chogDot:{width:8,height:8,borderRadius:4,flexShrink:0},
});
