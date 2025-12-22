<script>
  export let section = 'overview';

  const spacingScale = [
    { name: 'xs', value: '4px', usage: 'Tight spacing, icon margins' },
    { name: 'sm', value: '8px', usage: 'Small gaps, compact elements' },
    { name: 'md', value: '16px', usage: 'Default spacing' },
    { name: 'lg', value: '24px', usage: 'Section spacing' },
    { name: 'xl', value: '32px', usage: 'Large gaps between sections' },
    { name: '2xl', value: '48px', usage: 'Major section breaks' },
    { name: '3xl', value: '64px', usage: 'Page sections' },
    { name: '4xl', value: '96px', usage: 'Hero sections' }
  ];

  const gridSystem = {
    columns: 12,
    gutter: '24px',
    maxWidth: '1200px',
    breakpoints: [
      { name: 'Mobile', range: '< 640px', columns: 4 },
      { name: 'Tablet', range: '640px - 1024px', columns: 8 },
      { name: 'Desktop', range: '> 1024px', columns: 12 }
    ]
  };

  const applications = [
    {
      name: 'Business Card',
      specs: '85mm x 55mm',
      elements: ['Logo (minimum 25mm)', 'Name in DIN Bold', 'Contact in DIN Regular', 'Website URL']
    },
    {
      name: 'Email Signature',
      specs: '600px max width',
      elements: ['Logo (150px width)', 'Name and title', 'Contact information', 'Social links']
    },
    {
      name: 'Social Media',
      specs: 'Various sizes',
      elements: ['Profile: 250x250px', 'Cover: Platform specific', 'Post templates', 'Consistent color usage']
    },
    {
      name: 'Presentation',
      specs: '16:9 ratio',
      elements: ['Title slides', 'Content layouts', 'Logo placement', 'Color accents']
    }
  ];
</script>

