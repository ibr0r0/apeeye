import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useThemeContext, FONT } from '../context/ThemeContext';

const REPO = 'https://github.com/ibr0r0/apeeye';

function Link({ label, onPress }) {
  const { colors } = useThemeContext();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ hovered }) => ({ opacity: hovered ? 1 : 0.85 })}>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 22, fontFamily: FONT }}>{label}</Text>
    </Pressable>
  );
}

export default function Footer({ navigate }) {
  const { colors } = useThemeContext();
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const open = (url) => () => Linking.openURL(url);

  const columns = [
    { title: 'Apeeye', links: [
      { label: 'Playground', onPress: () => navigate('Playground') },
      { label: 'Docs', onPress: () => navigate('Docs') },
      { label: 'Changelog', onPress: open(`${REPO}/blob/main/CHANGELOG.md`) },
    ] },
    { title: 'Project', links: [
      { label: 'GitHub', onPress: open(REPO) },
      { label: 'Report an issue', onPress: open(`${REPO}/issues/new`) },
      { label: 'MIT License', onPress: open(`${REPO}/blob/main/LICENSE`) },
    ] },
    { title: 'Author', links: [
      { label: 'ibr0r.com', onPress: open('https://ibr0r.com') },
      { label: '@ibr0r on X', onPress: open('https://x.com/ibr0r') },
    ] },
  ];

  return (
    <View style={[styles.footer, { borderTopColor: colors.separator }]}>
      <View style={[styles.columns, { flexDirection: wide ? 'row' : 'column' }]}>
        {columns.map((c) => (
          <View key={c.title} style={styles.column}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', fontFamily: FONT, marginBottom: 6 }}>{c.title}</Text>
            {c.links.map((l) => <Link key={l.label} label={l.label} onPress={l.onPress} />)}
          </View>
        ))}
      </View>
      <Text style={{ color: colors.tertiary, fontSize: 12, fontFamily: FONT, marginTop: 24, textAlign: 'center' }}>
        🐒 Apeeye · Fake APIs, real endpoints. Your data never leaves your browser.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 32, marginTop: 24, alignItems: 'center' },
  columns: { gap: 40, flexWrap: 'wrap', justifyContent: 'center' },
  column: { minWidth: 130, gap: 2, alignItems: 'center' },
});
