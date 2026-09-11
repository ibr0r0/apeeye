import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useThemeContext, FONT } from '../context/ThemeContext';
import { useWorkspace } from '../src/WorkspaceContext';
import { Body, Button, Card, CodeBlock, CopyButton, Icon, Title, useFadeIn } from '../components/ui';
import Footer from '../components/Footer';

const FEATURES = [
  { icon: 'bolt', title: 'Instant endpoints', body: 'Name a collection and it’s a live REST URL with GET, POST, PUT, PATCH and DELETE.' },
  { icon: 'lock', title: 'Private by design', body: 'Everything stays in your browser. The relay stores nothing, so there’s nothing to leak.' },
  { icon: 'globe', title: 'Callable from anywhere', body: 'Fetch it from your app, hit it with curl or Postman, or hand the URL to a teammate.' },
];

const STEPS = [
  { n: 1, title: 'Create a collection', body: 'users, posts, whatever your UI needs.' },
  { n: 2, title: 'Add a few records', body: 'Use the fields builder, paste JSON, or POST from code.' },
  { n: 3, title: 'Point your app at it', body: 'Copy the URL and fetch. Keep the tab open and it just works.' },
];

export default function Home({ navigate }) {
  const { colors } = useThemeContext();
  const { workspaceUrl } = useWorkspace();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const grid = useFadeIn(700);

  const monkey = useRef(new Animated.Value(0)).current;
  const nod = useRef(new Animated.Value(0)).current;
  const line1 = useRef(new Animated.Value(0)).current;
  const line2 = useRef(new Animated.Value(0)).current;
  const sub = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = (v, delay) => Animated.timing(v, { toValue: 1, duration: 560, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([
      Animated.spring(monkey, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 16 }),
      rise(line1, 180), rise(line2, 280), rise(sub, 400), rise(cta, 500), rise(card, 640),
    ]).start();
  }, [monkey, line1, line2, sub, cta, card]);

  const nodOnce = () => {
    nod.setValue(0);
    Animated.spring(nod, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 18 }).start();
  };

  const riseStyle = (v) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] });
  const headline = { color: colors.text, fontSize: wide ? 56 : 40, fontWeight: '700', letterSpacing: wide ? -1.6 : -1, lineHeight: wide ? 62 : 46, textAlign: 'center', fontFamily: FONT };

  return (
    <View style={{ gap: 56, paddingTop: 24 }}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Pressable onHoverIn={nodOnce} onPress={nodOnce} accessibilityLabel="Apeeye">
          <Animated.Text style={{
            fontSize: wide ? 64 : 48, lineHeight: wide ? 76 : 58,
            opacity: monkey,
            transform: [
              { scale: monkey.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: monkey.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['-18deg', '8deg', '0deg'] }) },
              { rotate: nod.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-10deg', '0deg'] }) },
              { scale: nod.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] }) },
            ],
          }}>🐒</Animated.Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Animated.Text style={[headline, riseStyle(line1)]}>Fake APIs.</Animated.Text>
          <Animated.Text style={[headline, riseStyle(line2)]}>Real endpoints.</Animated.Text>
        </View>
        <Animated.View style={riseStyle(sub)}>
          <Body secondary style={{ fontSize: wide ? 21 : 17, lineHeight: wide ? 30 : 25, textAlign: 'center', maxWidth: 560 }}>
            Create mock REST endpoints in seconds. No login, no config, no database. Your data never leaves your browser.
          </Body>
        </Animated.View>
        <Animated.View style={[riseStyle(cta), { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }]}>
          <Button title="Open Playground" iconRight="arrowRight" size="lg" onPress={() => navigate('Playground')} />
          <Button title="Read the docs" size="lg" variant="secondary" onPress={() => navigate('Docs')} />
        </Animated.View>
      </View>

      <Animated.View style={[riseStyle(card), { alignSelf: 'center', width: '100%', maxWidth: 720 }]}>
        <Card elevated style={{ gap: 12, padding: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', fontFamily: FONT }}>Your workspace is already ready</Text>
            </View>
            <CopyButton text={workspaceUrl} label="Copy URL" />
          </View>
          <CodeBlock>{`const res = await fetch("${workspaceUrl}/users");\nconst users = await res.json();`}</CodeBlock>
          <Body secondary style={{ fontSize: 13.5, lineHeight: 19 }}>A private, unguessable URL was created for this browser. Create a collection and that call starts working.</Body>
        </Card>
      </Animated.View>

      <Animated.View style={[grid, { gap: 14, flexDirection: wide ? 'row' : 'column' }]}>
        {FEATURES.map((f) => (
          <Card key={f.title} style={{ flex: 1, gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={f.icon} size={20} color={colors.accent} stroke={1.9} />
            </View>
            <Title size={17}>{f.title}</Title>
            <Body secondary style={{ fontSize: 14, lineHeight: 20 }}>{f.body}</Body>
          </Card>
        ))}
      </Animated.View>

      <View style={{ gap: 18 }}>
        <Title size={wide ? 32 : 26} style={{ textAlign: 'center' }}>Three steps. Thirty seconds.</Title>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
          {STEPS.map((s) => (
            <Card key={s.n} style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700', fontFamily: FONT, letterSpacing: 0.4 }}>STEP {s.n}</Text>
              <Title size={17}>{s.title}</Title>
              <Body secondary style={{ fontSize: 14, lineHeight: 20 }}>{s.body}</Body>
            </Card>
          ))}
        </View>
      </View>

      <Body secondary style={{ textAlign: 'center', fontSize: 13.5, maxWidth: 560, alignSelf: 'center' }}>
        One honest trade-off: endpoints answer only while this tab is open. Close it and they pause. Reopen it and they’re back.
      </Body>

      <Footer navigate={navigate} />
    </View>
  );
}
