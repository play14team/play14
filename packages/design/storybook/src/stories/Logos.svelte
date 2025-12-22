<script lang="ts">
  import { base } from '$app/paths'
  
  export let showGuidelines = false
  export let showDownloads = false

  function handleImageError(event: Event, fallback: string) {
    const target = event.target as HTMLImageElement
    if (fallback && target.src !== fallback) {
      target.src = fallback
    }
  }

  const logoVariations = [
    {
      name: 'Primary Logo - Black on White',
      file: `${base}/logos/play14_black_bg_full.png`,
      fallback: `${base}/logos/play14_black_bg_full.svg`,
      background: 'white',
      description: 'Default logo for light backgrounds',
    },
    {
      name: 'Primary Logo - White on Black',
      file: `${base}/logos/play14_white_bg_full.png`,
      fallback: `${base}/logos/play14_white_bg_full.svg`,
      background: '#1a1a1a',
      description: 'For dark backgrounds',
    },
    {
      name: 'Transparent Background - White',
      file: `${base}/logos/play14_white_bg_transparent.png`,
      fallback: `${base}/logos/play14_white_bg_transparent.svg`,
      background: '#e8e8e8',
      description: 'For use on light backgrounds',
    },
    {
      name: 'Transparent Background - Black',
      file: `${base}/logos/play14_black_bg_transparent.png`,
      fallback: `${base}/logos/play14_black_bg_transparent.svg`,
      background: '#4a5568',
      description: 'For use on dark or colored backgrounds',
    },
  ]

  const anniversaryLogo = {
    name: '10th Anniversary Edition',
    file: `${base}/logos/play14_10th_anniversary.png`,
    fallback: `${base}/logos/play14_10th_anniversary.png`,
    background: '#2d3748',
    description: 'Special anniversary edition with celebratory design',
  }

  const formats = [
    { type: 'SVG', description: 'Scalable vector for web', path: '/logo/SVG/' },
    { type: 'PNG', description: 'Raster images for general use', path: '/logo/PNG/' },
    { type: 'EPS', description: 'Vector format for print', path: '/logo/EPS/' },
    { type: 'PDF', description: 'Print-ready documents', path: '/logo/PDF/' },
    { type: 'AI', description: 'Adobe Illustrator source files', path: '/logo/AI/' },
  ]

  const sizes = [
    { dimension: '4800x1506', use: 'High resolution banners' },
    { dimension: '1920x1280', use: 'Desktop wallpapers' },
    { dimension: '646x200', use: 'Email signatures' },
    { dimension: '304x93', use: 'Website headers' },
    { dimension: '250x250', use: 'Social media profiles' },
    { dimension: '150x46', use: 'Small web badges' },
  ]

  const clearSpace = {
    minimum: '20%',
    description: 'Minimum clear space around logo should be 20% of logo height',
  }

  const minimumSize = {
    print: '25mm',
    digital: '80px',
    description: 'Logo should not be displayed smaller than these dimensions',
  }
</script>

