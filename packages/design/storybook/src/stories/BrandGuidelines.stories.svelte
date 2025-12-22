<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import BrandGuidelines from './BrandGuidelines.svelte';

  const { Story } = defineMeta({
    title: 'Brand/Guidelines',
    component: BrandGuidelines,
    tags: ['autodocs'],
    parameters: {
      layout: 'padded',
      docs: {
        description: {
          component: 'Complete brand guidelines and graphic charter for #play14'
        }
      }
    }
  });
</script>

<Story name="Overview" />
<Story name="Spacing System" args={{ section: 'spacing' }} />
<Story name="Applications" args={{ section: 'applications' }} />