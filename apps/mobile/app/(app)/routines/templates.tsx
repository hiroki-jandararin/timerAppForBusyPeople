import { Colors } from '@/constants/colors';
import { ROUTINE_TEMPLATES } from '@timeapp/core';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function totalDurationSec(items: { durationSec: number }[]): number {
  return items.reduce((sum, item) => sum + item.durationSec, 0);
}

function formatMinutes(sec: number): string {
  return `約${Math.round(sec / 60)}分`;
}

export default function TemplateSelectScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {ROUTINE_TEMPLATES.map((template) => {
        const totalSec = totalDurationSec(template.items);
        const workoutCount = template.items.filter((item) => item.type === 'workout').length;
        return (
          <Pressable
            key={template.id}
            style={styles.card}
            onPress={() =>
              router.push({ pathname: '/routines/new', params: { templateId: template.id } })
            }
          >
            <View style={styles.accent} />
            <View style={styles.cardBody}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{template.name}</Text>
                {template.description && (
                  <Text style={styles.cardDesc}>{template.description}</Text>
                )}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeDuration}>{formatMinutes(totalSec)}</Text>
                <Text style={styles.badgeSets}>{workoutCount}セット</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      <Pressable style={styles.blankBtn} onPress={() => router.push('/routines/new')}>
        <Text style={styles.blankBtnText}>最初から作る</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, gap: 10, paddingBottom: 48 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  accent: {
    height: 3,
    backgroundColor: Colors.orange,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  cardLeft: { flex: 1 },
  cardName: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  cardDesc: { color: Colors.textSub, fontSize: 13, marginTop: 4 },
  badge: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B3530',
    backgroundColor: '#FF6B3510',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  badgeDuration: { color: Colors.orange, fontSize: 13, fontWeight: '800' },
  badgeSets: { color: Colors.textSub, fontSize: 11, fontWeight: '600' },
  blankBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  blankBtnText: { color: Colors.textSub, fontSize: 15, fontWeight: '600' },
});
