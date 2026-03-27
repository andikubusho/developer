/**
 * Utility to handle local storage for mock data
 */
export const getMockData = <T>(key: string, defaultData: T[]): T[] => {
  const saved = localStorage.getItem(`propdev_mock_${key}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Error parsing mock data for ${key}`, e);
    }
  }
  return defaultData;
};

export const saveMockData = <T>(key: string, data: T[]): void => {
  localStorage.setItem(`propdev_mock_${key}`, JSON.stringify(data));
};
