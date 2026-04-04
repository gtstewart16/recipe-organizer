import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  ({
    __esModule: true,
    default: {
      setItem: jest.fn(() => Promise.resolve()),
      getItem: jest.fn(() => Promise.resolve(null)),
      removeItem: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
    },
  })
);
