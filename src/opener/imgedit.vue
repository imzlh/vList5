<script lang="ts" setup>
    import { onUnmounted, ref, watch } from 'vue';
    import {mount} from '@/utils/imgedit';

    const _prop = defineProps(['visibility', 'option']),
        file = _prop.option,
        ev = defineEmits(['close']),
        container = ref();

    const prom_close = new Promise<void>(rs => onUnmounted(rs));
    watch(container, val => val && mount(val, file, ev, prom_close));
</script>

<template>
    <div ref="container" class="container"></div>
</template>

<style scoped>
    .container {
        height: 100%;
    }

    @media screen and (min-width: 30rem) {
        .container{
            height: calc(100% - 2rem);
            margin-top: 2rem;
        }
    }
</style>