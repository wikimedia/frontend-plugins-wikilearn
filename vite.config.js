export default {
  build: {
    lib: {
      entry: './src/index.jsx',
      name: 'wikilearn',
      fileName: 'wikilearn',
      formats: ['es'],   // emit ESM
    },
    rollupOptions: {
      external: ['react', 'react-dom'], // don’t bundle React
    },
    target: 'es2018', // important: ensures JSX transpiles to React.createElement
  },
  esbuild: {
    jsx: 'transform', // converts JSX → React.createElement
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
};
