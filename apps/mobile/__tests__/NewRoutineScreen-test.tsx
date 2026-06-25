import { render, screen } from '@testing-library/react-native';
import { ROUTINE_TEMPLATES } from '@timeapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NewRoutineScreen from '../app/(app)/routines/new';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ create: jest.fn() }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({ back: mockBack });
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockBack.mockClear();
});

describe('NewRoutineScreen', () => {
  it('templateId なしで開くとルーティン名は空', () => {
    render(<NewRoutineScreen />);
    expect(screen.getByPlaceholderText('例: 朝トレ10分').props.value).toBe('');
  });

  it('templateId ありで開くとテンプレート名が初期値として入る', () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);

    expect(screen.getByPlaceholderText('例: 朝トレ10分').props.value).toBe(template.name);
  });

  it('templateId ありで開くとテンプレートの最初のアイテム名が表示される', () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);

    expect(screen.getAllByText(template.items[0].title).length).toBeGreaterThan(0);
  });
});
