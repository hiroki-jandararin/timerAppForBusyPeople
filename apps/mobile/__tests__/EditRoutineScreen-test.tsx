import { render, screen, waitFor } from '@testing-library/react-native';
import { useAuth } from '@/contexts/AuthContext';

const mockGetById = jest.fn();
const mockBack = jest.fn();
const mockSignOut = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'routine-1' }),
}));

jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ getById: mockGetById, update: jest.fn() }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('@/features/ai/aiRoutineService', () => ({
  generateAiRoutine: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

import EditRoutineScreen from '../app/(app)/routines/[id]/edit';

const mockRoutine = {
  id: 'routine-1',
  name: 'テストルーティン',
  items: [
    { id: 'i1', type: 'workout' as const, title: 'ベンチプレス', durationSec: 60, voiceText: '' },
  ],
  targetDurationSec: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetById.mockResolvedValue(mockRoutine);
});

describe('EditRoutineScreen', () => {
  it('token が存在するとき AI で追加ボタンが表示される', async () => {
    (useAuth as jest.Mock).mockReturnValue({ token: 'test-token', signOut: mockSignOut });

    render(<EditRoutineScreen />);

    await waitFor(() => {
      expect(screen.getByText('AI で追加')).toBeTruthy();
    });
  });

  it('token が null のとき AI で追加ボタンが表示されない', async () => {
    (useAuth as jest.Mock).mockReturnValue({ token: null, signOut: mockSignOut });

    render(<EditRoutineScreen />);

    await waitFor(() => {
      expect(screen.queryByText('AI で追加')).toBeNull();
    });
  });
});
