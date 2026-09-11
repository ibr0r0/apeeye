import React from 'react';
import { Animated, Text, View } from 'react-native';
import { useThemeContext, FONT, MONO } from '../context/ThemeContext';
import { useWorkspace } from '../src/WorkspaceContext';
import { Badge, Body, Button, Card, CodeBlock, Group, Row, Title, methodTone, useFadeIn } from '../components/ui';
import Footer from '../components/Footer';

function DocRow({ label, body }) {
  const { colors } = useThemeContext();
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 3 }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: FONT }}>{label}</Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20, fontFamily: FONT }}>{body}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ gap: 12 }}>
      <Title size={22}>{title}</Title>
      {children}
    </View>
  );
}

export default function Docs({ navigate }) {
  const { colors } = useThemeContext();
  const { workspaceUrl: u, limits } = useWorkspace();
  const anim = useFadeIn();

  const endpoints = [
    ['GET', '/:collection', 'List all records'],
    ['POST', '/:collection', 'Create one. Send a JSON object; an id is assigned.'],
    ['GET', '/:collection/:id', 'Read one record'],
    ['PUT', '/:collection/:id', 'Replace a record. The id is kept.'],
    ['PATCH', '/:collection/:id', 'Merge fields into a record'],
    ['DELETE', '/:collection/:id', 'Delete a record'],
    ['GET', '/', 'List your collection names'],
  ];

  return (
    <Animated.View style={[anim, { gap: 36, maxWidth: 780, alignSelf: 'center', width: '100%' }]}>
      <View style={{ gap: 8, paddingTop: 12 }}>
        <Title size={40}>Docs</Title>
        <Body secondary style={{ fontSize: 17 }}>Everything you need. It fits on one page on purpose.</Body>
      </View>

      <Section title="How it works">
        <Card style={{ gap: 10 }}>
          <Body>On first visit your browser creates a random workspace ID and keeps it in localStorage. Your collections and records live in IndexedDB. The page holds a WebSocket to a small relay. When anything calls your URL, the relay forwards the request to this tab, the tab answers from IndexedDB, and the relay returns the response. The relay stores nothing.</Body>
          <Body secondary>The one trade-off: endpoints answer only while a tab with your workspace is open. Close it and callers get a 503 with a hint. Reopen it and everything is back.</Body>
        </Card>
      </Section>

      <Section title="Your endpoints">
        <CodeBlock>{u}</CodeBlock>
        <Group>
          {endpoints.map(([m, p, d]) => (
            <Row key={m + p} style={{ gap: 14 }}>
              <Badge tone={methodTone(m)} style={{ minWidth: 62 }}>{m}</Badge>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: MONO, minWidth: 150 }}>{p}</Text>
              <Text style={{ color: colors.secondary, fontSize: 14, fontFamily: FONT, flex: 1 }}>{d}</Text>
            </Row>
          ))}
        </Group>
        <Body secondary style={{ fontSize: 13.5 }}>
          404 when a collection or record doesn’t exist. 422 for an invalid name, id or body. 413 for oversized records. 429 at limits. 405 for unsupported methods.
        </Body>
      </Section>

      <Section title="Examples">
        <CodeBlock>{`// in your app
const res = await fetch("${u}/users");
const users = await res.json();

await fetch("${u}/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Ada", admin: true }),
});`}</CodeBlock>
        <CodeBlock>{`# from a terminal
curl ${u}/users
curl -X PATCH ${u}/users/1 \\
  -H 'Content-Type: application/json' -d '{"admin":false}'`}</CodeBlock>
      </Section>

      <Section title="Workspace">
        <Group>
          <DocRow label="Copy URL" body="Paste it into code or share it with a teammate." />
          <DocRow label="Export / Import" body="Download or load the whole workspace as JSON. This is your backup." />
          <DocRow label="Reset" body="Wipes everything and gives you a fresh ID and URL." />
          <DocRow label="Multiple tabs" body="The newest tab wins. The older one can take back over in one click." />
        </Group>
      </Section>

      <Section title="Limits">
        <Group>
          <DocRow label="Collections" body={`Up to ${limits.maxCollections} per workspace.`} />
          <DocRow label="Records per collection" body={`Up to ${limits.maxRecordsPerCollection}.`} />
          <DocRow label="Record size" body={`${Math.round(limits.maxRecordBytes / 1024 / 1024)} MB each, images included.`} />
        </Group>
        <Body secondary style={{ fontSize: 13.5 }}>The relay also rate-limits callers per IP and per workspace, and caps request bodies and concurrent requests.</Body>
      </Section>

      <Section title="Security and privacy">
        <Card style={{ gap: 8 }}>
          <Body>Your workspace ID is generated with a cryptographic random source and is the only thing protecting your URL. Treat it like a secret link: anyone who has it can read and write your mocks. Reset rotates it.</Body>
          <Body secondary>Nothing is ever written on the server. Prototype-polluting keys are stripped from every payload. This is a mocking tool, not a place for real user data.</Body>
        </Card>
      </Section>

      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <Button title="Open Playground" iconRight="arrowRight" size="lg" onPress={() => navigate?.('Playground')} />
      </View>

      <Footer navigate={navigate} />
    </Animated.View>
  );
}
