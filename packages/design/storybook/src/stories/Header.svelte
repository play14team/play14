<script lang="ts">
  interface Props {
    user?: { name: string } | null;
    onLogin?: () => void;
    onLogout?: () => void;
    onCreateAccount?: () => void;
  }

  let { user = null, onLogin, onLogout, onCreateAccount }: Props = $props();
</script>

<header>
  <div class="storybook-header">
    <div>
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd">
          <path
            d="M10 0h12a10 10 0 0110 10v12a10 10 0 01-10 10H10A10 10 0 010 22V10A10 10 0 0110 0z"
            fill="#FFF"
          />
          <path
            d="M5.3 10.6l10.4 6v11.1l-10.4-6v-11zm11.4-6.2l9.7 5.5-9.7 5.6V4.4z"
            fill="#555AB9"
          />
          <path
            d="M27.2 10.6v11.2l-10.5 6V16.5l10.5-6zM15.7 4.4v11L6 10l9.7-5.5z"
            fill="#91BAF8"
          />
        </g>
      </svg>
      <h1>Acme</h1>
    </div>
    <div>
      {#if user}
        <span class="welcome">
          Welcome, <b>{user.name}</b>!
        </span>
        <button type="button" class="storybook-button storybook-button--small" onclick={onLogout}>
          Log out
        </button>
      {:else}
        <button type="button" class="storybook-button storybook-button--small" onclick={onLogin}>
          Log in
        </button>
        <button
          type="button"
          class="storybook-button storybook-button--primary storybook-button--small"
          onclick={onCreateAccount}
        >
          Sign up
        </button>
      {/if}
    </div>
  </div>
</header>

<style>
  .storybook-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    font-family: 'Nunito Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }

  .storybook-header > div:first-child {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .storybook-header svg {
    display: inline-block;
    vertical-align: top;
  }

  .storybook-header h1 {
    display: inline-block;
    vertical-align: top;
    margin: 6px 0 6px 10px;
    font-weight: 700;
    font-size: 20px;
    line-height: 1;
  }

  .storybook-header > div:last-child {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .welcome {
    margin-right: 10px;
    color: #333;
    font-size: 14px;
  }

  .storybook-button {
    display: inline-block;
    padding: 11px 20px;
    border: 0;
    border-radius: 3em;
    cursor: pointer;
    font-family: 'Nunito Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-weight: 700;
    font-size: 14px;
    line-height: 1;
  }

  .storybook-button--primary {
    background-color: #1ea7fd;
    color: white;
  }

  .storybook-button--small {
    padding: 10px 16px;
    font-size: 12px;
  }
</style>