<script lang="ts">
  import {
    faBookOpenReader,
    faClock,
    faDatabase,
    faDoorOpen
  } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import { mergeEntries } from '$lib/components/merged-header-icon/merged-entries';
  import MergedHeaderIcon from '$lib/components/merged-header-icon/merged-header-icon.svelte';
  import Ripple from '$lib/components/ripple.svelte';
  import { baseHeaderClasses, baseIconClasses, pxScreen } from '$lib/css-classes';
  import { isHost, sendToHost } from '$lib/host/host-bridge';

  export let leavePageLink: string;
  export let activeSettings: string;

  $: exitsToHost = isHost() && leavePageLink.endsWith(mergeEntries.MANAGE.routeId);

  const settingItems = [
    {
      label: 'Reader',
      icon: faBookOpenReader
    },
    {
      label: 'Data',
      icon: faDatabase
    },
    {
      label: 'Statistics',
      icon: faClock
    }
  ];
</script>

<div class={baseHeaderClasses}>
  <div class="{pxScreen} flex px-0 md:px-5">
    <div class="h12 flex grow justify-evenly xl:h-10">
      {#each settingItems as settingItem (settingItem.label)}
        <button
          class="flex grow flex-col items-center justify-center text-xs"
          class:bg-gray-900={activeSettings === settingItem.label}
          class:hover:bg-gray-900={activeSettings !== settingItem.label}
          on:click={() => (activeSettings = settingItem.label)}
        >
          <Fa class="mb-1" icon={settingItem.icon} />
          {settingItem.label}
          <Ripple />
        </button>
      {/each}
    </div>
    {#if exitsToHost}
      <button class={baseIconClasses} title="Exit" on:click={() => sendToHost('exit')}>
        <Fa icon={faDoorOpen} />
      </button>
    {:else}
      <MergedHeaderIcon {leavePageLink} />
    {/if}
  </div>
</div>
