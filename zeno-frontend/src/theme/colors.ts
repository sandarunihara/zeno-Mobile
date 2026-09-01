export const lightColors = {
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  button: '#000000',
  buttonText: '#FFFFFF',
  buttonDisabled: '#CCCCCC',
  input: '#F5F5F5',
  inputBorder: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  error: '#FF3B30',
  success: '#34C759',
};

export const darkColors = {
  background: '#000000',
  text: '#FFFFFF',
  textSecondary: '#999999',
  border: '#333333',
  button: '#FFFFFF',
  buttonText: '#000000',
  buttonDisabled: '#555555',
  input: '#1C1C1C',
  inputBorder: '#333333',
  shadow: 'rgba(255, 255, 255, 0.1)',
  error: '#FF453A',
  success: '#30B0C0',
};

export type Theme = typeof lightColors;
