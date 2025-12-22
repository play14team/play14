<script>
  export let showScale = false
  export let showExamples = false

  const logoFontWeights = [
    { name: 'Regular', weight: 400, file: 'DIN Alternate Regular.otf' },
    { name: 'Medium', weight: 500, file: 'DIN Alternate Medium.otf' },
    { name: 'Bold', weight: 700, file: 'DIN Alternate Bold.otf' },
  ]

  const webFontWeights = [
    { name: 'Light', weight: 300 },
    { name: 'Regular', weight: 400 },
    { name: 'Medium', weight: 500 },
    { name: 'SemiBold', weight: 600 },
    { name: 'Bold', weight: 700 },
    { name: 'ExtraBold', weight: 800 },
    { name: 'Black', weight: 900 },
  ]

  const typeScale = [
    { name: 'Display', size: '4rem', lineHeight: '1.1', usage: 'Hero sections, main headlines' },
    { name: 'H1', size: '3rem', lineHeight: '1.2', usage: 'Page titles' },
    { name: 'H2', size: '2.25rem', lineHeight: '1.3', usage: 'Section headers' },
    { name: 'H3', size: '1.875rem', lineHeight: '1.4', usage: 'Subsection headers' },
    { name: 'H4', size: '1.5rem', lineHeight: '1.5', usage: 'Card titles' },
    { name: 'H5', size: '1.25rem', lineHeight: '1.6', usage: 'Small headers' },
    { name: 'Body Large', size: '1.125rem', lineHeight: '1.7', usage: 'Lead paragraphs' },
    { name: 'Body', size: '1rem', lineHeight: '1.7', usage: 'Default text' },
    { name: 'Small', size: '0.875rem', lineHeight: '1.5', usage: 'Captions, labels' },
    { name: 'Tiny', size: '0.75rem', lineHeight: '1.5', usage: 'Micro copy' },
  ]
</script>