<style>
  .guidelines {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: #333;
  }

  h2 {
    font-size: 1.75rem;
    margin: 2rem 0 1rem;
    color: #333;
  }

  h3 {
    font-size: 1.25rem;
    margin: 1.5rem 0 1rem;
    color: #444;
  }

  .intro {
    font-size: 1.125rem;
    line-height: 1.7;
    color: #555;
    margin-bottom: 3rem;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .brand-values {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }

  .value-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .value-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #FF5200;
    margin-bottom: 0.5rem;
  }

  .value-description {
    color: #666;
    line-height: 1.6;
  }

  .spacing-grid {
    display: grid;
    gap: 1rem;
    margin: 2rem 0;
  }

  .spacing-item {
    display: grid;
    grid-template-columns: 80px 100px 1fr;
    align-items: center;
    gap: 2rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }

  .spacing-visual {
    height: 40px;
    display: flex;
    align-items: center;
  }

  .spacing-box {
    background: #FF5200;
    height: 100%;
  }

  .spacing-name {
    font-weight: 500;
    color: #333;
  }

  .spacing-info {
    color: #666;
    font-size: 0.875rem;
  }

  .grid-demo {
    margin: 2rem 0;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
    margin: 1rem 0;
  }

  .grid-column {
    background: #e8f4f8;
    border: 1px solid #FF5200;
    padding: 1rem 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    color: #FF5200;
    border-radius: 4px;
  }

  .breakpoints-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  .breakpoints-table th,
  .breakpoints-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }

  .breakpoints-table th {
    background: #f8f9fa;
    font-weight: 500;
  }

  .applications-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }

  .application-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .application-preview {
    height: 150px;
    background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    color: #ccc;
  }

  .application-info {
    padding: 1.5rem;
  }

  .application-name {
    font-size: 1.25rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .application-specs {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 1rem;
  }

  .application-elements {
    list-style: none;
    padding: 0;
  }

  .application-elements li {
    padding: 0.25rem 0;
    padding-left: 1.25rem;
    position: relative;
    font-size: 0.875rem;
    color: #555;
  }

  .application-elements li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #FF5200;
  }

  .quick-reference {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 2rem;
    margin: 2rem 0;
  }

  .reference-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin-top: 1.5rem;
  }

  .reference-item h4 {
    color: #FF5200;
    margin-bottom: 0.5rem;
  }

  .reference-item code {
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .download-section {
    background: linear-gradient(135deg, #FF5200 0%, #FFC900 100%);
    color: white;
    padding: 3rem;
    border-radius: 8px;
    text-align: center;
    margin: 3rem 0;
  }

  .download-section h2 {
    color: white;
    margin-bottom: 1rem;
  }

  .download-button {
    display: inline-block;
    background: white;
    color: #FF5200;
    padding: 1rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    margin: 0.5rem;
    transition: transform 0.2s;
  }

  .download-button:hover {
    transform: translateY(-2px);
  }
</style>

<div class="guidelines">
  {#if section === 'overview'}
    <h1>#play14 Brand Guidelines</h1>
    
    <div class="intro">
      <p>
        The #play14 brand represents a global movement bringing people together through 
        serious play and games. These guidelines ensure consistent and impactful use of 
        our visual identity across all touchpoints.
      </p>
    </div>

    <h2>Brand Values</h2>
    <div class="brand-values">
      <div class="value-card">
        <div class="value-title">Playful</div>
        <div class="value-description">
          We believe in the power of play to unlock creativity and innovation
        </div>
      </div>
      <div class="value-card">
        <div class="value-title">Inclusive</div>
        <div class="value-description">
          Open to everyone, fostering diverse perspectives and collaboration
        </div>
      </div>
      <div class="value-card">
        <div class="value-title">Transformative</div>
        <div class="value-description">
          Using games to solve complex challenges and drive positive change
        </div>
      </div>
      <div class="value-card">
        <div class="value-title">Connected</div>
        <div class="value-description">
          Building a global community of practitioners and enthusiasts
        </div>
      </div>
    </div>

    <h2>Visual Identity Summary</h2>
    <div class="quick-reference">
      <div class="reference-grid">
        <div class="reference-item">
          <h4>Primary Font</h4>
          <code>DIN Alternate</code>
        </div>
        <div class="reference-item">
          <h4>Primary Colors</h4>
          <code>#D80000</code> Red<br>
          <code>#0098DD</code> Blue
        </div>
        <div class="reference-item">
          <h4>Logo Format</h4>
          <code>SVG</code> for web<br>
          <code>EPS</code> for print
        </div>
        <div class="reference-item">
          <h4>Minimum Size</h4>
          <code>80px</code> digital<br>
          <code>25mm</code> print
        </div>
      </div>
    </div>
  {/if}

  {#if section === 'spacing'}
    <h1>Spacing & Layout System</h1>
    
    <h2>Spacing Scale</h2>
    <p>Consistent spacing creates visual harmony and improves readability.</p>
    
    <div class="spacing-grid">
      {#each spacingScale as space}
        <div class="spacing-item">
          <div class="spacing-visual">
            <div class="spacing-box" style="width: {space.value}"></div>
          </div>
          <div>
            <div class="spacing-name">{space.name}</div>
            <div class="spacing-info">{space.value}</div>
          </div>
          <div class="spacing-info">{space.usage}</div>
        </div>
      {/each}
    </div>

    <h2>Grid System</h2>
    <div class="grid-demo">
      <p>
        Based on a <strong>{gridSystem.columns}-column grid</strong> with 
        <strong>{gridSystem.gutter} gutters</strong> and a maximum width 
        of <strong>{gridSystem.maxWidth}</strong>.
      </p>
      
      <h3>Grid Visualization</h3>
      <div class="grid-container">
        {#each Array(12) as _, i}
          <div class="grid-column">{i + 1}</div>
        {/each}
      </div>

      <h3>Responsive Breakpoints</h3>
      <table class="breakpoints-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Range</th>
            <th>Columns</th>
          </tr>
        </thead>
        <tbody>
          {#each gridSystem.breakpoints as breakpoint}
            <tr>
              <td>{breakpoint.name}</td>
              <td><code>{breakpoint.range}</code></td>
              <td>{breakpoint.columns}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if section === 'applications'}
    <h1>Brand Applications</h1>
    <p>Examples of how to apply the brand across different media and formats.</p>
    
    <div class="applications-grid">
      {#each applications as app}
        <div class="application-card">
          <div class="application-preview">
            📄
          </div>
          <div class="application-info">
            <div class="application-name">{app.name}</div>
            <div class="application-specs">{app.specs}</div>
            <ul class="application-elements">
              {#each app.elements as element}
                <li>{element}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>

    <div class="download-section">
      <h2>Download Brand Assets</h2>
      <p>Get all the resources you need to represent #play14</p>
      <div style="margin-top: 2rem;">
        <a href="/logo/" class="download-button">Logo Package</a>
        <a href="/font/" class="download-button">Font Files</a>
        <a href="/colors/" class="download-button">Color Swatches</a>
      </div>
    </div>

    <h2>Contact & Support</h2>
    <div class="quick-reference">
      <p><strong>Brand Owner:</strong> #play14 a.s.b.l.</p>
      <p><strong>Address:</strong> 46 boulevard Jules Salentiny, L-2511 Luxembourg</p>
      <p><strong>Logo Design:</strong> Christian Jolas</p>
      <p><strong>Website:</strong> <a href="https://play14.org" style="color: #FF5200;">play14.org</a></p>
    </div>
  {/if}
</div>