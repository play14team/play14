<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Logos from './Logos.svelte';

  const { Story } = defineMeta({
    title: 'Brand/Logos',
    component: Logos,
    tags: ['autodocs'],
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Official #play14 logos in various formats and variations'
        }
      }
    }
  });
</script>

<Story name="Logo Variations" />
<Story name="Usage Guidelines" args={{ showGuidelines: true }} />
<Story name="Download Assets" args={{ showDownloads: true }} />