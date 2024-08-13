<script setup lang="ts">
	import { computed, onMounted, reactive, readonly, ref, watch, type Ref } from 'vue';
	import type { AlertOpts, CtxDispOpts, CtxMenuData } from './env';
	import tabManager from './module/tabs.vue';
	import CtxMenu from './module/ctxmenu.vue';
	import { FS, Global, TREE, getActiveFile, getConfig, regConfig, splitPath } from './utils';
	import Opener from './module/opener.vue';
	import Message from './module/message.vue';
	import Chooser from './module/fileframe.vue';
	import Alert from './module/alert.vue';
	import Tree from './module/tree.vue';

	const ctxconfig = reactive({
			item: [] as Array<CtxMenuData>,
			display: false,
			x: 0,
			y: 0
		}),
		list_ele = ref<HTMLElement>();

	// 键盘事件管理器
	const KeyBoardManager = {
		/**
		 * @private
		 */
		current: 0,
		/**
		 * @private
		 */
		elements: computed(() => (list_ele.value as HTMLElement).getElementsByClassName('selectable')),

		get next(){
			if(this.current == this.elements.value.length-1)
				this.current = 0;
			else
				this.current ++;
			return this.elements.value[this.current] as HTMLElement;
		},
		get prev(){
			if(this.current == 0)
				this.current = this.elements.value.length -1;
			else
				this.current --;
			return this.elements.value[this.current] as HTMLElement;
		},
		_ensure(action: string):Promise<any>{
			return new Promise(rs => Global('ui.alert').call({
				"callback": res => res && rs(true),
				"message": "真的要" + action + '吗?',
				"title": "确认操作",
				"type": "confirm"
			} satisfies AlertOpts));
		},
		__handler(e: KeyboardEvent){
			e.preventDefault();

			switch (e.key) {
				case 'ArrowDown':
					this.next.click();
				break;

				case 'ArrowUp':
					this.prev.click();
				break;

				case 'Enter':
					this.elements.value[this.current].dispatchEvent(new MouseEvent('dblclick'));
				break;

				case 'Delete':
					const marked = getActiveFile();
					this._ensure('删除 ' + marked.length + '个文件(夹)')
						.then(() => {
							FS.del(marked.map(item => item.path));
						});
				break;

				default:
					break;
			}
		}
	}

	watch(list_ele, el => el && el.addEventListener('keydown', e => KeyBoardManager.__handler(e)));
	window.addEventListener('resize', () => layout_displayLeft.value = false);

	const tree_active = ref(false),
		layout_displayLeft = ref(false),
		taskmode = ref(false);

	watch(UIMAIN['layout.fontSize'], val => document.documentElement.style.fontSize = val + 'px');
	document.documentElement.style.fontSize = UIMAIN['layout.fontSize'].value + 'px';

	Global('ui.ctxmenu').data = function(data:CtxDispOpts){
		ctxconfig.x = data.pos_x;
		ctxconfig.y = data.pos_y;
		ctxconfig.item = data.content;
		ctxconfig.display = true;
	}

	function resize(e:PointerEvent){
		const rawW = UI.filelist_width.value;
		function rszHandler(ev:PointerEvent){
			ev.preventDefault();
			const size = rawW + ev.clientX - e.clientX;
			if(size < UIMAIN['layout.fontSize'].value * 10) return;
			else UI.filelist_width.value = Math.floor(size);
		}

		document.addEventListener('pointermove',rszHandler);
		document.addEventListener(
			'pointerup',
			() => document.removeEventListener('pointermove',rszHandler),
			{ once: true}
		);
	}

	function handleAppClick(el: MouseEvent){
		const target = el.target as HTMLElement;
		if(target.classList.contains('app-meta-header') && taskmode.value)
			taskmode.value = false
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
		},
		'身份设置',
		{
			"type": "text",
			"default": '',
			"key": "authkey",
			"name": "身份ID",
			"desc": "用于身份验证，解锁文件系统操作"
		},
		'个性化',
		{
			"type": "text",
			"default": "izCloud",
			"key": "appname",
			"name": "应用名称",
			"desc": "在左上角显示的应用名称"
		},{
			"type": "text",
			"default": "",
			"key": "favicon",
			"name": "应用图标",
			"desc": "在左上角显示的应用图标"
		}
	]);
	const UIMAIN = getConfig('基础'),
		size_w = ref(document.documentElement.clientWidth),
		size_h = ref(document.documentElement.clientHeight);

	window.addEventListener('resize',() => (
		size_w.value = document.documentElement.clientWidth,
		size_h.value = document.documentElement.clientHeight
	));

	export const reqFullscreen = () => document.body.requestFullscreen({
		"navigationUI": "hide"
	});

	const fullscreen = ref(false);
	document.body.addEventListener('fullscreenchange', () =>
		fullscreen.value = !!document.fullscreenElement
	);

	export const UI = {
		fontSize: UIMAIN['layout.fontSize'] as Ref<number>,
		width_total: size_w,
		height_total: size_h,
		app_width: computed(() => fullscreen.value
			? size_w.value
			: size_w.value - UIMAIN['layout.left'].value -3
		),
		filelist_width: UIMAIN['layout.left'] as Ref<number>,
		fullscreen
	};
