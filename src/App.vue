<script setup lang="ts">
	import { computed, nextTick, reactive, ref, shallowRef, watch, type Ref } from 'vue';
	import type { CtxDispOpts, CtxMenuData, FileOrDir, vDir } from './env';
	import tabManager from './module/tabs.vue';
	import CtxMenu from './module/ctxmenu.vue';
	import { FACTION, FS, TREE, getActiveFile, getConfig, message, openFile, regConfig, registerCommand } from './utils';
	import Opener from './module/opener.vue';
	import Message from './module/message.vue';
	import Chooser from './module/fdpicker.vue';
	import Alert from './module/alert.vue';
	import Tree from './module/tree.vue';
	import Command from './module/panel.vue';

	const list_ele = ref<HTMLElement>();
	window.addEventListener('resize', () => layout_displayLeft.value = false);

	// 键盘监听
	let current_tree = TREE.parent!,
		current_index = 0,
		old_fd: undefined | FileOrDir,
		current: FileOrDir = current_tree.child![current_index],
		locked = false;
	async function handleUpdate(multi = false){
		old_fd = current;
		multi || (old_fd && old_fd.parent?.active.delete(old_fd));
		locked = UI.loading = true;
		if(!current_tree.child) document.documentElement.focus(), await FS.loadTree(current_tree);
		else if(current_tree.child.length == 0) return;
		current_tree.unfold = true;
		locked = UI.loading = false;
		current = current_tree.child![current_index];
		if(!current) current_index = 0, current = current_tree.child![current_index];
		current.parent?.active.set(current, current.path);
	}
	watch(list_ele, ele => ele && (ele.addEventListener('keydown', (ev:KeyboardEvent) => {
		if((ev.target as HTMLElement).tagName == 'INPUT') return;
		if(locked) return;

		if(ev.ctrlKey) switch(ev.key){
			case 'keyA':
				if(!current.parent) return;
				current.parent.child?.forEach(child => current.parent?.active.set(child, child.path));
			break;

			case 'keyC':
				FACTION.mark('copy');
			break;

			case 'keyX':
				FACTION.mark('move');
			break;

			case 'keyV':
				let dir = current.type == 'dir' ? current : current.parent;
				if(dir) FACTION.exec(dir);
			break;

			default:
				return;
		}
		
		switch(ev.key){
			case 'ArrowUp':
				current_index = Math.max(0, current_index - 1);
				handleUpdate(ev.shiftKey);
			break;
				
			case 'ArrowDown':
				current_index = current_index >= current_tree.child!.length - 1 ? 0 : current_index + 1;
				handleUpdate(ev.shiftKey);	
			break;

			case 'Enter':{
				const cur = current;
				cur.type == 'dir'
					? FS.loadTree(cur).then(() => cur.unfold = true)
					: openFile(cur);
			break; }

			case 'Tab':
			case 'ArrowRight':
				if(current.type == 'dir')
					current_tree = current,
					current_index = 0;
				handleUpdate(ev.shiftKey);
			break;

			case 'ArrowLeft':
			case 'Escape':
				if(current_tree.parent && current_tree.path != '/')
					current_index = current_tree.parent.child!.indexOf(current_tree),
					current_tree = current_tree.parent;
				handleUpdate(ev.shiftKey);
			break;

			case 'F5':{
				const cur = current;
				if(cur.type == 'file' && cur.parent?.type == 'dir')
					FS.loadTree(cur.parent).then(() => cur!.parent!.unfold = true);
				else if(cur.type == 'dir')
					FS.loadTree(cur).then(() => cur!.unfold = true);
				handleUpdate(ev.shiftKey);
			break; }

			case 'F2':
				if(current.path != '/')
					current.rename = true;
			break;

			case 'Delete':
				if(current.path != '/')
					FS.del(getActiveFile()[0].path).catch(e => message({
						'type': 'error',
						'content': {
							'title': '删除失败',
							'content': (e as Error).message
						},
						'title': '文件资源管理器',
						'timeout': 10
					})).then(() => handleUpdate(ev.shiftKey));
			break;

			default: return;
		}

		ev.preventDefault();
	}), ele.addEventListener('pointerup', async e => {
		if((e.target as HTMLElement).tagName == 'INPUT') return;
		if(locked) return;
		const target = e.target as HTMLElement;
		// 切换活动ID
		if((target.classList.contains('item') || target.classList.contains('parent')) && target.dataset.position){
			const index = target.dataset.position.lastIndexOf(':'),
				tree = await FS.stat(target.dataset.position!.substring(0, index)),
				id = parseInt(target.dataset.position.substring(index + 1));
			current_tree = tree.type == 'dir' ? tree : tree.parent!, 
			current_index = id, handleUpdate(true);
		}
	})));

	const tree_active = ref(false),
		layout_displayLeft = ref(false),
		taskmode = ref(false);

	watch(UIMAIN['layout.fontSize'], val => document.documentElement.style.fontSize = val + 'px');
	document.documentElement.style.fontSize = UIMAIN['layout.fontSize'].value + 'px';

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
		if((target.classList.contains('app-meta-header') || target.classList.contains('default_app')) && taskmode.value)
			taskmode.value = false;
	}

	nextTick(() => registerCommand({
		"name": "list.focus",
		"title": "聚焦到文件列表",
		"handler": () => list_ele.value!.focus()
	}, {
		"name": "app.fullscreen",
		"title": "切换全屏模式",
		handler: () => UI.fullscreen.value ? document.exitFullscreen() : reqFullscreen()
	}))
	
	// 自动聚焦
	window.addEventListener('load', () => requestAnimationFrame(() => list_ele.value?.focus()));
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
			"default": "vList",
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
		fullscreen,
		loading: false
	};

	
	// ctxmenu
	const ctxconfig = reactive({
		item: [] as Array<CtxMenuData>,
		display: false,
		x: 0,
		y: 0
	});

	export function contextMenu(data:CtxDispOpts){
		ctxconfig.x = data.pos_x;
		ctxconfig.y = data.pos_y;
		ctxconfig.item = data.content;
		ctxconfig.display = true;
	}
</script>

<template>
	<!-- 加载进度条 -->
	<div class="loading" v-if="UI.loading"></div>
	<!-- 左侧文件 -->
	<div class="left" :style="{
		width: UI.filelist_width.value + 'px',
		left: layout_displayLeft ? '0' : '-200vw'
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
			<Tree :data="TREE" />
		</div>
	</div>
	<!-- 移动端时左侧的背层 -->
	<div class="left-mask" :style="{
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
		<!-- 快捷启动 -->
		<Command />
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
	@import './style/font.scss';

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

		@keyframes loading_anim {
			0%{
				left: -10vw;
				width: 0;
			}50%{
				left: 10vw;
				width: 70vw;
			}75%{
				left: 120vw;
				width: 0;
			}
		}

		> .loading{
			position: fixed;
			top: 0;
			height: .2rem;
			border-radius: .1rem;
			background-color: #65b6c6;
			z-index: 50;
			animation: loading_anim 2s linear infinite;
		}

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
				z-index: 2;
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
				float: right;

				> .mobile-tool{
					display: none;
				}
			}

			> .left-mask{
				display: none !important;
			}
		}
	}

	// 手机设备
	@media screen and (max-width: 30rem) {
		body {
			>.left {
				position: fixed;
				top: 0;
				height: 100%;
				bottom: 0;
				z-index: 55;
				width: calc(100vw - 2rem) !important;
				left: 0;
				box-shadow: 0 .25rem 1rem #646464;
			}

			// 遮罩
			.left-mask{
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

					> .app.default_app > *{
						pointer-events: none;
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
