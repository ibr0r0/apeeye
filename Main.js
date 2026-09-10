import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useThemeContext } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './screens/Home';
import Playground from './screens/Playground';
import Docs from './screens/Docs';

export default function Main() {
  const [page, setPage] = useState('Home');
  const { colors } = useThemeContext();
  const { width } = useWindowDimensions();
  const pad = width < 600 ? 16 : 24;

  const renderPage = () => {
    switch (page) {
      case 'Playground': return <Playground key="pg" />;
      case 'Docs': return <Docs key="docs" navigate={setPage} />;
      default: return <Home key="home" navigate={setPage} />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={styles.content}>
        <Navbar currentPage={page} navigate={setPage} />
        <View style={[styles.page, { paddingHorizontal: pad }]}>
          <View style={styles.container}>{renderPage()}</View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 80 },
  page: { paddingTop: 28 },
  container: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
});