</script>

<template>
	<!-- 左侧文件 -->
	<div class="left" :style="{
		width: UI.filelist_width.value + 'px',
		left: layout_displayLeft ? '1rem' : '-200vw'
	}">
		<div class="h">
			<img v-if="UIMAIN.favicon.value" :src="UIMAIN.favicon.value" />
			<svg fill="currentColor" viewBox="0 0 16 16" v-else>
				<path d="M4.158 12.025a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm-3.5 1.5a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 0 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm6 0a.5.5 0 0 1 .316.633l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.317zm.747-8.498a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 11H13a3 3 0 0 0 .405-5.973zM8.5 2a4 4 0 0 1 3.976 3.555.5.5 0 0 0 .5.445H13a2 2 0 0 1 0 4H3.5a2.5 2.5 0 1 1 .605-4.926.5.5 0 0 0 .596-.329A4.002 4.002 0 0 1 8.5 2z"/>
			</svg>
			{{ UIMAIN.appname.value }}
		</div>
		<div class="files vlist" ref="list_ele" tabindex="-1"
			@contextmenu.prevent @focus="tree_active = true" @blur="tree_active = false"
		>
			<Tree :data="TREE"/>
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
	<div class="right" :taskmode="taskmode" :fullscreen="fullscreen"
		:style="{ width: UI.app_width.value + 'px' }"
		@click="handleAppClick"
	>
		<tabManager ref="tabs" @click="taskmode = !taskmode" />
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
	@import './font.scss';

	body {
		margin: 0;
		overflow: hidden;
		font-family: unset !important;

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

				>svg, >img {
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
				box-sizing: border-box;
				outline: none;
				padding: 4.5rem .25rem 0 .25rem;
			}

		}

		>.resizer {
			width: 2px;
			background-color: rgb(195, 191, 191);
			cursor: ew-resize;
			position: relative;
			transition: background-color .2s;

			&:hover{
				background-color: #65b6c6;
				transition-delay: .3s;
			}

			&::before{
				content: '';
				position: absolute;
				top: 0;
				bottom: 0;
				left: -.25rem;
				right: -.25rem;
				z-index: 45;
			}
		}

		>.right {
			position: relative;

			&[fullscreen=true]{
				position: fixed;
				left: 0;right: 0;bottom: 0;top: 0;
				z-index: 100;
				width: 100vw !important;
				background-color: white;

				> .tab{
					display: none;
				}
			}
		}

		.ctx-mask-layer {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			z-index: 57;
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
				z-index: 55;
			}

			// 遮罩
			.left-overflow{
				position: fixed;
				top: 0;
				width: 100vw;
				height: 100vh;
				background-color: rgba(0, 0, 0, 0.3);
				z-index: 51;
				transition: all .3s;
			}

			>.right {
				position: absolute;
				width: 100% !important;
				overflow-y: auto;

				> .tab{
					position: fixed;
					display: block;
					margin: 0;
					left: auto;
					top: auto;
					right: .5rem;
					bottom: 1rem;

					> div[active=true] {
						width: 1.5rem;
						height: 1.5rem;
						padding: .5rem;
						border-radius: 2rem;
						flex-shrink: 0;
						background-color: rgb(255, 255, 255);

						&:hover > i, &::before, > span{
							display: none;
						}

						> img{
							display: block;
							margin: 0;
							padding: 0;
							width: 100%;
							height: 100%;
							transform: none;
						}
					}

					> div[active=false]{
						display: none;
					}
				}

				&[taskmode=true]{
					overflow-y: auto;
					text-align: center;
					padding-top: 50vh;
					background-image: linear-gradient(45deg, #6088dc, #29e6eb);

					> .app{
						transform: scale(.8);
						display: inline-block;
						overflow: hidden;
						width: 100vw;
						height: 100vh;
						height: 100svh;
						margin-top: -50vh;
						display: block !important;
						background-color: white;

						border-radius: .35rem;
						box-shadow: .05rem .01rem 2rem rgb(156, 155, 155);
						border: solid .1rem #b6b6b6;

						> .app-meta-header{
							display: block;
						}
					}

					> .app.default_app{
						display: none !important;
					}
				}

				> .mobile-tool{
					position: fixed;
					bottom: 20vh;
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
