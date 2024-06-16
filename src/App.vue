<script setup lang="ts">
	import { onMounted, reactive, ref, watch } from 'vue';
	import type { CtxDispOpts, CtxMenuData, vDir } from './data';
	import tabManager from './module/tabs.vue';
	import Tree from './module/tree.vue';
	import CtxMenu from './module/ctxmenu.vue';
	import { APP_NAME, FILE_PROXY_SERVER, Global, TREE } from './utils';
	import Opener from './module/opener.vue';
	import Message from './module/message.vue';
	import Chooser from './module/chooser.vue';
	import Alert from './module/alert.vue';
	import './opener';

	const ctxconfig = reactive({
		item: [] as Array<CtxMenuData>,
		display: false,
		x: 0,
		y: 0
	});

	const tree_active = ref(false),
		font = ref(18),
		width = reactive({
			width: document.documentElement.clientWidth,
			left: Math.min(font.value * 18,document.documentElement.clientWidth * .35),
		});

	window.addEventListener('resize',() => width.width = document.documentElement.clientWidth);
	
	document.documentElement.style.fontSize = font.value + 'px'
	watch(font,n => document.documentElement.style.fontSize = n + 'px');

	Global('ui.ctxmenu').data = function(data:CtxDispOpts){
		ctxconfig.x = data.pos_x;
		ctxconfig.y = data.pos_y;
		ctxconfig.item = data.content;
		ctxconfig.display = true;
	}

	function resize(e:PointerEvent){
		const rawW = width.left;
		function rszHandler(ev:PointerEvent){
			const size = rawW + ev.clientX - e.clientX;
			if(size < font.value * 14) return;
			else width.left = size;
		}

		document.addEventListener('pointermove',rszHandler);
		document.addEventListener(
			'pointerup',
			() => document.removeEventListener('pointermove',rszHandler),
			{ once: true}
		);
	}
</script>

<template>
	<div class="left" :style="{ width: (width.left -2).toFixed(0) + 'px' }">
		<div class="h">
			<svg fill="currentColor" viewBox="0 0 16 16">
				<path d="M4.158 12.025a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm-3.5 1.5a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm.747-8.498a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 11H13a3 3 0 0 0 .405-5.973zM8.5 2a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4.002 4.002 0 0 1 8.5 2z"/>
			</svg>
			{{ APP_NAME }}
		</div>
		<div class="files" tabindex="-1" @focus="tree_active = true" @blur="tree_active = false">
			<Tree :data="TREE" :active="tree_active" />
		</div>
	</div>
	<div class="resizer" @pointerdown="resize"></div>
	<div class="right" :style="{ width: (width.width - width.left -4).toFixed(0) + 'px' }">
		<tabManager ref="tabs" />
	</div>
	<!-- 右键 -->
	<div class="ctx-mask-layer" v-show="ctxconfig.display" @click="ctxconfig.display = false;"></div>
	<CtxMenu 
		@blur="ctxconfig.display = false"
		:data="ctxconfig.item" :display="ctxconfig.display"
		:x="ctxconfig.x" :y="ctxconfig.y"
	/>
	<!-- 消息组件 -->
	<Message />
	<!-- 打开方式 -->
	<Opener />
	<!-- 文件选择 -->
	<Chooser />
	<!-- 模态框 -->
	<Alert />
</template>

<style lang="scss">
	body {
		margin: 0;
		overflow: hidden;

		>.left,
		>.resizer,
		>.right {
			display: inline-block;
			box-sizing: border-box;
			height: 100vh;
		}

		>.left {
			box-sizing: border-box;
			padding: .25rem;
			overflow: auto;
			position: relative;
			// display: inline-flex;
			// flex-direction: column;
			background-color: #faf8f8;
			overflow: hidden;

			>.h {
				text-align: center;
				padding: .6rem 0;
				background-color: #faf8f8;
				z-index: 1;

				position: absolute;
				top: 0;
				left: 0;
				width: 100%;

				font-size: 1.6rem;
				line-height: 3rem;

				>svg {
					display: inline-block;
					width: 1em;
					height: 1em;
					margin: 0 .3em;
					transform: scale(1.5) translateY(10%);
				}
			}

			>.files {
				overflow: auto;
				height: 100%;
				padding-top: 3.5rem;
				box-sizing: border-box;
			}

			>.files {
				outline: none;
			}

		}

		>.resizer {
			width: 2px;
			background-color: rgb(195, 191, 191);
			cursor: ew-resize;
			position: relative;

			&::before{
				content: '';
				position: absolute;
				top: 0;
				bottom: 0;
				left: -.25rem;
				right: -.25rem;
				z-index: 5;
			}
		}

		>.right {
			position: relative;
		}

		.ctx-mask-layer {
			position: fixed;
			inset: 0;
			z-index: 100;
		}
	}

	// PC
	@media screen and (min-width: 30rem) {
		body {
			::-webkit-scrollbar {
				display: block;
				width: .2rem;
				transform: all .2s;
			}

			:hover::-webkit-scrollbar-thumb {
				background-color: rgb(160, 223, 198);
			}

			::-webkit-scrollbar-button {
				display: none;
			}

			&::-webkit-scrollbar-thumb {
				border-radius: 1rem;
				background-color: rgb(228, 229, 228);
				transition: all .2s;
			}

			>.right {
				position: relative;
				overflow: hidden;
			}
		}
	}

	// 手机设备
	@media screen and (max-width: 30rem) {
		body {
			>.left {
				position: fixed;
				inset: 0;
				margin: 1rem;
				border-radius: 0.8rem;
				padding: 1rem;
				z-index: 100;
				display: none;

				// 遮罩
				&::after {
					content: '';
					position: fixed;
					inset: 0;
					background-color: rgba(0, 0, 0, 0.3);
					z-index: -1;
				}
			}

			>.right {
				position: fixed;
				inset: 0;
			}
		}
	}
</style>
