// Test-only host adapter. This verifies React logic, not native layout or OS APIs.
/* eslint-disable react-refresh/only-export-components -- Test module, never loaded by the app. */
import { createElement, type ReactNode } from 'react';
type Props = { children?: ReactNode; onPress?: () => void; disabled?: boolean; value?: string; onChangeText?: (value: string) => void };
export const View = ({ children }: Props) => createElement('div', null, children);
export const ScrollView = View;
export const Text = ({ children }: Props) => createElement('span', null, children);
export const Pressable = ({ children, onPress, disabled }: Props) => createElement('button', { onClick: onPress, disabled }, children);
export const TextInput = ({ value, onChangeText }: Props) => createElement('input', { value: value || '', onChange: (e) => onChangeText?.(e.target.value) });
export const Image = () => createElement('img', { alt: 'test photo' });
export const StyleSheet = { create: <T,>(styles: T) => styles };
export const Alert = { alert: () => {} };
