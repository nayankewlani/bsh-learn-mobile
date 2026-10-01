// ── Numerology — Pythagorean Number Profile ────────────────────────────────────
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../constants";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0d0a1a", card:"#130f26", border:"#2a1d4a", surface:"#1a1430",
  accent:"#8b5cf6", accentSoft:"rgba(139,92,246,0.12)", gold:"#f59e0b",
  text:"#ede9fe", muted:"#7c6fa8", red:"#ef4444", green:"#10b981",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface NMeaning { number:number; title:string; keywords:string[]; description:string; strengths:string[]; challenges:string[]; career:string }
interface NResult {
  name:string; dob:string;
  lifePathNumber:number; destinyNumber:number; soulUrgeNumber:number;
  personalityNumber:number; birthdayNumber:number; personalYearNumber:number;
  maturityNumber:number; balanceNumber:number; hiddenPassionNumbers:number[];
  lifePathMeaning:NMeaning; destinyMeaning:NMeaning; soulUrgeMeaning:NMeaning; personalityMeaning:NMeaning;
  luckyNumbers:number[]; luckyColors:string[]; luckyDays:string[]; luckyGems:string[];
  compatibilityScores:Record<number,number>;
  nameNumberAnalysis:{ currentNameNumber:number; currentNameCompatibility:string; recommendation:string; suggestedFirstLetters:string[] };
  personalYearForecast:{ year:number; number:number; theme:string; opportunities:string; challenges:string; advice:string };
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchNumerology(name:string, dob:string):Promise<NResult> {
  const r = await fetch(`${API_URL}/numerology/calculate`,{
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name,dob}),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error?.message ?? j.message ?? "Failed");
  return j.data;
}

// ── Components ────────────────────────────────────────────────────────────────
function NumberCard({ label, value, sub, accent }:{ label:string; value:number; sub?:string; accent?:boolean }) {
  const isMaster = [11,22,33].includes(value);
  return (
    <View style={[s.numCard, accent&&{borderColor:C.accent+"66",backgroundColor:C.accentSoft}]}>
      <View style={[s.numCircle,isMaster&&{borderColor:C.gold,backgroundColor:C.gold+"15"}]}>
        <Text style={[s.numValue,isMaster&&{color:C.gold}]}>{value}</Text>
      </View>
      <Text style={s.numLabel}>{label}</Text>
      {sub&&<Text style={s.numSub}>{sub}</Text>}
      {isMaster&&<View style={s.masterBadge}><Text style={s.masterTxt}>MASTER</Text></View>}
    </View>
  );
}

