import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message ?? "Unknown error";
    return (
      <View style={s.container}>
        <Text style={s.title}>Something went wrong</Text>
        <ScrollView style={s.box}>
          <Text style={s.msg} selectable>{msg}</Text>
        </ScrollView>
        <TouchableOpacity style={s.btn} onPress={() => this.setState({ hasError: false, error: null })}>
          <Text style={s.btnTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0914", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#ef4444", fontSize: 20, fontWeight: "700", marginBottom: 16 },
  box: { maxHeight: 300, backgroundColor: "#1e1b4b", borderRadius: 12, padding: 16, width: "100%", marginBottom: 24 },
  msg: { color: "#d1d5db", fontSize: 13, fontFamily: "monospace" },
  btn: { backgroundColor: "#7c3aed", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
