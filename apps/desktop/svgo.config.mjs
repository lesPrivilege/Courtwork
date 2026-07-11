export const svgPolicy = { removeViewBox: false };

export default {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          mergePaths: false,
        },
      },
    },
    'removeDimensions',
  ],
};
