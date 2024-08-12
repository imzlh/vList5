<script lang="ts" setup>
    import { ref, watch } from 'vue';
    import {mount} from '@/utils/imgedit';

    const _prop = defineProps(['visibility', 'option']),
        file = _prop.option,
        ev = defineEmits(['close']),
        container = ref();

    watch(container, val => val && mount(val, file, ev));    
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