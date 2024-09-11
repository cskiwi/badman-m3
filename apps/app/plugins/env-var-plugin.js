const envVarPlugin = {
  name: 'env-var-plugin',
  setup(build) {
    const options = build.initialOptions;
    options.define['process.env'] = JSON.stringify(process.env);
  },
};

module.exports = envVarPlugin;