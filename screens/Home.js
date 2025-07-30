import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  Animated,
  View,
  ScrollView,
} from 'react-native';
import { useThemeContext } from '../context/ThemeContext';

const rotatingTexts = [
    '⚡ Ship frontend fast, no backend needed',
    '🚫 No login, no config, no crap',
    '🧪 Break your app safely',
    '🎯 Devs only, no managers allowed',
    '🤖 Auto-mocks in seconds',
  ];
  

export default function Home({ navigate }) {
  const { colors } = useThemeContext();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  const animateNext = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex((prev) => (prev + 1) % rotatingTexts.length);
      fadeAnim.setValue(0);
      translateAnim.setValue(-20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      animateNext();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: '🧪',
      title: 'Fake Everything',
      desc: 'Mock endpoints, dummy data, even fake errors.',
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      desc: 'Serverless, instant responses for dev testing.',
    },
    {
      icon: '🔧',
      title: 'Zero Setup',
      desc: 'No login, no config. Just hit the endpoint.',
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>🐒 Apeeye</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          The fakest API you'll ever love.
        </Text>
        <Text style={[styles.description, { color: colors.text }]}>
          Build, test, and laugh at fake APIs. No login. No config. Just pure nonsense.
        </Text>
        <Pressable
          onPress={() => navigate('Playground')}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.button,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.buttonText, fontWeight: '600' }}>Get Started →</Text>
        </Pressable>

        <View style={{ height: 40, marginTop: 30, alignItems: 'center' }}>
          <Animated.Text
            style={[
              styles.flippingText,
              {
                color: colors.text,
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              },
            ]}
          >
            {rotatingTexts[index]}
          </Animated.Text>
        </View>

        <View style={styles.featureGrid}>
          {features.map((item, i) => (
            <View
              key={i}
              style={[
                styles.featureBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.featureHeader}>
                <Text style={styles.featureIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.text }]}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 28,
    alignItems: 'center',
    minHeight: 600,
    paddingBottom: 70,
  },
  title: { fontSize: 42, fontWeight: 'bold', marginTop: 25 },
  subtitle: { fontSize: 22, opacity: 0.9, marginTop: 8 },
  description: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 24,
    opacity: 0.8,
    marginTop: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    marginTop: 28,
    alignSelf: 'center',
  },
  flippingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    width: 300,
  },
  featureGrid: {
    marginTop: 38,
    width: '100%',
    gap: 18,
  },
  featureBox: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    marginBottom: 2,
    alignItems: 'center',
  },
  featureHeader: {
    backgroundColor: '#238636',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIcon: {
    fontSize: 26,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 14,
    opacity: 0.75,
    textAlign: 'center',
  },
});

