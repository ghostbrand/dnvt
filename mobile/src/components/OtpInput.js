import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../config';

const OTP_LENGTH = 6;

export default function OtpInput({ value = '', onChange, autoFocus = true }) {
  const inputs = useRef([]);
  const [focused, setFocused] = useState(0);

  const digits = value.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);

  const handleChange = (text, index) => {
    const newDigits = [...digits];
    // Handle paste (multi-char)
    if (text.length > 1) {
      const pasted = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
      onChange(pasted);
      const lastIdx = Math.min(pasted.length, OTP_LENGTH - 1);
      inputs.current[lastIdx]?.focus();
      return;
    }
    const clean = text.replace(/[^0-9]/g, '');
    newDigits[index] = clean;
    const joined = newDigits.join('');
    onChange(joined);
    if (clean && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      onChange(newDigits.join(''));
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(ref) => { inputs.current[i] = ref; }}
          style={[
            styles.cell,
            focused === i && styles.cellFocused,
            digit && styles.cellFilled,
          ]}
          value={digit}
          onChangeText={(text) => handleChange(text, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          onFocus={() => setFocused(i)}
          keyboardType="number-pad"
          maxLength={i === 0 ? OTP_LENGTH : 1}
          autoFocus={autoFocus && i === 0}
          selectionColor={COLORS.blue}
          textContentType="oneTimeCode"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 16,
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  cellFocused: {
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  cellFilled: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
});
