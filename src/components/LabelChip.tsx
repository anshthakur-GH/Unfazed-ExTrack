import { Pressable, StyleSheet, Text } from 'react-native';
import { Label, LABEL_COLORS } from '../lib/labels';
import { theme } from '../lib/theme';

export default function LabelChip({
  label,
  selected,
  onPress,
}: {
  label: Label;
  selected: boolean;
  onPress: () => void;
}) {
  const color = LABEL_COLORS[label];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: color,
          backgroundColor: selected ? color : 'transparent',
        },
      ]}
    >
      <Text style={[styles.text, { color: selected ? theme.bg : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
