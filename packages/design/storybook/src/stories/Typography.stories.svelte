<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Typography from './Typography.svelte'

  const { Story } = defineMeta({
    title: 'Brand/Typography',
    component: Typography,
    tags: ['autodocs'],
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Typography system using DIN Alternate for the logo and Nunito font family for the web',
        },
      },
    },
  })
</script>

<Story name="Font Showcase" />
<Story name="Type Scale" args={{ showScale: true }} />
<Story name="Usage Examples" args={{ showExamples: true }} />
