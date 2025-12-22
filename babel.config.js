module.exports = function (api) {
  api.cache(true);
  const disableReanimated = process.env.DISABLE_REANIMATED === '1';
  return {
    presets: ["babel-preset-expo"],
    plugins: disableReanimated ? [] : ["react-native-reanimated/plugin"],
  };
};
