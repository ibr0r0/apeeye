import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useThemeContext } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './screens/Home';
import Playground from './screens/Playground';
import Docs from './screens/Docs';

export default function Main() {
  const [page, setPage] = useState('Home');
  const { colors } = useThemeContext();
  const { width } = useWindowDimensions();
  const isSmall = width < 500;

  const renderPage = () => {
    switch (page) {
      case 'Home': return <Home navigate={setPage} />;
      case 'Playground': return <Playground />;
      case 'Docs': return <Docs />;
      default: return <Home navigate={setPage} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Navbar currentPage={page} navigate={setPage} />
      <ScrollView contentContainerStyle={[styles.content, isSmall && styles.contentSmall]}>
        {renderPage()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  contentSmall: {
    padding: 20,
    gap: 14,
  },
});
