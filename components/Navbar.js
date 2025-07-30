import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeContext } from '../context/ThemeContext';

export default function Navbar({ currentPage, navigate }) {
  const { colors, scheme, mode, setMode } = useThemeContext();
  const { width } = useWindowDimensions();

  const isSmall = width < 600; 
  const links = ['Home', 'Playground', 'Docs'];

  const cycleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };;

  const content = (
    <View style={[styles.inner, isSmall && styles.innerStacked]}>
      <Text style={[styles.logo, { color: colors.text }]}>🐒 Apeeye</Text>

      <View style={[styles.links, isSmall && styles.linksStacked]}>
        {links.map((link) => (
          <Pressable key={link} onPress={() => navigate(link)}>
            <Text
              style={[
                styles.link,
                {
                  color: colors.text,
                  opacity: currentPage === link ? 1 : 0.6,
                  textDecorationLine: currentPage === link ? 'underline' : 'none',
                },
              ]}
            >
              {link}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={cycleTheme} style={styles.iconButton}>
  <Text style={{ fontSize: 20 }}>
    {mode === 'dark' ? '🌞' : '🌚'}
  </Text>
</Pressable>

    </View>
  );

  const sharedStyle = {
    backgroundColor: `${colors.background}cc`,
    borderBottomColor: colors.text + '20',
  };

  return Platform.select({
    web: (
      <View style={[styles.navbarWeb, sharedStyle]}>
        {content}
      </View>
    ),
    default: (
      <BlurView
        intensity={90}
        tint={colors.background === '#0d1117' ? 'dark' : 'light'}
        style={[styles.navbarNative]}
      >
        {content}
      </BlurView>
    ),
  });
}

const styles = StyleSheet.create({
  navbarNative: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'absolute',
    top: 0,
    zIndex: 100,
  },
  navbarWeb: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)', 
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  innerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  logo: { fontWeight: 'bold', fontSize: 18 },
  links: {
    flexDirection: 'row',
    gap: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  linksStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  link: {
    fontSize: 14,
    marginHorizontal: 10,
  },
});