function SectionCard({ title, children }:{ title:string; children:React.ReactNode }) {
  return (
    <View style={s.sectionCard}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Tag({ text, col }:{ text:string; col?:string }) {
  const color = col ?? C.accent;
  return <View style={[s.tag,{backgroundColor:color+"20",borderColor:color+"44"}]}>
    <Text style={[s.tagTxt,{color}]}>{text}</Text>
  </View>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Numerology() {
  const router = useRouter();
  const [name, setName]   = useState("");
  const [dob, setDob]     = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData]   = useState<NResult|null>(null);
  const [error, setError] = useState("");
  const [expandLP, setExpandLP] = useState(false);

  const calculate = async() => {
    if (!name.trim()){setError("Enter your full name.");return;}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)){setError("Date must be YYYY-MM-DD.");return;}
    setError(""); setLoading(true);
    try { setData(await fetchNumerology(name.trim(), dob)); }
    catch(e:any){setError(e.message??"Failed.");}
    finally{setLoading(false);}
  };

  const lpm = data?.lifePathMeaning;

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text}/>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>🔢 Numerology</Text>
          <Text style={s.headerSub}>Pythagorean Number Profile</Text>
        </View>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:48}}>

        {/* Form */}
        <View style={s.formCard}>
          <Text style={s.lbl}>Full Name (as given at birth)</Text>
          <TextInput style={s.inp} value={name} onChangeText={setName}
            placeholder="e.g. Pradeep Kumar Sharma" placeholderTextColor={C.muted}
            autoCapitalize="words"/>

          <Text style={[s.lbl,{marginTop:12}]}>Date of Birth</Text>
          <TextInput style={s.inp} value={dob} onChangeText={setDob}
            placeholder="YYYY-MM-DD" placeholderTextColor={C.muted}
            keyboardType="numbers-and-punctuation" maxLength={10}/>

          {error?<Text style={s.err}>{error}</Text>:null}

          <TouchableOpacity style={[s.calcBtn,loading&&{opacity:0.6}]} onPress={calculate} disabled={loading} activeOpacity={0.8}>
            {loading?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.calcBtnTxt}>Calculate Profile</Text>}
          </TouchableOpacity>
        </View>

        {data&&(
          <View style={{gap:14}}>

            {/* Core numbers grid */}
            <SectionCard title="🔢 Core Numbers">
              <View style={s.numGrid}>
                <NumberCard label="Life Path"   value={data.lifePathNumber}    accent/>
                <NumberCard label="Destiny"     value={data.destinyNumber}/>
                <NumberCard label="Soul Urge"   value={data.soulUrgeNumber}/>
                <NumberCard label="Personality" value={data.personalityNumber}/>
                <NumberCard label="Birthday"    value={data.birthdayNumber}/>
                <NumberCard label="Maturity"    value={data.maturityNumber}/>
              </View>
              <View style={s.pyRow}>
                <View style={{flex:1}}>
                  <Text style={s.pyLabel}>Personal Year {data.personalYearForecast.year}</Text>
                  <Text style={s.pyNum}>{data.personalYearNumber}</Text>
                </View>
                <View style={{flex:2}}>
                  <Text style={s.pyTheme}>{data.personalYearForecast.theme}</Text>
                </View>
              </View>
            </SectionCard>

            {/* Life Path deep dive */}
            <SectionCard title={`✨ Life Path ${data.lifePathNumber} — ${lpm?.title}`}>
              <Text style={s.desc}>{lpm?.description}</Text>
              <TouchableOpacity onPress={()=>setExpandLP(v=>!v)} style={{marginTop:8,flexDirection:"row",alignItems:"center",gap:4}}>
                <Text style={{fontSize:12,color:C.accent,fontWeight:"700"}}>{expandLP?"Show less":"Read more"}</Text>
                <Ionicons name={expandLP?"chevron-up":"chevron-down"} size={14} color={C.accent}/>
              </TouchableOpacity>
              {expandLP&&(
                <View style={{marginTop:12,gap:12}}>
                  <View>
                    <Text style={s.subHead}>Key Traits</Text>
                    <View style={{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:6}}>
                      {lpm?.keywords.map(k=><Tag key={k} text={k}/>)}
                    </View>
                  </View>
                  <View>
                    <Text style={s.subHead}>Strengths</Text>
                    {lpm?.strengths.map((str,i)=>(
                      <View key={i} style={{flexDirection:"row",gap:8,marginTop:5}}>
                        <View style={[s.dot,{backgroundColor:C.green}]}/>
                        <Text style={{flex:1,fontSize:12,color:C.text,lineHeight:18}}>{str}</Text>
                      </View>
                    ))}
                  </View>
                  <View>
                    <Text style={s.subHead}>Challenges</Text>
                    {lpm?.challenges.map((ch,i)=>(
                      <View key={i} style={{flexDirection:"row",gap:8,marginTop:5}}>
                        <View style={[s.dot,{backgroundColor:C.red}]}/>
                        <Text style={{flex:1,fontSize:12,color:C.text,lineHeight:18}}>{ch}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[s.careerBox]}>
                    <Text style={s.subHead}>Ideal Careers</Text>
                    <Text style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:18}}>{lpm?.career}</Text>
                  </View>
                </View>
              )}
            </SectionCard>

            {/* Destiny & Soul Urge */}
            <SectionCard title="🌟 Destiny & Inner Self">
              <View style={{gap:12,marginTop:4}}>
                <View style={s.interCard}>
                  <Text style={s.interTitle}>Destiny {data.destinyNumber} — {data.destinyMeaning.title}</Text>
                  <Text style={s.desc}>{data.destinyMeaning.description}</Text>
                </View>
                <View style={s.interCard}>
                  <Text style={s.interTitle}>Soul Urge {data.soulUrgeNumber} — {data.soulUrgeMeaning.title}</Text>
                  <Text style={s.desc}>{data.soulUrgeMeaning.description}</Text>
                </View>
              </View>
            </SectionCard>

            {/* Personal Year forecast */}
            <SectionCard title={`📅 Personal Year ${data.personalYearForecast.year} — ${data.personalYearForecast.theme}`}>
              {[
                {label:"Opportunities",text:data.personalYearForecast.opportunities,col:C.green},
                {label:"Challenges",  text:data.personalYearForecast.challenges,    col:C.red},
                {label:"Advice",      text:data.personalYearForecast.advice,         col:C.accent},
              ].map(({label,text,col})=>(
                <View key={label} style={[s.forecastRow,{borderLeftColor:col}]}>
                  <Text style={[s.forecastLabel,{color:col}]}>{label}</Text>
                  <Text style={s.desc}>{text}</Text>
                </View>
              ))}
            </SectionCard>

            {/* Lucky */}
            <SectionCard title="🍀 Lucky Indicators">
              {[
                {label:"Lucky Numbers", items:data.luckyNumbers.map(String), col:C.gold},
                {label:"Lucky Colors",  items:data.luckyColors,              col:C.accent},
                {label:"Lucky Days",    items:data.luckyDays,                col:C.green},
                {label:"Lucky Gems",    items:data.luckyGems,                col:"#ec4899"},
              ].map(({label,items,col})=>(
                <View key={label} style={{marginBottom:10}}>
                  <Text style={s.subHead}>{label}</Text>
                  <View style={{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:5}}>
                    {items.map(it=><Tag key={it} text={it} col={col}/>)}
                  </View>
                </View>
              ))}
            </SectionCard>

            {/* Name analysis */}
            <SectionCard title="📝 Name Analysis">
              <View style={[s.nameBanner,{borderColor:C.accent+"44"}]}>
                <Text style={{fontSize:12,color:C.muted}}>Current Name Number</Text>
                <Text style={{fontSize:28,fontWeight:"900",color:C.accent,marginVertical:4}}>{data.nameNumberAnalysis.currentNameNumber}</Text>
                <Tag text={data.nameNumberAnalysis.currentNameCompatibility} col={
                  data.nameNumberAnalysis.currentNameCompatibility==="Excellent"?C.green:
                  data.nameNumberAnalysis.currentNameCompatibility==="Good"?C.accent:
                  data.nameNumberAnalysis.currentNameCompatibility==="Neutral"?C.gold:C.red
                }/>
              </View>
              <Text style={[s.desc,{marginTop:10}]}>{data.nameNumberAnalysis.recommendation}</Text>
              {data.nameNumberAnalysis.suggestedFirstLetters.length>0&&(
                <View style={{marginTop:10}}>
                  <Text style={s.subHead}>Suggested Starting Letters</Text>
                  <View style={{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:6}}>
                    {data.nameNumberAnalysis.suggestedFirstLetters.map(l=>(
                      <View key={l} style={[s.letterChip]}>
                        <Text style={{fontSize:13,fontWeight:"900",color:C.gold}}>{l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </SectionCard>

            {/* Compatibility */}
            <SectionCard title="💞 Compatibility by Life Path">
              <View style={{gap:8,marginTop:8}}>
                {Object.entries(data.compatibilityScores).map(([num,score])=>{
                  const n=Number(num); const sc=Number(score);
                  const col=sc>=80?C.green:sc>=65?C.accent:C.red;
                  return (
                    <View key={n} style={{flexDirection:"row",alignItems:"center",gap:10}}>
                      <Text style={{fontSize:13,fontWeight:"900",color:C.text,width:20,textAlign:"center"}}>{n}</Text>
                      <View style={{flex:1,height:6,backgroundColor:C.surface,borderRadius:3,overflow:"hidden"}}>
                        <View style={{width:`${sc}%`,height:6,backgroundColor:col,borderRadius:3}}/>
                      </View>
                      <Text style={{fontSize:11,fontWeight:"700",color:col,width:36,textAlign:"right"}}>{sc}%</Text>
                    </View>
                  );
                })}
              </View>
            </SectionCard>

            {/* Hidden passions */}
            {data.hiddenPassionNumbers.length>0&&(
              <SectionCard title="🔥 Hidden Passions">
                <Text style={s.desc}>The numbers that appear most frequently in your name reveal your natural talents and deepest drives.</Text>
                <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:10}}>
                  {data.hiddenPassionNumbers.map(n=>(
                    <View key={n} style={[s.numCircle,{borderColor:C.gold,backgroundColor:C.gold+"18"}]}>
                      <Text style={[s.numValue,{color:C.gold}]}>{n}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            )}

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
  err:{marginTop:8,color:C.red,fontSize:12},
  calcBtn:{marginTop:14,backgroundColor:C.accent,borderRadius:12,paddingVertical:14,alignItems:"center"},
  calcBtnTxt:{color:"#fff",fontSize:15,fontWeight:"800"},
  sectionCard:{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:16},
  sectionTitle:{fontSize:14,fontWeight:"900",color:C.text,marginBottom:12,letterSpacing:0.2},
  numGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,justifyContent:"space-between"},
  numCard:{width:"30%",backgroundColor:C.surface,borderRadius:14,borderWidth:1,borderColor:C.border,padding:10,alignItems:"center",gap:4},
  numCircle:{width:52,height:52,borderRadius:26,borderWidth:2,borderColor:C.accent+"66",backgroundColor:C.accentSoft,alignItems:"center",justifyContent:"center"},
  numValue:{fontSize:22,fontWeight:"900",color:C.accent},
  numLabel:{fontSize:10,fontWeight:"700",color:C.muted,textAlign:"center",textTransform:"uppercase",letterSpacing:0.4},
  numSub:{fontSize:9,color:C.muted,textAlign:"center"},
  masterBadge:{backgroundColor:C.gold+"22",borderRadius:6,paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:C.gold+"55"},
  masterTxt:{fontSize:8,fontWeight:"900",color:C.gold,letterSpacing:0.5},
  pyRow:{flexDirection:"row",alignItems:"flex-start",gap:14,marginTop:14,paddingTop:14,borderTopWidth:1,borderColor:C.border},
  pyLabel:{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.5},
  pyNum:{fontSize:32,fontWeight:"900",color:C.accent,marginTop:2},
  pyTheme:{fontSize:13,fontWeight:"700",color:C.text,lineHeight:18,marginTop:4},
  desc:{fontSize:13,color:C.muted,lineHeight:19},
  subHead:{fontSize:11,fontWeight:"800",color:C.text,textTransform:"uppercase",letterSpacing:0.5},
  interCard:{backgroundColor:C.surface,borderRadius:12,borderWidth:1,borderColor:C.border,padding:12},
  interTitle:{fontSize:13,fontWeight:"800",color:C.accent,marginBottom:6},
  forecastRow:{borderLeftWidth:3,borderLeftColor:C.accent,paddingLeft:12,marginBottom:12},
  forecastLabel:{fontSize:11,fontWeight:"800",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4},
  tag:{borderRadius:20,paddingHorizontal:10,paddingVertical:4,borderWidth:1},
  tagTxt:{fontSize:11,fontWeight:"700"},
  careerBox:{backgroundColor:C.surface,borderRadius:10,padding:12,borderWidth:1,borderColor:C.border},
  dot:{width:6,height:6,borderRadius:3,marginTop:6,flexShrink:0},
  nameBanner:{borderRadius:12,borderWidth:1,padding:14,alignItems:"center",backgroundColor:C.surface},
  letterChip:{width:36,height:36,borderRadius:18,backgroundColor:C.gold+"18",borderWidth:1,borderColor:C.gold+"44",alignItems:"center",justifyContent:"center"},
});