<div class="logos-showcase">
  {#if !showGuidelines && !showDownloads}
    <section>
      <h2>Logo Variations</h2>
      <div class="logo-grid">
        {#each logoVariations as logo}
          <div class="logo-card">
            <div class="logo-display" style="background: {logo.background}">
              <img src={logo.file} alt={logo.name} onerror={(e) => handleImageError(e, logo.fallback)} />
            </div>
            <div class="logo-info">
              <div class="logo-name">{logo.name}</div>
              <div class="logo-description">{logo.description}</div>
            </div>
          </div>
        {/each}
      </div>

      <div class="anniversary-note">
        <h4>10th Anniversary Edition</h4>
        <p>Special anniversary logos are available in the "10 years" folder with celebratory design elements.</p>
      </div>

      <div style="margin-top: 2rem;">
        <div class="logo-card">
          <div
            class="logo-display"
            style="background: {anniversaryLogo.background}; padding: 4rem 2rem; min-height: 300px;"
          >
            <img
              src={anniversaryLogo.file}
              alt={anniversaryLogo.name}
              onerror={(e) => handleImageError(e, anniversaryLogo.fallback)}
              style="max-width: 90%; max-height: 400px;"
            />
          </div>
          <div class="logo-info">
            <div class="logo-name">{anniversaryLogo.name}</div>
            <div class="logo-description">{anniversaryLogo.description}</div>
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if showGuidelines}
    <section>
      <h2>Logo Usage Guidelines</h2>
      <div class="guidelines-section">
        <div class="guideline-item">
          <h3>Clear Space & Minimum Size</h3>
          <div class="specs-grid">
            <div class="spec-card">
              <div class="spec-value">{clearSpace.minimum}</div>
              <div class="spec-label">Minimum clear space around logo</div>
            </div>
            <div class="spec-card">
              <div class="spec-value">{minimumSize.digital} / {minimumSize.print}</div>
              <div class="spec-label">Minimum size (digital / print)</div>
            </div>
          </div>
        </div>

        <div class="guideline-item">
          <h3>Best Practices</h3>
          <div class="dos-donts">
            <div class="do">
              <h4>Do's</h4>
              <ul>
                <li>Use provided logo files</li>
                <li>Maintain aspect ratio</li>
                <li>Use appropriate color variant</li>
                <li>Ensure sufficient contrast</li>
                <li>Use SVG for web when possible</li>
              </ul>
            </div>
            <div class="dont">
              <h4>Don'ts</h4>
              <ul>
                <li>Don't stretch or distort</li>
                <li>Don't change colors</li>
                <li>Don't add effects or shadows</li>
                <li>Don't rotate the logo</li>
                <li>Don't recreate the logo</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="guideline-item">
          <h3>Color Backgrounds</h3>
          <p>When placing the logo on colored backgrounds:</p>
          <ul style="margin-top: 1rem; padding-left: 1.5rem;">
            <li>Use white logo on dark backgrounds (contrast ratio > 4.5:1)</li>
            <li>Use black logo on light backgrounds</li>
            <li>Avoid placing logo on busy or patterned backgrounds</li>
            <li>Test visibility at different sizes</li>
          </ul>
        </div>
      </div>
    </section>
  {/if}

  {#if showDownloads}
    <section>
      <h2>Download Assets</h2>
      <div class="downloads-section">
        <h3>Available Formats</h3>
        <div class="format-grid">
          {#each formats as format}
            <div class="format-card">
              <div class="format-type">{format.type}</div>
              <div class="format-description">{format.description}</div>
            </div>
          {/each}
        </div>

        <h3>Common Sizes</h3>
        <table class="size-table">
          <thead>
            <tr>
              <th>Dimensions</th>
              <th>Recommended Use</th>
            </tr>
          </thead>
          <tbody>
            {#each sizes as size}
              <tr>
                <td><code>{size.dimension}</code></td>
                <td>{size.use}</td>
              </tr>
            {/each}
          </tbody>
        </table>

        <div class="guideline-item" style="margin-top: 2rem;">
          <h3>File Organization</h3>
          <p>Logo assets are organized as follows:</p>
          <ul style="margin-top: 1rem; padding-left: 1.5rem;">
            <li><strong>SVG/</strong> - Scalable vectors for web use</li>
            <li><strong>PNG/</strong> - Raster images in various sizes</li>
            <li><strong>EPS/</strong> - Vector files for professional print</li>
            <li><strong>PDF/</strong> - Print-ready documents</li>
            <li><strong>AI/</strong> - Original Adobe Illustrator files</li>
            <li><strong>favicon/</strong> - Website favicon files</li>
            <li><strong>10 years/</strong> - Anniversary edition logos</li>
          </ul>
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .logos-showcase {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  section {
    margin-bottom: 3rem;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    color: #333;
  }

  h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: #333;
  }

  .logo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .logo-card {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .logo-display {
    padding: 3rem 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .logo-display img {
    max-width: 80%;
    height: auto;
    max-height: 100px;
  }

  .logo-info {
    padding: 1rem;
    background: white;
    border-top: 1px solid #e0e0e0;
  }

  .logo-name {
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: #333;
  }

  .logo-description {
    font-size: 0.875rem;
    color: #666;
  }

  .guidelines-section {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .guideline-item {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .guideline-item:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .dos-donts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1rem;
  }

  .do,
  .dont {
    padding: 1.5rem;
    border-radius: 8px;
  }

  .do {
    background: #fff5f0;
    border: 1px solid #FF5200;
  }

  .dont {
    background: #fff5f5;
    border: 1px solid #d80000;
  }

  .do h4 {
    color: #FF5200;
    margin-bottom: 1rem;
  }

  .dont h4 {
    color: #d80000;
    margin-bottom: 1rem;
  }

  .do ul,
  .dont ul {
    list-style: none;
    padding: 0;
  }

  .do li,
  .dont li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
  }

  .do li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #FF5200;
    font-weight: bold;
  }

  .dont li::before {
    content: '✗';
    position: absolute;
    left: 0;
    color: #d80000;
    font-weight: bold;
  }

  .downloads-section {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .format-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .format-card {
    text-align: center;
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .format-card:hover {
    border-color: #FF5200;
    background: #f8fbff;
  }

  .format-type {
    font-size: 1.5rem;
    font-weight: 700;
    color: #FF5200;
    margin-bottom: 0.5rem;
  }

  .format-description {
    font-size: 0.875rem;
    color: #666;
  }

  .size-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }

  .size-table th,
  .size-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }

  .size-table th {
    background: #f8f9fa;
    font-weight: 500;
  }

  .size-table tr:last-child td {
    border-bottom: none;
  }

  .specs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1rem;
  }

  .spec-card {
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .spec-value {
    font-size: 2rem;
    font-weight: 700;
    color: #FF5200;
    margin-bottom: 0.5rem;
  }

  .spec-label {
    font-size: 0.875rem;
    color: #666;
  }

  .anniversary-note {
    background: linear-gradient(135deg, #ffc900 0%, #ff5200 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin-top: 2rem;
  }

  .anniversary-note h4 {
    color: white;
    margin-bottom: 0.5rem;
  }
</style>
