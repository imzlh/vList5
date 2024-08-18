<script lang="ts" setup>
    import { onMounted, onUnmounted, ref } from 'vue'
    import { create, type Player } from 'asciinema-player'
    import 'asciinema-player/dist/bundle/asciinema-player.css'
    import type { vFile } from '@/env';

    const wrapper = ref(null),
        _prop = defineProps(['option']),
        file = _prop.option as vFile;
    let player: undefined | Player;

    onMounted(() => player = create(file.url, wrapper.value!, {
        autoPlay: true,
        fit: 'both'
    }));
    onUnmounted(() => player && player.dispose());
</script>

<template>
    <div class="asciinema-wrapper" ref="wrapper"></div>
</template>

<style scoped>
    .asciinema-wrapper {
        width: 100%;
        height: 100%;
        background-color: black
    }

    /* @media screen and (min-width: 30rem){
        .asciinema-wrapper {
            margin-top: 2rem;
        }
    } */
</style>