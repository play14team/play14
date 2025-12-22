import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|ts|svelte)"
  ],
  "addons": [
    "@storybook/addon-svelte-csf",
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/sveltekit",
    "options": {}
  },
  "staticDirs": [{from: "../static", to: "/"}],
  viteFinal: async (config) => {
    // Set base path for GitHub Pages
    if (process.env.NODE_ENV === 'production') {
      config.base = '/graphic-design/';
    }
    return config;
  }
};
export default config;