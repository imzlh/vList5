<script setup lang="ts">
	import type { CtxDispOpts, TabWindow } from '@/env';
	import { Global } from '@/utils';
	import { ref, reactive, toRaw, markRaw } from 'vue';
	import I_OFF from "/icon/off.webp";

	const tabs = reactive<Array<TabWindow>>([]),
		current = ref(-1);

	const func = {
		set(to: number) {
			const from = current.value;
			current.value = to;
			if (tabs[from] && tabs[from].onLeave) (tabs[from].onLeave as Function)();
			if (tabs[to] && tabs[to].onLeave) (tabs[to].onLeave as Function)();
		},

		add(item: TabWindow) {
			return current.value = tabs.push(markRaw({
				...item,
				uuid: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36)
			})) - 1;
		}
	};

	function ctxMenu(ev: MouseEvent, i: number) {
		Global('ui.ctxmenu').call({
			"pos_x": ev.clientX,
			"pos_y": ev.clientY,
			"content": [
				{
					"text": "关闭工作区",
					"tip": "关闭这个窗口",
					"icon": I_OFF,
					handle() {
						current.value = -1;
						tabs.splice(i, 1);
					},
				}
			]
		} satisfies CtxDispOpts)
	}

	Global('ui.window').data = func;
	defineExpose(func);
</script>

<template>
	<div class="tab" v-bind="$attrs">
		<template v-for="(data, i) in tabs" :key="data.uuid">
			<div v-if="data" @click="current = i" @contextmenu.prevent="ctxMenu($event, i)"
				:active="current == i"
			>
				<img :src="data.icon" onerror="this.style.display = 'none';" class="icon">
				<span>{{ data.name }}</span>
				<i class="close" @click.stop="tabs.splice(i, 1);"></i>
			</div>
		</template>
	</div>

	<template v-for="(data, i) in tabs" :key="data.uuid">
		<div v-if="data" :key="data.name + i" class="app" v-show="i == current">
			<div class="app-meta-header" @click="current = i">
				<img :src="data.icon" onerror="this.style.display = 'none';" class="icon">
				<span>{{ data.name }}</span>
				<i class="close" @click="tabs.splice(i, 1);"></i>
			</div>
			<suspense>
				<component :is="toRaw(data.content)" :option="data.option"
					@close="tabs.splice(i, 1);" @hide="current = -1" @show="current = i"
				/>

				<template #fallback>
					<div class="tab-loading"></div>
				</template>
			</suspense>
		</div>
	</template>

	<div class="app default_app" v-show="current == -1">
		<svg viewBox="0 0 16 16" class="default_app_icon">
			<path
				d="M5 2V0H0v5h2v6H0v5h5v-2h6v2h5v-5h-2V5h2V0h-5v2H5zm6 1v2h2v6h-2v2H5v-2H3V5h2V3h6zm1-2h3v3h-3V1zm3 11v3h-3v-3h3zM4 15H1v-3h3v3zM1 4V1h3v3H1z" />
		</svg>
	</div>

</template>


<style lang="scss">
	@import '@/icon.scss';

	.tab {
		padding: .45rem;
		display: flex;
		gap: .45rem;
		overflow-y: scroll;
		z-index: 39;

		position: absolute;
		top: 0;
		left: 0;
		right: 0;

		scroll-behavior: smooth;

		&::-webkit-scrollbar {
			display: none;
		}

		@keyframes tab_jumpin {
			from{
				transform: translateY(-5rem) scale(0);
				opacity: 0;
			}to{
				transform: none;
				opacity: 1;
			}
		}

		>div {
			border-radius: .25rem;
			padding: 0 .65rem;
			background-color: #edeaeaab;
			line-height: 2rem;
			box-shadow: 1px 3px 0.35rem rgba(204, 204, 204, 0.6);
			border-radius: .45rem;
			width: 8rem;
			max-width: 10rem;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			user-select: none;
			cursor: pointer;
			transition: all .2s;
			position: relative;
			font-size: .85rem;
			animation: jumpin .3s linear forwards;

			&[active=true]::before {
				content: '';
				position: absolute;
				left: 0;
				top: 0.4rem;
				width: .2rem;
				height: 1.2rem;
				background-color: #57c9d8;
				border-radius: .1rem;
			}

			&:hover {
				background-color: #edeaea;
			}

			&:hover > i.close{
				display: block;
			}

			>img {
				height: 1em;
				width: 1em;
				margin: 0 .35em;
				transform: scale(1.2) translateY(15%);
			}

			>i.close{
				display: none;
				content: $icon_close;
				width: 1rem;
				height: 1rem;

				position: absolute;
				right: .35rem;
				top: .5rem;
			}
		}
	}

	.app {
		width: 100%;
		height: 100%;
		transition: transform .2s;

		>.app-meta-header {
			display: none;

			position: absolute;
			z-index: 40;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgb(247 247 247 / 60%);
			backdrop-filter: blur(.2rem);
			padding: 1rem 0;
			color: rgb(96, 93, 93);
			font-size: 1.2rem;

			>img {
				width: 5rem;
				height: 5rem;
			}

			>* {
				display: block;
				margin: auto;
				pointer-events: none
			}

			>i {
				pointer-events: all;
				content: $icon_close;
				position: absolute;
				top: 1rem;
				right: 1rem;
				height: 1.5rem;
				width: 1.5em;
				z-index: 1;
			}
		}

		&.default_app {
			z-index: -1;
			display: flex;
			align-items: center;
			justify-content: center;

			svg {
				display: block;
				fill: rgb(178, 174, 167);
				width: 100%;
				max-width: 4rem;
			}
		}

		> div{
			outline: none;
		}

		.tab-loading{
        	display: flex;
			width: 100%;
			height: 100%;
			align-items: center;
			justify-content: center;
			z-index: 1;

			&::after{
				content: '';
				width: 3rem;
				height: 3rem;
				border: .4rem solid;
				border-color: #90cf5b transparent;
				border-radius: 50%;
				-webkit-animation: rotation 1s linear infinite;
				animation: rotation 1s linear infinite;
			}
		}
	}
</style>
