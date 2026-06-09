import { fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTINE_TEMPLATES } from '@timeapp/core';
import { useRouter } from 'expo-router';
import TemplateSelectScreen from '../app/(app)/routines/templates';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: jest.fn() });
  mockPush.mockClear();
});

describe('TemplateSelectScreen', () => {
  it('ROUTINE_TEMPLATESの全テンプレート名が表示される', () => {
    render(<TemplateSelectScreen />);

    for (const template of ROUTINE_TEMPLATES) {
      expect(screen.getByText(template.name)).toBeTruthy();
    }
  });

  it('テンプレートをタップすると templateId 付きで new 画面へ遷移する', () => {
    render(<TemplateSelectScreen />);
    const first = ROUTINE_TEMPLATES[0];

    fireEvent.press(screen.getByText(first.name));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/routines/new',
      params: { templateId: first.id },
    });
  });

  it('「最初から作る」をタップすると params なしで new 画面へ遷移する', () => {
    render(<TemplateSelectScreen />);

    fireEvent.press(screen.getByText('最初から作る'));

    expect(mockPush).toHaveBeenCalledWith('/routines/new');
  });
});
