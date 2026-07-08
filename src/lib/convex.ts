import { ConvexReactClient } from "convex/react";

export const getConvexUrl = (): string => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('ridm_cached_convex_url');
    if (cached && cached.trim()) return cached.trim();
  }
  return process.env.NEXT_PUBLIC_CONVEX_URL || 'https://capable-alligator-492.convex.cloud';
};

export const isConvexConfigured = (): boolean => {
  const url = getConvexUrl();
  return !!url && (url.startsWith('http') || url.startsWith('https')) && !url.includes('placeholder');
};

let activeClient: ConvexReactClient | null = null;

export const getConvexClient = (): ConvexReactClient => {
  if (!activeClient) {
    const url = getConvexUrl() || 'https://placeholder.convex.cloud';
    activeClient = new ConvexReactClient(url);
  }
  return activeClient;
};

export const updateConvexClient = (url: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ridm_cached_convex_url', url);
    activeClient = new ConvexReactClient(url);
  }
};

// Use Proxy to dynamically delegate all operations to the activeClient
export const convex = new Proxy({} as ConvexReactClient, {
  get(target, prop, receiver) {
    const client = getConvexClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export const queryWithTimeout = async <T>(queryName: string, args: any = {}, timeoutMs: number = 60000): Promise<T> => {
  console.log(`[CONVEX] Calling query: ${queryName}, args:`, args);
  const start = Date.now();
  try {
    const result = await convex.query(queryName as any, args);
    console.log(`[CONVEX] Query ${queryName} finished in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error(`[CONVEX] Query ${queryName} failed after ${Date.now() - start}ms:`, err);
    throw err;
  }
};

export const mutationWithTimeout = async <T>(mutationName: string, args: any = {}, timeoutMs: number = 60000): Promise<T> => {
  console.log(`[CONVEX] Calling mutation: ${mutationName}, args:`, args);
  const start = Date.now();
  try {
    const result = await convex.mutation(mutationName as any, args);
    console.log(`[CONVEX] Mutation ${mutationName} finished in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error(`[CONVEX] Mutation ${mutationName} failed after ${Date.now() - start}ms:`, err);
    throw err;
  }
};

