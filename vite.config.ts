import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 環境変数をロード (Vercel等の環境変数も含む)
  // process.cwd() might cause type error in some environments if @types/node is not fully compatible or loaded.
  // Casting to any to bypass the "Property 'cwd' does not exist on type 'Process'" error.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // コード内の `process.env.API_KEY` をビルド時に実際の値に置換する
      // ※ クライアントサイドにAPIキーが含まれることになるため、
      //    Google AI Studio側でAPIキーにリファラー制限などをかけることを強く推奨します。
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});