import { Rocket } from "@strapi/icons"
import { RebuildWidget } from "./components/RebuildWidget"

const PLUGIN_ID = "rebuild-trigger"

type StrapiAdminApp = {
  widgets: {
    register: (config: {
      id: string
      icon: typeof Rocket
      title: { id: string; defaultMessage: string }
      component: typeof RebuildWidget
      pluginId: string
    }) => void
  }
}

export default {
  register(app: StrapiAdminApp) {
    // Register the widget on the admin dashboard
    app.widgets.register({
      id: `${PLUGIN_ID}-widget`,
      icon: Rocket,
      title: {
        id: `${PLUGIN_ID}.widget.title`,
        defaultMessage: "Rebuild Website",
      },
      component: RebuildWidget,
      pluginId: PLUGIN_ID,
    })
  },

  bootstrap() {
    // Nothing to bootstrap
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        return {
          data: {
            [`${PLUGIN_ID}.widget.title`]: "Rebuild Website",
          },
          locale,
        }
      })
    )
  },
}
