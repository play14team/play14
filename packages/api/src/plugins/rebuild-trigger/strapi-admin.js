import { Rocket } from "@strapi/icons";
import RebuildWidget from "./admin/src/components/RebuildWidget";

const PLUGIN_ID = "rebuild-trigger";

export default {
  register(app) {
    // Register the widget on the admin dashboard
    app.widgets.register({
      id: `${PLUGIN_ID}-widget`,
      icon: Rocket,
      title: {
        id: `${PLUGIN_ID}.widget.title`,
        defaultMessage: "Rebuild Website",
      },
      component: () => Promise.resolve(RebuildWidget),
      pluginId: PLUGIN_ID,
    });
  },

  bootstrap() {
    // Nothing to bootstrap
  },

  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        return {
          data: {
            [`${PLUGIN_ID}.widget.title`]: "Rebuild Website",
          },
          locale,
        };
      })
    );
  },
};