<div class="typography-showcase">
  {#if !showScale && !showExamples}
    <section>
      <h2>Logo Font - DIN Alternate</h2>
      <p style="color: #666; margin-bottom: 2rem;">Used exclusively in the #play14 logo and brand identity marks</p>
      <div class="font-weights logo-font">
        {#each logoFontWeights as weight}
          <div class="weight-example">
            <div class="weight-label">
              <span class="weight-name">{weight.name}</span>
              <span class="weight-value">Weight: {weight.weight}</span>
            </div>
            <div class="alphabet" style="font-weight: {weight.weight}">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
              abcdefghijklmnopqrstuvwxyz
            </div>
            <div class="numbers" style="font-weight: {weight.weight}">
              {'0123456789 !@#$%^&*()_+-=[]{}|;\':",./<>?'}
            </div>
            <div class="sample-text" style="font-weight: {weight.weight}">#play14 - UNCONFERENCE FOR SERIOUS PLAY</div>
          </div>
        {/each}
      </div>
    </section>

    <section>
      <h2>Website Font - Nunito</h2>
      <p style="color: #666; margin-bottom: 2rem;">
        Primary font for all website content, UI elements, and marketing materials
      </p>
      <div class="font-weights web-font">
        {#each webFontWeights as weight}
          <div class="weight-example">
            <div class="weight-label">
              <span class="weight-name">{weight.name}</span>
              <span class="weight-value">Weight: {weight.weight}</span>
            </div>
            <div class="alphabet" style="font-weight: {weight.weight}">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
              abcdefghijklmnopqrstuvwxyz
            </div>
            <div class="numbers" style="font-weight: {weight.weight}">
              {'0123456789 !@#$%^&*()_+-=[]{}|;\':",./<>?'}
            </div>
            <div class="sample-text" style="font-weight: {weight.weight}">
              #play14 brings people together to share, learn, and connect through serious play and games.
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if showScale}
    <section>
      <h2>Type Scale</h2>
      <p style="color: #666; margin-bottom: 2rem;">Recommended sizes for Nunito font in web applications</p>
      <div class="type-scale web-font">
        {#each typeScale as item}
          <div class="scale-item">
            <div class="scale-label">{item.name}</div>
            <div class="scale-example" style="font-size: {item.size}; line-height: {item.lineHeight}">#play14</div>
            <div class="scale-specs">
              {item.size} / {item.lineHeight}<br />
              {item.usage}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if showExamples}
    <section>
      <h2>Usage Examples</h2>
      <div class="usage-examples">
        <div class="example-card">
          <div class="example-title">Website Hero Section (Nunito)</div>
          <div class="hero-example web-font">
            <div class="hero-title">#play14 Movement</div>
            <div class="hero-subtitle">Unconference for Serious Play</div>
          </div>
        </div>

        <div class="example-card">
          <div class="example-title">Content Card (Nunito)</div>
          <div class="card-example web-font">
            <div class="card-title">Join the Movement</div>
            <div class="card-description">
              Connect with a global community of practitioners using play and games to solve complex challenges and
              foster innovation.
            </div>
            <div class="card-meta">Luxembourg • Since 2014</div>
          </div>
        </div>
      </div>

      <div class="guidelines">
        <h3>Typography Guidelines</h3>
        <ul>
          <li><strong>DIN Alternate:</strong> Use exclusively for logos and brand marks</li>
          <li><strong>Nunito:</strong> Use for all website content, UI elements, and marketing materials</li>
          <li>Maintain consistent hierarchy with the type scale</li>
          <li>Regular weight (400) for body text, SemiBold (600) for emphasis, Bold (700) for headers</li>
          <li>Ensure minimum font size of 14px for body text</li>
          <li>Use appropriate line height for readability (1.5-1.7 for body text)</li>
          <li>Limit line length to 60-75 characters for optimal reading</li>
        </ul>
      </div>
    </section>
  {/if}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap');

  @font-face {
    font-family: 'DIN Alternate';
    src: url('/fonts/DIN-Alternate-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
  }

  @font-face {
    font-family: 'DIN Alternate';
    src: url('/fonts/DIN-Alternate-Medium.otf') format('opentype');
    font-weight: 500;
    font-style: normal;
  }

  @font-face {
    font-family: 'DIN Alternate';
    src: url('/fonts/DIN-Alternate-Bold.otf') format('opentype');
    font-weight: 700;
    font-style: normal;
  }

  .typography-showcase {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .logo-font {
    font-family: 'DIN Alternate', sans-serif;
  }

  .web-font {
    font-family: 'Nunito', sans-serif;
  }

  section {
    margin-bottom: 3rem;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: #333;
    font-weight: 500;
  }

  .font-weights {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .weight-example {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .weight-example:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .weight-label {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .weight-name {
    font-size: 1rem;
    color: #666;
    font-weight: 400;
  }

  .weight-value {
    font-size: 0.875rem;
    color: #999;
    font-family: monospace;
  }

  .alphabet {
    font-size: 1.5rem;
    line-height: 1.8;
    margin: 0.5rem 0;
  }

  .numbers {
    font-size: 1.5rem;
    line-height: 1.8;
    margin: 0.5rem 0;
  }

  .sample-text {
    font-size: 1.125rem;
    line-height: 1.6;
    color: #333;
    margin-top: 1rem;
  }

  .type-scale {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .scale-item {
    display: grid;
    grid-template-columns: 120px 1fr 200px;
    gap: 2rem;
    align-items: baseline;
    padding: 1.5rem 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .scale-item:last-child {
    border-bottom: none;
  }

  .scale-label {
    font-size: 0.875rem;
    color: #666;
    font-weight: 500;
  }

  .scale-example {
    color: #333;
  }

  .scale-specs {
    font-size: 0.75rem;
    color: #999;
    font-family: monospace;
  }

  .usage-examples {
    display: grid;
    gap: 2rem;
  }

  .example-card {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .example-title {
    font-size: 1.125rem;
    font-weight: 500;
    margin-bottom: 1rem;
    color: #333;
  }

  .hero-example {
    text-align: center;
    padding: 3rem;
    background: linear-gradient(135deg, #ff5200 0%, #ffc900 100%);
    border-radius: 8px;
    color: white;
  }

  .hero-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    font-weight: 400;
    opacity: 0.95;
  }

  .card-example {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .card-description {
    font-size: 1rem;
    line-height: 1.6;
    color: #666;
    margin-bottom: 1rem;
  }

  .card-meta {
    font-size: 0.875rem;
    color: #999;
  }

  .guidelines {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
    margin-top: 2rem;
  }

  .guidelines h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: #333;
  }

  .guidelines ul {
    list-style: none;
    padding: 0;
  }

  .guidelines li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
    color: #555;
  }

  .guidelines li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: #FF5200;
  }
</style>
