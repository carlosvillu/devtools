import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Los paquetes internos exportan TypeScript fuente (exports JIT, sin build):
  // Next los compila (architecture.md §7). @app/db entra en la lista cuando se
  // consuma desde web (T0.2).
  transpilePackages: ['@app/core'],
};

export default nextConfig;
