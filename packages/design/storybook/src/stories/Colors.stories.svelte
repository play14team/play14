<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Colors from './Colors.svelte';

  const { Story } = defineMeta({
    title: 'Brand/Colors',
    component: Colors,
    tags: ['autodocs'],
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Official #play14 brand colors palette'
        }
      }
    }
  });
</script>

<Story name="Primary Palette" />