const values = new Map<string, string>();
export default {
  getItem: async (key: string) => values.get(key) ?? null,
  setItem: async (key: string, value: string) => { values.set(key, value); },
  clear: async () => { values.clear(); },
};
