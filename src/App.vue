<script setup lang="ts">
	import { onMounted, reactive, ref, watch, type Ref } from 'vue';
	import type { CtxDispOpts, CtxMenuData } from './env';
	import tabManager from './module/tabs.vue';
	import Tree from './module/tree.vue';
	import CtxMenu from './module/ctxmenu.vue';
	import { APP_NAME, Global, TREE, getConfig, regConfig } from './utils';
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
	}),CONFIG = getConfig('基础'),
	layout_left = CONFIG['layout.left'] as Ref<number>,
	layout_total = ref(document.documentElement.clientWidth),
	layout_displayLeft = ref(true);

	const tree_active = ref(false);

	window.addEventListener('resize',() => (
		layout_total.value = document.documentElement.clientWidth,
		layout_displayLeft.value = false
	));
	
	watch(CONFIG['layout.fontSize'], val => document.documentElement.style.fontSize = val + 'px');
	document.documentElement.style.fontSize = CONFIG['layout.fontSize'].value + 'px';

	Global('ui.ctxmenu').data = function(data:CtxDispOpts){
		ctxconfig.x = data.pos_x;
		ctxconfig.y = data.pos_y;
		ctxconfig.item = data.content;
		ctxconfig.display = true;
	}

	function resize(e:PointerEvent){
		const rawW = layout_left.value;
		function rszHandler(ev:PointerEvent){
			ev.preventDefault();
			const size = rawW + ev.clientX - e.clientX;
			if(size < CONFIG['layout.fontSize'].value * 14) return;
			else layout_left.value = Math.floor(size);
		}

		document.addEventListener('pointermove',rszHandler);
		document.addEventListener(
			'pointerup',
			() => document.removeEventListener('pointermove',rszHandler),
			{ once: true}
		);
	}
</script>

<script lang="ts">
	regConfig('基础',[
		"布局设置",
		{
			"type": "number",
			"step": 1,
			"default": Math.min(18 * 12,document.documentElement.clientWidth * .35),
			"name": "文件栏大小",
			"desc": "左侧文件栏绝对大小(px)",
			"key": "layout.left"
		},{
			"type": "range",
			"step": 1,
			"min": 8,
			"max": 30,
			"default": 18,
			"name": "缩放",
			"key": "layout.fontSize"
		}
	])
</script>

<template>
	<!-- 左侧文件 -->
	<div class="left" :style="{ 
		width: layout_left -2 + 'px', 
		left: layout_displayLeft ? '1rem' : '-200vw' 
	}">
		<div class="h">
			<svg fill="currentColor" viewBox="0 0 16 16">
				<path d="M4.158 12.025a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm-3.5 1.5a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm.747-8.498a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 11H13a3 3 0 0 0 .405-5.973zM8.5 2a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4.002 4.002 0 0 1 8.5 2z"/>
			</svg>
			{{ APP_NAME }}
		</div>
		<div class="files vlist" tabindex="-1" @contextmenu.prevent @focus="tree_active = true" @blur="tree_active = false">
			<Tree :data="TREE" :active="tree_active" />
		</div>
	</div>
	<!-- 移动端时左侧的背层 -->
	<div class="left-overflow" :style="{
		opacity: layout_displayLeft ? '1' : '0',
		display: layout_displayLeft ? 'block' : 'none'
	}" @click="layout_displayLeft = false"></div>
	<!-- 调节大小 -->
	<div class="resizer" @pointerdown.prevent="resize"></div>
	<!-- 右侧 -->
	<div class="right" :style="{ width: layout_total - layout_left + 'px' }">
		<tabManager ref="tabs" />
		<!-- 右键 -->
		<div class="ctx-mask-layer" v-show="ctxconfig.display" 
			@click="ctxconfig.display = false;" @contextmenu.prevent="ctxconfig.display = false"></div>
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
		<!-- 显示选择栏 -->
		<div class="mobile-tool">
			<div @click="layout_displayLeft = !layout_displayLeft">
				<svg viewBox="0 0 16 16">
					<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
				</svg>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
	@import './public/font.scss';

	body {
		margin: 0;
		overflow: hidden;
		font-family: 'Open Sans','Clear Sans','Helvetica Neue','Helvetica','Arial','sans-serif';
		
		//  兼容移动端100svh
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;

		>.left,
		>.resizer,
		>.right {
			display: inline-block;
			box-sizing: border-box;
			height: 100%;
		}

		>.left {
			box-sizing: border-box;
			padding: .25rem;
			overflow: auto;
			// display: inline-flex;
			// flex-direction: column;
			background-color: #faf8f8;
			overflow: hidden;
			transition: left .3s;

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
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			z-index: 100;
		}
	}

	// PC
	@media screen and (min-width: 30rem) {
		body {
			::-webkit-scrollbar {
				display: block;
				width: .2rem;
				height: .2rem;
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

			>.left{
				position: relative !important;
				left: 0 !important;
			}

			>.right {
				position: relative;
				overflow: hidden;

				> .mobile-tool{
					display: none;
				}
			}

			> .left-overflow{
				display: none !important;
			}
		}
	}

	// 手机设备
	@media screen and (max-width: 30rem) {
		body {
			>.left {
				position: fixed;
				top: 1rem;
				width: calc(100vw - 2rem) !important;
				height: calc(100vh - 2rem);
				border-radius: 0.8rem;
				// padding: 1rem;
				z-index: 100;
			}

			// 遮罩
			.left-overflow{
				position: fixed;
				top: 0;
				width: 100vw;
				height: 100vh;
				background-color: rgba(0, 0, 0, 0.3);
				z-index: 99;
				transition: all .3s;
			}

			>.right {
				position: absolute;
				width: 100% !important;
				> .mobile-tool{
					position: absolute;
					bottom: 40%;
					right: 0;
					transform: translateY(-50%);

					background-color: rgba(230, 222, 222, 0.6);
					border-radius: .2rem 0 0 .2rem;

					> *{
						display: block;
						padding: .25rem;
						width: 1.2rem;
						height: 1.2rem;
						border-radius: .2rem;
					}
				}
			}
		}
	}
</style>
