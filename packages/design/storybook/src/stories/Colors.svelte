<script lang="ts">
  const colors = [
    { name: '#', hex: '#D80000', label: 'Red', rgb: 'rgb(216, 0, 0)' },
    { name: 'p', hex: '#FF5200', label: 'Orange', rgb: 'rgb(255, 82, 0)' },
    { name: 'l', hex: '#FFC900', label: 'Yellow', rgb: 'rgb(255, 201, 0)' },
    { name: 'a', hex: '#92C900', label: 'Green', rgb: 'rgb(146, 201, 0)' },
    { name: 'y', hex: '#0098DD', label: 'Blue', rgb: 'rgb(0, 152, 221)' },
    { name: '14', hex: '#393939', label: 'Gray', rgb: 'rgb(57, 57, 57)' }
  ];

  const neutrals = [
    { name: 'White', hex: '#FFFFFF', label: 'White', rgb: 'rgb(255, 255, 255)' },
    { name: 'Black', hex: '#000000', label: 'Black', rgb: 'rgb(0, 0, 0)' }
  ];

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="color-palette">
  <section>
    <h2>Primary Colors</h2>
    <p class="description">The #play14 brand uses vibrant colors that spell out the brand name</p>
    <div class="color-grid">
      {#each colors as color}
        <div class="color-card">
          <div class="color-swatch" style="background-color: {color.hex}"></div>
          <div class="color-info">
            <h3>{color.label}</h3>
            <p class="letter-mapping">Letter: <strong>{color.name}</strong></p>
            <div class="color-values">
              <button class="copy-btn" onclick={() => copyToClipboard(color.hex)}>
                HEX: {color.hex}
              </button>
              <button class="copy-btn" onclick={() => copyToClipboard(color.rgb)}>
                {color.rgb}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>Neutral Colors</h2>
    <div class="color-grid">
      {#each neutrals as color}
        <div class="color-card">
          <div class="color-swatch" style="background-color: {color.hex}; border: 1px solid #e0e0e0;"></div>
          <div class="color-info">
            <h3>{color.label}</h3>
            <div class="color-values">
              <button class="copy-btn" onclick={() => copyToClipboard(color.hex)}>
                HEX: {color.hex}
              </button>
              <button class="copy-btn" onclick={() => copyToClipboard(color.rgb)}>
                {color.rgb}
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>Usage Guidelines</h2>
    <ul class="guidelines">
      <li>Primary colors should be used for key brand elements and CTAs</li>
      <li>The gray (#393939) represents the "14" in the logo</li>
      <li>Use sufficient contrast for accessibility (WCAG AA minimum)</li>
      <li>For print materials, ensure CMYK conversion maintains vibrancy</li>
    </ul>
  </section>
</div>

<style>
  .color-palette {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  section {
    margin-bottom: 3rem;
  }

  h2 {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .description {
    color: #666;
    margin-bottom: 2rem;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .color-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .color-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .color-swatch {
    height: 120px;
    width: 100%;
  }

  .color-info {
    padding: 1rem;
  }

  .color-info h3 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #333;
  }

  .letter-mapping {
    font-size: 0.9rem;
    color: #666;
    margin: 0.25rem 0;
  }

  .letter-mapping strong {
    color: #333;
    font-weight: 600;
  }

  .color-values {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .copy-btn {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    font-family: monospace;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .copy-btn:hover {
    background: #e8e8e8;
  }

  .copy-btn:active {
    background: #d0d0d0;
  }

  .guidelines {
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
    content: "•";
    position: absolute;
    left: 0;
    color: #0098DD;
    font-weight: bold;
  }
</style>